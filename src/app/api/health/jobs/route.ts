import { NextResponse } from "next/server";
import { readJobsHealth } from "@/lib/jobs/health";

export const dynamic = "force-dynamic";

export async function GET() {
  const health = await readJobsHealth();
  return NextResponse.json(health, { status: health.status === "error" ? 503 : 200 });
}
