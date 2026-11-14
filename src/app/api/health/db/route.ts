import { NextResponse } from "next/server";
import { Pool } from "pg";
import { publicRoute } from "@/lib/http/route-scope";
import { connectionStringFor } from "@/lib/db/tenant-pool";

export const dynamic = "force-dynamic";

export const GET = publicRoute(async function GET() {
  let url: string | undefined;
  try {
    url = connectionStringFor("public") ?? process.env.DATABASE_URL;
  } catch {
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
  if (!url) {
    return NextResponse.json({ status: "error" }, { status: 503 });
  }

  const pool = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 3000 });
  try {
    const start = Date.now();
    const { rows } = await pool.query<{ role: string; ready: boolean }>(
      `SELECT current_user AS role, to_regprocedure('app_current_org()') IS NOT NULL AS ready`,
    );
    const ready = Boolean(rows[0]?.ready);
    return NextResponse.json(
      {
        status: ready ? "ok" : "error",
        latencyMs: Date.now() - start,
        role: rows[0]?.role ?? "unknown",
        schema: ready ? "ready" : "missing",
      },
      { status: ready ? 200 : 503 },
    );
  } catch {
    return NextResponse.json({ status: "error" }, { status: 503 });
  } finally {
    await pool.end().catch(() => undefined);
  }
});
