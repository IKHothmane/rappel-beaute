import { recordAdsDecision } from "@/modules/ads/ads-audit.service";
import { activateGoogleCampaign, pauseGoogleCampaign, reduceOrRaiseBudget } from "@/modules/ads/ads-actions.service";
import { getAdsMetrics } from "@/modules/ads/ads-metrics.service";
import { decideAdsAction } from "@/modules/ads/ads-rules.service";
import { getAdsConfig, listAdsDecisions } from "@/modules/ads/ads-store";
import { adsConnectionStatus, syncGoogleAdsCampaigns } from "@/modules/ads/google-ads.service";

type Actor = { platformUserId?: string | null; platformUserName?: string | null };

export function journalMetrics(
  config: { mode: string; maxCostPerSignupDh: number; maxDailyBudgetDh: number; agentEnabled: boolean },
  input: {
    decision: string;
    reason: string;
    executed: boolean;
    todaySpendDh: number;
    signups: number;
    dailyBudgetDh: number;
    nextBudgetDh?: number | null;
  },
) {
  const cpa = input.signups > 0 ? Math.round((input.todaySpendDh / input.signups) * 100) / 100 : null;
  const mode =
    !config.agentEnabled ? "Désactivé" : config.mode === "OBSERVE" ? "Observation" : config.mode === "LIMITED" ? "Automatique limité" : "Optimisation";
  return {
    mode,
    decision: input.decision,
    motive: input.reason,
    todaySpendDh: input.todaySpendDh,
    signups: input.signups,
    cpa,
    cpaLimit: config.maxCostPerSignupDh,
    dailyLimit: config.maxDailyBudgetDh,
    dailyBudgetDh: input.dailyBudgetDh,
    nextBudgetDh: input.nextBudgetDh ?? null,
    googleAds: input.executed ? "ACTION EFFECTUÉE" : "AUCUNE ÉCRITURE",
  };
}

export async function getAdsDashboard() {
  const [config, metrics, decisions, connection] = await Promise.all([
    getAdsConfig(),
    getAdsMetrics(),
    listAdsDecisions(40),
    Promise.resolve(adsConnectionStatus()),
  ]);
  return { config, metrics, decisions, connection };
}

export async function runAdsAgent(actor: Actor, opts?: { sync?: boolean }) {
  const config = await getAdsConfig();
  if (opts?.sync) {
    if (!adsConnectionStatus().connected) {
      throw new Error("Google Ads n'est pas connecté. Renseignez les variables d'environnement du serveur.");
    }
    await syncGoogleAdsCampaigns();
  }
  const metrics = await getAdsMetrics();
  if (metrics.campaigns.length === 0) {
    await recordAdsDecision({
      ...actor,
      campaignId: null,
      kind: "ANALYZE",
      summary: "Agent Ads IA",
      reason: "Aucune campagne synchronisée. Les chiffres Google Ads ne sont pas inventés.",
      executed: false,
      blocked: false,
      metrics: journalMetrics(config, {
        decision: "Aucune écriture Google Ads",
        reason: "Aucune campagne synchronisée. Les chiffres Google Ads ne sont pas inventés.",
        executed: false,
        todaySpendDh: 0,
        signups: metrics.signupsToday,
        dailyBudgetDh: config.maxDailyBudgetDh,
      }),
    });
    return getAdsDashboard();
  }

  const single = metrics.campaigns.length === 1;
  for (const campaign of metrics.campaigns) {
    const signups = single ? metrics.signupsToday : campaign.googleConversions;
    const decision = decideAdsAction(config, {
      name: campaign.name,
      status: campaign.status,
      dailyBudgetDh: campaign.dailyBudgetDh,
      todaySpendDh: campaign.todaySpendDh,
      monthSpendDh: campaign.monthSpendDh,
      signups,
    });
    let executed = false;
    let reason = decision.reason;
    let decisionText = decision.decision;
    const mayWrite = config.agentEnabled && config.mode !== "OBSERVE";
    if (decision.execute && mayWrite) {
      try {
        if (decision.kind === "PAUSE") await pauseGoogleCampaign(campaign.externalId);
        else if (decision.kind === "ACTIVATE") await activateGoogleCampaign(campaign.externalId);
        else if (
          (decision.kind === "REDUCE_BUDGET" || decision.kind === "INCREASE_BUDGET") &&
          decision.nextBudgetDh != null
        ) {
          await reduceOrRaiseBudget({
            externalId: campaign.externalId,
            budgetResourceName: campaign.budgetResourceName,
            nextBudgetDh: decision.nextBudgetDh,
          });
        }
        executed = true;
      } catch (error) {
        executed = false;
        decisionText = "Aucune écriture Google Ads";
        reason = `${decision.reason} Exécution refusée : ${error instanceof Error ? error.message : "erreur Google Ads"}.`;
      }
    }
    await recordAdsDecision({
      ...actor,
      campaignId: campaign.id,
      externalId: campaign.externalId,
      kind: decision.kind,
      summary: "Agent Ads IA",
      reason,
      executed,
      blocked: decision.blocked || (decision.execute && !executed),
      metrics: journalMetrics(config, {
        decision: decisionText,
        reason,
        executed,
        todaySpendDh: campaign.todaySpendDh,
        signups,
        dailyBudgetDh: campaign.dailyBudgetDh,
        nextBudgetDh: decision.nextBudgetDh ?? null,
      }),
    });
  }
  return getAdsDashboard();
}
