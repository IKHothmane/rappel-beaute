-- Nom du calendrier Google choisi par l'institut

ALTER TABLE "GoogleCalendarConnection"
  ADD COLUMN IF NOT EXISTS "calendarName" TEXT;
