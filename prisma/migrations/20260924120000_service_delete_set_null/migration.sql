-- Keep the service name on past appointments, then allow deleting the catalog row.
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "serviceNameSnapshot" TEXT;

UPDATE "Appointment" a
SET "serviceNameSnapshot" = s.name
FROM "Service" s
WHERE s.id = a."serviceId"
  AND (a."serviceNameSnapshot" IS NULL OR a."serviceNameSnapshot" = '');

ALTER TABLE "Appointment" DROP CONSTRAINT IF EXISTS "Appointment_serviceId_fkey";
ALTER TABLE "Appointment" ALTER COLUMN "serviceId" DROP NOT NULL;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_serviceId_fkey"
  FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PackageItem" DROP CONSTRAINT IF EXISTS "PackageItem_serviceId_fkey";
ALTER TABLE "PackageItem" ALTER COLUMN "serviceId" DROP NOT NULL;
ALTER TABLE "PackageItem" ADD CONSTRAINT "PackageItem_serviceId_fkey"
  FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WaitingListEntry" DROP CONSTRAINT IF EXISTS "WaitingListEntry_serviceId_fkey";
ALTER TABLE "WaitingListEntry" ADD CONSTRAINT "WaitingListEntry_serviceId_fkey"
  FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
