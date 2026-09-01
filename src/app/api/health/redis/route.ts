import { NextResponse } from "next/server";
import { pingRedis } from "@/lib/redis/client";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!process.env.REDIS_URL) {
    return NextResponse.json({ status: "skipped", message: "REDIS_URL not configured" });
  }

  const ok = await pingRedis();
  return NextResponse.json(
    { status: ok ? "ok" : "error" },
    { status: ok ? 200 : 503 },
  );
}
