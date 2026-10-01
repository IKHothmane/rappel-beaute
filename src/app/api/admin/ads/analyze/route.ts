import type { NextRequest } from "next/server";
import { adminError, adminJson, requireSuperAdmin } from "@/lib/admin/api-helpers";
import { runAdsAgent } from "@/modules/ads/ads-agent.service";

export async function POST(request: NextRequest) {
  const auth = requireSuperAdmin(request);
  if (!auth.ok) return auth.response;
  try {
    const body = (await request.json().catch(() => ({}))) as { sync?: boolean };
    const dashboard = await runAdsAgent(
      {
        platformUserId: auth.session?.id,
        platformUserName: `${auth.session?.firstName ?? ""} ${auth.session?.lastName ?? ""}`.trim(),
      },
      { sync: Boolean(body.sync) },
    );
    return adminJson(dashboard);
  } catch (error) {
    console.error("[POST /api/admin/ads/analyze]", error);
    return adminError(error instanceof Error ? error.message : "Analyse impossible.", 500);
  }
}
