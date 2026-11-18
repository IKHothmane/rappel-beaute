-- Sessions and requests are tied to the verified customer within the institute.
-- Rollback requires the previous application version. Preserve these tables if
-- active sessions or verification audit need to be retained for a later rollout.
BEGIN;

CREATE TABLE "LoyaltyVerificationRequest" (
  id TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  code TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL UNIQUE,
  mode TEXT NOT NULL CHECK (mode IN ('enroll', 'recover')),
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  phone TEXT NOT NULL,
  "marketingWhatsappConsent" BOOLEAN,
  "customerId" TEXT,
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMP(3),
  "consumedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoyaltyVerificationRequest_customerId_organizationId_fkey"
    FOREIGN KEY ("customerId", "organizationId")
    REFERENCES "Customer"(id, "organizationId") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LoyaltyVerificationRequest_approval_check"
    CHECK (("approvedAt" IS NULL AND "customerId" IS NULL AND "approvedBy" IS NULL AND "consumedAt" IS NULL)
        OR ("approvedAt" IS NOT NULL AND "customerId" IS NOT NULL AND "approvedBy" IS NOT NULL))
);

CREATE UNIQUE INDEX "LoyaltyVerificationRequest_organizationId_code_key"
  ON "LoyaltyVerificationRequest"("organizationId", code);
CREATE INDEX "LoyaltyVerificationRequest_customer_org_idx"
  ON "LoyaltyVerificationRequest"("customerId", "organizationId");
CREATE INDEX "LoyaltyVerificationRequest_expiresAt_idx" ON "LoyaltyVerificationRequest"("expiresAt");

CREATE TABLE "LoyaltyCustomerSession" (
  id TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "customerId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL UNIQUE,
  "phoneSnapshot" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "absoluteExpiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoyaltyCustomerSession_customerId_organizationId_fkey"
    FOREIGN KEY ("customerId", "organizationId")
    REFERENCES "Customer"(id, "organizationId") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LoyaltyCustomerSession_expiry_check" CHECK ("expiresAt" <= "absoluteExpiresAt")
);

CREATE INDEX "LoyaltyCustomerSession_customer_org_idx"
  ON "LoyaltyCustomerSession"("customerId", "organizationId");
CREATE INDEX "LoyaltyCustomerSession_expiresAt_idx" ON "LoyaltyCustomerSession"("expiresAt");

ALTER TABLE "LoyaltyVerificationRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LoyaltyCustomerSession" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "LoyaltyVerificationRequest"
  USING ("organizationId" = app_current_org())
  WITH CHECK ("organizationId" = app_current_org());
CREATE POLICY tenant_isolation ON "LoyaltyCustomerSession"
  USING ("organizationId" = app_current_org())
  WITH CHECK ("organizationId" = app_current_org());

REVOKE ALL ON "LoyaltyVerificationRequest", "LoyaltyCustomerSession"
  FROM PUBLIC, rappel_app, rappel_platform, rappel_public, rappel_job;
GRANT SELECT, UPDATE ("customerId", "approvedBy", "approvedAt", "consumedAt")
  ON "LoyaltyVerificationRequest" TO rappel_app;
GRANT SELECT, UPDATE ("revokedAt") ON "LoyaltyCustomerSession" TO rappel_app;
GRANT SELECT, INSERT (id, "organizationId", code, "tokenHash", mode, "firstName", "lastName", phone,
  "marketingWhatsappConsent", "expiresAt"), UPDATE ("consumedAt")
  ON "LoyaltyVerificationRequest" TO rappel_public;
GRANT SELECT, INSERT (id, "organizationId", "customerId", "tokenHash", "phoneSnapshot", "expiresAt", "absoluteExpiresAt"),
  UPDATE ("expiresAt", "revokedAt") ON "LoyaltyCustomerSession" TO rappel_public;

CREATE FUNCTION app_public_loyalty_join_institute(join_token text)
RETURNS TABLE ("organizationId" text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT q."organizationId" FROM public."LoyaltyJoinQr" q
  JOIN public."Organization" o ON o.id = q."organizationId" AND o.status = 'ACTIVE'
  WHERE q.token = join_token AND q.status = 'ACTIVE'
$$;
REVOKE ALL ON FUNCTION app_public_loyalty_join_institute(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_public_loyalty_join_institute(text) TO rappel_public;

COMMIT;
