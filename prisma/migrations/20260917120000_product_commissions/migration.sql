-- Commissions produits POS + paramètres org

CREATE TABLE "CommissionSettings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "productCommissionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "productCommissionRate" DECIMAL(5,2) NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommissionSettings_organizationId_key" ON "CommissionSettings"("organizationId");

ALTER TABLE "CommissionSettings" ADD CONSTRAINT "CommissionSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CommissionRecord : RDV optionnel, vente POS optionnelle
ALTER TABLE "CommissionRecord" DROP CONSTRAINT IF EXISTS "CommissionRecord_appointmentId_fkey";

ALTER TABLE "CommissionRecord" ALTER COLUMN "appointmentId" DROP NOT NULL;
ALTER TABLE "CommissionRecord" ALTER COLUMN "serviceId" DROP NOT NULL;

ALTER TABLE "CommissionRecord" ADD COLUMN IF NOT EXISTS "posSaleId" TEXT;

CREATE INDEX IF NOT EXISTS "CommissionRecord_posSaleId_idx" ON "CommissionRecord"("posSaleId");

ALTER TABLE "CommissionRecord" ADD CONSTRAINT "CommissionRecord_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommissionRecord" ADD CONSTRAINT "CommissionRecord_posSaleId_fkey" FOREIGN KEY ("posSaleId") REFERENCES "PosSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
