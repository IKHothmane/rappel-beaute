import { parseSessionTokenEdge } from "@/lib/auth/session-edge";
import { SESSION_COOKIE } from "@/lib/auth/types";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const QUERY_HOST = "__host";
const COOKIE_HOST = "__rappel_host";

type Domain = "www" | "app" | "admin";

function parseDomain(value: string | null | undefined): Domain | null {
  if (value === "www" || value === "app" || value === "admin") return value;
  return null;
}

/** Host public (Cloudflare Worker / proxy) prioritaire sur Host Railway. */
function publicHostname(request: NextRequest): string {
  const forwarded = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const raw = forwarded || request.headers.get("host") || "";
  return raw.split(":")[0].toLowerCase();
}

function domainFromHostname(hostname: string): Domain {
  if (hostname.startsWith("app.")) return "app";
  if (hostname.startsWith("admin.")) return "admin";
  return "www";
}

function isAppOrAdminHostname(hostname: string): boolean {
  return hostname.startsWith("app.") || hostname.startsWith("admin.");
}

/** Pages vitrine — sur localhost, ne pas laisser le cookie app les masquer. */
const WWW_PATH_PREFIXES = [
  "/fonctionnalites",
  "/tarifs",
  "/a-propos",
  "/essai",
  "/professionnel",
  "/connexion",
  "/demo",
  "/contact",
  "/faq",
  "/whatsapp",
  "/solutions",
  "/mentions-legales",
  "/confidentialite",
  "/ressources",
  "/blog",
  "/gestion-rendez-vous",
  "/gestion-stock",
  "/gestion-clientes",
] as const;

