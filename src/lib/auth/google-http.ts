import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookieSecure, createSessionCookie } from "@/lib/auth/session";
import { SESSION_MAX_AGE_SEC, type AppSessionUser } from "@/lib/auth/types";
import { COOKIE_HOST, resolvePublicHostname } from "@/lib/domain";
import { sanitizeRedirectAfter } from "@/lib/auth/redirect-after";
import { constantTimeEqual, googleAuthRedirectUri, isGoogleAuthAvailable } from "@/lib/auth/google-oidc";

/** Aller-retour OAuth : lié au state, 10 minutes. */
export const OAUTH_COOKIE_MAX_AGE_SEC = 10 * 60;
/** Inscription Google en attente : 30 minutes. */
export const PENDING_COOKIE_MAX_AGE_SEC = 30 * 60;

/** `__Host-` exige Secure : en HTTP de développement (COOKIE_SECURE=false) le préfixe est omis, comme session.ts. */
export function oauthCookieName(): string {
  return cookieSecure() ? "__Host-rb_oauth" : "rb_oauth";
}
export function pendingCookieName(): string {
  return cookieSecure() ? "__Host-rb_pending" : "rb_pending";
}

function cookieOptions(maxAge: number) {
  return { httpOnly: true, sameSite: "lax" as const, secure: cookieSecure(), path: "/", maxAge };
}

export function setOAuthCookie(res: NextResponse, state: string): void {
  res.cookies.set(oauthCookieName(), state, cookieOptions(OAUTH_COOKIE_MAX_AGE_SEC));
}
export function clearOAuthCookie(res: NextResponse): void {
  res.cookies.set(oauthCookieName(), "", cookieOptions(0));
}
export function setPendingCookie(res: NextResponse, token: string): void {
  res.cookies.set(pendingCookieName(), token, cookieOptions(PENDING_COOKIE_MAX_AGE_SEC));
}
export function clearPendingCookie(res: NextResponse): void {
  res.cookies.set(pendingCookieName(), "", cookieOptions(0));
}

/** Le cookie doit porter exactement le state renvoyé par Google (anti « login CSRF »). */
export function oauthCookieMatches(request: NextRequest, state: string): boolean {
  const cookie = request.cookies.get(oauthCookieName())?.value;
  return Boolean(cookie) && constantTimeEqual(cookie as string, state);
}

export { sanitizeRedirectAfter };

/** Destination par défaut après une connexion institut (même chemin que le formulaire de connexion). */
export const DEFAULT_APP_LANDING = "/dashboard/?__host=app&auth=1";
export const CHANGE_PASSWORD_LANDING = "/changer-mot-de-passe/?__host=app&auth=1";

// ---------------------------------------------------------------------------
// Requêtes
// ---------------------------------------------------------------------------

/** Origine publique de l'application : celle de l'URI de retour Google, sinon celle de la requête. */
export function appOrigin(request: NextRequest): string {
  const redirectUri = googleAuthRedirectUri(request.nextUrl.origin);
  try {
    if (redirectUri) return new URL(redirectUri).origin;
  } catch {
    /* repli ci-dessous */
  }
  return request.nextUrl.origin;
}

/** Valeur d'en-tête sans liste ni espaces ; les hôtes gardent leur port. */
const firstHeaderValue = (value: string | null) => (value ?? "").split(",")[0].trim().toLowerCase();

/**
 * POST sensible : JSON uniquement et même origine. Sec-Fetch-Site doit valoir same-origin quand il est
 * présent ; Origin, quand il est présent, doit être EXACTEMENT l'origine de la requête (schéma, hôte et port).
 * Sans aucun des deux en-têtes, la requête est refusée.
 */
