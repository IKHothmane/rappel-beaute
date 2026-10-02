export type AdsAgentMode = "OBSERVE" | "LIMITED" | "OPTIMIZE";
export type AdsDecisionKind =
  | "ANALYZE"
  | "PAUSE"
  | "ACTIVATE"
  | "REDUCE_BUDGET"
  | "INCREASE_BUDGET"
  | "BLOCKED";

export type AdsRuleConfig = {
  agentEnabled: boolean;
  mode: AdsAgentMode;
  maxDailyBudgetDh: number;
  maxMonthlyBudgetDh: number;
  maxIncreasePercent: number;
  maxDecreasePercent: number;
  maxCostPerSignupDh: number;
  watchSpend: boolean;
  watchConversions: boolean;
  pauseOnBudget: boolean;
  pauseOnHighCost: boolean;
  reactivateWhenOk: boolean;
  optimizeBudget: boolean;
  autoPause: boolean;
  autoReactivate: boolean;
  allowIncreaseOverCap: boolean;
};

export type AdsRuleCampaign = {
  name: string;
  status: "ACTIVE" | "PAUSED" | "UNKNOWN";
  dailyBudgetDh: number;
  todaySpendDh: number;
  monthSpendDh: number;
  signups: number;
};

export type AdsRuleDecision = {
  kind: AdsDecisionKind;
  execute: boolean;
  blocked: boolean;
  reason: string;
  summary: string;
  /** Texte affiché dans le journal, après application des plafonds. */
  decision: string;
  nextBudgetDh?: number;
};

function money(n: number) {
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}

function hold(
  summary: string,
  reason: string,
  kind: AdsDecisionKind = "ANALYZE",
  decision = "Aucune écriture Meta Ads",
): AdsRuleDecision {
  return { kind, execute: false, blocked: true, reason, summary, decision };
}

/**
 * Le moteur de règles décide seul. Aucune recommandation ne dépasse les plafonds,
 * et le mode observation n'exécute jamais d'écriture.
 */
