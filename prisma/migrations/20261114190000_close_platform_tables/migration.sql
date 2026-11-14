-- Les tables sans institut n'héritent plus d'un accès complet.
-- Une table créée ensuite par le rôle de migration reste fermée
-- tant que sa propre migration ne l'ouvre pas.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES
  FROM rappel_app, rappel_platform, rappel_public, rappel_job;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE USAGE, SELECT ON SEQUENCES
  FROM rappel_app, rappel_platform, rappel_public, rappel_job;

-- Comptes plateforme : lecture pour la connexion et l'inscription,
-- écriture réservée au back-office. L'institut et les tâches ne voient rien.
ALTER TABLE "PlatformUser" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS platform_user_read ON "PlatformUser";
CREATE POLICY platform_user_read ON "PlatformUser"
  FOR SELECT USING (current_user IN ('rappel_platform', 'rappel_public'));
DROP POLICY IF EXISTS platform_user_write ON "PlatformUser";
CREATE POLICY platform_user_write ON "PlatformUser"
  FOR ALL
  USING (current_user = 'rappel_platform')
  WITH CHECK (current_user = 'rappel_platform');

-- La configuration contient des secrets. Seul le back-office lit la ligne.
-- Le prix public passe par une fonction qui ne renvoie que ce nombre.
ALTER TABLE "PlatformConfig" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS platform_config_access ON "PlatformConfig";
CREATE POLICY platform_config_access ON "PlatformConfig"
  FOR ALL
  USING (current_user = 'rappel_platform')
  WITH CHECK (current_user = 'rappel_platform');

CREATE OR REPLACE FUNCTION app_public_price()
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT NULLIF(data #>> '{billing,publicPrice}', '')::numeric
  FROM public."PlatformConfig"
  WHERE id = 'default'
$$;
REVOKE ALL ON FUNCTION app_public_price() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_public_price() TO rappel_app, rappel_public, rappel_platform;

-- Un article non relu reste invisible à une route publique, même sans filtre SQL.
ALTER TABLE "BlogArticle" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS blog_article_read ON "BlogArticle";
CREATE POLICY blog_article_read ON "BlogArticle"
  FOR SELECT USING (
    current_user = 'rappel_platform'
    OR (
      current_user = 'rappel_public'
      AND status = 'published'
      AND "reviewedBy" IS NOT NULL
      AND "publishedAt" <= NOW()
    )
  );
DROP POLICY IF EXISTS blog_article_write ON "BlogArticle";
CREATE POLICY blog_article_write ON "BlogArticle"
  FOR ALL
  USING (current_user = 'rappel_platform')
  WITH CHECK (current_user = 'rappel_platform');
