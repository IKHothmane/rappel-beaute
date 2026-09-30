-- Connexion Google Calendar (1 par institut) + id événement sur les RDV

ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "googleEventId" TEXT;

CREATE TABLE IF NOT EXISTS "GoogleCalendarConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "googleEmail" TEXT NOT NULL,
    "googleAccountId" TEXT,
    "calendarId" TEXT NOT NULL DEFAULT 'primary',
    "refreshTokenEnc" TEXT NOT NULL,
    "accessTokenEnc" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GoogleCalendarConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GoogleCalendarConnection_organizationId_key"
  ON "GoogleCalendarConnection"("organizationId");

ALTER TABLE "GoogleCalendarConnection"
  DROP CONSTRAINT IF EXISTS "GoogleCalendarConnection_organizationId_fkey";

ALTER TABLE "GoogleCalendarConnection"
  ADD CONSTRAINT "GoogleCalendarConnection_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
