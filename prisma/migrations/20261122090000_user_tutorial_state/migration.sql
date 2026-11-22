-- Tutoriel de première connexion : état persisté par utilisateur ("UserTutorialState", une ligne par "User").
-- Migration ADDITIVE : une table neuve et un indicateur d'éligibilité sur les instituts.
-- Ordre de déploiement : migration d'abord, code ensuite (l'ancien code ignore la table).
--
-- Modèle :
--  * "userId" (TEXT, clé primaire, FK "User" ON DELETE CASCADE) : un état par utilisateur, supprimé avec lui.
--  * "organizationId" (TEXT NOT NULL, FK "Organization" ON DELETE CASCADE) : porte la RLS d'institut.
--  * "status" : NOT_STARTED | IN_PROGRESS | COMPLETED | SKIPPED (CHECK).
--  * "lastStep" : identifiant d'étape de 40 caractères au plus (CHECK), NULL tant qu'aucune étape n'est atteinte.
--  * "version" : version du contenu du tutoriel vu par l'utilisateur.
--
-- Isolation : RLS activée (convention du dépôt : ENABLE seulement, rappel_app n'est jamais propriétaire, donc
-- pas de FORCE), exactement UNE politique tenant_isolation de type ALL (USING + WITH CHECK), identique à
-- 20261110090000_tenant_row_level_security. Les droits par défaut (ALTER DEFAULT PRIVILEGES) donnent le DML
-- complet à rappel_public / rappel_job / rappel_platform : ils sont retirés puis rappel_app reçoit un droit
-- minimal par colonne ; rappel_platform est en lecture seule ; rappel_public et rappel_job n'ont aucun droit ;
-- personne n'a DELETE (la suppression passe par la cascade du "User") ni TRUNCATE.
-- "userId" et "organizationId" ne sont pas modifiables après création (INSERT seulement).
--
-- Limite connue : la politique ne vérifie que "organizationId" ; la clé étrangère "userId" ne vérifie pas que
-- l'utilisateur appartient à cet institut. L'application doit dériver "userId" ET "organizationId" de la session.
--
-- Sûreté du déploiement : PostgreSQL ajoute le booléen avec une valeur constante sans réécrire les lignes
-- existantes. La transaction prend un verrou exclusif sur "Organization" ; lock_timeout borne son attente.
-- Idempotence : IF NOT EXISTS, DROP POLICY IF EXISTS avant CREATE, REVOKE / GRANT répétables.
--
-- Contrôle après migration :
--   SELECT count(*) FROM "UserTutorialState";   -- 0
--
-- Retour arrière (retirer d'abord le code qui lit / écrit l'état du tutoriel) :
--   -- La table est neuve : la supprimer ne perd que l'avancement du tutoriel (les utilisateurs le revoient).
--   -- Pour le conserver en vue d'un redéploiement : CREATE TABLE "UserTutorialState_backup" AS SELECT * FROM "UserTutorialState";
--   DROP TABLE IF EXISTS "UserTutorialState";
-- Restauration : après un pg_restore --no-acl, rejouer `npm run ops:rls-grants` pour retrouver les droits minimaux.

BEGIN;
SET LOCAL lock_timeout = '10s';

-- Le premier défaut laisse les instituts déjà présents inéligibles, même vides.
-- Le second s'applique uniquement aux nouvelles insertions, y compris après rejeu.
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "tutorialAutoEligible" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Organization" ALTER COLUMN "tutorialAutoEligible" SET DEFAULT true;

-- 1. Table
CREATE TABLE IF NOT EXISTS "UserTutorialState" (
  "userId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
  "lastStep" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "startedAt" TIMESTAMPTZ,
  "completedAt" TIMESTAMPTZ,
  "skippedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "UserTutorialState_pkey" PRIMARY KEY ("userId"),
  CONSTRAINT "UserTutorialState_status_check"
    CHECK ("status" IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED')),
  CONSTRAINT "UserTutorialState_lastStep_check" CHECK ("lastStep" IS NULL OR char_length("lastStep") <= 40),
  CONSTRAINT "UserTutorialState_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "UserTutorialState_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "UserTutorialState_organizationId_idx" ON "UserTutorialState" ("organizationId");

-- 2. RLS : une seule politique tenant_isolation (ALL)
ALTER TABLE "UserTutorialState" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "UserTutorialState";
CREATE POLICY tenant_isolation ON "UserTutorialState"
  USING (app_rls_bypass() OR "organizationId" = app_current_org())
  WITH CHECK (app_rls_bypass() OR "organizationId" = app_current_org());

-- 3. Droits par rôle (les droits par défaut donnent sinon le DML complet à tous les rôles applicatifs)
REVOKE ALL ON TABLE "UserTutorialState" FROM PUBLIC, rappel_app, rappel_platform, rappel_public, rappel_job;

GRANT SELECT,
  INSERT ("userId", "organizationId", "status", "lastStep", "version", "startedAt", "completedAt", "skippedAt", "createdAt", "updatedAt"),
  UPDATE ("status", "lastStep", "version", "startedAt", "completedAt", "skippedAt", "updatedAt")
  ON "UserTutorialState" TO rappel_app;
GRANT SELECT ON "UserTutorialState" TO rappel_platform;

COMMIT;
