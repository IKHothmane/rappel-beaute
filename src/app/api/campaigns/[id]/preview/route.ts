import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireFeatureRead, stripOrganizationId } from "@/lib/auth/api-guard";
import { getCampaignById, previewCampaignAudience } from "@/lib/db/campaigns";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: RouteCtx) {
  const auth = await requireFeatureRead(request, "marketing");
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  try {
    const campaign = await getCampaignById(auth.session.organizationId, id);
    if (!campaign) {
      return NextResponse.json({ error: "Campagne introuvable." }, { status: 404 });
    }

    const raw = stripOrganizationId(
      (await request.json().catch(() => ({}))) as Record<string, unknown>,
    );
    const filters = raw.segmentFilters
      ? (raw.segmentFilters as typeof campaign.segmentFilters)
      : campaign.segmentFilters;
    const message =
      typeof raw.messageTemplate === "string" ? raw.messageTemplate : campaign.messageTemplate;
    const promotionId =
      raw.promotionId !== undefined ? (raw.promotionId as string | null) : campaign.promotionId;

    const preview = await previewCampaignAudience(
      auth.session.organizationId,
      filters,
      campaign.channel,
      message,
      promotionId,
    );
    return NextResponse.json(preview);
  } catch (error) {
    console.error("[POST /api/campaigns/:id/preview]", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
