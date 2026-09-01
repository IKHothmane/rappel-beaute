import { NextResponse } from "next/server";
import { pingRedis } from "@/lib/redis/client";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

async function checkDatabase(): Promise<boolean> {
  const url = process.env.DATABASE_URL;
  if (!url) return false;
  const pool = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 3000 });
  try {
    await pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  } finally {
    await pool.end().catch(() => undefined);
  }
}

export async function GET() {
  const [database, redis] = await Promise.all([checkDatabase(), pingRedis()]);

  const redisRequired = Boolean(process.env.REDIS_URL);
  const redisStatus = redisRequired ? (redis ? "ok" : "error") : "skipped";

  const ok = database && (!redisRequired || redis);

  const payload = {
    status: ok ? "ok" : "degraded",
    database: database ? "ok" : "error",
    redis: redisStatus,
    app: process.env.APP_ENV ?? process.env.NODE_ENV ?? "unknown",
    version: process.env.npm_package_version ?? "unknown",
    timestamp: new Date().toISOString(),
  };

  if (!ok && process.env.ALERT_ON_HEALTH_DEGRADED === "true") {
    const { sendAlert } = await import("@/lib/monitoring/alerts");
    void sendAlert({
      severity: "critical",
      title: "Health check dégradé",
      source: "api/health",
      details: JSON.stringify(payload),
      env: payload.app,
    });
  }

  return NextResponse.json(payload, { status: ok ? 200 : 503 });
}
