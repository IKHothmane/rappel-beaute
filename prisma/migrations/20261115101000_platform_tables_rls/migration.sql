-- Tables sans organizationId (ou racine "Organization") encore modifiables par rappel_app :
-- Organization, Plan, AdsAgentConfig, AdsAgentDecision, AdsCampaignSnapshot,
-- AppleWalletDevice, ResourceCatalogDefault, ServiceCatalogDefault, BlogQuestion.
--
-- Accès réels relevés dans le code avant d'écrire les règles :
--  * Organization : lue par tous les rôles ; mise à jour par le back-office, par l'institut sur sa
--    propre ligne (logo, site, adresse, numéro WhatsApp), jamais supprimée par un institut ;
--    créée par le back-office et par l'inscription publique ; statut changé par le back-office.
--  * Plan, catalogues de soins/ressources : lus par tous, écrits par le back-office seul.
--  * AppleWalletDevice : écrite par les routes publiques PassKit et lue/purgée par la tâche d'envoi.
--  * AdsAgent*, AdsCampaignSnapshot, BlogQuestion : aucun accès hors back-office.
--
-- Sans effet tant que l'application se connecte avec le rôle propriétaire (postgres) : seuls
-- rappel_app, rappel_platform, rappel_public et rappel_job sont soumis à ces règles.
--
-- Sûreté du déploiement : idempotente (DROP POLICY IF EXISTS avant CREATE, ENABLE RLS et REVOKE
-- répétables), aucun verrou long, aucune donnée touchée. Les contrôles d'intégrité référentielle
-- (clés étrangères, cascades) ignorent RLS : la suppression en cascade d'un institut par le
-- back-office n'est pas affectée.
--
-- Retour arrière (manuel) :
--   ALTER TABLE "<table>" DISABLE ROW LEVEL SECURITY;   -- pour chacune des tables ci-dessus
--   DROP POLICY IF EXISTS organization_read ON "Organization";   -- idem organization_insert, organization_update,
--                                                                 -- organization_delete, plan_read, plan_write, catalog_read,
--                                                                 -- catalog_write, platform_only, apple_device_access
--   GRANT SELECT, INSERT, UPDATE, DELETE ON "<table>" TO rappel_app, rappel_public, rappel_job;
--   GRANT UPDATE ON "Organization" TO rappel_app;   -- remet l'UPDATE de table entière (les colonnes seules sont accordées ci-dessous)
-- Attention : scripts/ops/rls-restore-grants.ts redonne SELECT/INSERT/UPDATE/DELETE sur toutes les
-- tables à rappel_app/public/job après une restauration. Les politiques ci-dessous restent la
-- barrière ; les REVOKE sont une seconde couche à rejouer (relancer cette migration en SQL).

SET lock_timeout = '10s';

-- ─── Organization ───────────────────────────────────────────────────────────────

ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS organization_read ON "Organization";
CREATE POLICY organization_read ON "Organization"
  FOR SELECT
  USING (
    current_user IN ('rappel_platform', 'rappel_public', 'rappel_job')
    OR id = app_current_org()
  );

-- Inscription publique : l'institut créé doit être celui que la requête a annoncé
-- (bindPublicInstitute avant la connexion).
DROP POLICY IF EXISTS organization_insert ON "Organization";
CREATE POLICY organization_insert ON "Organization"
  FOR INSERT
  WITH CHECK (
    current_user = 'rappel_platform'
    OR (current_user = 'rappel_public' AND id = app_current_org())
  );

DROP POLICY IF EXISTS organization_update ON "Organization";
CREATE POLICY organization_update ON "Organization"
  FOR UPDATE
  USING (
    current_user IN ('rappel_platform', 'rappel_job')
    OR (current_user = 'rappel_app' AND id = app_current_org())
  )
  WITH CHECK (
    current_user IN ('rappel_platform', 'rappel_job')
    OR (current_user = 'rappel_app' AND id = app_current_org())
  );

DROP POLICY IF EXISTS organization_delete ON "Organization";
CREATE POLICY organization_delete ON "Organization"
  FOR DELETE
  USING (current_user = 'rappel_platform');

-- Privilèges : l'institut ne crée ni ne supprime d'institut et ne modifie que les champs de
-- ses réglages (organization.ts). Statut, identifiant public et nom restent au back-office.
REVOKE INSERT, DELETE ON TABLE "Organization" FROM rappel_app, rappel_job;
REVOKE UPDATE, DELETE ON TABLE "Organization" FROM rappel_public;
REVOKE UPDATE ON TABLE "Organization" FROM rappel_app;
GRANT UPDATE ("logoUrl", website, address, "whatsappFrom", "updatedAt") ON TABLE "Organization" TO rappel_app;

-- ─── Plan et catalogues : lecture pour tous, écriture pour le back-office ───────

ALTER TABLE "Plan" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS plan_read ON "Plan";
CREATE POLICY plan_read ON "Plan" FOR SELECT USING (true);
DROP POLICY IF EXISTS plan_write ON "Plan";
CREATE POLICY plan_write ON "Plan"
  FOR ALL
  USING (current_user = 'rappel_platform')
  WITH CHECK (current_user = 'rappel_platform');
REVOKE INSERT, UPDATE, DELETE ON TABLE "Plan" FROM rappel_app, rappel_public, rappel_job;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ServiceCatalogDefault', 'ResourceCatalogDefault']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS catalog_read ON %I', t);
    EXECUTE format('CREATE POLICY catalog_read ON %I FOR SELECT USING (true)', t);
    EXECUTE format('DROP POLICY IF EXISTS catalog_write ON %I', t);
    EXECUTE format(
      'CREATE POLICY catalog_write ON %I FOR ALL USING (current_user = ''rappel_platform'') WITH CHECK (current_user = ''rappel_platform'')',
      t
    );
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON TABLE %I FROM rappel_app, rappel_public, rappel_job', t);
  END LOOP;
END $$;

-- ─── Back-office seul ───────────────────────────────────────────────────────────

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['AdsAgentConfig', 'AdsAgentDecision', 'AdsCampaignSnapshot', 'BlogQuestion']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS platform_only ON %I', t);
    EXECUTE format(
      'CREATE POLICY platform_only ON %I FOR ALL USING (current_user = ''rappel_platform'') WITH CHECK (current_user = ''rappel_platform'')',
      t
    );
    EXECUTE format('REVOKE ALL ON TABLE %I FROM rappel_app, rappel_public, rappel_job', t);
  END LOOP;
END $$;

-- ─── Appareils Apple Wallet : routes publiques PassKit, tâche d'envoi, back-office ─

ALTER TABLE "AppleWalletDevice" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS apple_device_access ON "AppleWalletDevice";
CREATE POLICY apple_device_access ON "AppleWalletDevice"
  FOR ALL
  USING (current_user IN ('rappel_platform', 'rappel_public', 'rappel_job'))
  WITH CHECK (current_user IN ('rappel_platform', 'rappel_public', 'rappel_job'));
REVOKE ALL ON TABLE "AppleWalletDevice" FROM rappel_app;

RESET lock_timeout;
