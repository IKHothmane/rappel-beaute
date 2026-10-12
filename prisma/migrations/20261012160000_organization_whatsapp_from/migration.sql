-- Numéro WhatsApp expéditeur propre à chaque institut.

ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "whatsappFrom" TEXT;
