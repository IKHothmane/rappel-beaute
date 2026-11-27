import { parseSessionTokenEdge } from "@/lib/auth/session-edge";
import { SESSION_COOKIE, SESSION_MAX_AGE_SEC } from "@/lib/auth/types";
import {
  COOKIE_HOST,
  HEADER_DOMAIN,
  QUERY_HOST,
  parseDomainParam,
  resolveDomainFromHostname,
  resolvePublicHostname,
  type RappelDomain,
} from "@/lib/domain";
import { originAccessAllowed } from "@/lib/http/origin-guard";
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
    "/creation-site-web",
    "/tarifs",
    "/instituts",
    "/a-propos",
    "/professionnel",
    "/assistant",
    "/connexion",
    "/contact",
    "/gestion-rendez-vous",
    "/gestion-clientes",
    "/gestion-stock",
    "/caisse",
    "/reservation-en-ligne",
    "/fidelite",
    "/carte",
    "/demo",
    "/essai", // Ancienne page : redirection vers /professionnel/.
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
  const path = request.nextUrl.pathname;

  // Vitrine /connexion etc. restent www même avec un ?__host=app résiduel
  // (évite de traiter /connexion comme route protégée de l’espace app).
  if (isMarketingPath(path) && path !== "/book" && !path.startsWith("/book/")) {
    const fromHost = resolveDomainFromHostname(
      request.headers.get("host"),
      request.headers.get("x-forwarded-host") ??
        request.headers.get("x-rappel-public-host"),
    );
    if (fromHost === "app" || fromHost === "admin") return fromHost;
    return "www";
  }

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

  if (path === "/book" || path.startsWith("/book/")) return "app";

  // 4) Espace institut sur le domaine public. Le cookie admin ne doit pas
  //    envoyer le SaaS vers /login/?__host=admin. L'admin reste explicite
  //    (?__host=admin ou sous-domaine admin.*).
  if (!isMarketingPath(path)) {
    if (session?.scope === "platform") return "admin";
    if (session?.scope === "app") return "app";
    return "app";
  }

  return fromHost;
}

const APP_PUBLIC_PATHS = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/activate",
  // Lien de vérification d'e-mail (inscription ou changement d'adresse) : ouvert sans session, y compris depuis
  // un autre appareil. Les API /api/auth/** ne passent pas par cette liste (voir le traitement de /api/ ci-dessus).
  "/verify-email",
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
  /** 307 : jamais 308 pour l’auth — les navigateurs mettent les 308 en cache et bouclent. */
  status: 307 | 308 = 307,
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
  const res = withFrameDeny(NextResponse.redirect(url, status));
  // Empêche le navigateur de rejouer d’anciens 308 (ERR_TOO_MANY_REDIRECTS).
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.headers.set("Pragma", "no-cache");
  return res;
}

/**
 * Politique de sécurité du contenu, posée ici seulement (next.config.mjs n'en définit plus : l'en-tête du
 * middleware l'écrasait). Elle couvre les pages et les API, en développement comme en production. Les fichiers
 * statiques (hors matcher) n'en reçoivent pas.
 *
 * Sans nonce (avis GHSA-ffhc-5mcf-pf4q sur Next 14), deux mots-clés restent nécessaires :
 * - 'unsafe-inline' : scripts en ligne du rendu RSC de Next, attributs onload ajoutés par Critters
 *   (scripts/inline-critical-css.mjs), balises HTML personnalisées de GTM ;
 * - 'unsafe-eval' : WebAssembly du lecteur de QR (barcode-detector/zxing-wasm), variables JavaScript
 *   personnalisées de GTM, rechargement à chaud en développement.
 * connect-src et img-src gardent https: : le fichier WebAssembly du lecteur de QR vient de fastly.jsdelivr.net,
 * l'hôte d'envoi Sentry dépend du DSN, les logos et photos peuvent venir d'un stockage externe.
 */
const CSP_DIRECTIVES: ReadonlyArray<readonly [string, string]> = [
  ["default-src", "'self'"],
  [
    "script-src",
    "'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com https://www.googletagmanager.com https://www.google-analytics.com",
  ],
  ["style-src", "'self' 'unsafe-inline'"],
  ["img-src", "'self' data: blob: https:"],
  ["font-src", "'self' data:"],
  ["connect-src", "'self' https:"],
  ["frame-src", "'self' https://www.googletagmanager.com"],
  ["object-src", "'none'"],
  ["base-uri", "'self'"],
  ["form-action", "'self'"],
];

function buildCsp(frameAncestors: string | null): string {
  const directives = frameAncestors
    ? [...CSP_DIRECTIVES, ["frame-ancestors", frameAncestors] as const]
    : CSP_DIRECTIVES;
  return directives.map(([name, value]) => `${name} ${value}`).join("; ");
}

