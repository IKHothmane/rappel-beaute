import type { NextRequest } from "next/server";
import { tenantRoute } from "@/lib/http/route-scope";
import { requireAppSession } from "@/lib/auth/api-guard";
import { consumeDimensions, RATE_POLICIES } from "@/lib/rate-limit";
import { checkJsonSameOrigin, googleAuthUnavailable, jsonNoStore } from "@/lib/auth/google-http";
import { getLinkContext, unlinkGoogleIdentity } from "@/lib/db/auth-identities";
import { verifyPasswordAsync } from "@/lib/auth/crypto";
import { MAX_PASSWORD_LENGTH } from "@/lib/db/users";
import { REAUTH_MAX_AGE_SEC, isRecentlyAuthenticated } from "@/lib/auth/reauth";
import { authBusy, badRequest, isAuthBusy, readJsonObject } from "@/lib/auth/auth-route-utils";

/**
 * POST /api/auth/google/unlink/ (JSON {password?}) : délie Google du compte connecté. Réauthentification
 * exigée : mot de passe actuel si le compte en a un, sinon connexion de moins de 10 minutes (REAUTH_REQUIRED).
 * Refusé si le compte n'a ni mot de passe ni e-mail vérifié (il n'aurait plus aucun moyen de se reconnecter).
 */
export const POST = tenantRoute(async function POST(request: NextRequest) {
  const unavailable = googleAuthUnavailable();
  if (unavailable) return unavailable;
  const refused = checkJsonSameOrigin(request);
  if (refused) return refused;

  const auth = await requireAppSession(request);
  if (!auth.ok) return auth.response;
  const { session } = auth;

  const limited = await consumeDimensions([
    { key: `auth:google:unlink:user:${session.id}`, ...RATE_POLICIES.googleAuth.unlink.user, sensitivity: "sensitive" },
  ]);
  if (!limited.allowed) {
    return jsonNoStore({ error: "Trop de tentatives. Réessayez plus tard." }, 429, {
      "Retry-After": String(limited.retryAfterSec ?? 900),
    });
  }

  // Réauthentification : mot de passe actuel dans le corps JSON si le compte en a un, sinon connexion récente.
  const body = await readJsonObject(request);
  if (!body) return badRequest();
  if (body.password !== undefined && typeof body.password !== "string") return badRequest();
  const password = typeof body.password === "string" ? body.password : "";
  if (password.length > MAX_PASSWORD_LENGTH) return badRequest("Mot de passe trop long.");

  try {
    const context = await getLinkContext(session.id, session.organizationId);
    if (!context) return jsonNoStore({ error: "Session expirée." }, 401);
    if (context.passwordHash) {
      if (!password) {
        return jsonNoStore({ error: "Saisissez votre mot de passe actuel.", code: "CURRENT_PASSWORD_REQUIRED" }, 400);
      }
      if (!(await verifyPasswordAsync(password, context.passwordHash))) {
        return jsonNoStore({ error: "Mot de passe incorrect.", code: "INVALID_PASSWORD" }, 403);
      }
    } else if (!isRecentlyAuthenticated(session.authAt)) {
      return jsonNoStore(
        { error: "Pour votre sécurité, reconnectez-vous puis réessayez.", code: "REAUTH_REQUIRED", maxAgeSec: REAUTH_MAX_AGE_SEC },
        401,
      );
    }
  } catch (error) {
    if (isAuthBusy(error)) return authBusy();
    throw error;
  }

  const result = await unlinkGoogleIdentity({ userId: session.id, organizationId: session.organizationId });
  switch (result) {
    case "unlinked":
      return jsonNoStore({ ok: true });
    case "not_linked":
      return jsonNoStore({ error: "Aucun compte Google lié.", code: "NOT_LINKED" }, 404);
    case "last_login_method":
      return jsonNoStore(
        { error: "Ajoutez un mot de passe ou vérifiez votre e-mail avant de délier Google.", code: "LAST_LOGIN_METHOD" },
        409,
      );
    default:
      return jsonNoStore({ error: "Session expirée." }, 401);
  }
});
