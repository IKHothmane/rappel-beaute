-- Journal plateforme.
-- Lecture : uniquement une session plateforme dont la preuve est valide.
-- Écriture : plateforme, et route publique (journal de connexion).
-- Une tâche, une session institut, ou une connexion sans preuve ne voit rien.
-- Le rôle rappel_app peut modifier ses variables de session, pas cette preuve.
-- Sans effet tant que l'application se connecte avec le rôle postgres.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC;

CREATE TABLE IF NOT EXISTS app_private.context_key (
  id int PRIMARY KEY CHECK (id = 1),
  value text NOT NULL
);
REVOKE ALL ON TABLE app_private.context_key FROM PUBLIC;

CREATE OR REPLACE FUNCTION app_scope_granted(expected text) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  secret text;
  claimed text;
  org text;
  bypass text;
  proof text;
  good text;
BEGIN
  SELECT value INTO secret FROM app_private.context_key WHERE id = 1;
  IF secret IS NULL OR expected IS NULL THEN
    RETURN false;
  END IF;
  claimed := current_setting('app.scope', true);
  org := coalesce(current_setting('app.current_org', true), '');
  bypass := coalesce(current_setting('app.rls_bypass', true), '');
  proof := current_setting('app.scope_proof', true);
  IF claimed IS DISTINCT FROM expected OR proof IS NULL OR proof = '' THEN
    RETURN false;
  END IF;
  good := encode(public.hmac(convert_to(claimed || '|' || org || '|' || bypass, 'UTF8'), convert_to(secret, 'UTF8'), 'sha256'), 'hex');
  RETURN good = proof;
END;
$$;

REVOKE ALL ON FUNCTION app_scope_granted(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_scope_granted(text) TO rappel_app;

ALTER TABLE "PlatformAuditLog" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS platform_only ON "PlatformAuditLog";
CREATE POLICY platform_audit_read ON "PlatformAuditLog" FOR SELECT USING (app_scope_granted('platform'));
CREATE POLICY platform_audit_insert ON "PlatformAuditLog" FOR INSERT WITH CHECK (app_scope_granted('platform') OR app_scope_granted('public'));
