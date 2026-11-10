import { NextResponse } from "next/server";
import { readJobsHealth } from "@/lib/jobs/health";
import { publicRoute } from "@/lib/http/route-scope";

export const dynamic = "force-dynamic";

export const GET = publicRoute(async function GET() {
  const health = await readJobsHealth();
  return NextResponse.json(health, { status: health.status === "error" ? 503 : 200 });
});