function isWwwMarketingPath(path: string): boolean {
  if (path === "/" || path === "") return true;
  return WWW_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

function resolveDomain(request: NextRequest): Domain {
  const explicit = parseDomain(request.nextUrl.searchParams.get(QUERY_HOST));
  if (explicit) return explicit;

  const hostname = publicHostname(request);
  const hostDomain = domainFromHostname(hostname);
  if (hostDomain !== "www") return hostDomain;

  // Origine partagée (localhost) : les URLs vitrine restent www même si
  // le cookie __rappel_host=app est encore présent.
  const path = request.nextUrl.pathname;
  if (isWwwMarketingPath(path)) return "www";

  return (
    parseDomain(request.cookies.get(COOKIE_HOST)?.value) ?? hostDomain
  );
}

const APP_PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password", "/activate"];
const ADMIN_PUBLIC_PATHS = ["/login", "/403"];

function isPublicPath(domain: Domain, path: string): boolean {
  const list = domain === "admin" ? ADMIN_PUBLIC_PATHS : APP_PUBLIC_PATHS;
  return list.some((p) => path === p || path.startsWith(`${p}/`));
}

function preserveHostParam(url: URL, domain: Domain, hostname: string) {
  // Prod : app.rappelbeauty.com / admin.… suffisent — pas besoin de ?__host=
  // Localhost (origine partagée) : garder ?__host=app|admin
  if (domain !== "www" && !isAppOrAdminHostname(hostname)) {
    url.searchParams.set(QUERY_HOST, domain);
  }
}

/**
 * Redirection sur le hostname public (X-Forwarded-Host),
 * jamais sur *.up.railway.app — sinon on quitte admin./app.
 */
function publicRedirect(
  request: NextRequest,
  pathname: string,
  domain: Domain,
  hostname: string,
  status: 307 | 308 = 308,
  extraSearch?: Record<string, string>,
) {
  const proto =
    request.headers.get("x-forwarded-proto") === "http" ? "http" : "https";
  const url = new URL(`${proto}://${hostname}${pathname}`);
  url.searchParams.delete(QUERY_HOST);
  if (extraSearch) {
    for (const [key, value] of Object.entries(extraSearch)) {
      url.searchParams.set(key, value);
    }
  }
  preserveHostParam(url, domain, hostname);
  return NextResponse.redirect(url, status);
}

async function getSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return parseSessionTokenEdge(token);
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const hostname = publicHostname(request);

  if (
    process.env.NODE_ENV === "production" &&
    request.headers.get("x-forwarded-proto") === "http"
  ) {
    const httpsUrl = new URL(`https://${hostname}${path}`);
    httpsUrl.search = request.nextUrl.search;
    return NextResponse.redirect(httpsUrl, 308);
  }

  if (path.startsWith("/api/")) {
    return NextResponse.next();
  }

  const queryHost = parseDomain(request.nextUrl.searchParams.get(QUERY_HOST));
  const domain = resolveDomain(request);
  const headers = new Headers(request.headers);
  headers.set("x-rappel-domain", domain);

  const session = await getSession(request);

  if (domain === "app") {
    const isPublic = isPublicPath(domain, path) || path === "/book" || path.startsWith("/book/");
    if (!isPublic) {
      if (!session) {
        return publicRedirect(
          request,
          "/login/",
          domain,
          hostname,
          308,
          path !== "/" && path !== "" ? { next: path } : undefined,
        );
      }
      if (session.scope === "platform") {
        return publicRedirect(request, "/login/", domain, hostname);
      }
    }
  }

  if (domain === "admin") {
    // /admin et /admin/* → chemins Super Admin (pas la vitrine)
    if (path === "/admin" || path === "/admin/" || path.startsWith("/admin/")) {
      const stripped = path.replace(/^\/admin\/?/, "/");
      const destPath =
        stripped === "/" || stripped === ""
          ? "/dashboard/"
          : stripped.endsWith("/")
            ? stripped
            : `${stripped}/`;
      return publicRedirect(request, destPath, domain, hostname);
    }

    const isPublic = isPublicPath(domain, path);
    if (!isPublic) {
      if (!session || session.scope !== "platform") {
        return publicRedirect(
          request,
          "/login/",
          domain,
          hostname,
          308,
          path !== "/" && path !== "" ? { next: path } : undefined,
        );
      }
    } else if (session?.scope === "platform" && path.startsWith("/login")) {
      return publicRedirect(request, "/dashboard/", domain, hostname);
    }
  }

  if (domain === "www") {
    // Pas de login sur le site marketing → espace institut (app)
    if (path === "/login" || path === "/login/") {
      const appLogin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
      if (appLogin && process.env.NODE_ENV === "production") {
        return NextResponse.redirect(`${appLogin}/login/`, 308);
      }
      const local = request.nextUrl.clone();
      local.pathname = "/login/";
      local.searchParams.set(QUERY_HOST, "app");
      return NextResponse.redirect(local, 308);
    }

    const res = NextResponse.next({ request: { headers } });
    // Accueil / pages vitrine : réinitialiser le cookie pour ne plus coller en mode app
    if (
      isWwwMarketingPath(path) &&
      !queryHost &&
      !isAppOrAdminHostname(hostname)
    ) {
      res.cookies.set(COOKIE_HOST, "www", { path: "/", sameSite: "lax" });
    } else if (queryHost) {
      res.cookies.set(COOKIE_HOST, queryHost, { path: "/", sameSite: "lax" });
    }
    return res;
  }

  const url = request.nextUrl.clone();

  if (domain === "admin") {
    url.pathname =
      path === "/" || path === ""
        ? "/domains/admin/dashboard"
        : path.startsWith("/domains/admin")
          ? path
          : `/domains/admin${path}`;
  } else {
    url.pathname =
      path === "/" || path === ""
        ? "/domains/app/dashboard"
        : path.startsWith("/domains/app")
          ? path
          : `/domains/app${path}`;
  }

  const res = NextResponse.rewrite(url, { request: { headers } });
  if (queryHost) {
    res.cookies.set(COOKIE_HOST, queryHost, { path: "/", sameSite: "lax" });
  }
  return res;
}

export const config = {
  matcher: [
    "/",
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
  ],
};
