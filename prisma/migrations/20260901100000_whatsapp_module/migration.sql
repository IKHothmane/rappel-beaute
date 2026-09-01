-- WhatsApp manuel assisté V1

CREATE TYPE "WhatsAppTaskType" AS ENUM (
  'APPOINTMENT_CONFIRMATION',
  'APPOINTMENT_REMINDER',
  'APPOINTMENT_FOLLOWUP',
  'REACTIVATION',
  'BIRTHDAY',
  'REVIEW_REQUEST',
  'PROMOTION',
  'PACKAGE_EXPIRING',
  'LOYALTY_REWARD',
  'WAITING_LIST'
);

CREATE TYPE "WhatsAppTaskStatus" AS ENUM (
  'PENDING',
  'SENT',
  'SKIPPED',
  'CANCELLED'
);

CREATE TYPE "WhatsAppStaffOutcome" AS ENUM (
  'CUSTOMER_CONFIRMED',
  'CUSTOMER_CANCELLED',
  'NEEDS_FOLLOWUP'
);

CREATE TABLE "WhatsAppTemplate" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "WhatsAppTaskType" NOT NULL,
  "body" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WhatsAppTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WhatsAppTask" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "appointmentId" TEXT,
  "templateId" TEXT,
  "type" "WhatsAppTaskType" NOT NULL,
  "status" "WhatsAppTaskStatus" NOT NULL DEFAULT 'PENDING',
  "messageSnapshot" TEXT NOT NULL,
  "phoneSnapshot" TEXT NOT NULL,
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "sentAt" TIMESTAMP(3),
  "sentById" TEXT,
  "staffOutcome" "WhatsAppStaffOutcome",
  "outcomeAt" TIMESTAMP(3),
  "outcomeById" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WhatsAppTask_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WhatsAppTemplate_organizationId_idx" ON "WhatsAppTemplate"("organizationId");
CREATE INDEX "WhatsAppTemplate_organizationId_type_idx" ON "WhatsAppTemplate"("organizationId", "type");
CREATE INDEX "WhatsAppTemplate_organizationId_active_idx" ON "WhatsAppTemplate"("organizationId", "active");

CREATE INDEX "WhatsAppTask_organizationId_idx" ON "WhatsAppTask"("organizationId");
CREATE INDEX "WhatsAppTask_organizationId_status_idx" ON "WhatsAppTask"("organizationId", "status");
CREATE INDEX "WhatsAppTask_organizationId_scheduledFor_idx" ON "WhatsAppTask"("organizationId", "scheduledFor");
CREATE INDEX "WhatsAppTask_organizationId_type_idx" ON "WhatsAppTask"("organizationId", "type");
CREATE INDEX "WhatsAppTask_customerId_idx" ON "WhatsAppTask"("customerId");
CREATE INDEX "WhatsAppTask_appointmentId_idx" ON "WhatsAppTask"("appointmentId");
CREATE INDEX "WhatsAppTask_templateId_idx" ON "WhatsAppTask"("templateId");

CREATE UNIQUE INDEX "WhatsAppTask_organizationId_idempotencyKey_key" ON "WhatsAppTask"("organizationId", "idempotencyKey");

ALTER TABLE "WhatsAppTemplate" ADD CONSTRAINT "WhatsAppTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WhatsAppTask" ADD CONSTRAINT "WhatsAppTask_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WhatsAppTask" ADD CONSTRAINT "WhatsAppTask_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WhatsAppTask" ADD CONSTRAINT "WhatsAppTask_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WhatsAppTask" ADD CONSTRAINT "WhatsAppTask_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WhatsAppTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
