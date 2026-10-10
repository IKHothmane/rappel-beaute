import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { dispatchAllDueCustomerPushes } from "@/lib/push/customer-push";

export const dynamic = "force-dynamic";

function cronAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim() ?? "";
  if (secret.length < 16) return false;
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const left = Buffer.from(token);
  const right = Buffer.from(secret);
  if (left.length !== right.length || left.length === 0) return false;
  return timingSafeEqual(left, right);
}

async function run(request: NextRequest) {
  if (!cronAuthorized(request)) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  const result = await dispatchAllDueCustomerPushes();
  return NextResponse.json({ ok: true, sent: result.sent, organizations: result.organizations });
}

export function GET(request: NextRequest) {
  return run(request);
}

export function POST(request: NextRequest) {
  return run(request);
}
