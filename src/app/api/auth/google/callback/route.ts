import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { publicRoute } from "@/lib/http/route-scope";
import { clientIp } from "@/lib/http/client-ip";
import { logger } from "@/lib/logger";
import { consumeDimensions, identityHash, RATE_POLICIES } from "@/lib/rate-limit";
import { getSessionFromRequest } from "@/lib/auth/session";
import { isAppSession } from "@/lib/auth/types";
import {
  exchangeGoogleCode,
  GoogleOidcError,
  googleAuthCredentials,
  googleAuthRedirectUri,
  verifyGoogleIdToken,
  type GoogleIdentityClaims,
} from "@/lib/auth/google-oidc";
import {
  CHANGE_PASSWORD_LANDING,
  DEFAULT_APP_LANDING,
  appOrigin,
  applyAppSession,
  clearOAuthCookie,
  googleAuthUnavailable,
  linkResultRedirect,
  loginErrorRedirect,
  oauthCookieMatches,
  setPendingCookie,
} from "@/lib/auth/google-http";
import { consumeOAuthState, peekOAuthState, type ConsumedOAuthState, type OAuthIntent } from "@/lib/db/auth-oauth-state";
import {
  createGooglePendingSignup,
  emailBelongsToAnyAccount,
  findGoogleIdentity,
  linkGoogleIdentity,
  loginWithGoogleIdentity,
} from "@/lib/db/auth-identities";

const ROUTE = "/api/auth/google/callback";

function redirectTo(request: NextRequest, path: string): NextResponse {
  const res = NextResponse.redirect(new URL(path, appOrigin(request)), 303);
  res.headers.set("Cache-Control", "no-store");
  clearOAuthCookie(res);
  return res;
}

function landingWithHost(path: string): string {
  const url = new URL(path, "http://rb.invalid");
  url.searchParams.set("__host", "app");
  url.searchParams.set("auth", "1");
  return `${url.pathname}${url.search}`;
}

async function handleLogin(request: NextRequest, claims: GoogleIdentityClaims, state: ConsumedOAuthState) {
  // Identité connue : connexion, quelle que soit l'intention affichée. Compte ou institut inactif : même refus.
  const known = await loginWithGoogleIdentity(claims.sub);
  if (known) {
    const target = known.mustChangePassword
      ? CHANGE_PASSWORD_LANDING
      : state.redirectAfter
        ? landingWithHost(state.redirectAfter)
        : DEFAULT_APP_LANDING;
    const res = redirectTo(request, target);
    applyAppSession(res, known);
    return res;
  }

  // Identité existante mais compte ou institut inactif : refus générique, jamais d'inscription.
  if (await findGoogleIdentity(claims.sub)) return loginErrorRedirect(request, "failed");

  // Identité inconnue. Aucune fusion ni indication d'existence : même réponse que l'e-mail soit connu ou non.
  if (state.intent !== "signup") return loginErrorRedirect(request, "no_account");
  if (await emailBelongsToAnyAccount(claims.email)) return loginErrorRedirect(request, "no_account");

  const token = await createGooglePendingSignup(claims);
  const res = redirectTo(request, "/professionnel/?google=1");
  setPendingCookie(res, token);
  return res;
}

async function handleLink(request: NextRequest, claims: GoogleIdentityClaims, state: ConsumedOAuthState) {
  const session = getSessionFromRequest(request);
  // La session courante doit être celle qui a demandé la liaison (l'état est lié à ce compte). Le cookie de
  // session est propre à un hôte : sans lui ici (session ouverte sur un autre hôte), la liaison échoue.
  if (!session || !isAppSession(session) || !state.userId || session.id !== state.userId) {
    return linkResultRedirect(request, "failed", state.redirectAfter);
  }
  const result = await linkGoogleIdentity({
    userId: session.id,
    organizationId: session.organizationId,
    sessionVersion: session.sessionVersion ?? 0,
    claims,
  });
  return linkResultRedirect(request, result === "inactive" ? "failed" : result, state.redirectAfter);
}

/** Intention connue (état lu sans consommation, ou consommé) : une liaison revient sur la page de sécurité. */
type Hint = { intent: OAuthIntent; redirectAfter: string | null } | null;

function fail(request: NextRequest, hint: Hint, code: "cancelled" | "failed" | "unavailable"): NextResponse {
  if (hint?.intent === "link") {
    return linkResultRedirect(request, code === "cancelled" ? "cancelled" : "failed", hint.redirectAfter);
  }
  return loginErrorRedirect(request, code);
}

export const GET = publicRoute(async function GET(request: NextRequest) {
  const unavailable = googleAuthUnavailable();
  if (unavailable) return unavailable;

  const ip = clientIp(request);
  const limited = await consumeDimensions([
    { key: `auth:google:callback:ip:${ip}`, ...RATE_POLICIES.googleAuth.callback.ip, sensitivity: "sensitive" },
  ]);
  if (!limited.allowed) return loginErrorRedirect(request, "failed");

  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const stateParam = params.get("state");
  const stateShapeOk = Boolean(stateParam) && (stateParam as string).length <= 256;
  // Le cookie posé au départ doit porter ce state : une URL de retour fournie par un tiers est refusée.
  const cookieOk = stateShapeOk && oauthCookieMatches(request, stateParam as string);

  // Lecture seule : sert uniquement à choisir la page de retour d'un échec de liaison. Rejeu, expiré et inconnu
  // donnent le même résultat (null) et le même message qu'un échec de connexion.
  let hint: Hint = null;
  if (cookieOk) {
    hint = await peekOAuthState(stateParam as string).catch(() => null);
  }

  const googleError = params.get("error");
  if (googleError) return fail(request, hint, googleError === "access_denied" ? "cancelled" : "failed");

  if (!code || !stateParam || code.length > 2048 || !stateShapeOk) return fail(request, hint, "failed");
  if (!cookieOk) return loginErrorRedirect(request, "failed");

  try {
    // Usage unique : un rejeu, un état expiré ou inconnu donne null.
    const state = await consumeOAuthState(stateParam);
    if (!state) return fail(request, hint, "failed");
    hint = { intent: state.intent, redirectAfter: state.redirectAfter };

    const credentials = googleAuthCredentials();
    const redirectUri = googleAuthRedirectUri(request.nextUrl.origin);
    if (!credentials || !redirectUri) return fail(request, hint, "unavailable");

    let claims: GoogleIdentityClaims;
    try {
      const idToken = await exchangeGoogleCode({ code, codeVerifier: state.codeVerifier, redirectUri });
      claims = await verifyGoogleIdToken(idToken, { clientId: credentials.clientId, expectedNonceHash: state.nonceHash });
    } catch (error) {
      logger.warn("google callback: exchange or id_token rejected", {
        route: ROUTE,
        code: error instanceof GoogleOidcError ? error.code : "unknown",
      });
      return fail(request, hint, "failed");
    }

    const subjectLimit = await consumeDimensions([
      {
        key: `auth:google:subject:${identityHash(`google:${claims.sub}`)}`,
        ...RATE_POLICIES.googleAuth.callback.subject,
        sensitivity: "sensitive",
      },
    ]);
    if (!subjectLimit.allowed) return fail(request, hint, "failed");

    return state.intent === "link" ? await handleLink(request, claims, state) : await handleLogin(request, claims, state);
  } catch (error) {
    logger.error("google callback failed", { route: ROUTE, error: error instanceof Error ? error.name : "unknown" });
    return fail(request, hint, "failed");
  }
});
