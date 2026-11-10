import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clientIp } from "@/lib/http/client-ip";
import { saveLoyaltyCardProfile } from "@/lib/loyalty/card-review";
import { consumeDimensions } from "@/lib/rate-limit";
import { publicRoute } from "@/lib/http/route-scope";

export const POST = publicRoute(async function POST(request: NextRequest) {
  const ip = clientIp(request);
  const body = (await request.json().catch(() => null)) as {
    token?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  } | null;
  if (!body?.token) return NextResponse.json({ error: "Carte introuvable." }, { status: 404 });

  const limited = await consumeDimensions([
    { key: `loyalty:profile:ip:${ip}`, limit: 15, windowMs: 60 * 60 * 1000, sensitivity: "sensitive" },
    {
      key: `loyalty:profile:token:${body.token.trim().toUpperCase()}`,
      limit: 10,
      windowMs: 60 * 60 * 1000,
      sensitivity: "sensitive",
    },
  ]);
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez plus tard." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec ?? 3600) } },
    );
  }

  const result = await saveLoyaltyCardProfile({
    cardToken: body.token,
    firstName: String(body.firstName ?? ""),
    lastName: String(body.lastName ?? ""),
    phone: String(body.phone ?? ""),
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, code: result.code });
});
