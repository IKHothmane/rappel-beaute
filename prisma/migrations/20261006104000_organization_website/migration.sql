-- Site web facultatif de l'institut, saisi à l'inscription professionnelle.

ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "website" TEXT;
