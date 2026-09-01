-- Promotions + Gift cards

DO $$ BEGIN
  ALTER TYPE "PaymentMethod" ADD VALUE 'GIFT_CARD';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TYPE "PromotionType" AS ENUM (
  'PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SERVICE', 'PACKAGE', 'HAPPY_HOUR'
);
CREATE TYPE "PromotionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'EXPIRED');
CREATE TYPE "GiftCardStatus" AS ENUM ('ACTIVE', 'USED', 'EXPIRED', 'CANCELLED');
CREATE TYPE "GiftCardTxnType" AS ENUM ('ISSUED', 'REDEEMED', 'ADJUSTMENT', 'REFUND');

ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "promotionId" TEXT;
CREATE INDEX IF NOT EXISTS "Appointment_promotionId_idx" ON "Appointment"("promotionId");

ALTER TABLE "Invoice"
  ADD COLUMN IF NOT EXISTS "promotionId" TEXT,
  ADD COLUMN IF NOT EXISTS "promotionNameSnapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "promotionCodeSnapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "promotionTypeSnapshot" TEXT;
CREATE INDEX IF NOT EXISTS "Invoice_promotionId_idx" ON "Invoice"("promotionId");

ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "giftCardId" TEXT;
CREATE INDEX IF NOT EXISTS "Payment_giftCardId_idx" ON "Payment"("giftCardId");

CREATE TABLE IF NOT EXISTS "Promotion" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "type" "PromotionType" NOT NULL,
  "status" "PromotionStatus" NOT NULL DEFAULT 'ACTIVE',
  "value" DECIMAL(10,2),
  "serviceId" TEXT,
  "category" TEXT,
  "customerId" TEXT,
  "minAmount" DECIMAL(10,2),
  "maxUses" INTEGER,
  "maxUsesPerCustomer" INTEGER,
  "usageCount" INTEGER NOT NULL DEFAULT 0,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "timeStart" TEXT,
  "timeEnd" TEXT,
  "weekdays" TEXT,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Promotion_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Promotion_organizationId_code_key"
  ON "Promotion"("organizationId", "code");
CREATE INDEX IF NOT EXISTS "Promotion_organizationId_idx" ON "Promotion"("organizationId");
CREATE INDEX IF NOT EXISTS "Promotion_organizationId_status_idx" ON "Promotion"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "Promotion_organizationId_deletedAt_idx" ON "Promotion"("organizationId", "deletedAt");
CREATE INDEX IF NOT EXISTS "Promotion_serviceId_idx" ON "Promotion"("serviceId");

CREATE TABLE IF NOT EXISTS "PromotionUsage" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "promotionId" TEXT NOT NULL,
  "customerId" TEXT,
  "appointmentId" TEXT,
  "invoiceId" TEXT,
  "discountAmount" DECIMAL(10,2) NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PromotionUsage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PromotionUsage_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PromotionUsage_promotionId_fkey"
    FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PromotionUsage_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "PromotionUsage_organizationId_idempotencyKey_key"
  ON "PromotionUsage"("organizationId", "idempotencyKey");
CREATE INDEX IF NOT EXISTS "PromotionUsage_organizationId_idx" ON "PromotionUsage"("organizationId");
CREATE INDEX IF NOT EXISTS "PromotionUsage_promotionId_idx" ON "PromotionUsage"("promotionId");
CREATE INDEX IF NOT EXISTS "PromotionUsage_customerId_idx" ON "PromotionUsage"("customerId");

DO $$ BEGIN
  ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_promotionId_fkey"
    FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_promotionId_fkey"
    FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "GiftCard" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "initialValue" DECIMAL(12,2) NOT NULL,
  "balance" DECIMAL(12,2) NOT NULL,
  "buyerCustomerId" TEXT,
  "beneficiaryCustomerId" TEXT,
  "status" "GiftCardStatus" NOT NULL DEFAULT 'ACTIVE',
  "expiresAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GiftCard_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GiftCard_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "GiftCard_buyerCustomerId_fkey"
    FOREIGN KEY ("buyerCustomerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "GiftCard_beneficiaryCustomerId_fkey"
    FOREIGN KEY ("beneficiaryCustomerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "GiftCard_organizationId_code_key" ON "GiftCard"("organizationId", "code");
CREATE INDEX IF NOT EXISTS "GiftCard_organizationId_idx" ON "GiftCard"("organizationId");
CREATE INDEX IF NOT EXISTS "GiftCard_organizationId_status_idx" ON "GiftCard"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "GiftCard_buyerCustomerId_idx" ON "GiftCard"("buyerCustomerId");
CREATE INDEX IF NOT EXISTS "GiftCard_beneficiaryCustomerId_idx" ON "GiftCard"("beneficiaryCustomerId");

CREATE TABLE IF NOT EXISTS "GiftCardTransaction" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "giftCardId" TEXT NOT NULL,
  "type" "GiftCardTxnType" NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "balanceAfter" DECIMAL(12,2) NOT NULL,
  "reason" TEXT,
  "paymentId" TEXT,
  "createdById" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GiftCardTransaction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GiftCardTransaction_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "GiftCardTransaction_giftCardId_fkey"
    FOREIGN KEY ("giftCardId") REFERENCES "GiftCard"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "GiftCardTransaction_organizationId_idempotencyKey_key"
  ON "GiftCardTransaction"("organizationId", "idempotencyKey");
CREATE INDEX IF NOT EXISTS "GiftCardTransaction_organizationId_idx" ON "GiftCardTransaction"("organizationId");
CREATE INDEX IF NOT EXISTS "GiftCardTransaction_giftCardId_idx" ON "GiftCardTransaction"("giftCardId");
CREATE INDEX IF NOT EXISTS "GiftCardTransaction_paymentId_idx" ON "GiftCardTransaction"("paymentId");

DO $$ BEGIN
  ALTER TABLE "Payment" ADD CONSTRAINT "Payment_giftCardId_fkey"
    FOREIGN KEY ("giftCardId") REFERENCES "GiftCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
