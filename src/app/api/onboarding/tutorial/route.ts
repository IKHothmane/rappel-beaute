import type { NextRequest } from "next/server";
import { tenantRoute } from "@/lib/http/route-scope";
import { requireAppSession, stripOrganizationId } from "@/lib/auth/api-guard";
import { checkJsonSameOrigin, jsonNoStore } from "@/lib/auth/google-http";
import { readJsonObject } from "@/lib/auth/auth-route-utils";
import { logger } from "@/lib/logger";
import {
  applyTutorialAction,
  getTutorialState,
  isTutorialAction,
  isTutorialStep,
  type TutorialStep,
} from "@/lib/db/tutorial-state";

/**
 * GET /api/onboarding/tutorial/ : { tutorial: {status, lastStep, version} | null, progress, eligible }.
 * Réservé au propriétaire : un autre rôle reçoit tutorial null et eligible false. La ligne NOT_STARTED n'est créée
 * que pour un propriétaire dont l'institut est encore vide ; un ancien compte actif n'est jamais éligible.
 *
 * PATCH {action: start|step|pause|skip|complete|reset, step?} : OWNER uniquement (403 sinon). Action ou étape
 * inconnue : 400 ; transition interdite : 409 ; table absente : 503. userId et organizationId viennent de la session,
 * jamais du corps. Même forme de réponse que le GET.
 */
export const GET = tenantRoute(async function GET(request: NextRequest) {
  const auth = await requireAppSession(request);
  if (!auth.ok) return auth.response;
  const { session } = auth;
  try {
    return jsonNoStore(await getTutorialState({ userId: session.id, organizationId: session.organizationId, isOwner: session.role === "OWNER" }));
  } catch (error) {
    logger.error("tutoriel : lecture impossible", { route: "onboarding/tutorial", error: error instanceof Error ? error.name : "unknown" });
    return jsonNoStore({ error: "Tutoriel indisponible." }, 500);
  }
});

export const PATCH = tenantRoute(async function PATCH(request: NextRequest) {
  const refused = checkJsonSameOrigin(request);
  if (refused) return refused;
  const auth = await requireAppSession(request);
  if (!auth.ok) return auth.response;
  const { session } = auth;
  if (session.role !== "OWNER") return jsonNoStore({ error: "Accès refusé." }, 403);

  const raw = await readJsonObject(request);
  if (!raw) return jsonNoStore({ error: "Requête invalide.", code: "INVALID_BODY" }, 400);
  const body = stripOrganizationId(raw);
  if (!isTutorialAction(body.action)) return jsonNoStore({ error: "Action inconnue.", code: "INVALID_ACTION" }, 400);
  let step: TutorialStep | undefined;
  if (body.step !== undefined && body.step !== null) {
    if (!isTutorialStep(body.step)) return jsonNoStore({ error: "Étape inconnue.", code: "INVALID_STEP" }, 400);
    step = body.step;
  }
  if (body.action === "step" && !step) return jsonNoStore({ error: "Étape requise.", code: "INVALID_STEP" }, 400);

  try {
    const result = await applyTutorialAction({ userId: session.id, organizationId: session.organizationId, action: body.action, step });
    if (result.kind === "unavailable") return jsonNoStore({ error: "Tutoriel momentanément indisponible.", code: "TUTORIAL_UNAVAILABLE" }, 503);
    if (result.kind === "invalid_transition") {
      return jsonNoStore({ error: "Action impossible dans l'état actuel du tutoriel.", code: "INVALID_TRANSITION", status: result.status }, 409);
    }
    const { kind: _kind, ...state } = result;
    return jsonNoStore(state);
  } catch (error) {
    logger.error("tutoriel : mise à jour impossible", { route: "onboarding/tutorial", error: error instanceof Error ? error.name : "unknown" });
    return jsonNoStore({ error: "Tutoriel indisponible." }, 500);
  }
});

export const dynamic = "force-dynamic";
