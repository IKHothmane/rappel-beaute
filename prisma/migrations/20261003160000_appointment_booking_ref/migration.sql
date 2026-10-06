-- Secret de réservation, distinct de l'identifiant interne.
-- Plusieurs valeurs NULL restent autorisées par l'unicité PostgreSQL.
ALTER TABLE "Appointment" ADD COLUMN "bookingRef" TEXT;

CREATE UNIQUE INDEX "Appointment_organizationId_bookingRef_key"
  ON "Appointment" ("organizationId", "bookingRef");
