import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAppSession } from "@/lib/auth/api-guard";
import { getOrganizationSubscription } from "@/lib/subscriptions/subscription-service";
import { PLAN_FEATURE_LABELS, type PlanFeatureKey } from "@/types/subscription";

export async function GET(request: NextRequest) {
  const auth = requireAppSession(request);
  if (!auth.ok) return auth.response;

  const sub = await getOrganizationSubscription(auth.session.organizationId);
  if (!sub) {
    return NextResponse.json({ error: "Abonnement introuvable." }, { status: 404 });
  }

  const features = (Object.keys(PLAN_FEATURE_LABELS) as PlanFeatureKey[]).map((key) => ({
    key,
    label: PLAN_FEATURE_LABELS[key],
    enabled: sub.features[key] === true,
  }));

  return NextResponse.json({ features, planCode: sub.planCode, planName: sub.planName });
}
