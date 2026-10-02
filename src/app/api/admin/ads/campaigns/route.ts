import type { NextRequest } from "next/server";
import { adminError, adminJson, requireSuperAdmin } from "@/lib/admin/api-helpers";
import { recordAdsDecision } from "@/modules/ads/ads-audit.service";
import { activateMetaCampaign, pauseMetaCampaign } from "@/modules/ads/ads-actions.service";
import { listAdsCampaigns } from "@/modules/ads/ads-store";

export async function POST(request: NextRequest) {
  const auth = requireSuperAdmin(request);
  if (!auth.ok) return auth.response;
  try {
    const body = (await request.json()) as { externalId?: string; action?: string };
    const externalId = body.externalId?.trim();
    if (!externalId || (body.action !== "PAUSE" && body.action !== "ACTIVATE")) {
      return adminError("Action invalide.", 400);
    }
    const campaign = (await listAdsCampaigns()).find((item) => item.externalId === externalId);
    if (!campaign) return adminError("Campagne introuvable.", 404);
    if (body.action === "PAUSE") await pauseMetaCampaign(externalId);
    else await activateMetaCampaign(externalId);
    await recordAdsDecision({
      platformUserId: auth.session?.id,
      platformUserName: `${auth.session?.firstName ?? ""} ${auth.session?.lastName ?? ""}`.trim(),
      campaignId: campaign.id,
      externalId,
      kind: body.action === "PAUSE" ? "PAUSE" : "ACTIVATE",
      summary: body.action === "PAUSE" ? `Pause manuelle ${campaign.name}` : `Activation manuelle ${campaign.name}`,
      reason: "Action demandée par le super administrateur.",
      executed: true,
      blocked: false,
    });
    return adminJson({ ok: true });
  } catch (error) {
    console.error("[POST /api/admin/ads/campaigns]", error);
    return adminError(error instanceof Error ? error.message : "Action Meta Ads impossible.", 500);
  }
}
