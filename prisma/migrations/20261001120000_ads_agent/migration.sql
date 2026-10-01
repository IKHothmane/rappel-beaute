-- Agent Google Ads interne SUPER_ADMIN. Inactif et en observation par défaut.

CREATE TYPE "AdsAgentMode" AS ENUM ('OBSERVE', 'LIMITED', 'OPTIMIZE');
CREATE TYPE "AdsCampaignStatus" AS ENUM ('ACTIVE', 'PAUSED', 'UNKNOWN');
CREATE TYPE "AdsDecisionKind" AS ENUM (
  'ANALYZE',
  'PAUSE',
  'ACTIVATE',
  'REDUCE_BUDGET',
  'INCREASE_BUDGET',
  'BLOCKED'
);

CREATE TABLE "AdsAgentConfig" (
  id TEXT PRIMARY KEY DEFAULT 'default',
  "agentEnabled" BOOLEAN NOT NULL DEFAULT false,
  mode "AdsAgentMode" NOT NULL DEFAULT 'OBSERVE',
  "maxDailyBudgetDh" DECIMAL(10, 2) NOT NULL DEFAULT 100,
  "maxMonthlyBudgetDh" DECIMAL(10, 2) NOT NULL DEFAULT 3000,
  "maxIncreasePercent" INTEGER NOT NULL DEFAULT 20,
  "maxDecreasePercent" INTEGER NOT NULL DEFAULT 30,
  "maxCostPerSignupDh" DECIMAL(10, 2) NOT NULL DEFAULT 80,
  "watchSpend" BOOLEAN NOT NULL DEFAULT true,
  "watchConversions" BOOLEAN NOT NULL DEFAULT true,
  "pauseOnBudget" BOOLEAN NOT NULL DEFAULT true,
  "pauseOnHighCost" BOOLEAN NOT NULL DEFAULT true,
  "reactivateWhenOk" BOOLEAN NOT NULL DEFAULT true,
  "optimizeBudget" BOOLEAN NOT NULL DEFAULT false,
  "autoPause" BOOLEAN NOT NULL DEFAULT true,
  "autoReactivate" BOOLEAN NOT NULL DEFAULT true,
  "allowCreateCampaign" BOOLEAN NOT NULL DEFAULT false,
  "allowIncreaseOverCap" BOOLEAN NOT NULL DEFAULT false,
  "allowBidChanges" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO "AdsAgentConfig" (id) VALUES ('default');

CREATE INDEX "AdsAgentConfig_mode_idx" ON "AdsAgentConfig" (mode);

CREATE TABLE "AdsCampaignSnapshot" (
  id TEXT PRIMARY KEY,
  "externalId" TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status "AdsCampaignStatus" NOT NULL DEFAULT 'UNKNOWN',
  "budgetResourceName" TEXT,
  "dailyBudgetDh" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "todaySpendDh" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "monthSpendDh" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  "cpcDh" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  ctr DECIMAL(8, 4) NOT NULL DEFAULT 0,
  "googleConversions" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "syncedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "AdsCampaignSnapshot_status_idx" ON "AdsCampaignSnapshot" (status);
CREATE INDEX "AdsCampaignSnapshot_syncedAt_idx" ON "AdsCampaignSnapshot" ("syncedAt");

CREATE TABLE "AdsAgentDecision" (
  id TEXT PRIMARY KEY,
  "campaignId" TEXT REFERENCES "AdsCampaignSnapshot" (id) ON DELETE SET NULL,
  kind "AdsDecisionKind" NOT NULL,
  summary TEXT NOT NULL,
  reason TEXT NOT NULL,
  executed BOOLEAN NOT NULL DEFAULT false,
  blocked BOOLEAN NOT NULL DEFAULT false,
  metrics JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "AdsAgentDecision_createdAt_idx" ON "AdsAgentDecision" ("createdAt");
CREATE INDEX "AdsAgentDecision_campaignId_idx" ON "AdsAgentDecision" ("campaignId");
CREATE INDEX "AdsAgentDecision_kind_idx" ON "AdsAgentDecision" (kind);
