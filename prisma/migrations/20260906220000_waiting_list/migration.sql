-- 41.18 Liste d'attente

CREATE TYPE "WaitingListStatus" AS ENUM (
  'WAITING',
  'NOTIFIED',
  'BOOKED',
  'EXPIRED',
  'CANCELLED'
);

CREATE TABLE "WaitingListEntry" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "staffId" TEXT,
  "preferredDate" DATE NOT NULL,
  "preferredTimeFrom" TEXT,
  "preferredTimeTo" TEXT,
  "status" "WaitingListStatus" NOT NULL DEFAULT 'WAITING',
  "notes" TEXT,
  "notifiedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WaitingListEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WaitingListEntry_organizationId_idx" ON "WaitingListEntry"("organizationId");
CREATE INDEX "WaitingListEntry_organizationId_status_idx" ON "WaitingListEntry"("organizationId", "status");
CREATE INDEX "WaitingListEntry_organizationId_serviceId_preferredDate_idx"
  ON "WaitingListEntry"("organizationId", "serviceId", "preferredDate");
CREATE INDEX "WaitingListEntry_organizationId_customerId_idx"
  ON "WaitingListEntry"("organizationId", "customerId");
CREATE INDEX "WaitingListEntry_staffId_idx" ON "WaitingListEntry"("staffId");

ALTER TABLE "WaitingListEntry"
  ADD CONSTRAINT "WaitingListEntry_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WaitingListEntry"
  ADD CONSTRAINT "WaitingListEntry_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WaitingListEntry"
  ADD CONSTRAINT "WaitingListEntry_serviceId_fkey"
  FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WaitingListEntry"
  ADD CONSTRAINT "WaitingListEntry_staffId_fkey"
  FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
