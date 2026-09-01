import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureRead,
  requireFeatureWrite,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import { getCampaignById, updateCampaign } from "@/lib/db/campaigns";
import { canWriteCampaigns } from "@/lib/rbac";
import { validateUpdateCampaign } from "@/lib/validation/campaign";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, ctx: RouteCtx) {
  const auth = await requireFeatureRead(request, "marketing");
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  try {
    const campaign = await getCampaignById(auth.session.organizationId, id);
    if (!campaign) {
      return NextResponse.json({ error: "Campagne introuvable." }, { status: 404 });
    }
    return NextResponse.json(campaign);
  } catch (error) {
    console.error("[GET /api/campaigns/:id]", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, ctx: RouteCtx) {
  const auth = await requireFeatureWrite(request, "marketing");
  if (!auth.ok) return auth.response;
  if (!canWriteCampaigns(auth.session.role)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const { id } = await ctx.params;
  try {
    const raw = stripOrganizationId((await request.json()) as Record<string, unknown>);
    const validated = validateUpdateCampaign(raw);
    if (!validated.ok) {
      return NextResponse.json({ error: "Données invalides." }, { status: 400 });
    }
    const actor = {
      id: auth.session.id,
      name: `${auth.session.firstName} ${auth.session.lastName}`.trim(),
    };
    const campaign = await updateCampaign(auth.session.organizationId, id, validated.data, actor);
    if (!campaign) {
      return NextResponse.json({ error: "Campagne introuvable." }, { status: 404 });
    }
    return NextResponse.json(campaign);
  } catch (error) {
    console.error("[PATCH /api/campaigns/:id]", error);
    const msg = error instanceof Error ? error.message : "Erreur serveur.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