export function decideAdsAction(config: AdsRuleConfig, campaign: AdsRuleCampaign): AdsRuleDecision {
  const name = campaign.name;
  const cost =
    campaign.signups > 0 ? campaign.todaySpendDh / campaign.signups : null;

  if (campaign.status === "UNKNOWN") {
    return hold(
      `Analyse ${name}`,
      "Statut de campagne inconnu : aucune action.",
    );
  }

  const overBudget =
    config.watchSpend &&
    (campaign.todaySpendDh > config.maxDailyBudgetDh ||
      campaign.monthSpendDh > config.maxMonthlyBudgetDh);

  if (overBudget) {
    const reason = `Dépense ${money(campaign.todaySpendDh)} DH aujourd'hui (plafond ${money(config.maxDailyBudgetDh)} DH) ou ${money(campaign.monthSpendDh)} DH ce mois (plafond ${money(config.maxMonthlyBudgetDh)} DH).`;
    return gate(config, {
      kind: "PAUSE",
      summary: `Pause ${name}`,
      decision: `Campagne mise en pause`,
      reason,
      allowed:
        config.pauseOnBudget &&
        config.autoPause &&
        campaign.status === "ACTIVE" &&
        config.mode !== "OBSERVE",
      blockReason: blockReason(config, "pause"),
    });
  }

  if (
    config.watchConversions &&
    campaign.signups === 0 &&
    campaign.todaySpendDh >= config.maxCostPerSignupDh &&
    campaign.todaySpendDh > 0
  ) {
    return gate(config, {
      kind: "PAUSE",
      summary: `Pause ${name}`,
      decision: "Campagne mise en pause",
      reason: `Aucune inscription après ${money(campaign.todaySpendDh)} DH. Seuil ${money(config.maxCostPerSignupDh)} DH.`,
      allowed:
        config.pauseOnHighCost &&
        config.autoPause &&
        campaign.status === "ACTIVE" &&
        config.mode !== "OBSERVE",
      blockReason: blockReason(config, "pause"),
    });
  }

  if (config.watchConversions && cost != null && cost > config.maxCostPerSignupDh && campaign.status === "ACTIVE") {
    const factor = 1 - config.maxDecreasePercent / 100;
    const next = roundMoney(Math.max(1, campaign.dailyBudgetDh * factor));
    return gate(config, {
      kind: "REDUCE_BUDGET",
      summary: `Budget ${name} réduit`,
      decision: `Budget réduit de ${money(campaign.dailyBudgetDh)} DH → ${money(next)} DH`,
      reason: `Règle −${config.maxDecreasePercent} % maximum. CPA ${money(cost)} DH, au-dessus de ${money(config.maxCostPerSignupDh)} DH.`,
      nextBudgetDh: next,
      allowed:
        config.pauseOnHighCost &&
        config.mode !== "OBSERVE" &&
        next < campaign.dailyBudgetDh,
      blockReason: blockReason(config, "reduce"),
    });
  }

  const profitable = cost != null && cost <= config.maxCostPerSignupDh;
  if (profitable && campaign.status === "ACTIVE" && config.optimizeBudget) {
    const step = Math.min(10, Math.max(0, config.maxIncreasePercent));
    const requested = campaign.dailyBudgetDh * (1 + step / 100);
    const ceiling = campaign.dailyBudgetDh * (1 + config.maxIncreasePercent / 100);
    const next = roundMoney(Math.min(requested, ceiling, config.maxDailyBudgetDh));
    if (next <= campaign.dailyBudgetDh) {
      return {
        kind: "ANALYZE",
        execute: false,
        blocked: false,
        summary: `Analyse ${name}`,
        decision: "Aucune action",
        reason: `CPA inférieur au seuil. Budget déjà au plafond autorisé (${money(campaign.dailyBudgetDh)} DH).`,
      };
    }
    return gate(config, {
      kind: "INCREASE_BUDGET",
      summary: `Budget ${name} ajusté`,
      decision: `Budget augmenté de ${money(campaign.dailyBudgetDh)} DH → ${money(next)} DH`,
      reason: `Règle +${config.maxIncreasePercent} % maximum. CPA ${money(cost)} DH, sous le seuil ${money(config.maxCostPerSignupDh)} DH.`,
      nextBudgetDh: next,
      allowed: config.mode === "LIMITED" || config.mode === "OPTIMIZE",
      blockReason: blockReason(config, "increase"),
    });
  }

  const acceptable =
    campaign.todaySpendDh <= config.maxDailyBudgetDh &&
    campaign.monthSpendDh <= config.maxMonthlyBudgetDh &&
    (cost == null || cost <= config.maxCostPerSignupDh);

  if (campaign.status === "PAUSED" && acceptable && config.reactivateWhenOk) {
    return gate(config, {
      kind: "ACTIVATE",
      summary: `Réactivation ${name}`,
      decision: "Campagne réactivée",
      reason: "Les plafonds de dépense et de coût par inscription sont respectés.",
      allowed: config.autoReactivate && config.mode !== "OBSERVE",
      blockReason: blockReason(config, "activate"),
    });
  }

  return {
    kind: "ANALYZE",
    execute: false,
    blocked: false,
    summary: `Analyse ${name}`,
    decision: "Aucune action",
    reason:
      cost == null
        ? "Aucun dépassement de plafond."
        : "CPA inférieur au seuil.",
  };
}

function gate(
  config: AdsRuleConfig,
  input: {
    kind: AdsDecisionKind;
    summary: string;
    decision: string;
    reason: string;
    allowed: boolean;
    blockReason: string;
    nextBudgetDh?: number;
  },
): AdsRuleDecision {
  if (!config.agentEnabled || config.mode === "OBSERVE" || !input.allowed) {
    const motive = !input.allowed && config.agentEnabled && config.mode !== "OBSERVE"
      ? `${input.blockReason} ${input.reason}`
      : input.reason;
    return hold(input.summary, motive, input.kind, "Aucune écriture Meta Ads");
  }
  return {
    kind: input.kind,
    execute: true,
    blocked: false,
    summary: input.summary,
    decision: input.decision,
    reason: input.reason,
    nextBudgetDh: input.nextBudgetDh,
  };
}

function blockReason(config: AdsRuleConfig, action: "pause" | "reduce" | "increase" | "activate") {
  if (!config.agentEnabled) return "Agent en pause.";
  if (config.mode === "OBSERVE") return "Mode observation : aucune modification envoyée à Meta Ads.";
  if (action === "pause" && !config.autoPause) return "La pause automatique est désactivée.";
  if (action === "activate" && !config.autoReactivate) return "La réactivation automatique est désactivée.";
  return "Action non autorisée par les règles.";
}

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}
