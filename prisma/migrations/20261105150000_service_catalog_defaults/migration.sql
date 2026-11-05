-- Images par défaut pour les noms de services suggérés

CREATE TABLE IF NOT EXISTS "ServiceCatalogDefault" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "imageUrl" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServiceCatalogDefault_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ServiceCatalogDefault_name_key" ON "ServiceCatalogDefault"("name");
