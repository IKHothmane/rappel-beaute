import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireFeatureRead, requireFeatureWrite, stripOrganizationId } from "@/lib/auth/api-guard";
import { listInstituteReviews, moderateInstituteReview } from "@/lib/reviews/public-review";

export async function GET(request: NextRequest) {
  const auth = await requireFeatureRead(request, "reviews");
  if (!auth.ok) return auth.response;
  const reviews = await listInstituteReviews(auth.session.organizationId);
  return NextResponse.json({ reviews });
}

export async function POST(request: NextRequest) {
  const auth = await requireFeatureWrite(request, "reviews");
  if (!auth.ok) return auth.response;
  const raw = stripOrganizationId((await request.json().catch(() => null)) as Record<string, unknown> | null ?? {});
  const action = String(raw.action ?? "");
  const reviewId = String(raw.reviewId ?? "");
  if (!reviewId || (action !== "publish" && action !== "reject" && action !== "report")) {
    return NextResponse.json({ error: "Action invalide." }, { status: 400 });
  }
  const ok = await moderateInstituteReview({
    organizationId: auth.session.organizationId,
    reviewId,
    action,
    reason: typeof raw.reason === "string" ? raw.reason : undefined,
    actorId: auth.session.id,
    actorName: `${auth.session.firstName} ${auth.session.lastName}`.trim(),
  });
  if (!ok) return NextResponse.json({ error: "Avis introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
