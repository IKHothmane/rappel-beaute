-- Anti double-réservation : contraintes EXCLUDE PostgreSQL
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Chevauchement staff interdit (sauf annulé / no-show)
ALTER TABLE "Appointment"
ADD CONSTRAINT "appointment_no_staff_overlap"
EXCLUDE USING gist (
  "staffId" WITH =,
  tsrange("startAt", "endAt", '[)') WITH &&
)
WHERE (status NOT IN ('CANCELLED', 'NO_SHOW'));

-- Chevauchement ressource interdit (si ressource assignée)
ALTER TABLE "Appointment"
ADD CONSTRAINT "appointment_no_resource_overlap"
EXCLUDE USING gist (
  "resourceId" WITH =,
  tsrange("startAt", "endAt", '[)') WITH &&
)
WHERE (status NOT IN ('CANCELLED', 'NO_SHOW') AND "resourceId" IS NOT NULL);
