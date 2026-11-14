CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC;
CREATE TABLE IF NOT EXISTS app_private.context_key (
  id int PRIMARY KEY CHECK (id = 1),
  value text NOT NULL
);
REVOKE ALL ON TABLE app_private.context_key FROM PUBLIC;

-- Les tables métier ne s'ouvrent plus avec une variable de session.
-- rappel_app ne voit que l'institut dont la preuve est valide.
-- Le back-office, les routes publiques et les tâches utilisent chacun un rôle
-- que rappel_app ne peut pas prendre. Sans effet pour une connexion postgres.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rappel_platform') THEN
    CREATE ROLE rappel_platform NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rappel_public') THEN
    CREATE ROLE rappel_public NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rappel_job') THEN
    CREATE ROLE rappel_job NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO rappel_platform, rappel_public, rappel_job;
REVOKE CREATE ON SCHEMA public FROM rappel_platform, rappel_public, rappel_job;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO rappel_platform, rappel_public, rappel_job;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO rappel_platform, rappel_public, rappel_job;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO rappel_platform, rappel_public, rappel_job;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO rappel_platform, rappel_public, rappel_job;

DO $$
BEGIN
  IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
    REVOKE ALL ON "_prisma_migrations" FROM rappel_platform, rappel_public, rappel_job;
  END IF;
END $$;

REVOKE ALL ON TABLE "PlatformAuditLog" FROM rappel_app, rappel_public, rappel_job, rappel_platform;
GRANT SELECT, INSERT ON TABLE "PlatformAuditLog" TO rappel_platform;
GRANT INSERT ON TABLE "PlatformAuditLog" TO rappel_public;

CREATE OR REPLACE FUNCTION app_rls_bypass() RETURNS boolean
LANGUAGE sql STABLE
AS $$ SELECT current_user IN ('rappel_platform', 'rappel_public', 'rappel_job') $$;

CREATE OR REPLACE FUNCTION app_private.org_proof_ok() RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  secret text;
  org text;
  proof text;
  good text;
BEGIN
  org := nullif(current_setting('app.current_org', true), '');
  proof := current_setting('app.scope_proof', true);
  IF org IS NULL OR proof IS NULL OR proof = '' THEN
    RETURN false;
  END IF;
  IF current_setting('app.scope', true) IS DISTINCT FROM 'tenant' THEN
    RETURN false;
  END IF;
  IF coalesce(current_setting('app.rls_bypass', true), '') IS DISTINCT FROM 'off' THEN
    RETURN false;
  END IF;
  SELECT value INTO secret FROM app_private.context_key WHERE id = 1;
  IF secret IS NULL THEN
    RETURN false;
  END IF;
  good := encode(public.hmac(convert_to('tenant|' || org || '|off', 'UTF8'), convert_to(secret, 'UTF8'), 'sha256'), 'hex');
  RETURN good = proof;
END;
$$;

REVOKE ALL ON FUNCTION app_private.org_proof_ok() FROM PUBLIC;
GRANT USAGE ON SCHEMA app_private TO rappel_app, rappel_platform, rappel_public, rappel_job;
GRANT EXECUTE ON FUNCTION app_private.org_proof_ok() TO rappel_app, rappel_platform, rappel_public, rappel_job;

CREATE OR REPLACE FUNCTION app_current_org() RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT CASE
    WHEN current_user IN ('rappel_platform', 'rappel_public', 'rappel_job') THEN NULLIF(current_setting('app.current_org', true), '')
    WHEN app_private.org_proof_ok() THEN NULLIF(current_setting('app.current_org', true), '')
    ELSE NULL
  END
$$;

REVOKE ALL ON FUNCTION app_current_org() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_current_org() TO rappel_app, rappel_platform, rappel_public, rappel_job;

DROP POLICY IF EXISTS platform_audit_read ON "PlatformAuditLog";
DROP POLICY IF EXISTS platform_audit_insert ON "PlatformAuditLog";
CREATE POLICY platform_audit_read ON "PlatformAuditLog" FOR SELECT USING (current_user = 'rappel_platform');
CREATE POLICY platform_audit_insert ON "PlatformAuditLog" FOR INSERT WITH CHECK (current_user IN ('rappel_platform', 'rappel_public'));
