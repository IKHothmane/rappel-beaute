import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { publicPushBody } from "@/lib/push/eligibility";
import { subscribeCustomerPush } from "@/lib/push/customer-push";
import { grantFromRequest } from "@/lib/push/grant";
import { limitCustomerPush, tooMany } from "@/lib/push/guard";

export async function POST(request: NextRequest) {
  const body = publicPushBody(await request.json().catch(() => null));
  if (!body.cardToken) return NextResponse.json({ error: "Carte introuvable." }, { status: 404 });
  const limited = await limitCustomerPush(request, body.cardToken);
  if (!limited.allowed) return tooMany();
  const result = await subscribeCustomerPush({
    token: body.cardToken,
    endpoint: body.endpoint,
    p256dh: body.p256dh,
    auth: body.auth,
    expirationTime: body.expirationTime,
    preferences: body.preferences,
    grant: await grantFromRequest(request),
  });
  if (result === "not_found") return NextResponse.json({ error: "Carte introuvable." }, { status: 404 });
  if (result === "forbidden") return NextResponse.json({ error: "Autorisation requise." }, { status: 401 });
  if (result === "expired") {
    return NextResponse.json({ error: "Cet abonnement a expiré." }, { status: 410 });
  }
  if (result === "invalid") {
    return NextResponse.json({ error: "Abonnement navigateur invalide." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
