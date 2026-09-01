-- Avis clients V1

CREATE TYPE "ReviewRequestStatus" AS ENUM ('PENDING', 'SENT', 'SKIPPED', 'CANCELLED', 'RECORDED');
CREATE TYPE "ReviewSatisfaction" AS ENUM ('VERY_SATISFIED', 'SATISFIED', 'DISSATISFIED');

CREATE TABLE "ReviewSettings" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "googleReviewUrl" TEXT,
  "delayHours" INTEGER NOT NULL DEFAULT 3,
  "maxWindowHours" INTEGER NOT NULL DEFAULT 24,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ReviewSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReviewRequest" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "whatsappTaskId" TEXT,
  "status" "ReviewRequestStatus" NOT NULL DEFAULT 'PENDING',
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "sentAt" TIMESTAMP(3),
  "sentById" TEXT,
  "satisfaction" "ReviewSatisfaction",
  "satisfactionRecordedAt" TIMESTAMP(3),
  "satisfactionRecordedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ReviewRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReviewSettings_organizationId_key" ON "ReviewSettings"("organizationId");
CREATE UNIQUE INDEX "ReviewRequest_appointmentId_key" ON "ReviewRequest"("appointmentId");
CREATE UNIQUE INDEX "ReviewRequest_whatsappTaskId_key" ON "ReviewRequest"("whatsappTaskId");

CREATE INDEX "ReviewRequest_organizationId_idx" ON "ReviewRequest"("organizationId");
CREATE INDEX "ReviewRequest_organizationId_status_idx" ON "ReviewRequest"("organizationId", "status");
CREATE INDEX "ReviewRequest_organizationId_scheduledFor_idx" ON "ReviewRequest"("organizationId", "scheduledFor");
CREATE INDEX "ReviewRequest_customerId_idx" ON "ReviewRequest"("customerId");

ALTER TABLE "ReviewSettings" ADD CONSTRAINT "ReviewSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReviewRequest" ADD CONSTRAINT "ReviewRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewRequest" ADD CONSTRAINT "ReviewRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewRequest" ADD CONSTRAINT "ReviewRequest_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewRequest" ADD CONSTRAINT "ReviewRequest_whatsappTaskId_fkey" FOREIGN KEY ("whatsappTaskId") REFERENCES "WhatsAppTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "WhatsAppTemplate"
SET body = 'Bonjour {{customer.firstName}} 🌸

Merci pour votre visite à {{organization.name}}.

Nous espérons que vous avez apprécié votre {{service.name}}.

Votre avis nous ferait très plaisir ❤️

⭐ Laisser un avis Google :
{{organization.googleReviewUrl}}',
    "updatedAt" = NOW()
WHERE type = 'REVIEW_REQUEST'::"WhatsAppTaskType" AND "isDefault" = true;
