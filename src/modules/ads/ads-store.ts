import { randomBytes } from "crypto";
import { Pool } from "pg";
import type { AdsAgentMode, AdsDecisionKind } from "@/modules/ads/ads-rules.service";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function id(prefix: string) {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

export type AdsConfigRow = {
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
  allowCreateCampaign: boolean;
  allowIncreaseOverCap: boolean;
  allowBidChanges: boolean;
};

export type AdsCampaignRow = {
  id: string;
  externalId: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "UNKNOWN";
  budgetResourceName: string | null;
  dailyBudgetDh: number;
  todaySpendDh: number;
  monthSpendDh: number;
  clicks: number;
  impressions: number;
  cpcDh: number;
  ctr: number;
  googleConversions: number;
  syncedAt: string | null;
};

export type AdsDecisionRow = {
  id: string;
  campaignId: string | null;
  campaignName: string | null;
  kind: AdsDecisionKind;
  summary: string;
  reason: string;
  executed: boolean;
  blocked: boolean;
  createdAt: string;
  metrics: Record<string, unknown> | null;
};

const CONFIG_DEFAULT: AdsConfigRow = {
  agentEnabled: false,
  mode: "OBSERVE",
  maxDailyBudgetDh: 100,
  maxMonthlyBudgetDh: 3000,
  maxIncreasePercent: 20,
  maxDecreasePercent: 30,
  maxCostPerSignupDh: 80,
  watchSpend: true,
  watchConversions: true,
  pauseOnBudget: true,
  pauseOnHighCost: true,
  reactivateWhenOk: true,
  optimizeBudget: false,
  autoPause: true,
  autoReactivate: true,
  allowCreateCampaign: false,
  allowIncreaseOverCap: false,
  allowBidChanges: false,
};

export async function getAdsConfig(): Promise<AdsConfigRow> {
  const res = await pool.query(`SELECT * FROM "AdsAgentConfig" WHERE id = 'default'`);
  const row = res.rows[0];
  if (!row) return CONFIG_DEFAULT;
  return mapConfig(row);
}

export async function saveAdsConfig(patch: Partial<AdsConfigRow>): Promise<AdsConfigRow> {
  const current = await getAdsConfig();
  const next = { ...current, ...patch };
  await pool.query(
    `INSERT INTO "AdsAgentConfig" (
      id, "agentEnabled", mode, "maxDailyBudgetDh", "maxMonthlyBudgetDh",
      "maxIncreasePercent", "maxDecreasePercent", "maxCostPerSignupDh",
      "watchSpend", "watchConversions", "pauseOnBudget", "pauseOnHighCost",
      "reactivateWhenOk", "optimizeBudget", "autoPause", "autoReactivate",
      "allowCreateCampaign", "allowIncreaseOverCap", "allowBidChanges", "updatedAt"
    ) VALUES (
      'default', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      "agentEnabled" = EXCLUDED."agentEnabled",
      mode = EXCLUDED.mode,
      "maxDailyBudgetDh" = EXCLUDED."maxDailyBudgetDh",
      "maxMonthlyBudgetDh" = EXCLUDED."maxMonthlyBudgetDh",
      "maxIncreasePercent" = EXCLUDED."maxIncreasePercent",
      "maxDecreasePercent" = EXCLUDED."maxDecreasePercent",
      "maxCostPerSignupDh" = EXCLUDED."maxCostPerSignupDh",
      "watchSpend" = EXCLUDED."watchSpend",
      "watchConversions" = EXCLUDED."watchConversions",
      "pauseOnBudget" = EXCLUDED."pauseOnBudget",
      "pauseOnHighCost" = EXCLUDED."pauseOnHighCost",
      "reactivateWhenOk" = EXCLUDED."reactivateWhenOk",
      "optimizeBudget" = EXCLUDED."optimizeBudget",
      "autoPause" = EXCLUDED."autoPause",
      "autoReactivate" = EXCLUDED."autoReactivate",
      "allowCreateCampaign" = EXCLUDED."allowCreateCampaign",
      "allowIncreaseOverCap" = EXCLUDED."allowIncreaseOverCap",
      "allowBidChanges" = EXCLUDED."allowBidChanges",
      "updatedAt" = NOW()`,
    [
      next.agentEnabled,
      next.mode,
      next.maxDailyBudgetDh,
      next.maxMonthlyBudgetDh,
      next.maxIncreasePercent,
      next.maxDecreasePercent,
      next.maxCostPerSignupDh,
      next.watchSpend,
      next.watchConversions,
      next.pauseOnBudget,
      next.pauseOnHighCost,
      next.reactivateWhenOk,
      next.optimizeBudget,
      next.autoPause,
      next.autoReactivate,
      next.allowCreateCampaign,
      next.allowIncreaseOverCap,
      next.allowBidChanges,
    ],
  );
  return next;
}

export async function listAdsCampaigns(): Promise<AdsCampaignRow[]> {
  const res = await pool.query(
    `SELECT * FROM "AdsCampaignSnapshot" ORDER BY name ASC`,
  );
  return res.rows.map(mapCampaign);
}

export async function upsertAdsCampaign(input: Omit<AdsCampaignRow, "id" | "syncedAt"> & { syncedAt?: string }) {
  const res = await pool.query(
    `INSERT INTO "AdsCampaignSnapshot" (
      id, "externalId", name, status, "budgetResourceName", "dailyBudgetDh",
      "todaySpendDh", "monthSpendDh", clicks, impressions, "cpcDh", ctr,
      "googleConversions", "syncedAt", "updatedAt"
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),NOW())
    ON CONFLICT ("externalId") DO UPDATE SET
      name = EXCLUDED.name,
      status = EXCLUDED.status,
      "budgetResourceName" = EXCLUDED."budgetResourceName",
      "dailyBudgetDh" = EXCLUDED."dailyBudgetDh",
      "todaySpendDh" = EXCLUDED."todaySpendDh",
      "monthSpendDh" = EXCLUDED."monthSpendDh",
      clicks = EXCLUDED.clicks,
      impressions = EXCLUDED.impressions,
      "cpcDh" = EXCLUDED."cpcDh",
      ctr = EXCLUDED.ctr,
      "googleConversions" = EXCLUDED."googleConversions",
      "syncedAt" = NOW(),
      "updatedAt" = NOW()
    RETURNING *`,
    [
      id("adsc"),
      input.externalId,
      input.name,
      input.status,
      input.budgetResourceName,
      input.dailyBudgetDh,
      input.todaySpendDh,
      input.monthSpendDh,
      input.clicks,
      input.impressions,
      input.cpcDh,
      input.ctr,
      input.googleConversions,
    ],
  );
  return mapCampaign(res.rows[0]);
}

export async function setAdsCampaignStatus(externalId: string, status: "ACTIVE" | "PAUSED") {
  await pool.query(
    `UPDATE "AdsCampaignSnapshot" SET status = $2, "updatedAt" = NOW() WHERE "externalId" = $1`,
    [externalId, status],
  );
}

export async function setAdsCampaignBudget(externalId: string, dailyBudgetDh: number) {
  await pool.query(
    `UPDATE "AdsCampaignSnapshot" SET "dailyBudgetDh" = $2, "updatedAt" = NOW() WHERE "externalId" = $1`,
    [externalId, dailyBudgetDh],
  );
}

export async function insertAdsDecision(input: {
  campaignId: string | null;
  kind: AdsDecisionKind;
  summary: string;
  reason: string;
  executed: boolean;
  blocked: boolean;
  metrics?: unknown;
}) {
  await pool.query(
    `INSERT INTO "AdsAgentDecision" (
      id, "campaignId", kind, summary, reason, executed, blocked, metrics
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
    [
      id("adsd"),
      input.campaignId,
      input.kind,
      input.summary,
      input.reason,
      input.executed,
      input.blocked,
      input.metrics != null ? JSON.stringify(input.metrics) : null,
    ],
  );
}

export async function listAdsDecisions(limit = 40): Promise<AdsDecisionRow[]> {
  const res = await pool.query(
    `SELECT d.*, c.name AS "campaignName"
     FROM "AdsAgentDecision" d
     LEFT JOIN "AdsCampaignSnapshot" c ON c.id = d."campaignId"
     ORDER BY d."createdAt" DESC
     LIMIT $1`,
    [Math.min(limit, 100)],
  );
  return res.rows.map((row) => ({
    id: String(row.id),
    campaignId: row.campaignId ? String(row.campaignId) : null,
    campaignName: row.campaignName ? String(row.campaignName) : null,
    kind: row.kind,
    summary: String(row.summary),
    reason: String(row.reason),
    executed: Boolean(row.executed),
    blocked: Boolean(row.blocked),
    createdAt: new Date(row.createdAt).toISOString(),
    metrics: row.metrics && typeof row.metrics === "object" ? (row.metrics as Record<string, unknown>) : null,
  }));
}

export async function platformAcquisitionCounts() {
  const res = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM "Organization"
        WHERE "createdAt" >= date_trunc('day', NOW() AT TIME ZONE 'Africa/Casablanca') AT TIME ZONE 'Africa/Casablanca') AS "signupsToday",
      (SELECT COUNT(*)::int FROM "Organization"
        WHERE "createdAt" >= date_trunc('month', NOW() AT TIME ZONE 'Africa/Casablanca') AT TIME ZONE 'Africa/Casablanca') AS "signupsMonth",
      (SELECT COUNT(*)::int FROM "Subscription" WHERE status = 'TRIAL') AS "activeTrials",
      (SELECT COUNT(*)::int FROM "Subscription" WHERE status = 'ACTIVE' AND paid = true) AS "subscriptions"
  `);
  const row = res.rows[0] ?? {};
  return {
    signupsToday: Number(row.signupsToday ?? 0),
    signupsMonth: Number(row.signupsMonth ?? 0),
    activeTrials: Number(row.activeTrials ?? 0),
    subscriptions: Number(row.subscriptions ?? 0),
  };
}

function mapConfig(row: Record<string, unknown>): AdsConfigRow {
  return {
    agentEnabled: Boolean(row.agentEnabled),
    mode: row.mode as AdsAgentMode,
    maxDailyBudgetDh: num(row.maxDailyBudgetDh),
    maxMonthlyBudgetDh: num(row.maxMonthlyBudgetDh),
    maxIncreasePercent: Number(row.maxIncreasePercent),
    maxDecreasePercent: Number(row.maxDecreasePercent),
    maxCostPerSignupDh: num(row.maxCostPerSignupDh),
    watchSpend: Boolean(row.watchSpend),
    watchConversions: Boolean(row.watchConversions),
    pauseOnBudget: Boolean(row.pauseOnBudget),
    pauseOnHighCost: Boolean(row.pauseOnHighCost),
    reactivateWhenOk: Boolean(row.reactivateWhenOk),
    optimizeBudget: Boolean(row.optimizeBudget),
    autoPause: Boolean(row.autoPause),
    autoReactivate: Boolean(row.autoReactivate),
    allowCreateCampaign: Boolean(row.allowCreateCampaign),
    allowIncreaseOverCap: Boolean(row.allowIncreaseOverCap),
    allowBidChanges: Boolean(row.allowBidChanges),
  };
}

function mapCampaign(row: Record<string, unknown>): AdsCampaignRow {
  return {
    id: String(row.id),
    externalId: String(row.externalId),
    name: String(row.name),
    status: row.status as AdsCampaignRow["status"],
    budgetResourceName: row.budgetResourceName ? String(row.budgetResourceName) : null,
    dailyBudgetDh: num(row.dailyBudgetDh),
    todaySpendDh: num(row.todaySpendDh),
    monthSpendDh: num(row.monthSpendDh),
    clicks: Number(row.clicks ?? 0),
    impressions: Number(row.impressions ?? 0),
    cpcDh: num(row.cpcDh),
    ctr: num(row.ctr),
    googleConversions: num(row.googleConversions),
    syncedAt: row.syncedAt ? new Date(String(row.syncedAt)).toISOString() : null,
  };
}

function num(value: unknown) {
  return Number(value ?? 0);
}
