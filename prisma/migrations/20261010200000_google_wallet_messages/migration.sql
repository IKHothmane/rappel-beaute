-- Messages Google Wallet. N'altère pas les visites, les récompenses ni le Web Push.

CREATE TABLE IF NOT EXISTS "GoogleWalletMessage" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "loyaltyCardId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "header" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GoogleWalletMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GoogleWalletMessage_organizationId_idempotencyKey_key"
  ON "GoogleWalletMessage"("organizationId", "idempotencyKey");
CREATE INDEX IF NOT EXISTS "GoogleWalletMessage_loyaltyCardId_sentAt_idx"
  ON "GoogleWalletMessage"("loyaltyCardId", "sentAt");
CREATE INDEX IF NOT EXISTS "GoogleWalletMessage_status_createdAt_idx"
  ON "GoogleWalletMessage"("status", "createdAt");

DO $$ BEGIN
  ALTER TABLE "GoogleWalletMessage"
    ADD CONSTRAINT "GoogleWalletMessage_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GoogleWalletMessage"
    ADD CONSTRAINT "GoogleWalletMessage_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GoogleWalletMessage"
    ADD CONSTRAINT "GoogleWalletMessage_loyaltyCardId_fkey"
    FOREIGN KEY ("loyaltyCardId") REFERENCES "LoyaltyCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
