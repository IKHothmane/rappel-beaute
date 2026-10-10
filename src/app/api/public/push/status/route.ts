import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cardTokenFromClient } from "@/lib/push/eligibility";
import { customerPushStatus } from "@/lib/push/customer-push";
import { grantFromRequest } from "@/lib/push/grant";
import { limitCustomerPush, tooMany } from "@/lib/push/guard";

export async function GET(request: NextRequest) {
  const token = cardTokenFromClient({
    cardToken: new URL(request.url).searchParams.get("cardToken") ?? "",
  });
  if (!token) return NextResponse.json({ error: "Carte introuvable." }, { status: 404 });
  const limited = await limitCustomerPush(request, token);
  if (!limited.allowed) return tooMany();
  const status = await customerPushStatus(token, await grantFromRequest(request));
  if (!status) return NextResponse.json({ error: "Carte introuvable." }, { status: 404 });
  return NextResponse.json(status);
}
