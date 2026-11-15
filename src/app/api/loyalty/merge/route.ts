import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireFeatureWrite, stripOrganizationId } from "@/lib/auth/api-guard";
import { tenantRoute } from "@/lib/http/route-scope";
import { consumeDimensions, identityHash } from "@/lib/rate-limit";
import {
  assignPhoneToCard,
  isLoyaltyMergeEnabled,
  MergeError,
  mergeCustomers,
  previewMerge,
  type MergeActor,
} from "@/lib/loyalty/merge";

/**
 * Fusion de fiches clientes (fidélité), réservée au propriétaire et au gestionnaire.
 *
 *   POST { action: "phone-preview", sourceCardToken | sourceCustomerId, phone }
 *     -> { mode: "assign", ... }  numéro libre : pas de fusion
 *     -> { mode: "merge", previewVersion, source, target, result, alerts }
 *   POST { action: "assign-phone", sourceCardToken | sourceCustomerId, phone, firstName?, lastName? }
 *     -> { mode: "assigned", ... } ou { mode: "merge", preview } si le numéro est (devenu) connu
 *   POST { action: "merge", sourceCustomerId, targetCustomerId, idempotencyKey, previewVersion, identityConfirmed: true }
 *     -> 200 { ...MergeResult } (replayed: true pour une fusion déjà enregistrée)
 *
 * Désactivée tant que LOYALTY_MERGE_ENABLED n'est pas « on » (404 MERGE_DISABLED).
 */

const MERGE_ROLES = new Set(["OWNER", "MANAGER"]);
const MAX_BODY_BYTES = 4096;
const WINDOW_MS = 10 * 60_000;

const PREVIEW_KEYS = ["action", "sourceCardToken", "sourceCustomerId", "phone"];
const ASSIGN_KEYS = [...PREVIEW_KEYS, "firstName", "lastName"];
const MERGE_KEYS = ["action", "sourceCustomerId", "targetCustomerId", "idempotencyKey", "previewVersion", "identityConfirmed"];

function fail(status: number, code: string, error: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error, code, ...extra }, { status });
}

function text(value: unknown, max: number): string | null {
  return typeof value === "string" && value.length > 0 && value.length <= max ? value : null;
}

function onlyKeys(body: Record<string, unknown>, allowed: string[]): boolean {
  return Object.keys(body).every((key) => allowed.includes(key));
}

function sourceOf(body: Record<string, unknown>): { sourceCardToken?: string; sourceCustomerId?: string } | null {
  const token = body.sourceCardToken === undefined ? null : text(body.sourceCardToken, 64);
  const customerId = body.sourceCustomerId === undefined ? null : text(body.sourceCustomerId, 80);
  if ((token === null) === (customerId === null)) return null; // exactement un des deux
  if (customerId !== null && !/^[A-Za-z0-9_.:-]+$/.test(customerId)) return null;
  return token !== null ? { sourceCardToken: token } : { sourceCustomerId: customerId as string };
}

function mergeFailure(error: unknown) {
  if (error instanceof MergeError) {
    return fail(error.status, error.code, error.message);
  }
  return null;
}

export const POST = tenantRoute(async function POST(request: NextRequest) {
  const auth = await requireFeatureWrite(request, "loyalty");
  if (!auth.ok) return auth.response;
  if (!MERGE_ROLES.has(auth.session.role)) {
    return fail(403, "FORBIDDEN", "Seuls le propriétaire et le gestionnaire peuvent fusionner des fiches.");
  }
  if (!isLoyaltyMergeEnabled()) {
    return fail(404, "MERGE_DISABLED", "La fusion de fiches n'est pas activée.");
  }

  const length = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) return fail(413, "INVALID_INPUT", "Requête trop volumineuse.");
  const raw = await request.json().catch(() => null);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fail(400, "INVALID_INPUT", "Requête invalide.");
  const body = stripOrganizationId(raw as Record<string, unknown>);
  const action = body.action;
  if (action !== "phone-preview" && action !== "assign-phone" && action !== "merge") {
    return fail(400, "INVALID_INPUT", "Action inconnue.");
  }

  // Limiteur dédié : l'aperçu révèle une fiche à partir d'un numéro (énumération), la fusion est lourde.
  const user = identityHash(auth.session.id);
  const org = identityHash(auth.session.organizationId);
  const heavy = action !== "phone-preview";
  const limited = await consumeDimensions([
    { key: `loyalty-merge:${action}:user:${user}`, limit: heavy ? 10 : 30, windowMs: WINDOW_MS, sensitivity: "sensitive" },
    { key: `loyalty-merge:org:${org}`, limit: 120, windowMs: WINDOW_MS },
  ]);
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Trop de requêtes. Réessayez dans un instant.", code: "RATE_LIMITED", retryAfterSec: limited.retryAfterSec },
      { status: 429, headers: limited.retryAfterSec ? { "Retry-After": String(limited.retryAfterSec) } : undefined },
    );
  }

  const organizationId = auth.session.organizationId;
  const actor: MergeActor = {
    id: auth.session.id,
    name: `${auth.session.firstName} ${auth.session.lastName}`.trim() || null,
  };

  try {
    if (action === "phone-preview") {
      const source = sourceOf(body);
      const phone = text(body.phone, 32);
      if (!onlyKeys(body, PREVIEW_KEYS) || !source || !phone) return fail(400, "INVALID_INPUT", "Requête invalide.");
      return NextResponse.json(await previewMerge(organizationId, { ...source, phone }));
    }
    if (action === "assign-phone") {
      const source = sourceOf(body);
      const phone = text(body.phone, 32);
      const names = [body.firstName, body.lastName];
      if (
        !onlyKeys(body, ASSIGN_KEYS) ||
        !source ||
        !phone ||
        names.some((name) => name !== undefined && name !== null && typeof name !== "string")
      ) {
        return fail(400, "INVALID_INPUT", "Requête invalide.");
      }
      return NextResponse.json(
        await assignPhoneToCard(organizationId, actor, { ...source, phone, firstName: body.firstName, lastName: body.lastName }),
      );
    }
    const sourceCustomerId = text(body.sourceCustomerId, 80);
    const targetCustomerId = text(body.targetCustomerId, 80);
    const idempotencyKey = text(body.idempotencyKey, 80);
    const previewVersion = text(body.previewVersion, 64);
    if (
      !onlyKeys(body, MERGE_KEYS) ||
      !sourceCustomerId ||
      !targetCustomerId ||
      !idempotencyKey ||
      !previewVersion ||
      !/^[A-Za-z0-9_.:-]{8,80}$/.test(idempotencyKey) ||
      !/^[0-9a-f]{64}$/.test(previewVersion) ||
      typeof body.identityConfirmed !== "boolean"
    ) {
      return fail(400, "INVALID_INPUT", "Requête invalide.");
    }
    if (body.identityConfirmed !== true) {
      return fail(400, "IDENTITY_NOT_CONFIRMED", "Confirmez l'identité de la cliente avant de fusionner.");
    }
    const result = await mergeCustomers(organizationId, actor, {
      sourceCustomerId,
      targetCustomerId,
      idempotencyKey,
      previewVersion,
      identityConfirmed: true,
    });
    return NextResponse.json(result);
  } catch (error) {
    const known = mergeFailure(error);
    if (known) return known;
    console.error("[POST /api/loyalty/merge]", error instanceof Error ? error.message : "erreur");
    return fail(500, "INTERNAL", "Impossible de traiter la demande de fusion.");
  }
});
