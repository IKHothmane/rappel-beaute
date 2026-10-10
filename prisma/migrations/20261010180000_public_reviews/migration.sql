-- Avis publics 1 à 5. Le flux de satisfaction WhatsApp reste inchangé.

CREATE TYPE "PublicReviewStatus" AS ENUM ('PENDING', 'PUBLISHED', 'REJECTED', 'REPORTED');

ALTER TABLE "ReviewRequest" ADD COLUMN IF NOT EXISTS "publicToken" TEXT;
ALTER TABLE "ReviewRequest" ADD COLUMN IF NOT EXISTS "tokenExpiresAt" TIMESTAMPTZ;

UPDATE "ReviewRequest"
SET
  "publicToken" = 'RBREV_' || upper(substr(md5("id"), 1, 20)),
  "tokenExpiresAt" = NOW() + INTERVAL '30 days'
WHERE "publicToken" IS NULL OR "tokenExpiresAt" IS NULL;

ALTER TABLE "ReviewRequest" ALTER COLUMN "publicToken" SET NOT NULL;
ALTER TABLE "ReviewRequest" ALTER COLUMN "tokenExpiresAt" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "ReviewRequest_publicToken_key" ON "ReviewRequest"("publicToken");

CREATE TABLE IF NOT EXISTS "Review" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "reviewRequestId" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT NOT NULL,
  "status" "PublicReviewStatus" NOT NULL DEFAULT 'PENDING',
  "publishedAt" TIMESTAMPTZ,
  "moderatedAt" TIMESTAMPTZ,
  "moderatedById" TEXT,
  "reportReason" TEXT,
  "reportedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Review_appointmentId_key" ON "Review"("appointmentId");
CREATE UNIQUE INDEX IF NOT EXISTS "Review_reviewRequestId_key" ON "Review"("reviewRequestId");
CREATE INDEX IF NOT EXISTS "Review_organizationId_status_idx" ON "Review"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "Review_organizationId_createdAt_idx" ON "Review"("organizationId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "Review" ADD CONSTRAINT "Review_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Review" ADD CONSTRAINT "Review_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Review" ADD CONSTRAINT "Review_appointmentId_fkey"
    FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewRequestId_fkey"
    FOREIGN KEY ("reviewRequestId") REFERENCES "ReviewRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