/** Pages et API : aucun site ne peut les afficher dans un cadre. */
const CONTENT_SECURITY_POLICY = buildCsp("'none'");

/**
 * Cadre de l'assistant public : même politique, sans frame-ancestors. La route ajoute son propre en-tête
 * `frame-ancestors <domaines du widget>` ; le navigateur applique les deux politiques ensemble.
 */
const ASSISTANT_FRAME_CSP = buildCsp(null);

const ASSISTANT_FRAME_PATH = "/api/public/assistant/frame";

function withFrameDeny(response: NextResponse) {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);
  return response;
}

function matchesPathPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Routes API exclues du refus des écritures inter-sites (Sec-Fetch-Site: cross-site) :
 * - /api/public/assistant : widget intégré sur les sites des instituts (assistant.js) ; CORS par domaine
 *   déclaré, authentification par jeton Bearer, jamais par cookie ;
 * - /api/whatsapp/webhook : webhook Meta (signature HMAC) ;
 * - /api/monitoring/telegram : webhook Telegram (secret d'en-tête) ;
 * - /api/cron : tâches planifiées (secret) ;
 * - /api/apple-wallet : service web Apple Wallet (servi avant tout contrôle, voir le début du middleware).
 * Un appelant serveur n'envoie pas Sec-Fetch-Site : ces exclusions documentent les appels externes attendus.
 * Les retours OAuth (/api/auth/google/callback, /api/integrations/google-calendar/callback) sont des GET.
 */
const CROSS_SITE_API_PREFIXES = [
  "/api/public/assistant",
  "/api/whatsapp/webhook",
  "/api/monitoring/telegram",
  "/api/cron",
  "/api/apple-wallet",
] as const;

/**
 * Protection CSRF commune aux API : une écriture (hors GET/HEAD/OPTIONS) envoyée par un navigateur depuis un
 * autre site est refusée. same-origin, same-site (www/app/admin), none et l'absence d'en-tête (clients hors
 * navigateur) passent ; les routes sensibles gardent leur contrôle checkJsonSameOrigin.
 */
function refuseCrossSiteApiWrite(request: NextRequest, path: string): NextResponse | null {
  if (!path.startsWith("/api/")) return null;
  if (SAFE_METHODS.has(request.method.toUpperCase())) return null;
  const fetchSite = request.headers.get("sec-fetch-site")?.trim().toLowerCase();
  if (fetchSite !== "cross-site") return null;
  if (CROSS_SITE_API_PREFIXES.some((prefix) => matchesPathPrefix(path, prefix))) return null;
  const res = NextResponse.json({ error: "Requête refusée : origine externe." }, { status: 403 });
  res.headers.set("Cache-Control", "no-store");
  return withFrameDeny(res);
}

/** Secure seulement en HTTPS (proxy ou URL) : en HTTP local, le navigateur refuserait le cookie. */
function isHttpsRequest(request: NextRequest): boolean {
  const forwardedProto = (request.headers.get("x-forwarded-proto") ?? "")
    .split(",")[0]
    .trim()
    .toLowerCase();
  return forwardedProto === "https" || request.nextUrl.protocol === "https:";
}

function setHostCookie(
  res: NextResponse,
  request: NextRequest,
  value: Domain,
  persistent: boolean,
) {
  res.cookies.set(COOKIE_HOST, value, {
    path: "/",
    sameSite: "lax",
    secure: isHttpsRequest(request),
    ...(persistent ? { maxAge: SESSION_MAX_AGE_SEC } : {}),
  });
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
  if (path.startsWith("/api/apple-wallet/")) return NextResponse.next();

  if (
    !originAccessAllowed(
      request.headers.get("x-rappel-origin"),
      process.env.ORIGIN_SECRET,
      request.headers.get("host"),
    )
  ) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const crossSiteRefusal = refuseCrossSiteApiWrite(request, path);
  if (crossSiteRefusal) return crossSiteRefusal;

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
    return withFrameDeny(NextResponse.redirect(httpsUrl, 308));
  }

  if (path === "/api/integrations/google-calendar/callback") {
    const url = request.nextUrl.clone();
    url.pathname = "/api/integrations/google-calendar/callback/";
    return withFrameDeny(NextResponse.rewrite(url));
  }

  // Connexion Google : l'URI enregistrée porte le slash final ; sans lui, trailingSlash répondrait par un 308.
  if (path === "/api/auth/google/callback") {
    const url = request.nextUrl.clone();
    url.pathname = "/api/auth/google/callback/";
    return withFrameDeny(NextResponse.rewrite(url));
  }

  if (path.startsWith("/api/")) {
    if (matchesPathPrefix(path, ASSISTANT_FRAME_PATH)) {
      // Pas de X-Frame-Options : la page s'affiche dans un cadre sur les domaines déclarés du widget.
      const res = NextResponse.next();
      res.headers.set("Content-Security-Policy", ASSISTANT_FRAME_CSP);
      return res;
    }
    return withFrameDeny(NextResponse.next());
  }

  if (path === "/assistant" || path.startsWith("/assistant/")) {
    return withFrameDeny(NextResponse.next());
  }

  const queryHost = parseDomainParam(request.nextUrl.searchParams.get(QUERY_HOST));
  const session = await getSession(request);

  const isLoginPath =
    path === "/connexion" ||
    path === "/connexion/" ||
    path === "/login" ||
    path === "/login/";
  if (isLoginPath && session?.scope === "app") {
    const mustChange =
      "mustChangePassword" in session && Boolean(session.mustChangePassword);
    // `auth=1` : URL différente des 308 mis en cache (ERR_TOO_MANY_REDIRECTS).
    return publicRedirect(
      request,
      mustChange ? `${CHANGE_PASSWORD_PATH}/` : "/dashboard/",
      "app",
      hostname,
      307,
      mustChange ? undefined : { auth: "1" },
    );
  }
  if (isLoginPath && session?.scope === "platform") {
    return publicRedirect(request, "/dashboard/", "admin", hostname, 307, {
      auth: "1",
    });
  }

  const domain = resolveDomain(request, session);
  const headers = new Headers(request.headers);
  headers.set(HEADER_DOMAIN, domain);

  if (domain === "app") {
    // Après rewrite Next ré-invoque le middleware sur /domains/app/... ;
    // comparer le chemin logique sinon /domains/app/login/ n'est pas « public »
    // → redirect /login/ → rewrite → boucle ERR_TOO_MANY_REDIRECTS.
    const logicalPath = stripDomainPrefix(path, "app");
    if (
      (logicalPath === "/login" || logicalPath === "/login/") &&
      !isAppOrAdminHostname(hostname)
    ) {
      return publicRedirect(request, "/connexion/", "www", hostname);
    }
    const isPublic =
      isPublicPath(domain, logicalPath) ||
      logicalPath === "/book" ||
      logicalPath.startsWith("/book/");
    if (!isPublic) {
      if (!session) {
        const loginPath = isAppOrAdminHostname(hostname) ? "/login/" : "/connexion/";
        return publicRedirect(
          request,
          loginPath,
          loginPath === "/connexion/" ? "www" : domain,
          hostname,
          307,
          logicalPath !== "/" && logicalPath !== ""
            ? { next: logicalPath }
            : undefined,
        );
      }
      if (session.scope === "platform") {
        const loginPath = isAppOrAdminHostname(hostname) ? "/login/" : "/connexion/";
        return publicRedirect(request, loginPath, loginPath === "/connexion/" ? "www" : domain, hostname, 307);
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
          307,
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
      const res = withFrameDeny(NextResponse.next({ request: { headers } }));
      setHostCookie(res, request, "admin", true);
      return res;
    }

    // Rewrite interne — /admin → Super Admin (pas la vitrine)
    const url = request.nextUrl.clone();
    url.pathname = adminInternalPath(path);
    const res = withFrameDeny(NextResponse.rewrite(url, { request: { headers } }));
    setHostCookie(res, request, "admin", true);
    return res;
  }

  if (domain === "www") {
    if (path === "/login" || path === "/login/" || path === "/essai" || path === "/essai/") {
      const local = request.nextUrl.clone();
      const retired = path.startsWith("/essai");
      local.pathname = retired ? "/professionnel/" : "/connexion/";
      local.search = "";
      // /essai/ est une page retirée : redirection permanente pour les moteurs.
      return withFrameDeny(NextResponse.redirect(local, retired ? 308 : 307));
    }

    const res = withFrameDeny(NextResponse.next({ request: { headers } }));
    setHostCookie(res, request, queryHost ?? "www", false);
    return res;
  }

  // domain === app → rewrite vers /domains/app/…
  // Si on y est déjà (ré-entrée après rewrite), next() — sinon boucle infinie
  // et Playwright timeout (goto qui ne finit jamais / formulaire jamais monté).
  if (path.startsWith("/domains/app")) {
    const res = withFrameDeny(NextResponse.next({ request: { headers } }));
    if (queryHost) setHostCookie(res, request, queryHost, true);
    return res;
  }

  const url = request.nextUrl.clone();
  if (path === "/" || path === "") {
    url.pathname = "/domains/app/dashboard/";
  } else {
    const joined = `/domains/app${path}`;
    url.pathname = joined.endsWith("/") ? joined : `${joined}/`;
  }

  const res = withFrameDeny(NextResponse.rewrite(url, { request: { headers } }));
  setHostCookie(res, request, domain, true);
  return res;
}

export const config = {
  matcher: [
    "/api/health",
    "/api/health/",
    "/api/:path*",
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
    "/",
  ],
};
