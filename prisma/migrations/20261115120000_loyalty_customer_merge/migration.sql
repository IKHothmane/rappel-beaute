-- Fusion de fiches clientes confirmée par le personnel (fidélité).
--
-- Une carte anonyme (fiche S) est fusionnée dans la fiche existante T du même institut. La carte de T
-- survit ; la carte de S devient un ALIAS : status 'MERGED', "mergedIntoCardId" = carte de T, elle garde
-- customerId = S et n'est jamais supprimée (son jeton et ses passes Wallet continuent de fonctionner).
-- Cas A : si T n'a pas de carte, la carte de S est rattachée à T (pas d'alias).
--
-- Contenu :
--  1. "LoyaltyCard"."mergedIntoCardId" : auto-référence ON DELETE SET NULL, index, CHECK NOT VALID
--     (status <> 'MERGED' OR "mergedIntoCardId" IS NOT NULL). status reste du texte (pas d'enum).
--  2. "Customer"."mergedIntoCustomerId" : repère de la fiche absorbante, index partiel, sans clé
--     étrangère (évite les cycles ; la fiche absorbante peut elle-même être absorbée plus tard).
--  3. Table "CustomerMerge" : journal des fusions (instantané avant fusion, éléments déplacés,
--     statistiques). Pas de clé étrangère vers Customer / LoyaltyCard / User : le journal survit à la
--     suppression d'une fiche, d'une carte ou d'un compte (seul l'institut le supprime, en cascade).
--     RLS identique aux tables tenant sensibles (modèle de 20261114201000 pour "CustomerNote") :
--     politique tenant_isolation, aucun accès pour rappel_public et rappel_job.
--  4. app_public_card_by_token(text) : pour une carte 'MERGED', renvoie l'id et l'institut de la carte
--     SURVIVANTE (profondeur 1, même institut, survivante ACTIVE). Carte ACTIVE : comportement inchangé.
--     Même signature, mêmes colonnes, SECURITY DEFINER, search_path = pg_catalog, mêmes REVOKE/GRANT.
--
-- Sûreté du déploiement :
--  * ADD COLUMN nullable sans défaut : instantané (pas de réécriture). Le verrou ACCESS EXCLUSIVE sur
--    "LoyaltyCard" et "Customer" est bref ; lock_timeout fait échouer la migration plutôt que de
--    bloquer le trafic.
--  * Clé étrangère ajoutée NOT VALID puis validée : la colonne est NULL partout, la validation ne
--    prend que SHARE UPDATE EXCLUSIVE (lectures et écritures continuent).
--  * CHECK NOT VALID : les lignes existantes ne sont pas relues ; toute ligne écrite est contrôlée.
--    Aucune carte n'est 'MERGED' avant cette migration. Validation possible plus tard :
--      ALTER TABLE "LoyaltyCard" VALIDATE CONSTRAINT "LoyaltyCard_merged_requires_target_check";
--  * CREATE INDEX (hors CONCURRENTLY, car la migration est transactionnelle) balaie "LoyaltyCard" et
--    "Customer" sous un verrou SHARE : à lancer hors heures de pointe sur une très grosse table.
--  * Ordre de déploiement : migration d'abord, code ensuite. L'ancien code ignore les nouvelles
--    colonnes et la nouvelle table ; aucune carte n'est 'MERGED' tant que le nouveau code n'a pas fusionné.
--  * Idempotente : IF NOT EXISTS, pg_constraint / pg_policies consultés avant chaque ajout,
--    DROP POLICY IF EXISTS avant CREATE, CREATE OR REPLACE FUNCTION, REVOKE / GRANT répétables.
--  * Limite connue : "mergedIntoCardId" est ON DELETE SET NULL (demande produit) alors que le CHECK exige
--    une cible pour une carte 'MERGED'. Supprimer physiquement la carte survivante tant qu'un alias la
--    référence échoue donc (23514) au lieu de laisser un alias orphelin. La suppression en cascade d'un
--    institut n'est pas concernée (voir tests/db/loyalty-customer-merge.pg.test.ts).
--
-- Contrôles après migration :
--   SELECT count(*) FROM "LoyaltyCard" WHERE status = 'MERGED' AND "mergedIntoCardId" IS NULL;   -- 0
--   SELECT count(*) FROM "CustomerMerge";                                                         -- 0 avant la première fusion
--
-- Retour arrière (retirer d'abord le code qui lit ces colonnes / cette table) :
--   -- 1. Rendre le jeton des alias de nouveau lisible avant de rétablir l'ancienne fonction, qui ne
--   --    connaît que status = 'ACTIVE' (les alias 'MERGED' deviendraient sinon introuvables). Décision
--   --    métier : remettre un alias en ACTIVE recrée une carte autonome pour la fiche S (compteurs
--   --    éventuellement fusionnés dans T) ; sinon laisser les jetons des alias sans résolution.
--   --      UPDATE "LoyaltyCard" SET status = 'ACTIVE' WHERE status = 'MERGED';   -- seulement si voulu
--   -- 2. Ancienne fonction (définition de 20261114201000_limit_component_privileges) :
--   CREATE OR REPLACE FUNCTION app_public_card_by_token(token text)
--   RETURNS TABLE (id text, "organizationId" text)
--   LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog
--   AS $$
--     SELECT c.id, c."organizationId" FROM public."LoyaltyCard" c
--     WHERE c."publicToken" = token AND c.status = 'ACTIVE' LIMIT 1
--   $$;
--   REVOKE ALL ON FUNCTION app_public_card_by_token(text) FROM PUBLIC;
--   GRANT EXECUTE ON FUNCTION app_public_card_by_token(text) TO rappel_public;
--   -- 3. Sauvegarder le journal si les fusions doivent rester auditables :
--   --      CREATE TABLE "CustomerMerge_backup" AS SELECT * FROM "CustomerMerge";
--   DROP TABLE IF EXISTS "CustomerMerge";
--   DROP INDEX IF EXISTS "Customer_mergedIntoCustomerId_idx";
--   ALTER TABLE "Customer" DROP COLUMN IF EXISTS "mergedIntoCustomerId";
--   ALTER TABLE "LoyaltyCard" DROP CONSTRAINT IF EXISTS "LoyaltyCard_merged_requires_target_check";
--   ALTER TABLE "LoyaltyCard" DROP CONSTRAINT IF EXISTS "LoyaltyCard_mergedIntoCardId_fkey";
--   DROP INDEX IF EXISTS "LoyaltyCard_mergedIntoCardId_idx";
--   ALTER TABLE "LoyaltyCard" DROP COLUMN IF EXISTS "mergedIntoCardId";
-- Attention : DROP COLUMN "mergedIntoCardId" / DROP TABLE "CustomerMerge" détruit le seul lien entre un
-- alias et la carte survivante, et l'instantané avant fusion : sans eux, une défusion n'est plus possible.
-- Restauration : une sauvegarde antérieure à cette migration n'a ni les colonnes ni la table ; la
-- restaurer avec le nouveau code échoue (colonne absente) et perd les fusions faites depuis (les cartes
-- alias reviendraient à ACTIVE sans leurs compteurs fusionnés côté survivante : ne pas rejouer le code
-- tant que la migration n'est pas rejouée). Rejouer `prisma migrate deploy` après restauration, ou
-- déployer l'ancien code. Une sauvegarde postérieure restaure colonnes, table et fusions.

SET lock_timeout = '10s';

-- 1. Carte alias -> carte survivante
ALTER TABLE "LoyaltyCard" ADD COLUMN IF NOT EXISTS "mergedIntoCardId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'LoyaltyCard_mergedIntoCardId_fkey' AND conrelid = to_regclass('public."LoyaltyCard"')
  ) THEN
    ALTER TABLE "LoyaltyCard"
      ADD CONSTRAINT "LoyaltyCard_mergedIntoCardId_fkey"
      FOREIGN KEY ("mergedIntoCardId") REFERENCES "LoyaltyCard" (id) ON DELETE SET NULL ON UPDATE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'LoyaltyCard_merged_requires_target_check' AND conrelid = to_regclass('public."LoyaltyCard"')
  ) THEN
    ALTER TABLE "LoyaltyCard"
      ADD CONSTRAINT "LoyaltyCard_merged_requires_target_check"
      CHECK (status <> 'MERGED' OR "mergedIntoCardId" IS NOT NULL) NOT VALID;
  END IF;
