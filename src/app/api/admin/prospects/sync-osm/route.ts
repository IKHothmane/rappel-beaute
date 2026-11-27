import type { NextRequest } from "next/server";
import { adminError, adminJson, requireSuperAdmin } from "@/lib/admin/api-helpers";
import { checkJsonSameOrigin } from "@/lib/auth/google-http";
import { ProspectSyncBusyError, syncOsmProspects } from "@/lib/db/prospects";
import { platformRoute } from "@/lib/http/route-scope";
import { logProspectFailure } from "@/lib/prospects/http";
import { fetchOsmProspects, OverpassError } from "@/lib/prospects/osm";

export const runtime = "nodejs";

/**
 * Synchronisation OpenStreetMap (Maroc) dans la requête : { inserted, updated, total, durationMs }.
 * 409 si une synchro tourne déjà, 502 si Overpass échoue. Appel JSON de même origine (corps `{}`).
 * La synchro va à son terme même si le navigateur abandonne la requête : le verrou et "lastSyncedAt"
 * (GET de la liste) permettent à l'interface de constater le résultat.
 */
export const POST = platformRoute(async (request: NextRequest) => {
  const refused = checkJsonSameOrigin(request);
  if (refused) return refused;
  const auth = await requireSuperAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const result = await syncOsmProspects(auth.session, () => fetchOsmProspects());
    return adminJson({
      inserted: result.inserted,
      updated: result.updated,
      unchanged: result.unchanged,
      total: result.total,
      durationMs: result.durationMs,
    });
  } catch (error) {
    if (error instanceof ProspectSyncBusyError) {
      return adminError("Une synchronisation est déjà en cours. Réessayez dans quelques minutes.", 409);
    }
    if (error instanceof OverpassError) {
      logProspectFailure("POST /api/admin/prospects/sync-osm", error);
      return adminError("OpenStreetMap (Overpass) n'a pas répondu correctement. Réessayez plus tard.", 502);
    }
    logProspectFailure("POST /api/admin/prospects/sync-osm", error);
    return adminError("Synchronisation impossible.", 500);
  }
});
