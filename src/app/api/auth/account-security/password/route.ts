import type { NextRequest } from "next/server";
import { tenantRoute } from "@/lib/http/route-scope";
import { clientIp } from "@/lib/http/client-ip";
import { requireAppSession } from "@/lib/auth/api-guard";
import { createSessionCookie } from "@/lib/auth/session";
import { checkJsonSameOrigin, jsonNoStore, publicSessionUser } from "@/lib/auth/google-http";
import { checkPasswordPolicy, PASSWORD_POLICY_MESSAGES } from "@/lib/auth/password-policy";
import { REAUTH_MAX_AGE_SEC, isRecentlyAuthenticated } from "@/lib/auth/reauth";
import { badRequest, readJsonObject, stringField, tooManyRequests } from "@/lib/auth/auth-route-utils";
import { getLinkContext } from "@/lib/db/auth-identities";
import { setInitialPassword } from "@/lib/db/account-security";
import { changeOwnPassword } from "@/lib/db/users";
import { consumeDimensions, identityHash, RATE_POLICIES } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import type { AppSessionUser } from "@/lib/auth/types";

function sessionReply(session: AppSessionUser, previous: { jti?: string; authAt?: number }) {
  const res = jsonNoStore({ ok: true, user: publicSessionUser(session) });
  // La session garde son identifiant et son échéance absolue ; seule sessionVersion change : les AUTRES sessions
  // (sessionVersion + 1) sont révoquées, celle-ci est ré-émise (comme change-password).
  res.cookies.set(createSessionCookie({ ...session, ...(previous.jti ? { jti: previous.jti } : {}), ...(previous.authAt ? { authAt: previous.authAt } : {}) }));
  return res;
}

/**
 * POST /api/auth/account-security/password/ (JSON {newPassword, currentPassword?}) : définit ou change le mot de passe.
 *  - Compte AVEC mot de passe : le mot de passe actuel est exigé (changeOwnPassword).
 *  - Compte SANS mot de passe (utilisateur Google) : exige une adresse e-mail VÉRIFIÉE (sinon 403 EMAIL_NOT_VERIFIED :
 *    passer par la vérification de l'adresse puis, au besoin, par « mot de passe oublié ») ET une authentification
 *    récente de moins de 10 minutes (sinon 401 REAUTH_REQUIRED).
 * Politique : 10 à 200 caractères, hors mots de passe courants, différent de l'adresse e-mail. Les autres sessions
 * du compte sont révoquées, la session courante est ré-émise.
 */
export const POST = tenantRoute(async function POST(request: NextRequest) {
  const refused = checkJsonSameOrigin(request);
  if (refused) return refused;
  const auth = await requireAppSession(request);
  if (!auth.ok) return auth.response;
  const { session } = auth;

  const body = await readJsonObject(request);
  if (!body) return badRequest();
  const newPassword = stringField(body, "newPassword");
  const currentPassword = stringField(body, "currentPassword");
  const policy = checkPasswordPolicy(newPassword, { email: session.email });
  if (policy) return badRequest(PASSWORD_POLICY_MESSAGES[policy], policy);
  if (currentPassword.length > 200) return badRequest("Mot de passe trop long.");

  const limited = await consumeDimensions([
    { key: `auth:acct-password:user:${identityHash(session.id)}`, ...RATE_POLICIES.accountSecurity.passwordUser, sensitivity: "sensitive" },
    { key: `auth:acct-password:ip:${clientIp(request)}`, ...RATE_POLICIES.accountSecurity.passwordIp, sensitivity: "sensitive" },
  ]);
  if (!limited.allowed) return tooManyRequests(limited.retryAfterSec);

  try {
    const context = await getLinkContext(session.id, session.organizationId);
    if (!context) return jsonNoStore({ error: "Session expirée." }, 401);

    if (context.passwordHash) {
      const updated = await changeOwnPassword({
        userId: session.id,
        organizationId: session.organizationId,
        newPassword,
        currentPassword,
      });
      return sessionReply(updated, session);
    }

    if (!isRecentlyAuthenticated(session.authAt)) {
      return jsonNoStore(
        { error: "Pour votre sécurité, reconnectez-vous puis réessayez.", code: "REAUTH_REQUIRED", maxAgeSec: REAUTH_MAX_AGE_SEC },
        401,
      );
    }
    const updated = await setInitialPassword({ userId: session.id, organizationId: session.organizationId, newPassword });
    return sessionReply(updated, session);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "EMAIL_NOT_VERIFIED") {
      return jsonNoStore({ error: "Vérifiez d'abord votre adresse e-mail.", code }, 403);
    }
    if (code === "PASSWORD_ALREADY_SET") {
      return jsonNoStore({ error: "Un mot de passe est déjà défini. Utilisez le changement de mot de passe.", code }, 409);
    }
    if (code === "CURRENT_PASSWORD_REQUIRED") return jsonNoStore({ error: "Saisissez votre mot de passe actuel.", code }, 400);
    if (code === "CURRENT_PASSWORD_INVALID") return jsonNoStore({ error: "Le mot de passe actuel est incorrect.", code }, 400);
    if (code === "PASSWORD_REUSE") return jsonNoStore({ error: "Choisissez un mot de passe différent de l'actuel.", code }, 400);
    if (code === "USER_NOT_FOUND") return jsonNoStore({ error: "Session expirée." }, 401);
    if ((error as { code?: unknown } | null)?.code === "AUTH_BUSY") {
      return jsonNoStore({ error: "Service momentanément indisponible. Réessayez." }, 503, { "Retry-After": "5" });
    }
    logger.error("account password failed", { route: "/api/auth/account-security/password", error: error instanceof Error ? error.name : "unknown" });
    return jsonNoStore({ error: "Impossible de définir le mot de passe." }, 500);
  }
});

export const dynamic = "force-dynamic";