END $$;

ALTER TABLE "LoyaltyCard" VALIDATE CONSTRAINT "LoyaltyCard_mergedIntoCardId_fkey";

CREATE INDEX IF NOT EXISTS "LoyaltyCard_mergedIntoCardId_idx" ON "LoyaltyCard" ("mergedIntoCardId");

-- 2. Fiche absorbée -> fiche absorbante (sans clé étrangère)
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "mergedIntoCustomerId" TEXT;

CREATE INDEX IF NOT EXISTS "Customer_mergedIntoCustomerId_idx"
  ON "Customer" ("mergedIntoCustomerId") WHERE "mergedIntoCustomerId" IS NOT NULL;

-- 3. Journal des fusions
CREATE TABLE IF NOT EXISTS "CustomerMerge" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "sourceCustomerId" TEXT NOT NULL,
  "targetCustomerId" TEXT NOT NULL,
  "sourceCardId" TEXT,
  "targetCardId" TEXT,
  "survivingCardId" TEXT,
  "actorId" TEXT,
  "actorName" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'COMPLETED',
  "snapshotBefore" JSONB NOT NULL,
  "moved" JSONB NOT NULL DEFAULT '{}',
  "stats" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revertedAt" TIMESTAMP(3),
  "revertedById" TEXT,
  CONSTRAINT "CustomerMerge_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CustomerMerge_status_check" CHECK ("status" IN ('COMPLETED', 'REVERTED')),
  CONSTRAINT "CustomerMerge_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "CustomerMerge_organizationId_idempotencyKey_key"
  ON "CustomerMerge" ("organizationId", "idempotencyKey");

