-- Inventory module V1 — Produits + Stock ledger

CREATE TYPE "ProductCategory" AS ENUM (
  'PROFESSIONNEL', 'VENTE', 'CONSOMMABLE', 'MATERIEL', 'ACCESSOIRE', 'JETABLE'
);

CREATE TYPE "ProductUnit" AS ENUM (
  'UNIT', 'ML', 'L', 'G', 'KG', 'BOX', 'PACK', 'PIECE'
);

CREATE TYPE "InventoryReferenceType" AS ENUM (
  'APPOINTMENT', 'PURCHASE', 'INVENTORY', 'SALE', 'MANUAL'
);

-- Remplacer MovementType
CREATE TYPE "MovementType_new" AS ENUM (
  'PURCHASE',
  'SERVICE_CONSUMPTION',
  'SALE',
  'RETURN',
  'LOSS',
  'DAMAGE',
  'EXPIRATION',
  'ADJUSTMENT_IN',
  'ADJUSTMENT_OUT',
  'TRANSFER_IN',
  'TRANSFER_OUT'
);

ALTER TABLE "InventoryMovement" ALTER COLUMN type DROP DEFAULT;
ALTER TABLE "InventoryMovement"
  ALTER COLUMN type TYPE "MovementType_new"
  USING (
    CASE type::text
      WHEN 'USAGE' THEN 'SERVICE_CONSUMPTION'::"MovementType_new"
      WHEN 'ADJUSTMENT' THEN 'ADJUSTMENT_OUT'::"MovementType_new"
      WHEN 'PURCHASE' THEN 'PURCHASE'::"MovementType_new"
      WHEN 'SALE' THEN 'SALE'::"MovementType_new"
      WHEN 'LOSS' THEN 'LOSS'::"MovementType_new"
      ELSE 'ADJUSTMENT_OUT'::"MovementType_new"
    END
  );

DROP TYPE "MovementType";
ALTER TYPE "MovementType_new" RENAME TO "MovementType";

-- Enrichir Product
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS category "ProductCategory" NOT NULL DEFAULT 'CONSOMMABLE';
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "purchasePrice" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "salePrice" DECIMAL(10,2);
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "maxStock" DECIMAL(12,3);
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "supplierName" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS consumable BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS sellable BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "unitEnum" "ProductUnit";
UPDATE "Product" SET "unitEnum" = CASE
  WHEN lower(unit) IN ('ml') THEN 'ML'::"ProductUnit"
  WHEN lower(unit) IN ('l', 'litre', 'liter') THEN 'L'::"ProductUnit"
  WHEN lower(unit) IN ('g', 'gr') THEN 'G'::"ProductUnit"
  WHEN lower(unit) IN ('kg') THEN 'KG'::"ProductUnit"
  WHEN lower(unit) IN ('box', 'boite', 'boîte') THEN 'BOX'::"ProductUnit"
  WHEN lower(unit) IN ('pack', 'paire') THEN 'PACK'::"ProductUnit"
  WHEN lower(unit) IN ('piece', 'pièce', 'pcs', 'unité', 'unite', 'unit') THEN 'PIECE'::"ProductUnit"
  ELSE 'UNIT'::"ProductUnit"
END
WHERE "unitEnum" IS NULL;

ALTER TABLE "Product" DROP COLUMN unit;
ALTER TABLE "Product" RENAME COLUMN "unitEnum" TO unit;
ALTER TABLE "Product" ALTER COLUMN unit SET NOT NULL;
ALTER TABLE "Product" ALTER COLUMN unit SET DEFAULT 'UNIT'::"ProductUnit";

ALTER TABLE "Product" ALTER COLUMN stock TYPE DECIMAL(12,3) USING stock::DECIMAL(12,3);
ALTER TABLE "Product" ALTER COLUMN "minStock" TYPE DECIMAL(12,3) USING "minStock"::DECIMAL(12,3);

CREATE INDEX IF NOT EXISTS "Product_organizationId_active_idx" ON "Product"("organizationId", active);
CREATE INDEX IF NOT EXISTS "Product_organizationId_deletedAt_idx" ON "Product"("organizationId", "deletedAt");
CREATE INDEX IF NOT EXISTS "Product_organizationId_category_idx" ON "Product"("organizationId", category);

-- Enrichir InventoryMovement
ALTER TABLE "InventoryMovement" ADD COLUMN IF NOT EXISTS unit "ProductUnit";
UPDATE "InventoryMovement" im
SET unit = p.unit
FROM "Product" p
WHERE im."productId" = p.id AND im.unit IS NULL;
UPDATE "InventoryMovement" SET unit = 'UNIT'::"ProductUnit" WHERE unit IS NULL;
ALTER TABLE "InventoryMovement" ALTER COLUMN unit SET NOT NULL;

ALTER TABLE "InventoryMovement" ALTER COLUMN quantity TYPE DECIMAL(12,3) USING quantity::DECIMAL(12,3);

ALTER TABLE "InventoryMovement" ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE "InventoryMovement" ADD COLUMN IF NOT EXISTS "referenceType" "InventoryReferenceType";
ALTER TABLE "InventoryMovement" ADD COLUMN IF NOT EXISTS "referenceId" TEXT;
ALTER TABLE "InventoryMovement" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "InventoryMovement" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;

-- Migrer note → reason si besoin
UPDATE "InventoryMovement" SET reason = note WHERE reason IS NULL AND note IS NOT NULL;
ALTER TABLE "InventoryMovement" DROP COLUMN IF EXISTS note;

CREATE UNIQUE INDEX IF NOT EXISTS "InventoryMovement_organizationId_idempotencyKey_key"
  ON "InventoryMovement"("organizationId", "idempotencyKey")
  WHERE "idempotencyKey" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "InventoryMovement_organizationId_createdAt_idx"
  ON "InventoryMovement"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "InventoryMovement_referenceType_referenceId_idx"
  ON "InventoryMovement"("referenceType", "referenceId");

CREATE TABLE IF NOT EXISTS "ProductLot" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "lotNumber" TEXT NOT NULL,
  quantity DECIMAL(12,3) NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductLot_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductLot_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "ProductLot_productId_idx" ON "ProductLot"("productId");
CREATE INDEX IF NOT EXISTS "ProductLot_productId_expiresAt_idx" ON "ProductLot"("productId", "expiresAt");

CREATE TABLE IF NOT EXISTS "ProductPriceHistory" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "oldPurchasePrice" DECIMAL(10,2),
  "newPurchasePrice" DECIMAL(10,2),
  "oldSalePrice" DECIMAL(10,2),
  "newSalePrice" DECIMAL(10,2),
  "userId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductPriceHistory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductPriceHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "ProductPriceHistory_productId_idx" ON "ProductPriceHistory"("productId");
