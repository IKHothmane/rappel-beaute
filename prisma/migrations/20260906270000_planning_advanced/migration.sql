-- 41.24 Planning avancé

DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE 'APPOINTMENT_RESCHEDULED';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "StaffOvertime" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "staffId" TEXT NOT NULL,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StaffOvertime_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "StaffOvertime_organizationId_startAt_endAt_idx"
  ON "StaffOvertime"("organizationId", "startAt", "endAt");
CREATE INDEX IF NOT EXISTS "StaffOvertime_staffId_startAt_endAt_idx"
  ON "StaffOvertime"("staffId", "startAt", "endAt");

DO $$ BEGIN
  ALTER TABLE "StaffOvertime"
    ADD CONSTRAINT "StaffOvertime_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "StaffOvertime"
    ADD CONSTRAINT "StaffOvertime_staffId_fkey"
    FOREIGN KEY ("staffId") REFERENCES "Staff"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "StaffReplacement" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "absentStaffId" TEXT NOT NULL,
  "substituteStaffId" TEXT NOT NULL,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "reason" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StaffReplacement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "StaffReplacement_organizationId_startAt_endAt_idx"
  ON "StaffReplacement"("organizationId", "startAt", "endAt");
CREATE INDEX IF NOT EXISTS "StaffReplacement_absentStaffId_startAt_endAt_idx"
  ON "StaffReplacement"("absentStaffId", "startAt", "endAt");
CREATE INDEX IF NOT EXISTS "StaffReplacement_substituteStaffId_idx"
  ON "StaffReplacement"("substituteStaffId");

DO $$ BEGIN
  ALTER TABLE "StaffReplacement"
    ADD CONSTRAINT "StaffReplacement_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "StaffReplacement"
    ADD CONSTRAINT "StaffReplacement_absentStaffId_fkey"
    FOREIGN KEY ("absentStaffId") REFERENCES "Staff"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "StaffReplacement"
    ADD CONSTRAINT "StaffReplacement_substituteStaffId_fkey"
    FOREIGN KEY ("substituteStaffId") REFERENCES "Staff"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "OrganizationClosure" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationClosure_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OrganizationClosure_organizationId_startAt_endAt_idx"
  ON "OrganizationClosure"("organizationId", "startAt", "endAt");

DO $$ BEGIN
  ALTER TABLE "OrganizationClosure"
    ADD CONSTRAINT "OrganizationClosure_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