-- Une fiche source ne peut être fusionnée qu'une fois tant que la fusion n'est pas annulée.
CREATE UNIQUE INDEX IF NOT EXISTS "CustomerMerge_organizationId_sourceCustomerId_completed_key"
  ON "CustomerMerge" ("organizationId", "sourceCustomerId") WHERE "status" = 'COMPLETED';

CREATE INDEX IF NOT EXISTS "CustomerMerge_organizationId_createdAt_idx"
  ON "CustomerMerge" ("organizationId", "createdAt" DESC);

ALTER TABLE "CustomerMerge" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "CustomerMerge";
CREATE POLICY tenant_isolation ON "CustomerMerge"
  USING (current_user = 'rappel_platform' OR "organizationId" = app_current_org())
  WITH CHECK (current_user = 'rappel_platform' OR "organizationId" = app_current_org());

REVOKE ALL ON TABLE "CustomerMerge" FROM PUBLIC;
REVOKE ALL ON TABLE "CustomerMerge" FROM rappel_public, rappel_job;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "CustomerMerge" TO rappel_app, rappel_platform;

-- 4. Résolution publique d'un jeton : une carte alias renvoie la carte survivante
CREATE OR REPLACE FUNCTION app_public_card_by_token(token text)
RETURNS TABLE (id text, "organizationId" text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT t.id, t."organizationId"
  FROM public."LoyaltyCard" c
  JOIN public."LoyaltyCard" t
    ON t.id = CASE WHEN c.status = 'MERGED' THEN c."mergedIntoCardId" ELSE c.id END
   AND t."organizationId" = c."organizationId"
  WHERE c."publicToken" = token
    AND c.status IN ('ACTIVE', 'MERGED')
    AND t.status = 'ACTIVE'
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION app_public_card_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_public_card_by_token(text) TO rappel_public;

RESET lock_timeout;
