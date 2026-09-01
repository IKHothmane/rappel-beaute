-- Module Ressources V1

CREATE TYPE "ResourceType" AS ENUM ('CABINE', 'SALLE', 'FAUTEUIL', 'TABLE', 'MACHINE', 'EQUIPEMENT', 'AUTRE');
CREATE TYPE "MaintenanceType" AS ENUM ('PREVENTIVE', 'CORRECTIVE', 'INSPECTION', 'AUTRE');
CREATE TYPE "MaintenanceStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "capacity" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "typeEnum" "ResourceType";

UPDATE "Resource" SET "typeEnum" = CASE
  WHEN lower("type") LIKE '%cabine%' THEN 'CABINE'::"ResourceType"
  WHEN lower("type") LIKE '%salle%' THEN 'SALLE'::"ResourceType"
  WHEN lower("type") LIKE '%fauteuil%' THEN 'FAUTEUIL'::"ResourceType"
  WHEN lower("type") LIKE '%table%' THEN 'TABLE'::"ResourceType"
  WHEN lower("type") LIKE '%machine%' THEN 'MACHINE'::"ResourceType"
  WHEN lower("type") LIKE '%équip%' OR lower("type") LIKE '%equip%' THEN 'EQUIPEMENT'::"ResourceType"
  ELSE 'AUTRE'::"ResourceType"
END
WHERE "typeEnum" IS NULL;

ALTER TABLE "Resource" DROP COLUMN "type";
ALTER TABLE "Resource" RENAME COLUMN "typeEnum" TO "type";
ALTER TABLE "Resource" ALTER COLUMN "type" SET NOT NULL;
ALTER TABLE "Resource" ALTER COLUMN "type" SET DEFAULT 'CABINE'::"ResourceType";

CREATE INDEX IF NOT EXISTS "Resource_organizationId_active_idx" ON "Resource"("organizationId", active);
CREATE INDEX IF NOT EXISTS "Resource_organizationId_deletedAt_idx" ON "Resource"("organizationId", "deletedAt");

CREATE TABLE IF NOT EXISTS "ResourceMaintenance" (
  "id" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  type "MaintenanceType" NOT NULL DEFAULT 'PREVENTIVE',
  reason TEXT,
  status "MaintenanceStatus" NOT NULL DEFAULT 'SCHEDULED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ResourceMaintenance_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ResourceMaintenance_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "ResourceMaintenance_resourceId_idx" ON "ResourceMaintenance"("resourceId");
CREATE INDEX IF NOT EXISTS "ResourceMaintenance_resourceId_startAt_endAt_idx" ON "ResourceMaintenance"("resourceId", "startAt", "endAt");
