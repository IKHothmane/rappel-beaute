import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { phoneKey } from "@/lib/rate-limit/keys";
import { publicPushBody } from "@/lib/push/eligibility";
import { authorizeCustomerPush } from "@/lib/push/customer-push";
import { setGrantCookie } from "@/lib/push/grant";
import { limitCustomerPush, tooMany } from "@/lib/push/guard";
import { consumeDimensions } from "@/lib/rate-limit";
import { clientIp } from "@/lib/http/client-ip";

export async function POST(request: NextRequest) {
  const raw = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const body = publicPushBody(raw);
  const phone = typeof raw?.phone === "string" ? raw.phone : "";
  if (!body.cardToken) return NextResponse.json({ error: "Carte introuvable." }, { status: 404 });
  const limited = await limitCustomerPush(request, body.cardToken);
  const phoneLimited = await consumeDimensions([
    {
      key: `push:phone:${clientIp(request)}:${phoneKey(phone)}`,
      limit: 5,
      windowMs: 60 * 60 * 1000,
      sensitivity: "sensitive",
    },
  ]);
  if (!limited.allowed || !phoneLimited.allowed) return tooMany();
  const result = await authorizeCustomerPush(body.cardToken, phone);
  if (!result.ok && result.reason === "not_found") {
    return NextResponse.json({ error: "Carte introuvable." }, { status: 404 });
  }
  if (!result.ok) {
    return NextResponse.json({ error: "Ce numéro ne correspond pas à cette carte." }, { status: 403 });
  }
  const response = NextResponse.json({ ok: true });
  setGrantCookie(response, result.grantToken);
  return response;
}
