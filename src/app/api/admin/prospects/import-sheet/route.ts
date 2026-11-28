import type { NextRequest } from "next/server";
import { adminError, adminJson, requireSuperAdmin } from "@/lib/admin/api-helpers";
import { readJsonObject } from "@/lib/auth/auth-route-utils";
import { checkJsonSameOrigin } from "@/lib/auth/google-http";
import { importProspects } from "@/lib/db/prospects";
import { platformRoute } from "@/lib/http/route-scope";
import { planCsvImport } from "@/lib/prospects/csv";
import { fetchGoogleSheetCsv, parseGoogleSheetUrl, SheetImportError } from "@/lib/prospects/google-sheet";
import { logProspectFailure, SMALL_BODY_MAX_BYTES } from "@/lib/prospects/http";
import { ImportFormatError } from "@/lib/prospects/import-plan";

export const runtime = "nodejs";

/**
 * Import d'une feuille Google Sheets partagée { url } → { inserted, updated, unchanged, skipped, errors }.
 * 400 lien refusé ; 422 feuille privée ; 413 plus de 2 Mo ; 502 Google ne répond pas correctement.
 */
export const POST = platformRoute(async (request: NextRequest) => {
  const refused = checkJsonSameOrigin(request);
  if (refused) return refused;
  const auth = await requireSuperAdmin(request);
  if (!auth.ok) return auth.response;

  const body = await readJsonObject(request, SMALL_BODY_MAX_BYTES);
  if (!body) return adminError("Corps JSON invalide.", 400);
  const ref = parseGoogleSheetUrl(body.url);
  if (!ref) {
    return adminError("Lien invalide : collez un lien https://docs.google.com/spreadsheets/d/… d'une feuille Google Sheets.", 400);
  }

  try {
    const csv = await fetchGoogleSheetCsv(ref);
    return adminJson(await importProspects(auth.session, planCsvImport(csv), "google-sheet"));
  } catch (error) {
    if (error instanceof SheetImportError) {
      if (error.kind === "inaccessible") return adminError(error.message, 422);
      if (error.kind === "too_large") return adminError(error.message, 413);
      logProspectFailure("POST /api/admin/prospects/import-sheet", error);
      return adminError("Google Sheets ne répond pas correctement. Réessayez plus tard ou importez le fichier .xlsx.", 502);
    }
    if (error instanceof ImportFormatError) return adminError(error.message, error.status);
    logProspectFailure("POST /api/admin/prospects/import-sheet", error);
    return adminError("Import impossible.", 500);
  }
});
