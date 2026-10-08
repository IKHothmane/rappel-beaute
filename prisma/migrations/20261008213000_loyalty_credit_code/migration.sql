-- Code institut à usage unique pour un passage exceptionnel.
-- Le QR public et la carte publique ne créditent jamais un passage.

CREATE TABLE IF NOT EXISTS "LoyaltyCreditCode" (
  id TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "usedAt" TIMESTAMPTZ,
  "createdBy" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "LoyaltyCreditCode_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "LoyaltyCreditCode_organizationId_expiresAt_idx"
  ON "LoyaltyCreditCode"("organizationId", "expiresAt");
