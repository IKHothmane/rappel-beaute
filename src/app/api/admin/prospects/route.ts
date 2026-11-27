import type { NextRequest } from "next/server";
import { adminError, adminJson, requireSuperAdmin } from "@/lib/admin/api-helpers";
import { readJsonObject } from "@/lib/auth/auth-route-utils";
import { checkJsonSameOrigin } from "@/lib/auth/google-http";
import { createManualProspect, listProspects, ProspectDuplicateError } from "@/lib/db/prospects";
import { platformRoute } from "@/lib/http/route-scope";
import { logProspectFailure, SMALL_BODY_MAX_BYTES } from "@/lib/prospects/http";
import { parseManualProspect, parseProspectFilters } from "@/lib/prospects/validation";

export const runtime = "nodejs";

/** Liste filtrée : { items, total, page, pageSize, cities, stats, lastSyncedAt }. */
export const GET = platformRoute(async (request: NextRequest) => {
  const auth = await requireSuperAdmin(request);
  if (!auth.ok) return auth.response;

  const parsed = parseProspectFilters(request.nextUrl.searchParams);
  if (!parsed.ok) return adminError(parsed.error, 400);
  try {
    return adminJson(await listProspects(parsed.value));
  } catch (error) {
    logProspectFailure("GET /api/admin/prospects", error);
    return adminError("Liste des prospects indisponible.", 500);
  }
});

/** Création manuelle : { item } (201) ; 400 { error, fieldErrors } ; 409 si le téléphone existe déjà. */
export const POST = platformRoute(async (request: NextRequest) => {
  const refused = checkJsonSameOrigin(request);
  if (refused) return refused;
  const auth = await requireSuperAdmin(request);
  if (!auth.ok) return auth.response;

  const body = await readJsonObject(request, SMALL_BODY_MAX_BYTES);
  if (!body) return adminError("Corps JSON invalide.", 400);
  const parsed = parseManualProspect(body);
  if (!parsed.ok) return adminJson({ error: "Données invalides.", fieldErrors: parsed.fieldErrors }, 400);

  try {
    const item = await createManualProspect(auth.session, parsed.value);
    return adminJson({ item }, 201);
  } catch (error) {
    if (error instanceof ProspectDuplicateError) {
      return adminJson({ error: "Un prospect avec ce téléphone existe déjà.", fieldErrors: { phone: "Téléphone déjà enregistré." } }, 409);
    }
    logProspectFailure("POST /api/admin/prospects", error);
    return adminError("Création impossible.", 500);
  }
});
