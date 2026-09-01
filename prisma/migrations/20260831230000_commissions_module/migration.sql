-- Commission adjustments + monthly period closure

CREATE TYPE "CommissionPeriodStatus" AS ENUM ('OPEN', 'CLOSED');

CREATE TABLE IF NOT EXISTS "CommissionAdjustment" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "commissionRecordId" TEXT NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "reason" TEXT NOT NULL,
  "paymentId" TEXT,
  "createdById" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommissionAdjustment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommissionAdjustment_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CommissionAdjustment_commissionRecordId_fkey"
    FOREIGN KEY ("commissionRecordId") REFERENCES "CommissionRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "CommissionAdjustment_organizationId_idempotencyKey_key"
  ON "CommissionAdjustment"("organizationId", "idempotencyKey");
CREATE INDEX IF NOT EXISTS "CommissionAdjustment_organizationId_idx"
  ON "CommissionAdjustment"("organizationId");
CREATE INDEX IF NOT EXISTS "CommissionAdjustment_commissionRecordId_idx"
  ON "CommissionAdjustment"("commissionRecordId");
CREATE INDEX IF NOT EXISTS "CommissionAdjustment_organizationId_createdAt_idx"
  ON "CommissionAdjustment"("organizationId", "createdAt");

CREATE TABLE IF NOT EXISTS "CommissionPeriod" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "status" "CommissionPeriodStatus" NOT NULL DEFAULT 'OPEN',
  "closedAt" TIMESTAMP(3),
  "closedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommissionPeriod_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommissionPeriod_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "CommissionPeriod_organizationId_year_month_key"
  ON "CommissionPeriod"("organizationId", "year", "month");
CREATE INDEX IF NOT EXISTS "CommissionPeriod_organizationId_idx"
  ON "CommissionPeriod"("organizationId");
CREATE INDEX IF NOT EXISTS "CommissionPeriod_organizationId_status_idx"
  ON "CommissionPeriod"("organizationId", "status");

CREATE INDEX IF NOT EXISTS "CommissionRecord_organizationId_serviceId_idx"
  ON "CommissionRecord"("organizationId", "serviceId");
