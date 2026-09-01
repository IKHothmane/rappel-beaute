import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAppSession } from "@/lib/auth/api-guard";
import { getSubscriptionUsage } from "@/lib/subscriptions/usage";

export async function GET(request: NextRequest) {
  const auth = requireAppSession(request);
  if (!auth.ok) return auth.response;

  const usage = await getSubscriptionUsage(auth.session.organizationId);
  if (!usage) {
    return NextResponse.json({ error: "Abonnement introuvable." }, { status: 404 });
  }
  return NextResponse.json({ usage });
}
