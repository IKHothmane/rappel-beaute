-- Loyalty + Packages (forfaits)

CREATE TYPE "LoyaltyLevel" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'VIP');
CREATE TYPE "LoyaltyTxnType" AS ENUM ('EARN', 'REDEEM', 'ADJUSTMENT', 'EXPIRE');
CREATE TYPE "LoyaltyRewardType" AS ENUM ('DISCOUNT_FIXED', 'DISCOUNT_PERCENT', 'FREE_SERVICE');
CREATE TYPE "LoyaltyRedemptionStatus" AS ENUM ('APPLIED', 'VOID');
CREATE TYPE "PackageStatus" AS ENUM ('ACTIVE', 'EXHAUSTED', 'VOID', 'EXPIRED');

CREATE TABLE IF NOT EXISTS "LoyaltyProgram" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "madPerPoint" DECIMAL(10,2) NOT NULL DEFAULT 1,
  "bronzeMin" INTEGER NOT NULL DEFAULT 0,
  "silverMin" INTEGER NOT NULL DEFAULT 1000,
  "goldMin" INTEGER NOT NULL DEFAULT 3000,
  "vipMin" INTEGER NOT NULL DEFAULT 6000,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LoyaltyProgram_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LoyaltyProgram_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "LoyaltyProgram_organizationId_key" ON "LoyaltyProgram"("organizationId");

CREATE TABLE IF NOT EXISTS "LoyaltyAccount" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "balance" INTEGER NOT NULL DEFAULT 0,
  "lifetimePoints" INTEGER NOT NULL DEFAULT 0,
  "level" "LoyaltyLevel" NOT NULL DEFAULT 'BRONZE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LoyaltyAccount_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LoyaltyAccount_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LoyaltyAccount_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "LoyaltyAccount_organizationId_customerId_key"
  ON "LoyaltyAccount"("organizationId", "customerId");
CREATE INDEX IF NOT EXISTS "LoyaltyAccount_organizationId_idx" ON "LoyaltyAccount"("organizationId");
CREATE INDEX IF NOT EXISTS "LoyaltyAccount_organizationId_level_idx" ON "LoyaltyAccount"("organizationId", "level");
CREATE INDEX IF NOT EXISTS "LoyaltyAccount_organizationId_balance_idx" ON "LoyaltyAccount"("organizationId", "balance");

CREATE TABLE IF NOT EXISTS "LoyaltyTransaction" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "type" "LoyaltyTxnType" NOT NULL,
  "points" INTEGER NOT NULL,
  "balanceAfter" INTEGER NOT NULL,
  "reason" TEXT,
  "paymentId" TEXT,
  "appointmentId" TEXT,
  "rewardId" TEXT,
  "redemptionId" TEXT,
  "createdById" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoyaltyTransaction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LoyaltyTransaction_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LoyaltyTransaction_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "LoyaltyAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "LoyaltyTransaction_organizationId_idempotencyKey_key"
  ON "LoyaltyTransaction"("organizationId", "idempotencyKey");
CREATE INDEX IF NOT EXISTS "LoyaltyTransaction_organizationId_idx" ON "LoyaltyTransaction"("organizationId");
CREATE INDEX IF NOT EXISTS "LoyaltyTransaction_accountId_idx" ON "LoyaltyTransaction"("accountId");
CREATE INDEX IF NOT EXISTS "LoyaltyTransaction_customerId_idx" ON "LoyaltyTransaction"("customerId");
CREATE INDEX IF NOT EXISTS "LoyaltyTransaction_organizationId_createdAt_idx"
  ON "LoyaltyTransaction"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "LoyaltyTransaction_paymentId_idx" ON "LoyaltyTransaction"("paymentId");

CREATE TABLE IF NOT EXISTS "LoyaltyReward" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "pointsCost" INTEGER NOT NULL,
  "type" "LoyaltyRewardType" NOT NULL,
  "value" DECIMAL(10,2),
  "serviceId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "maxRedemptions" INTEGER,
  "redemptionCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LoyaltyReward_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LoyaltyReward_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "LoyaltyReward_organizationId_idx" ON "LoyaltyReward"("organizationId");
CREATE INDEX IF NOT EXISTS "LoyaltyReward_organizationId_active_idx" ON "LoyaltyReward"("organizationId", "active");

CREATE TABLE IF NOT EXISTS "LoyaltyRedemption" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "rewardId" TEXT NOT NULL,
  "pointsSpent" INTEGER NOT NULL,
  "status" "LoyaltyRedemptionStatus" NOT NULL DEFAULT 'APPLIED',
  "appointmentId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoyaltyRedemption_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LoyaltyRedemption_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LoyaltyRedemption_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "LoyaltyAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LoyaltyRedemption_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LoyaltyRedemption_rewardId_fkey"
    FOREIGN KEY ("rewardId") REFERENCES "LoyaltyReward"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "LoyaltyRedemption_organizationId_idempotencyKey_key"
  ON "LoyaltyRedemption"("organizationId", "idempotencyKey");
CREATE INDEX IF NOT EXISTS "LoyaltyRedemption_organizationId_idx" ON "LoyaltyRedemption"("organizationId");
CREATE INDEX IF NOT EXISTS "LoyaltyRedemption_customerId_idx" ON "LoyaltyRedemption"("customerId");
CREATE INDEX IF NOT EXISTS "LoyaltyRedemption_rewardId_idx" ON "LoyaltyRedemption"("rewardId");
CREATE INDEX IF NOT EXISTS "LoyaltyRedemption_accountId_idx" ON "LoyaltyRedemption"("accountId");

CREATE TABLE IF NOT EXISTS "Package" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "serviceId" TEXT,
  "sessionTotal" INTEGER NOT NULL,
  "sessionUsed" INTEGER NOT NULL DEFAULT 0,
  "pricePaid" DECIMAL(12,2) NOT NULL,
  "status" "PackageStatus" NOT NULL DEFAULT 'ACTIVE',
  "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "paymentId" TEXT,
  "notes" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Package_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Package_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Package_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Package_serviceId_fkey"
    FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Package_organizationId_idx" ON "Package"("organizationId");
CREATE INDEX IF NOT EXISTS "Package_customerId_idx" ON "Package"("customerId");
CREATE INDEX IF NOT EXISTS "Package_organizationId_status_idx" ON "Package"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "Package_serviceId_idx" ON "Package"("serviceId");

CREATE TABLE IF NOT EXISTS "PackageItem" (
  "id" TEXT NOT NULL,
  "packageId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "sessionTotal" INTEGER NOT NULL,
  "sessionUsed" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "PackageItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PackageItem_packageId_fkey"
    FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PackageItem_serviceId_fkey"
    FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "PackageItem_packageId_idx" ON "PackageItem"("packageId");
CREATE INDEX IF NOT EXISTS "PackageItem_serviceId_idx" ON "PackageItem"("serviceId");

CREATE TABLE IF NOT EXISTS "PackageSession" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "packageId" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PackageSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PackageSession_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PackageSession_packageId_fkey"
    FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PackageSession_appointmentId_fkey"
    FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "PackageSession_organizationId_idempotencyKey_key"
  ON "PackageSession"("organizationId", "idempotencyKey");
CREATE INDEX IF NOT EXISTS "PackageSession_organizationId_idx" ON "PackageSession"("organizationId");
CREATE INDEX IF NOT EXISTS "PackageSession_packageId_idx" ON "PackageSession"("packageId");
CREATE INDEX IF NOT EXISTS "PackageSession_appointmentId_idx" ON "PackageSession"("appointmentId");
