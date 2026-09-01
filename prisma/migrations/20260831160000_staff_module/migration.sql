-- Module Employées V1

ALTER TYPE "StaffStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';

CREATE TYPE "LeaveType" AS ENUM ('CONGE', 'MALADIE', 'ABSENCE', 'AUTRE');
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS "firstName" TEXT;
ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS "lastName" TEXT;
ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS position TEXT;
ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS "hireDate" TIMESTAMP(3);
ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

UPDATE "Staff"
SET "firstName" = COALESCE("firstName", name),
    "lastName" = COALESCE(NULLIF("lastName", ''), ''),
    position = COALESCE(position, role)
WHERE "firstName" IS NULL OR position IS NULL;

UPDATE "Staff" SET "lastName" = '' WHERE "lastName" IS NULL;
UPDATE "Staff" SET "firstName" = 'Employée' WHERE "firstName" IS NULL OR "firstName" = '';

ALTER TABLE "Staff" ALTER COLUMN "firstName" SET NOT NULL;
ALTER TABLE "Staff" ALTER COLUMN "lastName" SET NOT NULL;

ALTER TABLE "Staff" DROP COLUMN IF EXISTS name;
ALTER TABLE "Staff" DROP COLUMN IF EXISTS role;

CREATE INDEX IF NOT EXISTS "Staff_organizationId_deletedAt_idx" ON "Staff"("organizationId", "deletedAt");
CREATE INDEX IF NOT EXISTS "Staff_organizationId_lastName_idx" ON "Staff"("organizationId", "lastName");

CREATE TABLE IF NOT EXISTS "StaffSchedule" (
  "id" TEXT NOT NULL,
  "staffId" TEXT NOT NULL,
  "dayOfWeek" INTEGER NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "StaffSchedule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StaffSchedule_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "StaffSchedule_staffId_dayOfWeek_key" ON "StaffSchedule"("staffId", "dayOfWeek");
CREATE INDEX IF NOT EXISTS "StaffSchedule_staffId_idx" ON "StaffSchedule"("staffId");

CREATE TABLE IF NOT EXISTS "StaffBreak" (
  "id" TEXT NOT NULL,
  "staffId" TEXT NOT NULL,
  "dayOfWeek" INTEGER NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  CONSTRAINT "StaffBreak_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StaffBreak_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "StaffBreak_staffId_idx" ON "StaffBreak"("staffId");

CREATE TABLE IF NOT EXISTS "StaffLeave" (
  "id" TEXT NOT NULL,
  "staffId" TEXT NOT NULL,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  type "LeaveType" NOT NULL DEFAULT 'CONGE',
  reason TEXT,
  status "LeaveStatus" NOT NULL DEFAULT 'APPROVED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StaffLeave_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StaffLeave_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "StaffLeave_staffId_idx" ON "StaffLeave"("staffId");
CREATE INDEX IF NOT EXISTS "StaffLeave_staffId_startAt_endAt_idx" ON "StaffLeave"("staffId", "startAt", "endAt");
