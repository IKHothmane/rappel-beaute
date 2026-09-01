-- Module Services V1

CREATE TYPE "CommissionType" AS ENUM ('PERCENTAGE', 'FIXED');

ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "prepTimeMin" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "cleanupTimeMin" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "deposit" DECIMAL(10,2);
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS "Service_organizationId_active_idx" ON "Service"("organizationId", "active");

CREATE TABLE IF NOT EXISTS "ServiceStaff" (
  "serviceId" TEXT NOT NULL,
  "staffId" TEXT NOT NULL,
  CONSTRAINT "ServiceStaff_pkey" PRIMARY KEY ("serviceId", "staffId"),
  CONSTRAINT "ServiceStaff_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE,
  CONSTRAINT "ServiceStaff_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "ServiceStaff_staffId_idx" ON "ServiceStaff"("staffId");

CREATE TABLE IF NOT EXISTS "ServiceResource" (
  "serviceId" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "ServiceResource_pkey" PRIMARY KEY ("serviceId", "resourceId"),
  CONSTRAINT "ServiceResource_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE,
  CONSTRAINT "ServiceResource_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "ServiceResource_resourceId_idx" ON "ServiceResource"("resourceId");

CREATE TABLE IF NOT EXISTS "ServiceProduct" (
  "serviceId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" DECIMAL(10,3) NOT NULL,
  "unit" TEXT NOT NULL,
  CONSTRAINT "ServiceProduct_pkey" PRIMARY KEY ("serviceId", "productId"),
  CONSTRAINT "ServiceProduct_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE,
  CONSTRAINT "ServiceProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "ServiceProduct_productId_idx" ON "ServiceProduct"("productId");

CREATE TABLE IF NOT EXISTS "ServiceCommission" (
  "id" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "staffId" TEXT NOT NULL,
  "type" "CommissionType" NOT NULL,
  "percentage" DECIMAL(5,2),
  "fixedAmount" DECIMAL(10,2),
  CONSTRAINT "ServiceCommission_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ServiceCommission_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE,
  CONSTRAINT "ServiceCommission_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "ServiceCommission_serviceId_staffId_key" ON "ServiceCommission"("serviceId", "staffId");
CREATE INDEX IF NOT EXISTS "ServiceCommission_serviceId_idx" ON "ServiceCommission"("serviceId");
