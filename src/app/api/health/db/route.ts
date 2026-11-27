import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Pool } from "pg";
import { publicRoute } from "@/lib/http/route-scope";
import { connectionStringFor } from "@/lib/db/tenant-pool";
import { HEALTH_HEADERS, healthTokenAuthorized, healthUnauthorized } from "../_lib/access";

export const dynamic = "force-dynamic";

/**
 * Connexion de sonde séparée du pool applicatif (elle répond même s'il est saturé),
 * mais unique pour le processus : une seule connexion au plus, réutilisée d'une requête à l'autre.
 * Les appels concurrents attendent cette connexion au plus `connectionTimeoutMillis`.
 */
type ProbePool = { url: string; pool: Pool };
const globalForProbe = globalThis as unknown as { healthProbePool?: ProbePool };

function probePool(url: string): Pool {
  const current = globalForProbe.healthProbePool;
  if (current?.url === url) return current.pool;
  if (current) void current.pool.end().catch(() => undefined);
  const pool = new Pool({
    connectionString: url,
    max: 1,
    connectionTimeoutMillis: 3_000,
    idleTimeoutMillis: 30_000,
    statement_timeout: 3_000,
    allowExitOnIdle: true,
  });
  // Une connexion inactive coupée ne doit pas arrêter le processus.
  pool.on("error", () => undefined);
  globalForProbe.healthProbePool = { url, pool };
  return pool;
}

function probeError(): NextResponse {
  return NextResponse.json({ status: "error" }, { status: 503, headers: HEALTH_HEADERS });
}

/** Réservé à la surveillance : `Authorization: Bearer <HEALTH_TOKEN|CRON_SECRET>`. */
export const GET = publicRoute(async function GET(request: NextRequest) {
  // Avant toute lecture de configuration ou connexion : un appel anonyme ne touche pas la base.
  if (!healthTokenAuthorized(request)) return healthUnauthorized();

  let url: string | undefined;
  try {
    url = connectionStringFor("public") ?? process.env.DATABASE_URL;
  } catch {
    return probeError();
  }
  if (!url) return probeError();

  try {
    const start = Date.now();
    const { rows } = await probePool(url).query<{ ready: boolean }>(
      `SELECT to_regprocedure('app_current_org()') IS NOT NULL AS ready`,
    );
    const ready = Boolean(rows[0]?.ready);
    return NextResponse.json(
      {
        status: ready ? "ok" : "error",
        latencyMs: Date.now() - start,
        schema: ready ? "ready" : "missing",
      },
      { status: ready ? 200 : 503, headers: HEALTH_HEADERS },
    );
  } catch {
    return probeError();
  }
});
