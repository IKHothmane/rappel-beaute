-- Migration: étendre Customer pour module Clientes V1

ALTER TYPE "CustomerStatus" ADD VALUE IF NOT EXISTS 'INACTIVE';
ALTER TYPE "CustomerStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';

ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "birthDate" TIMESTAMP(3);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "instagram" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "marketingWhatsapp" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "marketingEmail" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "marketingSms" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

UPDATE "Customer" SET phone = '0600000000' WHERE phone IS NULL OR phone = '';
ALTER TABLE "Customer" ALTER COLUMN "phone" SET NOT NULL;

-- VIP stocké → ACTIVE (segment VIP calculé côté API)
UPDATE "Customer" SET status = 'ACTIVE' WHERE status::text = 'VIP';

DROP INDEX IF EXISTS "Customer_organizationId_phone_key";
CREATE UNIQUE INDEX "Customer_organizationId_phone_key"
  ON "Customer"("organizationId", "phone");

CREATE INDEX IF NOT EXISTS "Customer_organizationId_deletedAt_idx"
  ON "Customer"("organizationId", "deletedAt");
