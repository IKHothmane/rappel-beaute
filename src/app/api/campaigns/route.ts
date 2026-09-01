import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureRead,
  requireFeatureWrite,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import { createCampaign, listCampaigns, previewCampaignAudience } from "@/lib/db/campaigns";
import { canWriteCampaigns } from "@/lib/rbac";
import { validateCreateCampaign, validatePreviewBody } from "@/lib/validation/campaign";

export async function GET(request: NextRequest) {
  const auth = await requireFeatureRead(request, "marketing");
  if (!auth.ok) return auth.response;
  try {
    const result = await listCampaigns(auth.session.organizationId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[GET /api/campaigns]", error);
    return NextResponse.json({ error: "Impossible de charger les campagnes." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireFeatureWrite(request, "marketing");
  if (!auth.ok) return auth.response;

  try {
    const raw = stripOrganizationId((await request.json()) as Record<string, unknown>);
    const actor = {
      id: auth.session.id,
      name: `${auth.session.firstName} ${auth.session.lastName}`.trim(),
    };

    if (raw.action === "preview") {
      const validated = validatePreviewBody(raw);
      if (!validated.ok) {
        return NextResponse.json({ error: "Données invalides." }, { status: 400 });
      }
      const preview = await previewCampaignAudience(
        auth.session.organizationId,
        validated.segmentFilters,
        validated.channel,
        validated.messageTemplate,
        validated.promotionId,
      );
      return NextResponse.json(preview);
    }

    if (!canWriteCampaigns(auth.session.role)) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }

    const validated = validateCreateCampaign(raw);
    if (!validated.ok) {
      return NextResponse.json({ error: "Données invalides.", details: validated.errors }, { status: 400 });
    }

    const campaign = await createCampaign(auth.session.organizationId, validated.data, actor);
    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error("[POST /api/campaigns]", error);
    return NextResponse.json({ error: "Impossible de créer la campagne." }, { status: 500 });
  }
}
