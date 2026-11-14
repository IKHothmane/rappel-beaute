-- Une route publique ne traverse plus les instituts.
-- Le back-office et les tâches gardent cette traversée, sauf sur la caisse,
-- les factures, les achats et les notes de dossier.
CREATE OR REPLACE FUNCTION app_rls_bypass() RETURNS boolean
LANGUAGE sql STABLE
AS $$ SELECT current_user IN ('rappel_platform', 'rappel_job') $$;

CREATE OR REPLACE FUNCTION app_current_org() RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT CASE
    WHEN current_user IN ('rappel_platform', 'rappel_job') THEN NULLIF(current_setting('app.current_org', true), '')
    WHEN app_private.org_proof_ok() THEN NULLIF(current_setting('app.current_org', true), '')
    ELSE NULL
  END
$$;

-- La connexion reste possible : le rôle public lit les comptes pour s'authentifier.
DROP POLICY IF EXISTS tenant_isolation ON "User";
CREATE POLICY tenant_isolation ON "User"
  USING (
    current_user IN ('rappel_platform', 'rappel_public')
    OR "organizationId" = app_current_org()
  )
  WITH CHECK (
    current_user IN ('rappel_platform', 'rappel_public')
    OR "organizationId" = app_current_org()
  );

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'Payment', 'PaymentTicketSequence', 'CashRegisterSession', 'CashRegisterTransaction',
    'PosSale', 'Expense', 'CommissionSettings', 'CommissionRecord', 'CommissionAdjustment',
    'CommissionPeriod', 'Invoice', 'InvoiceSequence', 'CustomerNote', 'Purchase', 'PurchaseReceipt'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (current_user = ''rappel_platform'' OR "organizationId" = app_current_org()) WITH CHECK (current_user = ''rappel_platform'' OR "organizationId" = app_current_org())',
      t
    );
    EXECUTE format('REVOKE ALL ON TABLE %I FROM rappel_public, rappel_job', t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS tenant_isolation ON "InvoiceItem";
CREATE POLICY tenant_isolation ON "InvoiceItem"
  USING (current_user = 'rappel_platform' OR EXISTS (SELECT 1 FROM "Invoice" parent WHERE parent.id = "InvoiceItem"."invoiceId"))
  WITH CHECK (current_user = 'rappel_platform' OR EXISTS (SELECT 1 FROM "Invoice" parent WHERE parent.id = "InvoiceItem"."invoiceId"));
REVOKE ALL ON TABLE "InvoiceItem" FROM rappel_public, rappel_job;

DROP POLICY IF EXISTS tenant_isolation ON "PurchaseItem";
CREATE POLICY tenant_isolation ON "PurchaseItem"
  USING (current_user = 'rappel_platform' OR EXISTS (SELECT 1 FROM "Purchase" parent WHERE parent.id = "PurchaseItem"."purchaseId"))
  WITH CHECK (current_user = 'rappel_platform' OR EXISTS (SELECT 1 FROM "Purchase" parent WHERE parent.id = "PurchaseItem"."purchaseId"));
REVOKE ALL ON TABLE "PurchaseItem" FROM rappel_public, rappel_job;

DROP POLICY IF EXISTS tenant_isolation ON "PurchaseReceiptLine";
CREATE POLICY tenant_isolation ON "PurchaseReceiptLine"
  USING (current_user = 'rappel_platform' OR EXISTS (SELECT 1 FROM "PurchaseReceipt" parent WHERE parent.id = "PurchaseReceiptLine"."receiptId"))
  WITH CHECK (current_user = 'rappel_platform' OR EXISTS (SELECT 1 FROM "PurchaseReceipt" parent WHERE parent.id = "PurchaseReceiptLine"."receiptId"));
REVOKE ALL ON TABLE "PurchaseReceiptLine" FROM rappel_public, rappel_job;

-- Recherche d'un numéro par le webhook : cinq lignes au plus, pas la table entière.
CREATE OR REPLACE FUNCTION app_public_customer_by_phone(candidates text[])
RETURNS TABLE (id text, "organizationId" text, "firstName" text, "lastName" text, phone text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT c.id, c."organizationId", c."firstName", c."lastName", c.phone
  FROM public."Customer" c
  WHERE c."deletedAt" IS NULL
    AND regexp_replace(c.phone, '\D', '', 'g') = ANY(candidates)
  LIMIT 5
$$;
REVOKE ALL ON FUNCTION app_public_customer_by_phone(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_public_customer_by_phone(text[]) TO rappel_public;

CREATE OR REPLACE FUNCTION app_public_card_by_token(token text)
RETURNS TABLE (id text, "organizationId" text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT c.id, c."organizationId"
  FROM public."LoyaltyCard" c
  WHERE c."publicToken" = token AND c.status = 'ACTIVE'
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION app_public_card_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_public_card_by_token(text) TO rappel_public;
