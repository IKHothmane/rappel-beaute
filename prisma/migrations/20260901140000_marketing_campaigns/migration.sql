-- Marketing campaigns V1

CREATE TYPE "CampaignChannel" AS ENUM ('WHATSAPP', 'EMAIL');
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "CampaignRecipientStatus" AS ENUM ('PENDING', 'SENT', 'SKIPPED', 'CANCELLED');

CREATE TABLE "Campaign" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "channel" "CampaignChannel" NOT NULL DEFAULT 'WHATSAPP',
  "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
  "messageTemplate" TEXT NOT NULL,
  "segmentFilters" JSONB NOT NULL,
  "promotionId" TEXT,
  "scheduledFor" TIMESTAMP(3),
  "audienceCount" INTEGER NOT NULL DEFAULT 0,
  "preparedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CampaignRecipient" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "status" "CampaignRecipientStatus" NOT NULL DEFAULT 'PENDING',
  "messageSnapshot" TEXT NOT NULL,
  "phoneSnapshot" TEXT,
  "emailSnapshot" TEXT,
  "whatsappTaskId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CampaignRecipient_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "WhatsAppTask" ADD COLUMN IF NOT EXISTS "campaignId" TEXT;

CREATE INDEX "Campaign_organizationId_idx" ON "Campaign"("organizationId");
CREATE INDEX "Campaign_organizationId_status_idx" ON "Campaign"("organizationId", "status");
CREATE INDEX "Campaign_promotionId_idx" ON "Campaign"("promotionId");

CREATE INDEX "CampaignRecipient_campaignId_idx" ON "CampaignRecipient"("campaignId");
CREATE INDEX "CampaignRecipient_campaignId_status_idx" ON "CampaignRecipient"("campaignId", "status");
CREATE INDEX "CampaignRecipient_customerId_idx" ON "CampaignRecipient"("customerId");
CREATE INDEX "CampaignRecipient_whatsappTaskId_idx" ON "CampaignRecipient"("whatsappTaskId");

CREATE UNIQUE INDEX "CampaignRecipient_campaignId_customerId_key" ON "CampaignRecipient"("campaignId", "customerId");

CREATE INDEX "WhatsAppTask_campaignId_idx" ON "WhatsAppTask"("campaignId");

ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CampaignRecipient" ADD CONSTRAINT "CampaignRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignRecipient" ADD CONSTRAINT "CampaignRecipient_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignRecipient" ADD CONSTRAINT "CampaignRecipient_whatsappTaskId_fkey" FOREIGN KEY ("whatsappTaskId") REFERENCES "WhatsAppTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WhatsAppTask" ADD CONSTRAINT "WhatsAppTask_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
