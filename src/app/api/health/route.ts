import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { pool } from "@/lib/db/pool";
import { getMemorySnapshot } from "@/lib/ops/memory";
import { appEnvironment } from "@/lib/site";
import { pingRedis } from "@/lib/redis/client";
import { publicRoute } from "@/lib/http/route-scope";
import { HEALTH_HEADERS, healthTokenAuthorized, singleFlight } from "./_lib/access";

export const dynamic = "force-dynamic";

async function checkDatabase(): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  try {
    await pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

// Une rafale de sondes publiques partage un seul aller-retour base + Redis.
const probeDependencies = singleFlight(() => Promise.all([checkDatabase(), pingRedis()]));

/**
 * Public : état minimal ({ status, database, redis, version }), lu par la surveillance et les déploiements.
 * Avec `Authorization: Bearer <HEALTH_TOKEN|CRON_SECRET>` : environnement, horodatage et mémoire du processus.
 */
export const GET = publicRoute(async function GET(request: NextRequest) {
  const [database, redis] = await probeDependencies();

  const redisRequired = Boolean(process.env.REDIS_URL);
  const redisStatus = redisRequired ? (redis ? "ok" : "error") : "skipped";

  const ok = database && (!redisRequired || redis);

  const payload = {
    status: ok ? "ok" : "degraded",
    database: database ? "ok" : "error",
    redis: redisStatus,
    version: process.env.npm_package_version ?? "unknown",
  };

  if (!ok && process.env.ALERT_ON_HEALTH_DEGRADED === "true") {
    const { sendAlert } = await import("@/lib/monitoring/alerts");
    void sendAlert({
      severity: "critical",
      title: "Health check dégradé",
      source: "api/health",
      details: JSON.stringify(payload),
      env: appEnvironment(),
    });
  }

  const body = healthTokenAuthorized(request)
    ? {
        ...payload,
        app: appEnvironment(),
        timestamp: new Date().toISOString(),
        memory: getMemorySnapshot(),
      }
    : payload;

  return NextResponse.json(body, { status: ok ? 200 : 503, headers: HEALTH_HEADERS });
});
