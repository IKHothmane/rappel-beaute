import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireFeatureWrite } from "@/lib/auth/api-guard";
import { getCampaignById, prepareCampaign } from "@/lib/db/campaigns";
import { canPrepareCampaigns } from "@/lib/rbac";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: RouteCtx) {
  const auth = await requireFeatureWrite(request, "marketing");
  if (!auth.ok) return auth.response;
  if (!canPrepareCampaigns(auth.session.role)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const { id } = await ctx.params;
  try {
    const actor = {
      id: auth.session.id,
      name: `${auth.session.firstName} ${auth.session.lastName}`.trim(),
    };
    const result = await prepareCampaign(auth.session.organizationId, id, actor);
    const campaign = await getCampaignById(auth.session.organizationId, id);
    return NextResponse.json({ ...result, campaign });
  } catch (error) {
    console.error("[POST /api/campaigns/:id/prepare]", error);
    const msg = error instanceof Error ? error.message : "Erreur serveur.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
