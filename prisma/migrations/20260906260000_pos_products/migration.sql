-- 41.23 POS Produits

DO $$ BEGIN
  CREATE TYPE "PosSaleStatus" AS ENUM ('COMPLETED', 'REFUNDED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Invoice" ALTER COLUMN "customerId" DROP NOT NULL;

ALTER TABLE "InvoiceItem" ADD COLUMN IF NOT EXISTS "productId" TEXT;

CREATE INDEX IF NOT EXISTS "InvoiceItem_productId_idx" ON "InvoiceItem"("productId");

DO $$ BEGIN
  ALTER TABLE "InvoiceItem"
    ADD CONSTRAINT "InvoiceItem_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "PosSale" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "paymentId" TEXT,
  "customerId" TEXT,
  "soldById" TEXT,
  "status" "PosSaleStatus" NOT NULL DEFAULT 'COMPLETED',
  "subtotal" DECIMAL(12,2) NOT NULL,
  "discountTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(12,2) NOT NULL,
  "paymentMethod" "PaymentMethod" NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PosSale_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PosSale_invoiceId_key" ON "PosSale"("invoiceId");
CREATE UNIQUE INDEX IF NOT EXISTS "PosSale_organizationId_idempotencyKey_key"
  ON "PosSale"("organizationId", "idempotencyKey");
CREATE INDEX IF NOT EXISTS "PosSale_organizationId_createdAt_idx"
  ON "PosSale"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "PosSale_organizationId_customerId_idx"
  ON "PosSale"("organizationId", "customerId");

DO $$ BEGIN
  ALTER TABLE "PosSale"
    ADD CONSTRAINT "PosSale_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PosSale"
    ADD CONSTRAINT "PosSale_invoiceId_fkey"
    FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PosSale"
    ADD CONSTRAINT "PosSale_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
