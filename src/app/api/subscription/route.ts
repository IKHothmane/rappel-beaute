import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAppSession } from "@/lib/auth/api-guard";
import { getOrganizationSubscription } from "@/lib/subscriptions/subscription-service";

export async function GET(request: NextRequest) {
  const auth = requireAppSession(request);
  if (!auth.ok) return auth.response;

  const sub = await getOrganizationSubscription(auth.session.organizationId);
  if (!sub) {
    return NextResponse.json({ error: "Abonnement introuvable." }, { status: 404 });
  }
  return NextResponse.json({ subscription: sub });
}
