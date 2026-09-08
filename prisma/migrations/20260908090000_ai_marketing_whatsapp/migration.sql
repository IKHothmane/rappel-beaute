-- 43.7 — Attribution IA marketing sur WhatsAppTask
-- Funnel : message généré (tâche PENDING) → envoyé → Appointment.attributionSource = ai_marketing

ALTER TABLE "WhatsAppTask"
  ADD COLUMN IF NOT EXISTS "attributionSource" TEXT;

CREATE INDEX IF NOT EXISTS "WhatsAppTask_organizationId_attributionSource_idx"
  ON "WhatsAppTask"("organizationId", "attributionSource");
