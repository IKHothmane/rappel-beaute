import type { NextRequest } from "next/server";
import { tenantRoute } from "@/lib/http/route-scope";
import { clientIp } from "@/lib/http/client-ip";
import { requireAppSession } from "@/lib/auth/api-guard";
import { verifyPasswordAsync } from "@/lib/auth/crypto";
import { checkJsonSameOrigin, jsonNoStore } from "@/lib/auth/google-http";
import { scheduleEmailChange } from "@/lib/auth/email-auth-tasks";
import { badRequest, parseEmailInput, readJsonObject, stringField, tooManyRequests, authBusy, isAuthBusy } from "@/lib/auth/auth-route-utils";
import { REAUTH_MAX_AGE_SEC, isRecentlyAuthenticated } from "@/lib/auth/reauth";
import { getLinkContext } from "@/lib/db/auth-identities";
import { MAX_PASSWORD_LENGTH } from "@/lib/db/users";
import { consumeDimensions, emailKey, identityHash, RATE_POLICIES } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const GENERIC = {
  ok: true,
  message: "Si cette adresse peut être utilisée, un e-mail de confirmation vient d'être envoyé à cette adresse.",
} as const;

/**
 * POST /api/auth/account-security/email/ (JSON {email, password}) : demande l'adresse e-mail du compte connecté
 * (ajout, changement, ou vérification de l'adresse actuelle non vérifiée). Le mot de passe actuel est exigé quand le
 * compte en a un ; sans mot de passe (compte Google) une authentification récente (moins de 10 minutes) l'est
 * (401 REAUTH_REQUIRED). Réponse GÉNÉRIQUE : identique que l'adresse soit libre, déjà utilisée (comptes institut ou
 * plateforme, insensible à la casse) ou déjà vérifiée sur ce compte ; le contrôle d'unicité, le jeton haché (24 h,
 * usage unique) et l'envoi vers la NOUVELLE adresse se font après la réponse.
 */
export const POST = tenantRoute(async function POST(request: NextRequest) {
  const refused = checkJsonSameOrigin(request);
  if (refused) return refused;
  const auth = await requireAppSession(request);
  if (!auth.ok) return auth.response;
  const { session } = auth;

  const body = await readJsonObject(request);
  if (!body) return badRequest();
  const email = parseEmailInput(body.email);
  if (!email) return badRequest("Adresse e-mail invalide.", "EMAIL_INVALID");
  const password = stringField(body, "password");
  if (password.length > MAX_PASSWORD_LENGTH) return badRequest("Mot de passe trop long.");

  const limited = await consumeDimensions([
    { key: `auth:acct-email:user:${identityHash(session.id)}`, ...RATE_POLICIES.accountSecurity.emailUser, sensitivity: "sensitive" },
    { key: `auth:acct-email:ip:${clientIp(request)}`, ...RATE_POLICIES.accountSecurity.emailIp, sensitivity: "sensitive" },
    // Clé = adresse visée (hachée) : protège la boîte d'un tiers, que l'adresse soit utilisée ou non.
    { key: `auth:acct-email:target:${emailKey(email)}`, ...RATE_POLICIES.accountSecurity.emailTarget, sensitivity: "sensitive" },
  ]);
  if (!limited.allowed) return tooManyRequests(limited.retryAfterSec);

  try {
    const context = await getLinkContext(session.id, session.organizationId);
    if (!context) return jsonNoStore({ error: "Session expirée." }, 401);
    if (context.passwordHash) {
      if (!password) return jsonNoStore({ error: "Saisissez votre mot de passe actuel.", code: "CURRENT_PASSWORD_REQUIRED" }, 400);
      if (!(await verifyPasswordAsync(password, context.passwordHash))) {
        return jsonNoStore({ error: "Mot de passe incorrect.", code: "INVALID_PASSWORD" }, 403);
      }
    } else if (!isRecentlyAuthenticated(session.authAt)) {
      return jsonNoStore(
        { error: "Pour votre sécurité, reconnectez-vous puis réessayez.", code: "REAUTH_REQUIRED", maxAgeSec: REAUTH_MAX_AGE_SEC },
        401,
      );
    }
    scheduleEmailChange({
      userId: session.id,
      organizationId: session.organizationId,
      email,
      requestOrigin: request.nextUrl.origin,
    });
    return jsonNoStore(GENERIC);
  } catch (error) {
    if (isAuthBusy(error)) return authBusy();
    logger.error("account email request failed", { route: "/api/auth/account-security/email", error: error instanceof Error ? error.name : "unknown" });
    return jsonNoStore({ error: "Impossible d'envoyer l'e-mail. Réessayez." }, 500);
  }
});

export const dynamic = "force-dynamic";
