import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { preferencesOnEnable, publicPushBody } from "@/lib/push/eligibility";
import { updateCustomerPushPreferences } from "@/lib/push/customer-push";
import { grantFromRequest } from "@/lib/push/grant";
import { limitCustomerPush, tooMany } from "@/lib/push/guard";

export async function POST(request: NextRequest) {
  const body = publicPushBody(await request.json().catch(() => null));
  if (!body.cardToken) return NextResponse.json({ error: "Carte introuvable." }, { status: 404 });
  const limited = await limitCustomerPush(request, body.cardToken);
  if (!limited.allowed) return tooMany();
  const result = await updateCustomerPushPreferences(
    body.cardToken,
    preferencesOnEnable(body.preferences),
    await grantFromRequest(request),
  );
  if (result === "not_found") return NextResponse.json({ error: "Carte introuvable." }, { status: 404 });
  if (result === "forbidden") return NextResponse.json({ error: "Autorisation requise." }, { status: 401 });
  if (result === "inactive") {
    return NextResponse.json({ error: "Activez d'abord les notifications." }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
