import { NextResponse } from "next/server";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return NextResponse.json({ status: "error", message: "DATABASE_URL not configured" }, { status: 503 });
  }

  const pool = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 3000 });
  try {
    const start = Date.now();
    await pool.query("SELECT 1");
    return NextResponse.json({
      status: "ok",
      latencyMs: Date.now() - start,
    });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 503 });
  } finally {
    await pool.end().catch(() => undefined);
  }
}
