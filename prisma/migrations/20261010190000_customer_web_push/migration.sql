-- Notifications Web Push clientes. Distinctes de la table Notification (personnel).

DO $$ BEGIN
  CREATE TYPE "CustomerPushCategory" AS ENUM (
    'LOYALTY_REWARD',
    'LOYALTY_PROGRESS',
    'REVIEW_REQUEST',
    'REWARD_EXPIRY',
    'OFFER'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CustomerPushStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "NotificationPreference" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "loyaltyReward" BOOLEAN NOT NULL DEFAULT false,
  "loyaltyProgress" BOOLEAN NOT NULL DEFAULT false,
  "reviewRequest" BOOLEAN NOT NULL DEFAULT false,
  "rewardExpiry" BOOLEAN NOT NULL DEFAULT false,
  "offers" BOOLEAN NOT NULL DEFAULT false,
  "consentedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WebPushSubscription" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "expirationTime" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "failureCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebPushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CustomerPushDelivery" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "category" "CustomerPushCategory" NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "url" TEXT,
  "status" "CustomerPushStatus" NOT NULL DEFAULT 'PENDING',
  "scheduledFor" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerPushDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "NotificationPreference_organizationId_customerId_key"
  ON "NotificationPreference"("organizationId", "customerId");
CREATE INDEX IF NOT EXISTS "NotificationPreference_organizationId_idx"
  ON "NotificationPreference"("organizationId");

CREATE UNIQUE INDEX IF NOT EXISTS "WebPushSubscription_endpoint_key"
  ON "WebPushSubscription"("endpoint");
CREATE INDEX IF NOT EXISTS "WebPushSubscription_organizationId_customerId_idx"
  ON "WebPushSubscription"("organizationId", "customerId");

CREATE UNIQUE INDEX IF NOT EXISTS "CustomerPushDelivery_organizationId_idempotencyKey_key"
  ON "CustomerPushDelivery"("organizationId", "idempotencyKey");
CREATE INDEX IF NOT EXISTS "CustomerPushDelivery_organizationId_status_scheduledFor_idx"
  ON "CustomerPushDelivery"("organizationId", "status", "scheduledFor");
CREATE INDEX IF NOT EXISTS "CustomerPushDelivery_customerId_idx"
  ON "CustomerPushDelivery"("customerId");

DO $$ BEGIN
  ALTER TABLE "NotificationPreference"
    ADD CONSTRAINT "NotificationPreference_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "NotificationPreference"
    ADD CONSTRAINT "NotificationPreference_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "WebPushSubscription"
    ADD CONSTRAINT "WebPushSubscription_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "WebPushSubscription"
    ADD CONSTRAINT "WebPushSubscription_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CustomerPushDelivery"
    ADD CONSTRAINT "CustomerPushDelivery_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CustomerPushDelivery"
    ADD CONSTRAINT "CustomerPushDelivery_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
