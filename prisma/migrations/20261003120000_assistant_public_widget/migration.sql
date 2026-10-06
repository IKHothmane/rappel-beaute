-- Assistant public : widget, sessions, OTP, actions confirmées.
-- publicId n'accorde aucun accès. customerId n'est écrit que par le serveur après OTP.

CREATE TYPE "PublicWidgetStatus" AS ENUM ('ACTIVE', 'DISABLED');
CREATE TYPE "AssistantChannel" AS ENUM ('WIDGET', 'DASHBOARD', 'MOBILE');
CREATE TYPE "AssistantActionType" AS ENUM (
  'CREATE_APPOINTMENT',
  'RESCHEDULE_APPOINTMENT',
  'CANCEL_APPOINTMENT'
);
CREATE TYPE "AssistantActionStatus" AS ENUM (
  'PROPOSED',
  'PENDING_CONFIRMATION',
  'CONFIRMED',
  'EXECUTING',
  'EXECUTED',
  'EXPIRED',
  'CANCELLED',
  'FAILED'
);

CREATE TABLE "PublicWidget" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "publicId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" "PublicWidgetStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PublicWidget_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PublicWidget_publicId_key" ON "PublicWidget"("publicId");
CREATE INDEX "PublicWidget_organizationId_idx" ON "PublicWidget"("organizationId");

CREATE TABLE "PublicWidgetOrigin" (
  "id" TEXT NOT NULL,
  "widgetId" TEXT NOT NULL,
  "origin" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PublicWidgetOrigin_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PublicWidgetOrigin_widgetId_origin_key" ON "PublicWidgetOrigin"("widgetId", "origin");
CREATE INDEX "PublicWidgetOrigin_origin_idx" ON "PublicWidgetOrigin"("origin");

CREATE TABLE "AssistantSettings" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "monthlyMessageLimit" INTEGER NOT NULL DEFAULT 2000,
  "alertPercent" INTEGER NOT NULL DEFAULT 80,
  "blockAtPercent" INTEGER NOT NULL DEFAULT 100,
  "allowOverage" BOOLEAN NOT NULL DEFAULT false,
  "conversationRetentionDays" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssistantSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AssistantSettings_organizationId_key" ON "AssistantSettings"("organizationId");

CREATE TABLE "AssistantWidgetSession" (
  "id" TEXT NOT NULL,
  "widgetId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssistantWidgetSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AssistantWidgetSession_tokenHash_key" ON "AssistantWidgetSession"("tokenHash");
CREATE INDEX "AssistantWidgetSession_organizationId_expiresAt_idx" ON "AssistantWidgetSession"("organizationId", "expiresAt");
CREATE INDEX "AssistantWidgetSession_widgetId_idx" ON "AssistantWidgetSession"("widgetId");

CREATE TABLE "AssistantCustomerSession" (
  "id" TEXT NOT NULL,
  "widgetSessionId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "verifiedAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssistantCustomerSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AssistantCustomerSession_tokenHash_key" ON "AssistantCustomerSession"("tokenHash");
CREATE INDEX "AssistantCustomerSession_organizationId_customerId_idx" ON "AssistantCustomerSession"("organizationId", "customerId");
CREATE INDEX "AssistantCustomerSession_widgetSessionId_idx" ON "AssistantCustomerSession"("widgetSessionId");

CREATE TABLE "AssistantVerificationChallenge" (
  "id" TEXT NOT NULL,
  "widgetSessionId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssistantVerificationChallenge_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AssistantVerificationChallenge_widgetSessionId_consumedAt_idx"
  ON "AssistantVerificationChallenge"("widgetSessionId", "consumedAt");

CREATE TABLE "AssistantConversation" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "channel" "AssistantChannel" NOT NULL DEFAULT 'WIDGET',
  "widgetSessionId" TEXT,
  "customerSessionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssistantConversation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AssistantConversation_organizationId_createdAt_idx" ON "AssistantConversation"("organizationId", "createdAt");
CREATE INDEX "AssistantConversation_widgetSessionId_idx" ON "AssistantConversation"("widgetSessionId");

CREATE TABLE "AssistantMessage" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "role" "AIMessageRole" NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssistantMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AssistantMessage_conversationId_createdAt_idx" ON "AssistantMessage"("conversationId", "createdAt");

CREATE TABLE "AssistantAction" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "customerId" TEXT,
  "type" "AssistantActionType" NOT NULL,
  "status" "AssistantActionStatus" NOT NULL DEFAULT 'PROPOSED',
  "payload" JSONB NOT NULL,
  "result" JSONB,
  "idempotencyKey" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "confirmedAt" TIMESTAMP(3),
  "executedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssistantAction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AssistantAction_organizationId_idempotencyKey_key"
  ON "AssistantAction"("organizationId", "idempotencyKey");
CREATE INDEX "AssistantAction_conversationId_status_idx" ON "AssistantAction"("conversationId", "status");
CREATE INDEX "AssistantAction_organizationId_status_idx" ON "AssistantAction"("organizationId", "status");

ALTER TABLE "PublicWidget"
  ADD CONSTRAINT "PublicWidget_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PublicWidgetOrigin"
  ADD CONSTRAINT "PublicWidgetOrigin_widgetId_fkey"
  FOREIGN KEY ("widgetId") REFERENCES "PublicWidget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssistantSettings"
  ADD CONSTRAINT "AssistantSettings_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssistantWidgetSession"
  ADD CONSTRAINT "AssistantWidgetSession_widgetId_fkey"
  FOREIGN KEY ("widgetId") REFERENCES "PublicWidget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssistantWidgetSession"
  ADD CONSTRAINT "AssistantWidgetSession_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssistantCustomerSession"
  ADD CONSTRAINT "AssistantCustomerSession_widgetSessionId_fkey"
  FOREIGN KEY ("widgetSessionId") REFERENCES "AssistantWidgetSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssistantCustomerSession"
  ADD CONSTRAINT "AssistantCustomerSession_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssistantCustomerSession"
  ADD CONSTRAINT "AssistantCustomerSession_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssistantVerificationChallenge"
  ADD CONSTRAINT "AssistantVerificationChallenge_widgetSessionId_fkey"
  FOREIGN KEY ("widgetSessionId") REFERENCES "AssistantWidgetSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssistantConversation"
  ADD CONSTRAINT "AssistantConversation_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssistantConversation"
  ADD CONSTRAINT "AssistantConversation_widgetSessionId_fkey"
  FOREIGN KEY ("widgetSessionId") REFERENCES "AssistantWidgetSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AssistantConversation"
  ADD CONSTRAINT "AssistantConversation_customerSessionId_fkey"
  FOREIGN KEY ("customerSessionId") REFERENCES "AssistantCustomerSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AssistantMessage"
  ADD CONSTRAINT "AssistantMessage_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "AssistantConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssistantAction"
  ADD CONSTRAINT "AssistantAction_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "AssistantConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssistantAction"
  ADD CONSTRAINT "AssistantAction_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssistantAction"
  ADD CONSTRAINT "AssistantAction_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
