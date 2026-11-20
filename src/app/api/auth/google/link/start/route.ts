import type { NextRequest } from "next/server";
import { tenantRoute } from "@/lib/http/route-scope";
import { clientIp } from "@/lib/http/client-ip";
import { requireAppSession } from "@/lib/auth/api-guard";
import { verifyPasswordAsync } from "@/lib/auth/crypto";
import { authBusy, isAuthBusy } from "@/lib/auth/auth-route-utils";
import { MAX_PASSWORD_LENGTH } from "@/lib/db/users";
import { consumeDimensions, RATE_POLICIES } from "@/lib/rate-limit";
import {
  buildGoogleAuthorizationUrl,
  generatePkceMaterial,
  googleAuthCredentials,
} from "@/lib/auth/google-oidc";
import {
  canonicalAuthHostMismatch,
  checkJsonSameOrigin,
  googleAuthUnavailable,
  googleRedirectUriFor,
  jsonNoStore,
  sanitizeRedirectAfter,
  setOAuthCookie,
} from "@/lib/auth/google-http";
import { createOAuthState } from "@/lib/db/auth-oauth-state";
import { getLinkContext } from "@/lib/db/auth-identities";
import { logger } from "@/lib/logger";
import { wrongHostResponse } from "@/lib/auth/auth-hosts";

/**
 * POST /api/auth/google/link/start/ (JSON {password, next?}) : session institut valide ET mot de passe actuel
 * re-saisi. Crée un état lié à l'utilisateur et renvoie {url} (navigation côté client) avec le cookie lié au
 * state. Un compte sans mot de passe est refusé : la liaison ne se fait jamais sans preuve du compte existant.
 */
export const POST = tenantRoute(async function POST(request: NextRequest) {
  const unavailable = googleAuthUnavailable();
  if (unavailable) return unavailable;
  const refused = checkJsonSameOrigin(request);
  if (refused) return refused;

  // Le cookie lié au state est propre à un hôte, et la session aussi : la liaison n'est possible que depuis
  // l'hôte de l'URI de retour. Ailleurs, le retour de Google n'y retrouverait ni ce cookie ni la session.
  const credentials = googleAuthCredentials();
  const redirectUri = googleRedirectUriFor(request);
  if (!credentials || !redirectUri) return jsonNoStore({ error: "Service indisponible." }, 503);
  const canonical = canonicalAuthHostMismatch(request, redirectUri);
  if (canonical) {
    // Message directement affichable ; `host` et `origin` permettent à l'interface de proposer le lien.
    return wrongHostResponse(canonical.origin, "La liaison de Google");
  }

  const auth = await requireAppSession(request);
  if (!auth.ok) return auth.response;
  const { session } = auth;

  const limited = await consumeDimensions([
    { key: `auth:google:link:user:${session.id}`, ...RATE_POLICIES.googleAuth.link.user, sensitivity: "sensitive" },
    { key: `auth:google:link:ip:${clientIp(request)}`, ...RATE_POLICIES.googleAuth.link.ip, sensitivity: "sensitive" },
  ]);
  if (!limited.allowed) {
    return jsonNoStore({ error: "Trop de tentatives. Réessayez plus tard." }, 429, {
      "Retry-After": String(limited.retryAfterSec ?? 900),
    });
  }

  let body: { password?: unknown; next?: unknown };
  try {
    body = (await request.json()) as { password?: unknown; next?: unknown };
  } catch {
    return jsonNoStore({ error: "Requête invalide." }, 400);
  }
  const password = typeof body?.password === "string" ? body.password : "";
  if (!password || password.length > MAX_PASSWORD_LENGTH) {
    return jsonNoStore({ error: "Mot de passe actuel requis." }, 400);
  }

  const context = await getLinkContext(session.id, session.organizationId);
  if (!context) return jsonNoStore({ error: "Session expirée." }, 401);
  if (!context.passwordHash) {
    return jsonNoStore(
      { error: "Ce compte n'a pas de mot de passe. Définissez-en un avant de lier Google.", code: "NO_PASSWORD" },
      400,
    );
  }
  let passwordOk: boolean;
  try {
    passwordOk = await verifyPasswordAsync(password, context.passwordHash);
  } catch (error) {
    if (isAuthBusy(error)) return authBusy();
    throw error;
  }
  if (!passwordOk) {
    return jsonNoStore({ error: "Mot de passe incorrect.", code: "INVALID_PASSWORD" }, 403);
  }
  if (context.linked) {
    return jsonNoStore({ error: "Un compte Google est déjà lié.", code: "ALREADY_LINKED" }, 409);
  }

  const material = generatePkceMaterial();
  try {
    await createOAuthState({
      material,
      intent: "link",
      userId: session.id,
      redirectAfter: sanitizeRedirectAfter(body.next),
    });
  } catch (error) {
    logger.error("google link start failed", { route: "/api/auth/google/link/start", error: error instanceof Error ? error.name : "unknown" });
    return jsonNoStore({ error: "Service indisponible." }, 503);
  }

  const res = jsonNoStore({
    url: buildGoogleAuthorizationUrl({
      clientId: credentials.clientId,
      redirectUri,
      state: material.state,
      nonce: material.nonce,
      codeChallenge: material.codeChallenge,
    }),
  });
  setOAuthCookie(res, material.state);
  return res;
});
