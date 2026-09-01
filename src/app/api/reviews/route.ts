import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureRead,
  requireFeatureWrite,
  requireFeatureWriteLimited,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import {
  getOrCreateReviewSettings,
  listRecentDissatisfiedAlerts,
  listReviewRequests,
  recordReviewSatisfaction,
  skipReviewRequest,
  updateReviewSettings,
} from "@/lib/db/reviews";
import { canManageReviewSettings, canSendReviews } from "@/lib/rbac";
import { parseReviewAction } from "@/lib/validation/review";
import type { ReviewRequestStatus } from "@/types/review";

export async function GET(request: NextRequest) {
  const auth = await requireFeatureRead(request, "reviews");
  if (!auth.ok) return auth.response;
  try {
    const sp = new URL(request.url).searchParams;
    const status = (sp.get("status")?.trim() || undefined) as ReviewRequestStatus | "ALL" | undefined;
    const result = await listReviewRequests(auth.session.organizationId, {
      status: status ?? undefined,
    });
    const alerts = canManageReviewSettings(auth.session.role)
      ? await listRecentDissatisfiedAlerts(auth.session.organizationId)
      : [];
    return NextResponse.json({ ...result, alerts });
  } catch (error) {
    console.error("[GET /api/reviews]", error);
    return NextResponse.json({ error: "Impossible de charger les avis." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireFeatureWriteLimited(request, "reviews");
  if (!auth.ok) return auth.response;

  try {
    const raw = stripOrganizationId((await request.json()) as Record<string, unknown>);
    const parsed = parseReviewAction(raw);
    const actor = {
      id: auth.session.id,
      name: `${auth.session.firstName} ${auth.session.lastName}`.trim(),
    };

    if (parsed.action === "invalid") {
      return NextResponse.json({ error: "Action invalide." }, { status: 400 });
    }

    if (parsed.action === "updateSettings") {
      if (!canManageReviewSettings(auth.session.role)) {
        return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
      }
      const settings = await updateReviewSettings(
        auth.session.organizationId,
        parsed.data,
        actor,
      );
      return NextResponse.json(settings);
    }

    if (!canSendReviews(auth.session.role)) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }

    if (parsed.action === "skip") {
      const ok = await skipReviewRequest(auth.session.organizationId, parsed.reviewId, actor);
      if (!ok) return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
      return NextResponse.json({ ok: true });
    }

    if (parsed.action === "recordSatisfaction") {
      const result = await recordReviewSatisfaction(
        auth.session.organizationId,
        parsed.reviewId,
        parsed.satisfaction,
        actor,
      );
      if (!result.ok) {
        return NextResponse.json({ error: "Demande introuvable ou pas encore envoyée." }, { status: 404 });
      }
      return NextResponse.json({ ok: true, alert: result.alert ?? null });
    }

    return NextResponse.json({ error: "Action non supportée." }, { status: 400 });
  } catch (error) {
    console.error("[POST /api/reviews]", error);
    return NextResponse.json({ error: "Action impossible." }, { status: 500 });
  }
}
