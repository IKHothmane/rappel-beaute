import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireFeatureRead } from "@/lib/auth/api-guard";
import { listCampaignRecipients } from "@/lib/db/campaigns";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, ctx: RouteCtx) {
  const auth = await requireFeatureRead(request, "marketing");
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  try {
    const recipients = await listCampaignRecipients(auth.session.organizationId, id);
    return NextResponse.json({ data: recipients });
  } catch (error) {
    console.error("[GET /api/campaigns/:id/recipients]", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
