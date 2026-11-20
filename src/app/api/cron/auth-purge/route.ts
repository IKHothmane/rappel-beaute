import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cronAuthorized, isDryRun } from "@/lib/cron/auth";
import { purgeExpiredAuthState } from "@/lib/db/auth-purge";
import { logger } from "@/lib/logger";
import { jobRoute } from "@/lib/http/route-scope";

export const dynamic = "force-dynamic";

async function run(request: NextRequest) {
  if (!cronAuthorized(request)) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  // dryRun : aucune suppression, aucun accès base.
  if (isDryRun(request)) return NextResponse.json({ ok: true, dryRun: true });
  try {
    const result = await purgeExpiredAuthState();
    logger.info("auth purge", { route: "/api/cron/auth-purge", ...result });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    logger.error("auth purge failed", {
      route: "/api/cron/auth-purge",
      error: error instanceof Error ? error.name : "unknown",
    });
    return NextResponse.json({ error: "Purge impossible." }, { status: 500 });
  }
}

export const GET = jobRoute(function GET(request: NextRequest) {
  return run(request);
});

export const POST = jobRoute(function POST(request: NextRequest) {
  return run(request);
});
