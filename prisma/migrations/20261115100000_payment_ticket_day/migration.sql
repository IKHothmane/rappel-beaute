-- Le numéro de passage JJ/MM-NNN n'a pas d'année : l'unicité (organizationId, ticketNumber)
-- refuserait dès le 01/09/2027 le premier ticket du 01/09 puisque celui de 2026 existe déjà.
-- On ajoute le jour calendaire (Africa/Casablanca) et l'unicité devient
-- (organizationId, ticketDay, ticketNumber). Le libellé affiché ne change pas.
--
-- Sûreté du déploiement :
--  * additive : la colonne est nullable, l'ancien code continue d'écrire sans ticketDay
--    (valeur par défaut = jour courant Casablanca, identique à celui de la séquence) ;
--  * l'ancienne unicité garantit déjà (organizationId, ticketNumber) unique : la nouvelle,
--    plus faible, ne peut pas échouer sur des données existantes ;
--  * idempotente : IF NOT EXISTS / IF EXISTS, la mise à jour ne vise que ticketDay IS NULL ;
--  * l'index unique est total (non partiel) : PostgreSQL ne compare pas les NULL entre eux,
--    donc les paiements sans numéro (ticketNumber NULL) ne sont jamais en conflit. Cela
--    correspond à ce que Prisma déclare dans @@unique([organizationId, ticketDay, ticketNumber]).
--
-- Verrous : l'ajout de colonne sans défaut et le SET DEFAULT sont instantanés ; la création
-- de l'index unique bloque brièvement les écritures sur "Payment" (table de petite taille).
-- lock_timeout fait échouer la migration plutôt que de bloquer le trafic derrière un verrou.
--
-- Retour arrière (manuel, ne rien supprimer côté données) :
--   -- 1. Le code précédent reste compatible avec la colonne : un retour de code seul est possible.
--   -- 2. Pour revenir au schéma précédent, seulement tant qu'aucun JJ/MM-NNN n'existe sur deux années :
--   --    SELECT "organizationId", "ticketNumber", count(*) FROM "Payment"
--   --      WHERE "ticketNumber" IS NOT NULL GROUP BY 1, 2 HAVING count(*) > 1;   -- doit être vide
--   CREATE UNIQUE INDEX IF NOT EXISTS "Payment_organizationId_ticketNumber_key"
--     ON "Payment" ("organizationId", "ticketNumber") WHERE "ticketNumber" IS NOT NULL;
--   CREATE INDEX IF NOT EXISTS "Payment_organizationId_ticketNumber_idx"
--     ON "Payment" ("organizationId", "ticketNumber");
--   DROP INDEX IF EXISTS "Payment_organizationId_ticketDay_ticketNumber_key";
--   ALTER TABLE "Payment" DROP COLUMN IF EXISTS "ticketDay";   -- facultatif : perd le jour calendaire
-- Restauration : la colonne fait partie du dump ; une sauvegarde antérieure à cette migration
-- n'a pas ticketDay, la migration le recalcule depuis "paidAt".

SET lock_timeout = '10s';

ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "ticketDay" DATE;

-- "paidAt" est un timestamp sans fuseau stocké en UTC par Prisma (même conversion que la
-- migration 20261108143000_payment_ticket_number).
UPDATE "Payment"
SET "ticketDay" = (("paidAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Africa/Casablanca')::date
WHERE "ticketDay" IS NULL;

-- Après le rattrapage : les lignes antérieures ne reçoivent pas la date de la migration.
ALTER TABLE "Payment"
  ALTER COLUMN "ticketDay" SET DEFAULT ((now() AT TIME ZONE 'Africa/Casablanca'::text))::date;

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_organizationId_ticketDay_ticketNumber_key"
  ON "Payment" ("organizationId", "ticketDay", "ticketNumber");

-- Remplacés : l'unicité sans année, et son doublon non unique que plus aucune requête n'utilise
-- (aucune lecture ne filtre sur ticketNumber).
DROP INDEX IF EXISTS "Payment_organizationId_ticketNumber_key";
DROP INDEX IF EXISTS "Payment_organizationId_ticketNumber_idx";

RESET lock_timeout;
