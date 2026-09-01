-- Centre de notifications V1

CREATE TYPE "NotificationType" AS ENUM (
  'APPOINTMENT_CREATED',
  'APPOINTMENT_CANCELLED',
  'APPOINTMENT_NO_SHOW',
  'PAYMENT_RECEIVED',
  'REFUND_CREATED',
  'EXPENSE_CREATED',
  'STOCK_LOW',
  'STOCK_OUT',
  'PRODUCT_EXPIRING',
  'STAFF_LEAVE',
  'REVIEW_PENDING',
  'PACKAGE_EXPIRING',
  'LOYALTY_REWARD',
  'CAMPAIGN_READY',
  'SYSTEM'
);

CREATE TYPE "NotificationSeverity" AS ENUM (
  'INFO',
  'WARNING',
  'CRITICAL',
  'SUCCESS'
);

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "severity" "NotificationSeverity" NOT NULL DEFAULT 'INFO',
  "entityType" TEXT,
  "entityId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Notification_organizationId_idempotencyKey_key"
  ON "Notification"("organizationId", "idempotencyKey");

CREATE INDEX "Notification_organizationId_userId_createdAt_idx"
  ON "Notification"("organizationId", "userId", "createdAt");

CREATE INDEX "Notification_organizationId_userId_readAt_idx"
  ON "Notification"("organizationId", "userId", "readAt");

CREATE INDEX "Notification_organizationId_userId_type_idx"
  ON "Notification"("organizationId", "userId", "type");

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
