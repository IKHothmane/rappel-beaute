import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cronAuthorized } from "@/lib/cron/auth";
import { dispatchAllDueCustomerPushes } from "@/lib/push/customer-push";
import { jobRoute } from "@/lib/http/route-scope";

export const dynamic = "force-dynamic";

async function run(request: NextRequest) {
  if (!cronAuthorized(request)) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  const result = await dispatchAllDueCustomerPushes();
  return NextResponse.json({ ok: true, sent: result.sent, organizations: result.organizations });
}

export const GET = jobRoute(function GET(request: NextRequest) {
  return run(request);
});

export const POST = jobRoute(function POST(request: NextRequest) {
  return run(request);
});
