-- Images par défaut des types de ressources (Cabine, Salle, Fauteuil, …)

CREATE TABLE IF NOT EXISTS "ResourceCatalogDefault" (
  "id" TEXT NOT NULL,
  "type" "ResourceType" NOT NULL,
  "imageUrl" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ResourceCatalogDefault_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ResourceCatalogDefault_type_key" ON "ResourceCatalogDefault"("type");
