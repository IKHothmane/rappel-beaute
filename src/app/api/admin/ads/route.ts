import type { NextRequest } from "next/server";
import { adminError, adminJson, requireSuperAdmin } from "@/lib/admin/api-helpers";
import { writePlatformAuditLog } from "@/lib/db/platform-audit";
import { recordAdsDecision } from "@/modules/ads/ads-audit.service";
import { getAdsDashboard, journalMetrics } from "@/modules/ads/ads-agent.service";
import { getAdsConfig, saveAdsConfig, type AdsConfigRow } from "@/modules/ads/ads-store";
import type { AdsAgentMode } from "@/modules/ads/ads-rules.service";

export async function GET(request: NextRequest) {
  const auth = requireSuperAdmin(request);
  if (!auth.ok) return auth.response;
  try {
    return adminJson(await getAdsDashboard());
  } catch (error) {
    console.error("[GET /api/admin/ads]", error);
    return adminError("Impossible de charger l'agent Ads.", 500);
  }
}

export async function PATCH(request: NextRequest) {
  const auth = requireSuperAdmin(request);
  if (!auth.ok) return auth.response;
  try {
    const body = (await request.json()) as { patch?: Partial<AdsConfigRow>; emergency?: boolean };
    const patch = sanitize(body.patch ?? {});
    if (!patch) return adminError("Réglages invalides.", 400);
    const nextPatch = body.emergency ? { ...patch, agentEnabled: false } : patch;
    if (!nextPatch) return adminError("Réglages invalides.", 400);
    const before = await getAdsConfig();
    const settings = await saveAdsConfig(nextPatch);
    if (body.emergency) {
      await recordAdsDecision({
        platformUserId: auth.session?.id,
        platformUserName: actorName(auth.session),
        campaignId: null,
        kind: "BLOCKED",
        summary: "Pause d'urgence",
        reason: "Toute action automatique est arrêtée.",
        executed: false,
        blocked: true,
        metrics: journalMetrics(
          { ...settings, agentEnabled: false },
          {
            decision: "Aucune écriture Google Ads",
            reason: "Pause d'urgence. Toute action automatique est arrêtée.",
            executed: false,
            todaySpendDh: 0,
            signups: 0,
            dailyBudgetDh: settings.maxDailyBudgetDh,
          },
        ),
      });
    }
    await writePlatformAuditLog({
      platformUserId: auth.session?.id,
      platformUserName: actorName(auth.session),
      entityType: "ADS_AGENT",
      entityId: "config",
      action: "ADS_CONFIG",
      before,
      after: settings,
    });
    return adminJson({ settings });
  } catch (error) {
    console.error("[PATCH /api/admin/ads]", error);
    return adminError("Impossible d'enregistrer les règles.", 500);
  }
}

function actorName(session?: { firstName?: string; lastName?: string } | null) {
  return `${session?.firstName ?? ""} ${session?.lastName ?? ""}`.trim();
}

function sanitize(patch?: Partial<AdsConfigRow>): Partial<AdsConfigRow> | null {
  if (!patch || typeof patch !== "object") return null;
  const next: Partial<AdsConfigRow> = {};
  if (typeof patch.agentEnabled === "boolean") next.agentEnabled = patch.agentEnabled;
  if (patch.mode === "OBSERVE" || patch.mode === "LIMITED" || patch.mode === "OPTIMIZE") {
    next.mode = patch.mode as AdsAgentMode;
  }
  const daily = bound(patch.maxDailyBudgetDh, 1, 100_000);
  const monthly = bound(patch.maxMonthlyBudgetDh, 1, 1_000_000);
  if (daily != null) next.maxDailyBudgetDh = daily;
  if (monthly != null) next.maxMonthlyBudgetDh = monthly;
  if (
    (next.maxDailyBudgetDh ?? 0) > 0 &&
    (next.maxMonthlyBudgetDh ?? monthly ?? 0) > 0 &&
    (next.maxMonthlyBudgetDh ?? Number.POSITIVE_INFINITY) < (next.maxDailyBudgetDh ?? 0)
  ) {
    return null;
  }
  const inc = bound(patch.maxIncreasePercent, 0, 100);
  const dec = bound(patch.maxDecreasePercent, 0, 90);
  const cost = bound(patch.maxCostPerSignupDh, 0, 100_000);
  if (inc != null) next.maxIncreasePercent = Math.min(inc, 100);
  if (dec != null) next.maxDecreasePercent = dec;
  if (cost != null) next.maxCostPerSignupDh = cost;
  for (const key of [
    "watchSpend",
    "watchConversions",
    "pauseOnBudget",
    "pauseOnHighCost",
    "reactivateWhenOk",
    "optimizeBudget",
    "autoPause",
    "autoReactivate",
    "allowCreateCampaign",
    "allowIncreaseOverCap",
    "allowBidChanges",
  ] as const) {
    if (typeof patch[key] === "boolean") next[key] = patch[key];
  }
  next.allowCreateCampaign = false;
  next.allowIncreaseOverCap = false;
  next.allowBidChanges = false;
  return next;
}

function bound(value: unknown, min: number, max: number) {
  if (value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return Math.round(n * 100) / 100;
}
