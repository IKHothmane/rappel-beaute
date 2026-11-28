import type { NextRequest } from "next/server";
import { adminError, adminJson, requireSuperAdmin } from "@/lib/admin/api-helpers";
import { readJsonObject } from "@/lib/auth/auth-route-utils";
import { checkJsonSameOrigin } from "@/lib/auth/google-http";
import { importProspects } from "@/lib/db/prospects";
import { platformRoute } from "@/lib/http/route-scope";
import { CSV_MAX_BYTES, planCsvImport } from "@/lib/prospects/csv";
import { IMPORT_BODY_MAX_BYTES, logProspectFailure } from "@/lib/prospects/http";
import { ImportFormatError } from "@/lib/prospects/import-plan";

export const runtime = "nodejs";

/**
 * Import CSV { csv } (2 Mo au plus) → { inserted, updated, unchanged, skipped, errors: { line, error }[] }.
 * Même analyse que l'import de fichier (colonne id, statut, notes) ; une transaction pour toutes les écritures.
 */
export const POST = platformRoute(async (request: NextRequest) => {
  const refused = checkJsonSameOrigin(request);
  if (refused) return refused;
  const auth = await requireSuperAdmin(request);
  if (!auth.ok) return auth.response;

  const body = await readJsonObject(request, IMPORT_BODY_MAX_BYTES);
  if (!body) return adminError("Corps JSON invalide ou trop volumineux (2 Mo de CSV au plus).", 400);
  if (typeof body.csv !== "string" || !body.csv.trim()) return adminError("Champ csv requis.", 400);
  if (Buffer.byteLength(body.csv, "utf8") > CSV_MAX_BYTES) return adminError("Fichier CSV limité à 2 Mo.", 413);

  try {
    return adminJson(await importProspects(auth.session, planCsvImport(body.csv), "csv"));
  } catch (error) {
    if (error instanceof ImportFormatError) return adminError(error.message, error.status);
    logProspectFailure("POST /api/admin/prospects/import-csv", error);
    return adminError("Import impossible.", 500);
  }
});
