import { logger } from "@/lib/logger";
import { OverpassError } from "@/lib/prospects/osm";

/** Plafond du corps JSON d'un import : 2 Mo de CSV plus l'échappement JSON (guillemets, retours à la ligne). */
export const IMPORT_BODY_MAX_BYTES = 6 * 1024 * 1024;
/** Corps JSON d'un fichier en base64 : 2 Mo décodés font ~2,7 Mo encodés, plus le nom et l'enveloppe JSON. */
export const FILE_IMPORT_BODY_MAX_BYTES = 3 * 1024 * 1024;
/** Corps JSON des autres écritures (création, suivi). */
export const SMALL_BODY_MAX_BYTES = 16 * 1024;

export { isProspectId } from "@/lib/prospects/validation";

/**
 * Journal d'erreur sans donnée personnelle : nom de l'erreur, code PostgreSQL et, pour Overpass, la nature
 * de l'échec. Jamais le message brut d'une erreur base (il peut citer une valeur), ni le contenu importé.
 */
export function logProspectFailure(route: string, error: unknown): void {
  const err = error as { name?: unknown; code?: unknown } | null;
  logger.error("prospection : échec", {
    route,
    errorName: typeof err?.name === "string" ? err.name : typeof error,
    ...(typeof err?.code === "string" ? { pgCode: err.code } : {}),
    ...(error instanceof OverpassError ? { overpass: error.kind, overpassStatus: error.status } : {}),
  });
}
