-- Finance V1 — Caisse + Paiements enrichis + Remboursements

-- PaymentMethod: ajouter ONLINE
DO $$ BEGIN
  ALTER TYPE "PaymentMethod" ADD VALUE 'ONLINE';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TYPE "PaymentKind" AS ENUM ('PAYMENT', 'DEPOSIT', 'REFUND');
CREATE TYPE "CashRegisterStatus" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "CashTxnType" AS ENUM (
  'OPENING', 'SALE', 'REFUND_OUT', 'CASH_OUT', 'CASH_IN', 'CLOSING'
);

-- Enrichir Payment
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS kind "PaymentKind" NOT NULL DEFAULT 'PAYMENT';
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "parentPaymentId" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;

DO $$ BEGIN
  ALTER TABLE "Payment"
    ADD CONSTRAINT "Payment_parentPaymentId_fkey"
    FOREIGN KEY ("parentPaymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_organizationId_idempotencyKey_key"
  ON "Payment"("organizationId", "idempotencyKey");

CREATE INDEX IF NOT EXISTS "Payment_customerId_idx" ON "Payment"("customerId");
CREATE INDEX IF NOT EXISTS "Payment_parentPaymentId_idx" ON "Payment"("parentPaymentId");
CREATE INDEX IF NOT EXISTS "Payment_organizationId_paidAt_idx" ON "Payment"("organizationId", "paidAt");

CREATE TABLE IF NOT EXISTS "CashRegisterSession" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "openedById" TEXT NOT NULL,
  "closedById" TEXT,
  "openingFloat" DECIMAL(12,2) NOT NULL,
  "closingCounted" DECIMAL(12,2),
  "expectedBalance" DECIMAL(12,2),
  "difference" DECIMAL(12,2),
  "closeReason" TEXT,
  "status" "CashRegisterStatus" NOT NULL DEFAULT 'OPEN',
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CashRegisterSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CashRegisterSession_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "CashRegisterSession_organizationId_idx"
  ON "CashRegisterSession"("organizationId");
CREATE INDEX IF NOT EXISTS "CashRegisterSession_organizationId_status_idx"
  ON "CashRegisterSession"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "CashRegisterSession_organizationId_openedAt_idx"
  ON "CashRegisterSession"("organizationId", "openedAt");

-- Une seule caisse OPEN par organisation
CREATE UNIQUE INDEX IF NOT EXISTS "CashRegisterSession_one_open_per_org"
  ON "CashRegisterSession"("organizationId")
  WHERE "status" = 'OPEN';

CREATE TABLE IF NOT EXISTS "CashRegisterTransaction" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "type" "CashTxnType" NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "method" "PaymentMethod" DEFAULT 'CASH',
  "reason" TEXT,
  "paymentId" TEXT,
  "userId" TEXT,
  "idempotencyKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CashRegisterTransaction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CashRegisterTransaction_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CashRegisterTransaction_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "CashRegisterSession"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CashRegisterTransaction_paymentId_fkey"
    FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "CashRegisterTransaction_organizationId_idempotencyKey_key"
  ON "CashRegisterTransaction"("organizationId", "idempotencyKey");

CREATE INDEX IF NOT EXISTS "CashRegisterTransaction_sessionId_idx"
  ON "CashRegisterTransaction"("sessionId");
CREATE INDEX IF NOT EXISTS "CashRegisterTransaction_organizationId_createdAt_idx"
  ON "CashRegisterTransaction"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "CashRegisterTransaction_paymentId_idx"
  ON "CashRegisterTransaction"("paymentId");