export function checkJsonSameOrigin(request: NextRequest, options: { allowMultipart?: boolean } = {}): NextResponse | null {
  const contentType = request.headers.get("content-type") ?? "";
  // multipart/form-data n'est admis que pour les routes qui reçoivent un logo ; les contrôles d'origine ci-dessous
  // restent identiques (un formulaire inter-sites est refusé par Origin / Sec-Fetch-Site).
  const typeOk =
    /^application\/json\b/i.test(contentType) || (options.allowMultipart === true && /^multipart\/form-data\b/i.test(contentType));
  if (!typeOk) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 415 });
  }
  const fetchSite = request.headers.get("sec-fetch-site");
  const origin = request.headers.get("origin");
  if (fetchSite && fetchSite !== "same-origin") return forbidden();
  if (origin) {
    let originValue: string;
    try {
      originValue = new URL(origin).origin.toLowerCase();
    } catch {
      return forbidden();
    }
    // Derrière le proxy, le schéma public est celui de x-forwarded-proto ; sans lui, celui de la requête.
    const forwardedProto = firstHeaderValue(request.headers.get("x-forwarded-proto"));
    const protocols = new Set<string>([
      forwardedProto === "http" || forwardedProto === "https" ? forwardedProto : request.nextUrl.protocol.replace(/:$/, ""),
    ]);
    const hosts = new Set<string>(
      [
        firstHeaderValue(request.headers.get("x-rappel-public-host")),
        firstHeaderValue(request.headers.get("x-forwarded-host")),
        firstHeaderValue(request.headers.get("host")),
        request.nextUrl.host.toLowerCase(),
      ].filter(Boolean),
    );
    const allowed = new Set<string>([request.nextUrl.origin.toLowerCase()]);
    for (const protocol of protocols) for (const host of hosts) allowed.add(`${protocol}://${host}`);
    if (!allowed.has(originValue)) return forbidden();
  } else if (!fetchSite) {
    return forbidden();
  }
  return null;
}

/**
 * Le cookie lié au state (et le cookie pending) est propre à un hôte : le départ d'une connexion ou d'une
 * liaison doit avoir lieu sur l'hôte de l'URI de retour. Renvoie cet hôte canonique s'il diffère de l'hôte
 * courant, sinon null.
 */
export function canonicalAuthHostMismatch(request: NextRequest, redirectUri: string): URL | null {
  const target = new URL(redirectUri);
  const currentHost =
    resolvePublicHostname(
      request.headers.get("host"),
      request.headers.get("x-forwarded-host"),
      request.headers.get("x-rappel-public-host"),
    ) || request.nextUrl.hostname.toLowerCase();
  return target.hostname.toLowerCase() === currentHost ? null : target;
}

function forbidden() {
  return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
}

/** Réponse identique pour « désactivé », « non configuré » ou inconnu : aucun indice d'état. */
export function googleAuthUnavailable(): NextResponse | null {
  if (isGoogleAuthAvailable()) return null;
  return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
}

export const NO_STORE = { "Cache-Control": "no-store", Pragma: "no-cache" } as const;

export function jsonNoStore(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { ...NO_STORE, ...headers } });
}

/** Codes renvoyés au formulaire de connexion (`?google_error=`) ; le texte affiché est choisi côté interface. */
export type GoogleLoginError = "cancelled" | "no_account" | "failed" | "unavailable";

export function loginErrorRedirect(request: NextRequest, code: GoogleLoginError): NextResponse {
  const url = new URL("/connexion/", appOrigin(request));
  url.searchParams.set("google_error", code);
  const res = NextResponse.redirect(url, 303);
  res.headers.set("Cache-Control", "no-store");
  clearOAuthCookie(res);
  return res;
}

/** Pose le cookie de session EXISTANT et le cookie d'hôte, comme /api/auth/login. */
export function applyAppSession(res: NextResponse, session: AppSessionUser): void {
  // Comme /api/auth/login : le cache du navigateur ne doit pas resservir une page d'avant la connexion.
  res.headers.set("Clear-Site-Data", '"cache"');
  res.cookies.set(createSessionCookie(session, SESSION_MAX_AGE_SEC));
  res.cookies.set(COOKIE_HOST, "app", { path: "/", sameSite: "lax", maxAge: SESSION_MAX_AGE_SEC });
}

/** Codes renvoyés à la carte de sécurité (`?google_link=`) après une liaison. */
export type GoogleLinkOutcome = "linked" | "already_linked" | "in_use" | "cancelled" | "failed";

/** Retour d'une liaison : l'utilisateur est connecté, il revient sur sa page de sécurité avec le résultat. */
export function linkResultRedirect(request: NextRequest, code: GoogleLinkOutcome, redirectAfter?: string | null): NextResponse {
  const url = new URL(sanitizeRedirectAfter(redirectAfter) ?? "/security/", "http://rb.invalid");
  url.searchParams.set("__host", "app");
  url.searchParams.set("google_link", code);
  const res = NextResponse.redirect(new URL(`${url.pathname}${url.search}`, appOrigin(request)), 303);
  res.headers.set("Cache-Control", "no-store");
  clearOAuthCookie(res);
  return res;
}

export function publicSessionUser(session: AppSessionUser) {
  return {
    id: session.id,
    email: session.email,
    firstName: session.firstName,
    lastName: session.lastName,
    role: session.role,
    orgName: session.orgName,
    orgSlug: session.orgSlug,
    accountType: session.accountType,
    scope: session.scope,
    mustChangePassword: session.mustChangePassword,
  };
}
