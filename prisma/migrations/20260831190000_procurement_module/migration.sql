-- Procurement module — Suppliers + Purchases + Receipts

CREATE TYPE "PurchaseStatus" AS ENUM (
  'DRAFT',
  'ORDERED',
  'PARTIALLY_RECEIVED',
  'RECEIVED',
  'CANCELLED'
);

CREATE TABLE "Supplier" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "address" TEXT,
  "contactName" TEXT,
  "notes" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Supplier_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Supplier_organizationId_idx" ON "Supplier"("organizationId");
CREATE INDEX "Supplier_organizationId_active_idx" ON "Supplier"("organizationId", "active");
CREATE INDEX "Supplier_organizationId_deletedAt_idx" ON "Supplier"("organizationId", "deletedAt");

CREATE TABLE "ProductSupplier" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "supplierSku" TEXT,
  "purchasePrice" DECIMAL(10,2) NOT NULL,
  "minimumOrderQuantity" DECIMAL(12,3),
  "leadTimeDays" INTEGER,
  "preferred" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductSupplier_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductSupplier_productId_supplierId_key" UNIQUE ("productId", "supplierId"),
  CONSTRAINT "ProductSupplier_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProductSupplier_supplierId_fkey"
    FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ProductSupplier_supplierId_idx" ON "ProductSupplier"("supplierId");
CREATE INDEX "ProductSupplier_productId_idx" ON "ProductSupplier"("productId");

CREATE TABLE "Purchase" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "status" "PurchaseStatus" NOT NULL DEFAULT 'DRAFT',
  "notes" TEXT,
  "orderedAt" TIMESTAMP(3),
  "receivedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Purchase_organizationId_number_key" UNIQUE ("organizationId", "number"),
  CONSTRAINT "Purchase_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Purchase_supplierId_fkey"
    FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "Purchase_organizationId_idx" ON "Purchase"("organizationId");
CREATE INDEX "Purchase_organizationId_status_idx" ON "Purchase"("organizationId", "status");
CREATE INDEX "Purchase_supplierId_idx" ON "Purchase"("supplierId");

CREATE TABLE "PurchaseItem" (
  "id" TEXT NOT NULL,
  "purchaseId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantityOrdered" DECIMAL(12,3) NOT NULL,
  "quantityReceived" DECIMAL(12,3) NOT NULL DEFAULT 0,
  "unitPrice" DECIMAL(10,2) NOT NULL,
  "unit" "ProductUnit" NOT NULL,
  CONSTRAINT "PurchaseItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PurchaseItem_purchaseId_productId_key" UNIQUE ("purchaseId", "productId"),
  CONSTRAINT "PurchaseItem_purchaseId_fkey"
    FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PurchaseItem_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "PurchaseItem_productId_idx" ON "PurchaseItem"("productId");

CREATE TABLE "PurchaseReceipt" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "purchaseId" TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" TEXT,
  "notes" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PurchaseReceipt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PurchaseReceipt_organizationId_idempotencyKey_key"
    UNIQUE ("organizationId", "idempotencyKey"),
  CONSTRAINT "PurchaseReceipt_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PurchaseReceipt_purchaseId_fkey"
    FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "PurchaseReceipt_purchaseId_idx" ON "PurchaseReceipt"("purchaseId");
CREATE INDEX "PurchaseReceipt_organizationId_idx" ON "PurchaseReceipt"("organizationId");

CREATE TABLE "PurchaseReceiptLine" (
  "id" TEXT NOT NULL,
  "receiptId" TEXT NOT NULL,
  "purchaseItemId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" DECIMAL(12,3) NOT NULL,
  "lotNumber" TEXT,
  "expiresAt" TIMESTAMP(3),
  "inventoryMovementId" TEXT,
  CONSTRAINT "PurchaseReceiptLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PurchaseReceiptLine_receiptId_fkey"
    FOREIGN KEY ("receiptId") REFERENCES "PurchaseReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "PurchaseReceiptLine_receiptId_idx" ON "PurchaseReceiptLine"("receiptId");
CREATE INDEX "PurchaseReceiptLine_purchaseItemId_idx" ON "PurchaseReceiptLine"("purchaseItemId");
