-- Enregistrements PassKit. Le numéro de série reste le jeton public de la carte.

CREATE TABLE IF NOT EXISTS "AppleWalletPass" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "loyaltyCardId" TEXT NOT NULL,
  "serialNumber" TEXT NOT NULL,
  "authenticationToken" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AppleWalletPass_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AppleWalletPass_loyaltyCardId_key" ON "AppleWalletPass"("loyaltyCardId");
CREATE UNIQUE INDEX IF NOT EXISTS "AppleWalletPass_serialNumber_key" ON "AppleWalletPass"("serialNumber");
CREATE INDEX IF NOT EXISTS "AppleWalletPass_organizationId_idx" ON "AppleWalletPass"("organizationId");

CREATE TABLE IF NOT EXISTS "AppleWalletDevice" (
  "id" TEXT NOT NULL,
  "deviceLibraryIdentifier" TEXT NOT NULL,
  "pushToken" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AppleWalletDevice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AppleWalletDevice_deviceLibraryIdentifier_key"
  ON "AppleWalletDevice"("deviceLibraryIdentifier");

CREATE TABLE IF NOT EXISTS "AppleWalletRegistration" (
  "id" TEXT NOT NULL,
  "passId" TEXT NOT NULL,
  "deviceId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AppleWalletRegistration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AppleWalletRegistration_passId_deviceId_key"
  ON "AppleWalletRegistration"("passId", "deviceId");
CREATE INDEX IF NOT EXISTS "AppleWalletRegistration_deviceId_idx" ON "AppleWalletRegistration"("deviceId");

DO $$ BEGIN
  ALTER TABLE "AppleWalletPass" ADD CONSTRAINT "AppleWalletPass_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "AppleWalletPass" ADD CONSTRAINT "AppleWalletPass_loyaltyCardId_fkey"
    FOREIGN KEY ("loyaltyCardId") REFERENCES "LoyaltyCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "AppleWalletRegistration" ADD CONSTRAINT "AppleWalletRegistration_passId_fkey"
    FOREIGN KEY ("passId") REFERENCES "AppleWalletPass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "AppleWalletRegistration" ADD CONSTRAINT "AppleWalletRegistration_deviceId_fkey"
    FOREIGN KEY ("deviceId") REFERENCES "AppleWalletDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
