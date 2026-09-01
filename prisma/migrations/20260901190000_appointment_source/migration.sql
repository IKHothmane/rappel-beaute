-- Réservation en ligne — source du rendez-vous

CREATE TYPE "AppointmentSource" AS ENUM (
  'MANUAL',
  'ONLINE_BOOKING',
  'PHONE',
  'WHATSAPP'
);

ALTER TABLE "Appointment"
  ADD COLUMN "source" "AppointmentSource" NOT NULL DEFAULT 'MANUAL';

CREATE INDEX "Appointment_organizationId_source_idx"
  ON "Appointment"("organizationId", "source");
