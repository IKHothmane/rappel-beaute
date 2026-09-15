-- Support console Super Admin : numéros, notes internes, satisfaction, SLA, catégories

CREATE SEQUENCE IF NOT EXISTS support_ticket_number_seq START WITH 1000;

ALTER TABLE "SupportTicket"
  ADD COLUMN IF NOT EXISTS "ticketNumber" INTEGER,
  ADD COLUMN IF NOT EXISTS "firstResponseAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "satisfactionRating" INTEGER,
  ADD COLUMN IF NOT EXISTS "satisfactionComment" TEXT,
  ADD COLUMN IF NOT EXISTS "satisfactionAt" TIMESTAMPTZ;

UPDATE "SupportTicket"
SET "ticketNumber" = nextval('support_ticket_number_seq')
WHERE "ticketNumber" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "SupportTicket_ticketNumber_key"
  ON "SupportTicket"("ticketNumber");

ALTER TABLE "SupportTicket"
  ALTER COLUMN "ticketNumber" SET DEFAULT nextval('support_ticket_number_seq');

ALTER TABLE "SupportMessage"
  ADD COLUMN IF NOT EXISTS "isInternal" BOOLEAN NOT NULL DEFAULT false;

-- Catégories étendues (idempotent via DO block)
DO $$ BEGIN
  ALTER TYPE "SupportTicketCategory" ADD VALUE IF NOT EXISTS 'LOGIN';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE "SupportTicketCategory" ADD VALUE IF NOT EXISTS 'SUBSCRIPTION';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE "SupportTicketCategory" ADD VALUE IF NOT EXISTS 'PAYMENT';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE "SupportTicketCategory" ADD VALUE IF NOT EXISTS 'APPOINTMENTS';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE "SupportTicketCategory" ADD VALUE IF NOT EXISTS 'CUSTOMERS';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE "SupportTicketCategory" ADD VALUE IF NOT EXISTS 'STOCK';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE "SupportTicketCategory" ADD VALUE IF NOT EXISTS 'MARKETING';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE "SupportTicketCategory" ADD VALUE IF NOT EXISTS 'WHATSAPP';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE "SupportTicketCategory" ADD VALUE IF NOT EXISTS 'AI';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Backfill firstResponseAt depuis premier message PLATFORM public
UPDATE "SupportTicket" t
SET "firstResponseAt" = sub.first_at
FROM (
  SELECT m."ticketId", MIN(m."createdAt") AS first_at
  FROM "SupportMessage" m
  WHERE m."senderType" = 'PLATFORM'
    AND COALESCE(m."isInternal", false) = false
  GROUP BY m."ticketId"
) sub
WHERE t.id = sub."ticketId"
  AND t."firstResponseAt" IS NULL;
