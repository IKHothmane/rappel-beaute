import type { NextRequest } from "next/server";
import { publicRoute } from "@/lib/http/route-scope";
import { clientIp } from "@/lib/http/client-ip";
import { logger } from "@/lib/logger";
import { consumeDimensions, identityHash, RATE_POLICIES } from "@/lib/rate-limit";
import {
  DEFAULT_APP_LANDING,
  applyAppSession,
  checkJsonSameOrigin,
  clearOAuthCookie,
  clearPendingCookie,
  jsonNoStore,
  pendingCookieName,
  publicSessionUser,
} from "@/lib/auth/google-http";
import { authHostMismatch, wrongHostResponse } from "@/lib/auth/auth-hosts";
import { badRequest, tooManyRequests } from "@/lib/auth/auth-route-utils";
import { MAX_PASSWORD_LENGTH } from "@/lib/db/users";
import { loadAppSessionForUser } from "@/lib/db/auth-identities";
import { completeEmailSignup, getEmailPendingState } from "@/lib/db/email-signup";
import { PublicSignupError } from "@/lib/db/institute-create";
import { field, notifySignupLead, prepareLogo, readSignupRequest, storeSignupLogo, validateInstituteFields } from "@/lib/auth/signup-form";
import type { AppSessionUser } from "@/lib/auth/types";

const ROUTE = "/api/auth/signup/email/complete";
const EXPIRED = { error: "Votre inscription a expiré. Recommencez.", code: "PENDING_EXPIRED" };

function sessionResponse(session: AppSessionUser) {
  const res = jsonNoStore({ ok: true, user: publicSessionUser(session), redirect: DEFAULT_APP_LANDING });
  applyAppSession(res, session);
  clearPendingCookie(res);
  clearOAuthCookie(res);
  return res;
}

/**
 * POST /api/auth/signup/email/complete/ (JSON ou multipart/form-data avec le champ `logo`) : finalise l'inscription
 * e-mail VÉRIFIÉE (cookie `__Host-rb_pending` posé par /verify/). Corps : password (celui de l'inscription, voir
 * completeEmailSignup), institut, ville, phone, name?, localisation?, website?, no_website?, message?, hp.
 * Crée institut + OWNER (mot de passe de l'inscription) + essai + réglages + audit dans UNE transaction, puis le logo
 * (hors transaction, échec toléré, jamais sur un rejeu) et émet la session. Double clic ou rejeu dans les 10 minutes :
 * une seule organisation, la session est réémise. Aucun mot de passe ni PIN dans aucune réponse.
 */
