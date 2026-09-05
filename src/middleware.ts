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

function domainFromHost(hostHeader: string | null): Domain {
  const hostname = (hostHeader ?? "").split(":")[0].toLowerCase();
  if (hostname.startsWith("app.")) return "app";
  if (hostname.startsWith("admin.")) return "admin";
  return "www";
}

function isAppOrAdminHostname(hostHeader: string | null): boolean {
  const hostname = (hostHeader ?? "").split(":")[0].toLowerCase();
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

  const hostDomain = domainFromHost(request.headers.get("host"));
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

function preserveHostParam(url: URL, domain: Domain, hostHeader: string | null) {
  // Prod : app.rappelbeauty.com / admin.… suffisent — pas besoin de ?__host=
  // Localhost (origine partagée) : garder ?__host=app|admin
  if (domain !== "www" && !isAppOrAdminHostname(hostHeader)) {
    url.searchParams.set(QUERY_HOST, domain);
  }
}

async function getSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return parseSessionTokenEdge(token);
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (
    process.env.NODE_ENV === "production" &&
    request.headers.get("x-forwarded-proto") === "http"
  ) {
    const httpsUrl = request.nextUrl.clone();
    httpsUrl.protocol = "https:";
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
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = "/login/";
        if (path !== "/" && path !== "") {
          loginUrl.searchParams.set("next", path);
        }
        loginUrl.searchParams.delete(QUERY_HOST);
        preserveHostParam(loginUrl, domain, request.headers.get("host"));
        return NextResponse.redirect(loginUrl);
      }
      if (session.scope === "platform") {
        const forbidden = request.nextUrl.clone();
        forbidden.pathname = "/login/";
        forbidden.searchParams.delete(QUERY_HOST);
        preserveHostParam(forbidden, domain, request.headers.get("host"));
        return NextResponse.redirect(forbidden);
      }
    }
  }

  if (domain === "admin") {
    const isPublic = isPublicPath(domain, path);
    if (!isPublic) {
      if (!session || session.scope !== "platform") {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = "/login/";
        if (path !== "/" && path !== "") {
          loginUrl.searchParams.set("next", path);
        }
        loginUrl.searchParams.delete(QUERY_HOST);
        preserveHostParam(loginUrl, domain, request.headers.get("host"));
        return NextResponse.redirect(loginUrl);
      }
    } else if (session?.scope === "platform" && path.startsWith("/login")) {
      const dash = request.nextUrl.clone();
      dash.pathname = "/dashboard/";
      dash.searchParams.delete(QUERY_HOST);
      preserveHostParam(dash, domain, request.headers.get("host"));
      return NextResponse.redirect(dash);
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
      !isAppOrAdminHostname(request.headers.get("host"))
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
