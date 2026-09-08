-- 41.20 Relance post-prestation

DO $$ BEGIN
  ALTER TYPE "WhatsAppTaskType" ADD VALUE 'POST_VISIT';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "recommendedReturnDays" INTEGER;

CREATE TABLE IF NOT EXISTS "PostVisitSettings" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "defaultReturnDays" INTEGER NOT NULL DEFAULT 30,
  "maxOverdueDays" INTEGER NOT NULL DEFAULT 14,
  "minimumDaysBetweenMarketingMessages" INTEGER NOT NULL DEFAULT 30,
  "respectFutureAppointments" BOOLEAN NOT NULL DEFAULT true,
  "respectOptIn" BOOLEAN NOT NULL DEFAULT true,
  "autoCreateWhatsAppTasks" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PostVisitSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PostVisitSettings_organizationId_key"
  ON "PostVisitSettings"("organizationId");

DO $$ BEGIN
  ALTER TABLE "PostVisitSettings"
    ADD CONSTRAINT "PostVisitSettings_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

UPDATE "Service"
SET "recommendedReturnDays" = 30, "updatedAt" = NOW()
WHERE id = 's1' AND "recommendedReturnDays" IS NULL;
