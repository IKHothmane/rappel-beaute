-- 41.19 QR réservation — tracking + attribution

CREATE TYPE "PublicBookingEventType" AS ENUM ('VIEW', 'BOOKED');

ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "attributionSource" TEXT;

CREATE INDEX IF NOT EXISTS "Appointment_organizationId_attributionSource_idx"
  ON "Appointment"("organizationId", "attributionSource");

CREATE TABLE "PublicBookingEvent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "eventType" "PublicBookingEventType" NOT NULL,
  "source" TEXT,
  "serviceId" TEXT,
  "staffId" TEXT,
  "appointmentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PublicBookingEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PublicBookingEvent_organizationId_createdAt_idx"
  ON "PublicBookingEvent"("organizationId", "createdAt");
CREATE INDEX "PublicBookingEvent_organizationId_source_eventType_idx"
  ON "PublicBookingEvent"("organizationId", "source", "eventType");
CREATE INDEX "PublicBookingEvent_organizationId_eventType_idx"
  ON "PublicBookingEvent"("organizationId", "eventType");

ALTER TABLE "PublicBookingEvent"
  ADD CONSTRAINT "PublicBookingEvent_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
