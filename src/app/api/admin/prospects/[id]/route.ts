import type { NextRequest } from "next/server";
import { adminError, adminJson, requireSuperAdmin } from "@/lib/admin/api-helpers";
import { readJsonObject } from "@/lib/auth/auth-route-utils";
import { checkJsonSameOrigin } from "@/lib/auth/google-http";
import { ProspectNotFoundError, updateProspectTracking } from "@/lib/db/prospects";
import { platformRoute } from "@/lib/http/route-scope";
import { isProspectId, logProspectFailure, SMALL_BODY_MAX_BYTES } from "@/lib/prospects/http";
import { parseProspectPatch } from "@/lib/prospects/validation";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** Suivi commercial : { status?, notes? } → { item }. Aucun autre champ n'est accepté. */
export const PATCH = platformRoute(async (request: NextRequest, ctx: Ctx) => {
  const refused = checkJsonSameOrigin(request);
  if (refused) return refused;
  const auth = await requireSuperAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  if (!isProspectId(id)) return adminError("Prospect introuvable.", 404);
  const body = await readJsonObject(request, SMALL_BODY_MAX_BYTES);
  if (!body) return adminError("Corps JSON invalide.", 400);
  const parsed = parseProspectPatch(body);
  if (!parsed.ok) {
    return adminJson({ error: parsed.error, ...(parsed.fieldErrors ? { fieldErrors: parsed.fieldErrors } : {}) }, 400);
  }

  try {
    const item = await updateProspectTracking(auth.session, id, parsed.value);
    return adminJson({ item });
  } catch (error) {
    if (error instanceof ProspectNotFoundError) return adminError("Prospect introuvable.", 404);
    logProspectFailure("PATCH /api/admin/prospects/[id]", error);
    return adminError("Modification impossible.", 500);
  }
});
