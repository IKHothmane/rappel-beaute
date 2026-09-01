-- Réactivation clientes

CREATE TABLE "ReactivationSettings" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "minimumDaysBetweenMarketingMessages" INTEGER NOT NULL DEFAULT 30,
  "threshold30Enabled" BOOLEAN NOT NULL DEFAULT true,
  "threshold45Enabled" BOOLEAN NOT NULL DEFAULT true,
  "threshold60Enabled" BOOLEAN NOT NULL DEFAULT true,
  "threshold90Enabled" BOOLEAN NOT NULL DEFAULT true,
  "autoCreateWhatsAppTasks" BOOLEAN NOT NULL DEFAULT true,
  "promoCode30" TEXT,
  "promoCode45" TEXT,
  "promoCode60" TEXT,
  "promoCode90" TEXT,
  "promoDiscount30" TEXT DEFAULT '-5%',
  "promoDiscount45" TEXT DEFAULT '-10%',
  "promoDiscount60" TEXT DEFAULT '-15%',
  "promoDiscount90" TEXT DEFAULT '-20%',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ReactivationSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReactivationSnooze" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "snoozedUntil" TIMESTAMP(3) NOT NULL,
  "reason" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ReactivationSnooze_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReactivationSettings_organizationId_key" ON "ReactivationSettings"("organizationId");

CREATE INDEX "ReactivationSnooze_organizationId_idx" ON "ReactivationSnooze"("organizationId");
CREATE INDEX "ReactivationSnooze_organizationId_customerId_idx" ON "ReactivationSnooze"("organizationId", "customerId");
CREATE INDEX "ReactivationSnooze_organizationId_snoozedUntil_idx" ON "ReactivationSnooze"("organizationId", "snoozedUntil");

ALTER TABLE "ReactivationSettings" ADD CONSTRAINT "ReactivationSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReactivationSnooze" ADD CONSTRAINT "ReactivationSnooze_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReactivationSnooze" ADD CONSTRAINT "ReactivationSnooze_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Modèle réactivation enrichi (variables historique)
UPDATE "WhatsAppTemplate"
SET body = 'Bonjour {{customer.firstName}} 🌸

Cela fait {{lastVisit.days}} jours que nous ne vous avons pas vue.
Votre dernier {{lastService.name}} remonte à {{lastVisit.date}}.

Nous serions ravis de vous revoir à {{organization.name}}.
{{promotion.discount}} avec le code {{promotion.code}}.',
    "updatedAt" = NOW()
WHERE type = 'REACTIVATION'::"WhatsAppTaskType" AND "isDefault" = true;
