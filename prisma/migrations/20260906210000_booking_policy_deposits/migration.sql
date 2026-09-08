-- 41.17 Acompte V1 & anti-no-show

CREATE TYPE "DepositState" AS ENUM (
  'NOT_REQUIRED',
  'AWAITING',
  'PAID',
  'FORFEITED',
  'REFUNDED'
);

CREATE TYPE "DepositDefaultMode" AS ENUM (
  'NONE',
  'FIXED',
  'PERCENT'
);

CREATE TYPE "DepositRetentionPolicy" AS ENUM (
  'KEEP',
  'REFUND'
);

ALTER TABLE "Appointment"
  ADD COLUMN "depositState" "DepositState" NOT NULL DEFAULT 'NOT_REQUIRED',
  ADD COLUMN "depositDueAt" TIMESTAMP(3);

-- Backfill: si deposit > 0 et statut PENDING → AWAITING, sinon NOT_REQUIRED / PAID heuristique
UPDATE "Appointment"
SET "depositState" = CASE
  WHEN deposit IS NOT NULL AND deposit > 0 AND status = 'PENDING' THEN 'AWAITING'::"DepositState"
  WHEN deposit IS NOT NULL AND deposit > 0 AND status NOT IN ('PENDING', 'CANCELLED') THEN 'PAID'::"DepositState"
  ELSE 'NOT_REQUIRED'::"DepositState"
END;

CREATE INDEX "Appointment_organizationId_depositState_idx"
  ON "Appointment"("organizationId", "depositState");

CREATE TABLE "BookingPolicySettings" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "depositsEnabled" BOOLEAN NOT NULL DEFAULT false,
  "defaultMode" "DepositDefaultMode" NOT NULL DEFAULT 'NONE',
  "defaultFixedAmount" DECIMAL(10,2),
  "defaultPercent" DECIMAL(5,2),
  "confirmDeadlineHours" INTEGER NOT NULL DEFAULT 24,
  "lateCancelHours" INTEGER NOT NULL DEFAULT 24,
  "onCustomerLateCancel" "DepositRetentionPolicy" NOT NULL DEFAULT 'KEEP',
  "onNoShow" "DepositRetentionPolicy" NOT NULL DEFAULT 'KEEP',
  "onInstituteCancel" "DepositRetentionPolicy" NOT NULL DEFAULT 'REFUND',
  "noShowWarnAt" INTEGER NOT NULL DEFAULT 1,
  "noShowRequireDepositAt" INTEGER NOT NULL DEFAULT 2,
  "noShowStrictAt" INTEGER NOT NULL DEFAULT 3,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BookingPolicySettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BookingPolicySettings_organizationId_key"
  ON "BookingPolicySettings"("organizationId");

ALTER TABLE "BookingPolicySettings"
  ADD CONSTRAINT "BookingPolicySettings_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
