import type { NextRequest } from "next/server";
import { adminError, adminJson, requireSuperAdmin } from "@/lib/admin/api-helpers";
import { readJsonObject } from "@/lib/auth/auth-route-utils";
import { checkJsonSameOrigin } from "@/lib/auth/google-http";
import { importCsvProspects } from "@/lib/db/prospects";
import { platformRoute } from "@/lib/http/route-scope";
import { CSV_MAX_BYTES, CsvFormatError, planCsvImport } from "@/lib/prospects/csv";
import { IMPORT_BODY_MAX_BYTES, logProspectFailure } from "@/lib/prospects/http";

export const runtime = "nodejs";

/**
 * Import CSV { csv } (2 Mo au plus) → { inserted, updated, skipped, errors: { line, error }[] }.
 * Les lignes invalides ou en double sont ignorées et listées ; les autres sont écrites en une transaction.
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

  let plan;
  try {
    plan = planCsvImport(body.csv);
  } catch (error) {
    if (error instanceof CsvFormatError) return adminError(error.message, 400);
    throw error;
  }

  try {
    const counts =
      plan.rows.length > 0
        ? await importCsvProspects(auth.session, plan.rows, { skipped: plan.skipped, errorCount: plan.errors.length })
        : { inserted: 0, updated: 0, unchanged: 0 };
    return adminJson({
      inserted: counts.inserted,
      updated: counts.updated,
      unchanged: counts.unchanged,
      skipped: plan.skipped,
      errors: plan.errors,
    });
  } catch (error) {
    logProspectFailure("POST /api/admin/prospects/import-csv", error);
    return adminError("Import impossible.", 500);
  }
});
