-- Carte de fidélité par passages. Le QR porte un jeton public, pas l'identifiant cliente.

ALTER TABLE "LoyaltyProgram"
  ADD COLUMN IF NOT EXISTS "visitsPerReward" INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS "rewardLabel" TEXT NOT NULL DEFAULT 'Récompense';

DO $$ BEGIN
  CREATE TYPE "LoyaltyEventType" AS ENUM ('VISIT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "LoyaltyCard" (
  id TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "publicToken" TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "LoyaltyCard_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LoyaltyCard_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "LoyaltyCard_publicToken_key" ON "LoyaltyCard"("publicToken");
CREATE UNIQUE INDEX IF NOT EXISTS "LoyaltyCard_organizationId_customerId_key"
  ON "LoyaltyCard"("organizationId", "customerId");
CREATE INDEX IF NOT EXISTS "LoyaltyCard_organizationId_idx" ON "LoyaltyCard"("organizationId");
CREATE INDEX IF NOT EXISTS "LoyaltyCard_customerId_idx" ON "LoyaltyCard"("customerId");

CREATE TABLE IF NOT EXISTS "LoyaltyEvent" (
  id TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "loyaltyCardId" TEXT NOT NULL,
  type "LoyaltyEventType" NOT NULL DEFAULT 'VISIT',
  "appointmentId" TEXT NOT NULL,
  "serviceId" TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  points INTEGER NOT NULL DEFAULT 1,
  "validatedBy" TEXT,
  "validatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "LoyaltyEvent_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LoyaltyEvent_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LoyaltyEvent_loyaltyCardId_fkey"
    FOREIGN KEY ("loyaltyCardId") REFERENCES "LoyaltyCard"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LoyaltyEvent_appointmentId_fkey"
    FOREIGN KEY ("appointmentId") REFERENCES "Appointment"(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "LoyaltyEvent_appointmentId_key" ON "LoyaltyEvent"("appointmentId");
CREATE INDEX IF NOT EXISTS "LoyaltyEvent_organizationId_idx" ON "LoyaltyEvent"("organizationId");
CREATE INDEX IF NOT EXISTS "LoyaltyEvent_loyaltyCardId_validatedAt_idx"
  ON "LoyaltyEvent"("loyaltyCardId", "validatedAt");
CREATE INDEX IF NOT EXISTS "LoyaltyEvent_customerId_idx" ON "LoyaltyEvent"("customerId");

CREATE TABLE IF NOT EXISTS "LoyaltyVisitReward" (
  id TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "loyaltyCardId" TEXT NOT NULL,
  "loyaltyEventId" TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'AVAILABLE',
  "earnedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "LoyaltyVisitReward_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LoyaltyVisitReward_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LoyaltyVisitReward_loyaltyCardId_fkey"
    FOREIGN KEY ("loyaltyCardId") REFERENCES "LoyaltyCard"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LoyaltyVisitReward_loyaltyEventId_fkey"
    FOREIGN KEY ("loyaltyEventId") REFERENCES "LoyaltyEvent"(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "LoyaltyVisitReward_loyaltyEventId_key"
  ON "LoyaltyVisitReward"("loyaltyEventId");
CREATE INDEX IF NOT EXISTS "LoyaltyVisitReward_organizationId_idx"
  ON "LoyaltyVisitReward"("organizationId");
CREATE INDEX IF NOT EXISTS "LoyaltyVisitReward_loyaltyCardId_status_idx"
  ON "LoyaltyVisitReward"("loyaltyCardId", status);
