-- Reprises d'envoi et autorisation distincte du jeton public de la carte.

ALTER TABLE "CustomerPushDelivery" ADD COLUMN IF NOT EXISTS "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "CustomerPushDelivery" ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP(3);
ALTER TABLE "CustomerPushDelivery" ADD COLUMN IF NOT EXISTS "attemptCount" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "CustomerPushDelivery_status_nextAttemptAt_idx"
  ON "CustomerPushDelivery"("status", "nextAttemptAt");

CREATE TABLE IF NOT EXISTS "PushAccessGrant" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PushAccessGrant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PushAccessGrant_tokenHash_key" ON "PushAccessGrant"("tokenHash");
CREATE INDEX IF NOT EXISTS "PushAccessGrant_organizationId_customerId_idx"
  ON "PushAccessGrant"("organizationId", "customerId");

DO $$ BEGIN
  ALTER TABLE "PushAccessGrant"
    ADD CONSTRAINT "PushAccessGrant_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PushAccessGrant"
    ADD CONSTRAINT "PushAccessGrant_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
