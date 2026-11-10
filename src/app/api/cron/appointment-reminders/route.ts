import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cronAuthorized, isDryRun } from "@/lib/cron/auth";
import { dispatchAutoAppointmentReminders } from "@/lib/whatsapp/auto-reminders";
import { jobRoute } from "@/lib/http/route-scope";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function run(request: NextRequest) {
  if (!cronAuthorized(request)) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  const result = await dispatchAutoAppointmentReminders({ dryRun: isDryRun(request) });
  return NextResponse.json({ ok: true, ...result });
}

export const GET = jobRoute(function GET(request: NextRequest) {
  return run(request);
});

export const POST = jobRoute(function POST(request: NextRequest) {
  return run(request);
});
