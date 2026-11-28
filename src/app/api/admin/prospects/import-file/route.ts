import type { NextRequest } from "next/server";
import { adminError, adminJson, requireSuperAdmin } from "@/lib/admin/api-helpers";
import { readBodyBytesCapped } from "@/lib/auth/auth-route-utils";
import { checkJsonSameOrigin } from "@/lib/auth/google-http";
import { importProspects } from "@/lib/db/prospects";
import { platformRoute } from "@/lib/http/route-scope";
import { decodeCsvBytes, planCsvImport } from "@/lib/prospects/csv";
import { FILE_IMPORT_BODY_MAX_BYTES, logProspectFailure } from "@/lib/prospects/http";
import { decodeImportFile, ImportFormatError, planTabularImport } from "@/lib/prospects/import-plan";
import { readXlsxRecords } from "@/lib/prospects/xlsx";

export const runtime = "nodejs";

/**
 * Import d'un fichier { filename, contentBase64 } : .xlsx (première feuille) ou .csv, 2 Mo décodés au plus.
 * → { inserted, updated, unchanged, skipped, errors } ; 400 extension ou fichier illisible ; 413 trop volumineux.
 */
export const POST = platformRoute(async (request: NextRequest) => {
  const refused = checkJsonSameOrigin(request);
  if (refused) return refused;
  const auth = await requireSuperAdmin(request);
  if (!auth.ok) return auth.response;

  // Lecture bornée pendant le flux : au-delà, 413 sans tout charger en mémoire.
  const raw = await readBodyBytesCapped(request, FILE_IMPORT_BODY_MAX_BYTES);
  if (!raw) return adminError("Fichier trop volumineux (2 Mo au plus).", 413);
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(raw));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    body = parsed as Record<string, unknown>;
  } catch {
    return adminError("Corps JSON invalide.", 400);
  }

  try {
    const file = decodeImportFile(body.filename, body.contentBase64);
    const plan =
      file.kind === "xlsx"
        ? planTabularImport(await readXlsxRecords(file.bytes))
        : planCsvImport(decodeCsvBytes(file.bytes));
    return adminJson(await importProspects(auth.session, plan, file.kind));
  } catch (error) {
    if (error instanceof ImportFormatError) return adminError(error.message, error.status);
    logProspectFailure("POST /api/admin/prospects/import-file", error);
    return adminError("Import impossible.", 500);
  }
});
