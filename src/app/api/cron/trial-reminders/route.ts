import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cronAuthorized, isDryRun } from "@/lib/cron/auth";
import { sendTrialReminders } from "@/lib/subscriptions/trial-reminders";
import { jobRoute } from "@/lib/http/route-scope";

export const dynamic = "force-dynamic";

async function run(request: NextRequest) {
  if (!cronAuthorized(request)) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  const result = await sendTrialReminders({ dryRun: isDryRun(request) });
  return NextResponse.json({ ok: true, ...result });
}

export const GET = jobRoute(function GET(request: NextRequest) {
  return run(request);
});

export const POST = jobRoute(function POST(request: NextRequest) {
  return run(request);
});
