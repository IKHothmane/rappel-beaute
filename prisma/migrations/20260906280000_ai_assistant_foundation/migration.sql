-- 43.1 — Assistant IA (conversations + usage)

DO $$ BEGIN
  CREATE TYPE "AIMessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM', 'TOOL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "AIConversation" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AIConversation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AIConversation_organizationId_userId_updatedAt_idx"
  ON "AIConversation"("organizationId", "userId", "updatedAt");
CREATE INDEX IF NOT EXISTS "AIConversation_organizationId_createdAt_idx"
  ON "AIConversation"("organizationId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "AIConversation"
    ADD CONSTRAINT "AIConversation_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AIConversation"
    ADD CONSTRAINT "AIConversation_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "AIMessage" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "role" "AIMessageRole" NOT NULL,
  "content" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AIMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AIMessage_conversationId_createdAt_idx"
  ON "AIMessage"("conversationId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "AIMessage"
    ADD CONSTRAINT "AIMessage_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "AIConversation"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "AIUsagePeriod" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "periodKey" TEXT NOT NULL,
  "messageCount" INTEGER NOT NULL DEFAULT 0,
  "promptTokens" INTEGER NOT NULL DEFAULT 0,
  "completionTokens" INTEGER NOT NULL DEFAULT 0,
  "estimatedCostMad" DECIMAL(12,4) NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AIUsagePeriod_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AIUsagePeriod_organizationId_periodKey_key"
  ON "AIUsagePeriod"("organizationId", "periodKey");
CREATE INDEX IF NOT EXISTS "AIUsagePeriod_organizationId_idx"
  ON "AIUsagePeriod"("organizationId");

DO $$ BEGIN
  ALTER TABLE "AIUsagePeriod"
    ADD CONSTRAINT "AIUsagePeriod_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
