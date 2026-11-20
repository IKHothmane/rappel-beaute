-- =============================================================================
-- EN ATTENTE : unicité globale de l'e-mail des utilisateurs d'institut
-- =============================================================================
-- Ce fichier vit volontairement dans prisma/pending-migrations/ : `prisma migrate deploy`
-- (releaseCommand de railway.toml) ne lit QUE prisma/migrations/. Une migration en échec
-- y bloquerait le release et tous les déploiements suivants (état « failed » dans
-- _prisma_migrations, à résoudre à la main). Ne la déplacer dans prisma/migrations/
-- qu'après audit et résolution des doublons.
--
-- PRÉCONDITION
--   Aucun doublon d'e-mail, insensible à la casse et aux espaces de bord, entre comptes "User"
--   (tous instituts confondus). Auditer avec scripts/ops/auth-accounts-audit.sql (requête 03a :
--   groupes_en_double = 0). Les doublons se résolvent À LA MAIN, hors migration (désactiver,
--   changer l'e-mail ou fusionner par une procédure métier validée).
--
-- COMPORTEMENT
--   1. Le bloc DO compte les groupes en double. S'il en reste, RAISE EXCEPTION avec un message
--      explicite : la transaction est annulée, aucun index n'est créé, aucune donnée n'est touchée.
--   2. Sinon : CREATE UNIQUE INDEX IF NOT EXISTS "User_email_lower_unique"
--      sur LOWER(BTRIM(email)), partiel (e-mail non NULL et non vide).
--   Les comptes sans e-mail (NULL ou vide, p.ex. identifiés par loginPhone) restent autorisés
--   en nombre illimité. Aucune donnée n'est modifiée, fusionnée ni supprimée par cette migration.
--   Le comptage n'est pas filtré par la RLS : la migration s'exécute avec le rôle propriétaire
--   des tables (RLS activée mais non forcée) ; ne pas l'exécuter avec un rôle d'application.
--
-- IMPACT
--   CREATE UNIQUE INDEX (non CONCURRENTLY, car Prisma exécute la migration en transaction) prend un
--   verrou SHARE sur "User" : lectures permises, écritures bloquées le temps de la création
--   (courte sur une table de comptes). lock_timeout évite d'attendre indéfiniment.
--   Après application, les insertions d'un e-mail déjà pris (casse/espaces compris) échouent en
--   23505 sur "User_email_lower_unique" : le code d'inscription et de création de compte doit
--   gérer cette erreur (aujourd'hui seule "User_loginPhone_key" est traduite).
--   L'ancien index "User_organizationId_email_key" est conservé (utilisé par Prisma).
--
-- RETOUR ARRIÈRE
--   DROP INDEX IF EXISTS "User_email_lower_unique";
--   (aucune donnée à restaurer ; si la migration a été déplacée puis marquée appliquée par Prisma,
--    retirer aussi sa ligne de _prisma_migrations ou la garder et la remplacer par une migration
--    de suppression d'index, jamais modifier une migration déjà appliquée.)
--   En cas d'échec en cours de `migrate deploy` : `prisma migrate resolve --rolled-back
--   20261120090000_user_email_global_unique`, corriger les doublons, puis relancer.
-- =============================================================================

SET LOCAL lock_timeout = '10s';

DO $$
DECLARE
  nb_groupes integer;
  nb_comptes integer;
BEGIN
  SELECT COUNT(*), COALESCE(SUM(n), 0)
    INTO nb_groupes, nb_comptes
    FROM (
      SELECT COUNT(*) AS n
        FROM "User"
       WHERE email IS NOT NULL AND BTRIM(email) <> ''
       GROUP BY LOWER(BTRIM(email))
      HAVING COUNT(*) > 1
    ) d;

  IF nb_groupes > 0 THEN
    RAISE EXCEPTION
      'Migration user_email_global_unique annulée : % e-mail(s) en double (% comptes concernés). Résoudre les doublons avec scripts/ops/auth-accounts-audit.sql (requêtes 03a-03d) avant de déployer. Aucune donnée n''a été modifiée et aucun index n''a été créé.',
      nb_groupes, nb_comptes
      USING ERRCODE = 'unique_violation',
            HINT = 'Aucune modification automatique : désactiver, corriger ou fusionner les comptes manuellement, puis relancer.';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_lower_unique"
  ON "User" (LOWER(BTRIM(email)))
  WHERE email IS NOT NULL AND BTRIM(email) <> '';
