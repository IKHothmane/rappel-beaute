-- Sécurité restante de l'authentification : révocation de session (déconnexion réelle), jetons à usage unique
-- (state OAuth Google Calendar) et purge planifiée de l'état d'authentification périmé.
-- Migration ADDITIVE (phase "expand") : une table neuve et une fonction neuve ; aucune table, colonne ou fonction
-- existante n'est modifiée ni supprimée. Idempotente (IF NOT EXISTS, DROP POLICY IF EXISTS, CREATE OR REPLACE,
-- REVOKE / GRANT répétables).
--
-- Contenu :
--  1. "SessionRevocation" : un identifiant `jti` inscrit à la déconnexion (kind 'session') ou à la première utilisation
--     d'un state OAuth (kind 'oauth_state', clé primaire = usage unique atomique). `organizationId` est NULL pour une
--     session plateforme. Pas de clé étrangère : une ligne n'a de sens qu'avant `expiresAt`, puis elle est purgée.
--     RLS : une ligne d'institut n'est visible et insérable que par cet institut (rappel_app) ; les rôles public,
--     plateforme et tâche voient tout (app_rls_bypass() n'inclut plus rappel_public depuis 20261114201000 : il est donc nommé
--     explicitement dans la politique ; la déconnexion est une route publique, le back-office lit les sessions
--     plateforme). Aucune modification ni suppression par rappel_app / rappel_public / rappel_platform.
--  2. app_purge_expired_auth_data(retention) : fonction SECURITY DEFINER pour la tâche planifiée /api/cron/auth-purge.
--     Elle appelle app_purge_expired_auth_state (migration 20261118100000), supprime les révocations expirées et les
--     jetons d'activation expirés ou consommés depuis plus longtemps que `retention`, et REMPLACE SUR PLACE par leur
--     haché 'sha256:<hex>' les anciens jetons d'activation encore en clair (les liens déjà envoyés restent valables :
--     l'application cherche toujours le haché et le clair). Ne supprime jamais ni compte, ni institut.
--
-- Sûreté du déploiement :
--  * Migration d'abord, code ensuite : l'ancien code ignore la table. Le nouveau code tolère l'absence de la table
--    (révocation inactive, journalisée) et refuse un state OAuth si la table manque.
--  * Aucune session existante n'est touchée : les jetons déjà émis n'ont pas de jti et expirent naturellement.
--
-- Retour arrière (retirer d'abord le code) :
--   DROP FUNCTION IF EXISTS app_purge_expired_auth_data(interval);
--   DROP TABLE IF EXISTS "SessionRevocation";
--   -- ATTENTION : la purge remplace sur place les jetons d'activation restés en clair par leur haché (irréversible).
--   -- Après un retour arrière du CODE, les liens d'activation/réinitialisation déjà envoyés dont le jeton a été
--   -- haché par la purge ne fonctionnent plus avec l'ancien code : réémettre ces liens.

SET lock_timeout = '10s';

CREATE TABLE IF NOT EXISTS "SessionRevocation" (
  "jti" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'session',
  "scope" TEXT NOT NULL DEFAULT 'app',
  "userId" TEXT NOT NULL,
  "organizationId" TEXT,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "revokedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SessionRevocation_pkey" PRIMARY KEY ("jti"),
  CONSTRAINT "SessionRevocation_jti_check" CHECK (char_length("jti") BETWEEN 16 AND 128),
  CONSTRAINT "SessionRevocation_kind_check" CHECK ("kind" IN ('session', 'oauth_state')),
  CONSTRAINT "SessionRevocation_scope_check" CHECK ("scope" IN ('app', 'platform')),
  CONSTRAINT "SessionRevocation_org_check" CHECK ("scope" = 'platform' OR "organizationId" IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS "SessionRevocation_expiresAt_idx" ON "SessionRevocation" ("expiresAt");

ALTER TABLE "SessionRevocation" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "SessionRevocation";
CREATE POLICY tenant_isolation ON "SessionRevocation"
  USING (app_rls_bypass() OR current_user = 'rappel_public' OR ("organizationId" IS NOT NULL AND "organizationId" = app_current_org()))
  WITH CHECK (app_rls_bypass() OR current_user = 'rappel_public' OR ("organizationId" IS NOT NULL AND "organizationId" = app_current_org()));

REVOKE ALL ON TABLE "SessionRevocation" FROM PUBLIC, rappel_app, rappel_platform, rappel_public, rappel_job;
GRANT SELECT, INSERT ("jti", "kind", "scope", "userId", "organizationId", "expiresAt") ON "SessionRevocation" TO rappel_app;
GRANT SELECT, INSERT ("jti", "kind", "scope", "userId", "organizationId", "expiresAt") ON "SessionRevocation" TO rappel_public;
GRANT SELECT, INSERT ("jti", "kind", "scope", "userId", "organizationId", "expiresAt") ON "SessionRevocation" TO rappel_platform;
GRANT SELECT ON "SessionRevocation" TO rappel_job;

-- Purge planifiée (tâche cron). `retention` : délai de grâce après expiration (7 jours par défaut).
CREATE OR REPLACE FUNCTION app_purge_expired_auth_data(retention interval DEFAULT interval '7 days')
RETURNS TABLE (
  "oauthStates" bigint,
  "pendingSignups" bigint,
  "verificationTokens" bigint,
  "sessionRevocations" bigint,
  "activationTokensDeleted" bigint,
  "activationTokensHashed" bigint
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  cutoff timestamptz;
  n_state bigint;
  n_pending bigint;
  n_verification bigint;
  n_revocations bigint;
  n_deleted bigint;
  n_hashed bigint;
BEGIN
  IF retention IS NULL OR retention < interval '0' THEN
    RAISE EXCEPTION 'retention must be a non-negative interval' USING ERRCODE = '22023';
  END IF;
  cutoff := pg_catalog.now() - retention;

  SELECT s."oauthStates", s."pendingSignups", s."verificationTokens"
    INTO n_state, n_pending, n_verification
    FROM public.app_purge_expired_auth_state(retention) s;

  DELETE FROM public."SessionRevocation" WHERE "expiresAt" < cutoff;
  GET DIAGNOSTICS n_revocations = ROW_COUNT;

  DELETE FROM public."ActivationToken" WHERE "expiresAt" < cutoff OR "usedAt" < cutoff;
  GET DIAGNOSTICS n_deleted = ROW_COUNT;

  -- Jetons restés en clair (émis avant le hachage) : remplacés sur place par leur haché SHA-256 hexadécimal,
  -- identique à hashActivationToken() côté application ('sha256:' + hex de l'UTF-8 du jeton).
  UPDATE public."ActivationToken"
     SET "token" = 'sha256:' || pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to("token", 'UTF8')), 'hex')
   WHERE "token" NOT LIKE 'sha256:%';
  GET DIAGNOSTICS n_hashed = ROW_COUNT;

  RETURN QUERY SELECT n_state, n_pending, n_verification, n_revocations, n_deleted, n_hashed;
END;
$$;
REVOKE ALL ON FUNCTION app_purge_expired_auth_data(interval) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_purge_expired_auth_data(interval) TO rappel_job, rappel_platform;

RESET lock_timeout;
