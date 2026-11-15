-- Journal plateforme : identifiant d'institut conservé après suppression de l'institut.
--
-- Problème : PlatformAuditLog_organizationId_fkey est ON DELETE SET NULL. Quand un institut est
-- supprimé, toutes ses lignes de journal perdent "organizationId" ; l'historique (paiements,
-- abonnements supprimés en cascade, etc.) n'est alors plus retrouvable par institut.
--
-- Solution : colonne nullable "organizationIdSnapshot", SANS clé étrangère, copie de l'identifiant
-- au moment de l'écriture. Les lecteurs filtrent sur COALESCE("organizationId","organizationIdSnapshot").
--  * writePlatformAuditLog la renseigne dès qu'un organizationId est fourni ;
--  * un trigger BEFORE INSERT la renseigne aussi pour tout autre écrivain (ancien code encore en
--    service pendant le déploiement, script SQL) : il ne modifie que la ligne en cours d'insertion ;
--  * les lignes existantes ayant un organizationId sont rattrapées ci-dessous.
-- Le journal reste append-only pour les rôles applicatifs : aucune politique UPDATE ni droit
-- UPDATE/DELETE n'est ajouté (le backfill s'exécute avec le rôle propriétaire des migrations, qui
-- n'est pas soumis aux politiques RLS ; les droits des rôles rappel_* sont inchangés).
-- Les lignes déjà détachées (organizationId NULL, institut déjà supprimé) n'ont pas d'identifiant
-- à récupérer : elles restent sans institut.
--
-- Sûreté : ADD COLUMN nullable sans défaut est instantané (pas de réécriture) ; backfill en une
-- instruction (le journal est une table d'événements administratifs, de faible volume) ;
-- CREATE INDEX court (table de faible volume) ; lock_timeout fait échouer la migration plutôt que
-- de bloquer le trafic. Idempotente : IF NOT EXISTS, backfill limité aux lignes encore NULL,
-- DROP TRIGGER IF EXISTS avant CREATE.
--
-- Contrôle après migration (doit renvoyer 0) :
--   SELECT count(*) FROM "PlatformAuditLog" WHERE "organizationId" IS NOT NULL AND "organizationIdSnapshot" IS NULL;
--
-- Retour arrière (l'ancien code ignore la colonne ; retirer d'abord le code qui la lit) :
--   DROP TRIGGER IF EXISTS "PlatformAuditLog_org_snapshot_trg" ON "PlatformAuditLog";
--   DROP FUNCTION IF EXISTS platform_audit_log_org_snapshot();
--   DROP INDEX IF EXISTS "PlatformAuditLog_organizationIdSnapshot_idx";
--   ALTER TABLE "PlatformAuditLog" DROP COLUMN IF EXISTS "organizationIdSnapshot";
-- Attention : la suppression de la colonne détruit le seul lien vers les instituts déjà supprimés.
-- Avant de la retirer, sauvegarder au besoin :
--   CREATE TABLE "PlatformAuditLog_org_snapshot_backup" AS
--     SELECT id, "organizationIdSnapshot" FROM "PlatformAuditLog" WHERE "organizationIdSnapshot" IS NOT NULL;
-- Restauration : une sauvegarde antérieure à cette migration n'a pas la colonne ; la restaurer avec
-- le nouveau code échoue (colonne absente). Rejouer `prisma migrate deploy` après restauration, ou
-- déployer l'ancien code. Une sauvegarde postérieure restaure la colonne et ses valeurs.

SET lock_timeout = '10s';

ALTER TABLE "PlatformAuditLog" ADD COLUMN IF NOT EXISTS "organizationIdSnapshot" TEXT;

CREATE OR REPLACE FUNCTION platform_audit_log_org_snapshot() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."organizationIdSnapshot" IS NULL AND NEW."organizationId" IS NOT NULL THEN
    NEW."organizationIdSnapshot" := NEW."organizationId";
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "PlatformAuditLog_org_snapshot_trg" ON "PlatformAuditLog";
CREATE TRIGGER "PlatformAuditLog_org_snapshot_trg"
  BEFORE INSERT ON "PlatformAuditLog"
  FOR EACH ROW EXECUTE FUNCTION platform_audit_log_org_snapshot();

UPDATE "PlatformAuditLog"
   SET "organizationIdSnapshot" = "organizationId"
 WHERE "organizationId" IS NOT NULL AND "organizationIdSnapshot" IS NULL;

CREATE INDEX IF NOT EXISTS "PlatformAuditLog_organizationIdSnapshot_idx"
  ON "PlatformAuditLog" ("organizationIdSnapshot");

RESET lock_timeout;
