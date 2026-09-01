-- Invoices + Commission snapshots

CREATE TYPE "InvoiceStatus" AS ENUM (
  'DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'VOID'
);

ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS ice TEXT;

ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "invoiceId" TEXT;

CREATE TABLE IF NOT EXISTS "InvoiceSequence" (
  "organizationId" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "lastValue" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InvoiceSequence_pkey" PRIMARY KEY ("organizationId", "year"),
  CONSTRAINT "InvoiceSequence_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Invoice" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "appointmentId" TEXT,
  "customerId" TEXT NOT NULL,
  "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "orgNameSnapshot" TEXT NOT NULL,
  "orgAddressSnapshot" TEXT,
  "orgPhoneSnapshot" TEXT,
  "orgIceSnapshot" TEXT,
  "customerNameSnapshot" TEXT NOT NULL,
  "customerPhoneSnapshot" TEXT,
  "subtotal" DECIMAL(12,2) NOT NULL,
  "discountTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(12,2) NOT NULL,
  "notes" TEXT,
  "issuedAt" TIMESTAMP(3),
  "voidedAt" TIMESTAMP(3),
  "voidReason" TEXT,
  "createdById" TEXT,
  "idempotencyKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Invoice_organizationId_number_key" UNIQUE ("organizationId", "number"),
  CONSTRAINT "Invoice_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Invoice_appointmentId_fkey"
    FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Invoice_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_organizationId_idempotencyKey_key"
  ON "Invoice"("organizationId", "idempotencyKey");

CREATE INDEX IF NOT EXISTS "Invoice_organizationId_idx" ON "Invoice"("organizationId");
CREATE INDEX IF NOT EXISTS "Invoice_organizationId_status_idx" ON "Invoice"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "Invoice_organizationId_issuedAt_idx" ON "Invoice"("organizationId", "issuedAt");
CREATE INDEX IF NOT EXISTS "Invoice_customerId_idx" ON "Invoice"("customerId");
CREATE INDEX IF NOT EXISTS "Invoice_appointmentId_idx" ON "Invoice"("appointmentId");

CREATE TABLE IF NOT EXISTS "InvoiceItem" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "serviceId" TEXT,
  "nameSnapshot" TEXT NOT NULL,
  "unitPriceSnapshot" DECIMAL(10,2) NOT NULL,
  "quantity" DECIMAL(10,3) NOT NULL DEFAULT 1,
  "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(12,2) NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InvoiceItem_invoiceId_fkey"
    FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");

DO $$ BEGIN
  ALTER TABLE "Payment"
    ADD CONSTRAINT "Payment_invoiceId_fkey"
    FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "Payment_invoiceId_idx" ON "Payment"("invoiceId");

CREATE TABLE IF NOT EXISTS "CommissionRecord" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "staffId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "serviceNameSnapshot" TEXT NOT NULL,
  "staffNameSnapshot" TEXT NOT NULL,
  "baseAmount" DECIMAL(10,2) NOT NULL,
  "type" "CommissionType" NOT NULL,
  "percentageSnapshot" DECIMAL(5,2),
  "fixedSnapshot" DECIMAL(10,2),
  "commissionAmount" DECIMAL(10,2) NOT NULL,
  "paid" BOOLEAN NOT NULL DEFAULT false,
  "paidAt" TIMESTAMP(3),
  "idempotencyKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommissionRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommissionRecord_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CommissionRecord_appointmentId_fkey"
    FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CommissionRecord_staffId_fkey"
    FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "CommissionRecord_organizationId_idempotencyKey_key"
  ON "CommissionRecord"("organizationId", "idempotencyKey");

CREATE INDEX IF NOT EXISTS "CommissionRecord_organizationId_idx" ON "CommissionRecord"("organizationId");
CREATE INDEX IF NOT EXISTS "CommissionRecord_staffId_idx" ON "CommissionRecord"("staffId");
CREATE INDEX IF NOT EXISTS "CommissionRecord_appointmentId_idx" ON "CommissionRecord"("appointmentId");
CREATE INDEX IF NOT EXISTS "CommissionRecord_organizationId_createdAt_idx"
  ON "CommissionRecord"("organizationId", "createdAt");
