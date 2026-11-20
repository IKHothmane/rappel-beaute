import type { NextRequest } from "next/server";
import { publicRoute } from "@/lib/http/route-scope";
import { clientIp } from "@/lib/http/client-ip";
import { logger } from "@/lib/logger";
import { consumeDimensions, identityHash, RATE_POLICIES } from "@/lib/rate-limit";
import { field, notifySignupLead, prepareLogo, readSignupRequest, storeSignupLogo, validateInstituteFields } from "@/lib/auth/signup-form";
import {
  DEFAULT_APP_LANDING,
  applyAppSession,
  checkJsonSameOrigin,
  clearOAuthCookie,
  clearPendingCookie,
  googleAuthUnavailable,
  jsonNoStore,
  pendingCookieName,
  publicSessionUser,
} from "@/lib/auth/google-http";
import {
  completeGoogleSignup,
  getGooglePendingState,
  loadAppSessionForUser,
  loginWithGoogleIdentity,
} from "@/lib/db/auth-identities";
import { PublicSignupError } from "@/lib/db/institute-create";
import type { AppSessionUser } from "@/lib/auth/types";

const ROUTE = "/api/auth/google/signup";
const EXPIRED = { error: "Votre inscription a expiré. Recommencez avec Google.", code: "PENDING_EXPIRED" };

const ipDimension = (request: NextRequest) => ({
  key: `auth:google:signup:ip:${clientIp(request)}`,
  ...RATE_POLICIES.googleAuth.signup.ip,
  sensitivity: "sensitive" as const,
});
const tooMany = (retryAfterSec?: number) =>
  jsonNoStore({ error: "Trop de demandes. Réessayez plus tard." }, 429, { "Retry-After": String(retryAfterSec ?? 3600) });
const bad = (message: string) => jsonNoStore({ error: message }, 400);

function sessionResponse(session: AppSessionUser) {
  const res = jsonNoStore({ ok: true, user: publicSessionUser(session), redirect: DEFAULT_APP_LANDING });
  applyAppSession(res, session);
  clearPendingCookie(res);
  clearOAuthCookie(res);
  return res;
}

/**
 * POST /api/auth/google/signup/ (JSON ou multipart/form-data avec le champ `logo`) : finalise l'inscription Google
 * en attente en créant l'institut, le propriétaire OWNER sans mot de passe (e-mail vérifié par Google), l'essai et
 * l'identité, puis émet la session. Idempotent : un rejeu avec le même cookie ne crée pas de seconde organisation.
 * Le logo (validation et stockage de /api/public/signup : 2 Mo, PNG/JPG/WEBP/SVG, catégorie "logos") est traité
 * APRÈS la transaction, jamais sur un rejeu ; son échec est toléré.
 */
export const POST = publicRoute(async function POST(request: NextRequest) {
  const unavailable = googleAuthUnavailable();
  if (unavailable) return unavailable;
  const refused = checkJsonSameOrigin(request, { allowMultipart: true });
  if (refused) return refused;

  const parsed = await readSignupRequest(request);
  if (!parsed.ok) return jsonNoStore({ error: parsed.error }, parsed.status);
  const { fields } = parsed;

  // Leurre anti-robot : un champ caché rempli n'est jamais rempli par une personne.
  if (field(fields, "hp")) return bad("Requête invalide.");

  const validated = validateInstituteFields(fields);
  if (!validated.ok) return bad(validated.error);
  const { personName, institut, phoneDigits, city, address, website } = validated.value;
  const logo = await prepareLogo(parsed.logoFile);
  if (!logo.ok) return bad(logo.error);

  const token = request.cookies.get(pendingCookieName())?.value;
  if (!token) return jsonNoStore(EXPIRED, 400);

  try {
    const pending = await getGooglePendingState(token);
    const dead = !pending || (pending.consumed ? !pending.replayable : pending.expired);
    if (dead) {
      // Un jeton inconnu ou périmé est un échec : il compte contre l'IP (sondage de cookies).
      const probe = await consumeDimensions([ipDimension(request)]);
      if (!probe.allowed) return tooMany(probe.retryAfterSec);
      const res = jsonNoStore(EXPIRED, 400);
      clearPendingCookie(res);
      return res;
    }
    // Quotas consommés APRÈS validation du corps et de l'état, et jamais pour un rejeu idempotent (rien n'est
    // créé : il réémet seulement la session dans la fenêtre de rejeu). Par IP et par identité Google.
    if (!pending.consumed) {
      const limited = await consumeDimensions([
        ipDimension(request),
        {
          key: `auth:google:signup:subject:${identityHash(`google:${pending.sub}`)}`,
          ...RATE_POLICIES.googleAuth.signup.subject,
          sensitivity: "sensitive",
        },
      ]);
      if (!limited.allowed) return tooMany(limited.retryAfterSec);
    }

    const result = await completeGoogleSignup({
      token,
      institut,
      city,
      address,
      website,
      phone: phoneDigits,
      personName: personName || undefined,
    });

    if (result.kind === "invalid") {
      const res = jsonNoStore(EXPIRED, 400);
      clearPendingCookie(res);
      return res;
    }

    if (result.kind === "replay") {
      // Institut déjà créé par un appel précédent : on réémet la session de cette organisation, sans rien créer.
      const session = await loginWithGoogleIdentity(result.sub, result.organizationId);
      if (!session) return jsonNoStore({ error: "Connexion impossible. Réessayez." }, 409);
      return sessionResponse(session);
    }

    const session = await loadAppSessionForUser(result.userId, result.organizationId);
    if (!session) return jsonNoStore({ error: "Connexion impossible. Réessayez." }, 409);

    // Hors transaction : logo (échec toléré, jamais sur un rejeu) puis e-mail de lead interne.
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
          { error: "Impossible de créer ce compte. Connectez-vous avec votre e-mail puis liez Google.", code: "NOT_AVAILABLE" },
          409,
        );
      }
      return bad(error.message);
    }
    logger.error("google signup failed", { route: "/api/auth/google/signup", error: error instanceof Error ? error.name : "unknown" });
    return jsonNoStore({ error: "Impossible de créer le compte. Réessayez." }, 500);
  }
});

export const dynamic = "force-dynamic";
