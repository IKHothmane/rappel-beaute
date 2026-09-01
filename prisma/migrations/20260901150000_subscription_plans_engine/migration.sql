-- Étape 40 — Plans + Subscription évolutif

CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'YEARLY');

ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'TRIAL';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'PAUSED';

CREATE TABLE "Plan" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "price" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'MAD',
  "billingInterval" "BillingInterval" NOT NULL DEFAULT 'MONTHLY',
  "maxStaff" INTEGER,
  "maxCustomers" INTEGER,
  "maxAppointmentsPerMonth" INTEGER,
  "maxResources" INTEGER,
  "trialDays" INTEGER NOT NULL DEFAULT 14,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "features" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Plan_code_key" ON "Plan"("code");
CREATE INDEX "Plan_active_idx" ON "Plan"("active");

INSERT INTO "Plan" (
  "id", "code", "name", "description", "price", "currency", "billingInterval",
  "maxStaff", "maxCustomers", "maxAppointmentsPerMonth", "maxResources",
  "trialDays", "active", "features", "updatedAt"
) VALUES
(
  'plan_starter', 'STARTER', 'Starter', 'Essentiel pour démarrer',
  299, 'MAD', 'MONTHLY', 3, 500, 150, 3, 14, true,
  '{
    "agenda": true, "customers": true, "services": true, "staff": true,
    "booking": true, "whatsappManual": true,
    "inventory": false, "purchases": false, "cashRegister": false,
    "invoices": false, "expenses": false, "commissions": false,
    "loyalty": false, "marketing": false, "reviews": false, "analytics": false,
    "multiSite": false, "api": false, "automation": false, "ai": false
  }'::jsonb,
  NOW()
),
(
  'plan_institut', 'INSTITUT', 'Institut', 'Complet pour instituts établis',
  499, 'MAD', 'MONTHLY', 10, 2000, 300, 10, 14, true,
  '{
    "agenda": true, "customers": true, "services": true, "staff": true,
    "booking": true, "whatsappManual": true,
    "inventory": true, "purchases": true, "cashRegister": true,
    "invoices": true, "expenses": true, "commissions": true,
    "loyalty": true, "marketing": true, "reviews": true, "analytics": true,
    "multiSite": false, "api": false, "automation": false, "ai": false
  }'::jsonb,
  NOW()
),
(
  'plan_premium', 'PREMIUM', 'Premium', 'Scale & automatisation',
  899, 'MAD', 'MONTHLY', 50, 10000, 1000, 50, 14, true,
  '{
    "agenda": true, "customers": true, "services": true, "staff": true,
    "booking": true, "whatsappManual": true,
    "inventory": true, "purchases": true, "cashRegister": true,
    "invoices": true, "expenses": true, "commissions": true,
    "loyalty": true, "marketing": true, "reviews": true, "analytics": true,
    "multiSite": true, "api": true, "automation": true, "ai": true
  }'::jsonb,
  NOW()
)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "price" = EXCLUDED."price",
  "maxStaff" = EXCLUDED."maxStaff",
  "maxCustomers" = EXCLUDED."maxCustomers",
  "maxAppointmentsPerMonth" = EXCLUDED."maxAppointmentsPerMonth",
  "maxResources" = EXCLUDED."maxResources",
  "features" = EXCLUDED."features",
  "updatedAt" = NOW();

-- Migration Subscription
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "planId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "priceSnapshot" DECIMAL(10,2);
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "currencySnapshot" TEXT DEFAULT 'MAD';
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "currentPeriodStart" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "currentPeriodEnd" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMP(3);

UPDATE "Subscription" s SET
  "planId" = p."id",
  "priceSnapshot" = s."price",
  "currencySnapshot" = 'MAD',
  "startedAt" = COALESCE(s."startAt", NOW()),
  "currentPeriodStart" = COALESCE(s."startAt", NOW()),
  "currentPeriodEnd" = COALESCE(s."renewAt", NOW() + INTERVAL '1 month')
FROM "Plan" p
WHERE s."planId" IS NULL AND p."code" = s."plan"::text;

UPDATE "Subscription" SET "planId" = 'plan_institut' WHERE "planId" IS NULL;

UPDATE "Subscription" SET
  "priceSnapshot" = COALESCE("priceSnapshot", 499),
  "startedAt" = COALESCE("startedAt", NOW()),
  "currentPeriodStart" = COALESCE("currentPeriodStart", NOW()),
  "currentPeriodEnd" = COALESCE("currentPeriodEnd", NOW() + INTERVAL '1 month')
WHERE "priceSnapshot" IS NULL OR "startedAt" IS NULL;

ALTER TABLE "Subscription" ALTER COLUMN "planId" SET NOT NULL;
ALTER TABLE "Subscription" ALTER COLUMN "priceSnapshot" SET NOT NULL;
ALTER TABLE "Subscription" ALTER COLUMN "startedAt" SET NOT NULL;
ALTER TABLE "Subscription" ALTER COLUMN "currentPeriodStart" SET NOT NULL;
ALTER TABLE "Subscription" ALTER COLUMN "currentPeriodEnd" SET NOT NULL;

ALTER TABLE "Subscription" DROP COLUMN IF EXISTS "plan";
ALTER TABLE "Subscription" DROP COLUMN IF EXISTS "price";
ALTER TABLE "Subscription" DROP COLUMN IF EXISTS "startAt";
ALTER TABLE "Subscription" DROP COLUMN IF EXISTS "renewAt";

CREATE INDEX IF NOT EXISTS "Subscription_planId_idx" ON "Subscription"("planId");

ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DROP TYPE IF EXISTS "SubscriptionPlan";