export const POST = publicRoute(async function POST(request: NextRequest) {
  const refused = checkJsonSameOrigin(request, { allowMultipart: true });
  if (refused) return refused;
  const wrongHost = authHostMismatch(request);
  if (wrongHost) return wrongHostResponse(wrongHost, "La création de votre institut");

  // Avant toute lecture du corps : cookie d'inscription présent, puis quota par IP (un corps volumineux ou
  // invalide ne coûte rien tant que ces deux contrôles échouent).
  const token = request.cookies.get(pendingCookieName())?.value;
  if (!token) return jsonNoStore(EXPIRED, 400);

  const ipLimit = {
    key: `auth:signup-email:complete:ip:${clientIp(request)}`,
    ...RATE_POLICIES.emailSignup.completeIp,
    sensitivity: "sensitive" as const,
  };
  try {
    const ipGate = await consumeDimensions([ipLimit]);
    if (!ipGate.allowed) return tooManyRequests(ipGate.retryAfterSec);
  } catch (error) {
    if ((error as { code?: unknown } | null)?.code === "AUTH_BUSY") {
      return jsonNoStore({ error: "Service momentanément indisponible. Réessayez." }, 503, { "Retry-After": "5" });
    }
    logger.error("email signup complete failed", { route: ROUTE, error: error instanceof Error ? error.name : "unknown" });
    return jsonNoStore({ error: "Impossible de créer le compte. Réessayez." }, 500);
  }

  const parsed = await readSignupRequest(request);
  if (!parsed.ok) return jsonNoStore({ error: parsed.error }, parsed.status);
  const { fields } = parsed;
  if (field(fields, "hp")) return badRequest();

  const validated = validateInstituteFields(fields);
  if (!validated.ok) return badRequest(validated.error);
  const password = typeof fields.password === "string" ? fields.password : "";
  if (!password || password.length > MAX_PASSWORD_LENGTH) {
    return badRequest("Saisissez le mot de passe choisi à l'inscription.", "PASSWORD_MISMATCH");
  }
  const logo = await prepareLogo(parsed.logoFile);
  if (!logo.ok) return badRequest(logo.error);

  try {
    const state = await getEmailPendingState(token);
    const dead = !state || (state.consumed ? !state.replayable : state.expired);
    if (dead) {
      // Un cookie inconnu ou périmé est un échec : il a déjà compté contre l'IP (sondage de cookies).
      const res = jsonNoStore(EXPIRED, 400);
      clearPendingCookie(res);
      return res;
    }
    // Par inscription (borne aussi les essais du mot de passe, rejeu compris) ; l'IP a déjà été comptée.
    const limited = await consumeDimensions([
      {
        key: `auth:signup-email:complete:pending:${identityHash(`email-pending:${token}`)}`,
        ...RATE_POLICIES.emailSignup.completeSubject,
        sensitivity: "sensitive",
      },
    ]);
    if (!limited.allowed) return tooManyRequests(limited.retryAfterSec);

    const result = await completeEmailSignup({
      token,
      password,
      institut: validated.value.institut,
      city: validated.value.city,
      address: validated.value.address,
      website: validated.value.website,
      phone: validated.value.phoneDigits,
      personName: validated.value.personName || undefined,
    });

    if (result.kind === "bad_password") {
      return jsonNoStore({ error: "Le mot de passe ne correspond pas à celui de votre inscription.", code: "PASSWORD_MISMATCH" }, 403);
    }
    if (result.kind === "invalid") {
      const res = jsonNoStore(EXPIRED, 400);
      clearPendingCookie(res);
      return res;
    }

    const session = await loadAppSessionForUser(result.userId, result.organizationId);
    if (!session) return jsonNoStore({ error: "Connexion impossible. Réessayez.", code: "LOGIN_FAILED" }, 409);
    if (result.kind === "replay") return sessionResponse(session);

    // Hors transaction : logo puis notification interne ; leurs échecs n'annulent jamais l'inscription.
    await storeSignupLogo(result.organizationId, logo.logo, ROUTE);
    await notifySignupLead({
      route: ROUTE,
      organizationId: result.organizationId,
      personName: `${session.firstName} ${session.lastName}`.trim(),
      institut: result.institut,
      email: result.email,
      fields: validated.value,
      logoName: logo.logo?.name ?? null,
    });
    return sessionResponse(session);
  } catch (error) {
    if (error instanceof PublicSignupError) {
      if (error.code === "PHONE_TAKEN") return jsonNoStore({ error: error.message, code: "PHONE_TAKEN" }, 409);
      if (error.code === "EMAIL_TAKEN") {
        return jsonNoStore(
          { error: "Impossible de créer ce compte. Connectez-vous avec votre e-mail.", code: "NOT_AVAILABLE" },
          409,
        );
      }
      return badRequest(error.message);
    }
    if ((error as { code?: unknown } | null)?.code === "AUTH_BUSY") {
      return jsonNoStore({ error: "Service momentanément indisponible. Réessayez." }, 503, { "Retry-After": "5" });
    }
    logger.error("email signup complete failed", { route: ROUTE, error: error instanceof Error ? error.name : "unknown" });
    return jsonNoStore({ error: "Impossible de créer le compte. Réessayez." }, 500);
  }
});

export const dynamic = "force-dynamic";
