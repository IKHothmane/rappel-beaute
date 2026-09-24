import { parseSessionTokenEdge } from "@/lib/auth/session-edge";
import { SESSION_COOKIE } from "@/lib/auth/types";
import {
  COOKIE_HOST,
  HEADER_DOMAIN,
  QUERY_HOST,
  parseDomainParam,
  resolveDomainFromHostname,
  resolvePublicHostname,
  type RappelDomain,
} from "@/lib/domain";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type Domain = RappelDomain;

function isAppOrAdminHostname(hostname: string): boolean {
  return hostname.startsWith("app.") || hostname.startsWith("admin.");
}

/** Pages vitrine : le cookie admin/app ne doit pas les détourner. */
function isMarketingPath(path: string): boolean {
  if (path === "/" || path === "") return true;
  const prefixes = [
    "/fonctionnalites",
    "/tarifs",
    "/a-propos",
    "/professionnel",
    "/connexion",
    "/contact",
    "/gestion-rendez-vous",
    "/gestion-clientes",
    "/gestion-stock",
    "/demo",
    "/essai",
    "/faq",
    "/whatsapp",
    "/blog",
    "/ressources",
    "/solutions",
    "/confidentialite",
    "/mentions-legales",
  ];
  return prefixes.some((p) => path === p || path.startsWith(`${p}/`));
}

function resolveDomain(
  request: NextRequest,
  session: { scope?: string } | null,
): Domain {
  // 1) Query localhost / apex (?__host=admin)
  const explicit = parseDomainParam(request.nextUrl.searchParams.get(QUERY_HOST));
  if (explicit) return explicit;

  // 2) Header posé par le Cloudflare Worker
  const fromWorker = parseDomainParam(request.headers.get(HEADER_DOMAIN));
  if (fromWorker) return fromWorker;

  // 3) Vrais sous-domaines app.* / admin.* (prioritaires sur le cookie)
  const fromHost = resolveDomainFromHostname(
    request.headers.get("host"),
    request.headers.get("x-forwarded-host") ??
      request.headers.get("x-rappel-public-host"),
  );
  if (fromHost === "app" || fromHost === "admin") return fromHost;

  const path = request.nextUrl.pathname;
  if (path === "/book" || path.startsWith("/book/")) return "app";

  // 4) Session ou cookie sur localhost / apex (ex. /dashboard/ après login)
  if (!isMarketingPath(path)) {
    if (session?.scope === "platform") return "admin";
    if (session?.scope === "app") return "app";
    const fromCookie = parseDomainParam(request.cookies.get(COOKIE_HOST)?.value);
    if (fromCookie === "app" || fromCookie === "admin") return fromCookie;
  }

  return fromHost;
}

const APP_PUBLIC_PATHS = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/activate",
];
const ADMIN_PUBLIC_PATHS = ["/login", "/403"];
const CHANGE_PASSWORD_PATH = "/changer-mot-de-passe";

function isChangePasswordPath(path: string): boolean {
  return path === CHANGE_PASSWORD_PATH || path.startsWith(`${CHANGE_PASSWORD_PATH}/`);
}

/** /domains/app/login/ → /login/ — pour les checks publics après rewrite. */
function stripDomainPrefix(path: string, domain: "app" | "admin"): string {
  const prefix = domain === "app" ? "/domains/app" : "/domains/admin";
  if (path === prefix || path === `${prefix}/`) return "/";
  if (path.startsWith(`${prefix}/`)) {
    const rest = path.slice(prefix.length);
    return rest.startsWith("/") ? rest : `/${rest}`;
  }
  return path;
}

function isPublicPath(domain: Domain, path: string): boolean {
  const list = domain === "admin" ? ADMIN_PUBLIC_PATHS : APP_PUBLIC_PATHS;
  return list.some((p) => path === p || path.startsWith(`${p}/`));
}

function preserveHostParam(url: URL, domain: Domain, hostname: string) {
  if (domain !== "www" && !isAppOrAdminHostname(hostname)) {
    url.searchParams.set(QUERY_HOST, domain);
  }
}

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

  const usePublic =
    Boolean(hostname) &&
    !hostname.includes("up.railway.app") &&
    hostname !== "localhost" &&
    !hostname.startsWith("127.");

  const url = usePublic
    ? new URL(`${proto}://${hostname}${pathname}`)
    : (() => {
        const u = request.nextUrl.clone();
        u.pathname = pathname;
        u.search = "";
        return u;
      })();

  url.searchParams.delete(QUERY_HOST);
  if (extraSearch) {
    for (const [key, value] of Object.entries(extraSearch)) {
      url.searchParams.set(key, value);
    }
  }
  preserveHostParam(url, domain, hostname);
  return NextResponse.redirect(url, status);
}

/** /admin → /domains/admin/dashboard ; /admin/users → /domains/admin/users */
function adminInternalPath(path: string): string {
  if (path === "/" || path === "") return "/domains/admin/dashboard";
  if (path === "/admin" || path === "/admin/") return "/domains/admin/dashboard";
  if (path.startsWith("/admin/")) {
    const rest = path.slice("/admin".length);
    const joined = `/domains/admin${rest === "/" ? "/dashboard" : rest}`.replace(
      /\/$/,
      "",
    );
    return joined || "/domains/admin/dashboard";
  }
  if (path.startsWith("/domains/admin")) return path;
  return `/domains/admin${path}`.replace(/\/$/, "");
}

async function getSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return parseSessionTokenEdge(token);
}

function isLoopbackHostname(hostname: string): boolean {
  const host = hostname.split(":")[0]?.toLowerCase() ?? "";
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".localhost")
  );
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const hostname = resolvePublicHostname(
    request.headers.get("host"),
    request.headers.get("x-forwarded-host"),
    request.headers.get("x-rappel-public-host"),
  );

  // Force HTTPS seulement derrière un vrai host public.
  // Sinon next start local / E2E CI (http://127.0.0.1:3000) boucle en 308
  // vers https://127.0.0.1/api/health/ (sans port) et ne démarre jamais.
  if (
    process.env.NODE_ENV === "production" &&
    request.headers.get("x-forwarded-proto") === "http" &&
    !isLoopbackHostname(hostname)
  ) {
    const httpsUrl = new URL(`https://${hostname}${path}`);
    httpsUrl.search = request.nextUrl.search;
    return NextResponse.redirect(httpsUrl, 308);
  }

  if (path.startsWith("/api/")) {
    return NextResponse.next();
  }

  const queryHost = parseDomainParam(request.nextUrl.searchParams.get(QUERY_HOST));
  const session = await getSession(request);
  const domain = resolveDomain(request, session);
  const headers = new Headers(request.headers);
  headers.set(HEADER_DOMAIN, domain);

  if (domain === "app") {
    // Après rewrite Next ré-invoque le middleware sur /domains/app/... ;
    // comparer le chemin logique sinon /domains/app/login/ n'est pas « public »
    // → redirect /login/ → rewrite → boucle ERR_TOO_MANY_REDIRECTS.
    const logicalPath = stripDomainPrefix(path, "app");
    const isPublic =
      isPublicPath(domain, logicalPath) ||
      logicalPath === "/book" ||
      logicalPath.startsWith("/book/");
    if (!isPublic) {
      if (!session) {
        return publicRedirect(
          request,
          "/login/",
          domain,
          hostname,
          308,
          logicalPath !== "/" && logicalPath !== ""
            ? { next: logicalPath }
            : undefined,
        );
      }
      if (session.scope === "platform") {
        return publicRedirect(request, "/login/", domain, hostname);
      }
      // Reset admin : accès limité à la page de changement de MDP
      if (
        session.scope === "app" &&
        "mustChangePassword" in session &&
        session.mustChangePassword &&
        !isChangePasswordPath(logicalPath)
      ) {
        return publicRedirect(request, `${CHANGE_PASSWORD_PATH}/`, domain, hostname);
      }
    } else if (
      session?.scope === "app" &&
      "mustChangePassword" in session &&
      session.mustChangePassword &&
      logicalPath.startsWith("/login")
    ) {
      return publicRedirect(request, `${CHANGE_PASSWORD_PATH}/`, domain, hostname);
    }
  }

  if (domain === "admin") {
    const logicalPath = stripDomainPrefix(path, "admin");
    const isPublic = isPublicPath(domain, logicalPath);
    if (!isPublic) {
      if (!session || session.scope !== "platform") {
        return publicRedirect(
          request,
          "/login/",
          domain,
          hostname,
          308,
          logicalPath !== "/" && logicalPath !== ""
            ? { next: logicalPath }
            : undefined,
        );
      }
    } else if (session?.scope === "platform" && logicalPath.startsWith("/login")) {
      return publicRedirect(request, "/dashboard/", domain, hostname);
    }

    // Déjà sous /domains/admin (ré-entrée middleware après rewrite) → next, pas rewrite
    if (path.startsWith("/domains/admin")) {
      const res = NextResponse.next({ request: { headers } });
      res.cookies.set(COOKIE_HOST, "admin", { path: "/", sameSite: "lax" });
      return res;
    }

    // Rewrite interne — /admin → Super Admin (pas la vitrine)
    const url = request.nextUrl.clone();
    url.pathname = adminInternalPath(path);
    const res = NextResponse.rewrite(url, { request: { headers } });
    res.cookies.set(COOKIE_HOST, "admin", { path: "/", sameSite: "lax" });
    return res;
  }

  if (domain === "www") {
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
    if (!queryHost) {
      res.cookies.set(COOKIE_HOST, "www", { path: "/", sameSite: "lax" });
    } else {
      res.cookies.set(COOKIE_HOST, queryHost, { path: "/", sameSite: "lax" });
    }
    return res;
  }

  // domain === app → rewrite vers /domains/app/…
  // Si on y est déjà (ré-entrée après rewrite), next() — sinon boucle infinie
  // et Playwright timeout (goto qui ne finit jamais / formulaire jamais monté).
  if (path.startsWith("/domains/app")) {
    const res = NextResponse.next({ request: { headers } });
    if (queryHost) {
      res.cookies.set(COOKIE_HOST, queryHost, { path: "/", sameSite: "lax" });
    }
    return res;
  }

  const url = request.nextUrl.clone();
  if (path === "/" || path === "") {
    url.pathname = "/domains/app/dashboard/";
  } else {
    const joined = `/domains/app${path}`;
    url.pathname = joined.endsWith("/") ? joined : `${joined}/`;
  }

  const res = NextResponse.rewrite(url, { request: { headers } });
  res.cookies.set(COOKIE_HOST, domain, { path: "/", sameSite: "lax" });
  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
    "/",
  ],
};
