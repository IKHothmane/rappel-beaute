-- Prospection commerciale du back-office : "Prospect" (instituts et salons de beauté au Maroc, importés
-- d'OpenStreetMap, d'un CSV ou saisis à la main). Table PLATEFORME : pas de "organizationId", aucun institut
-- ne la voit. Migration ADDITIVE : une table neuve, aucune table existante touchée.
-- Ordre de déploiement : migration d'abord, code ensuite (l'ancien code ignore la table).
--
-- Modèle :
--  * "source" : 'OSM' | 'CSV' | 'MANUAL' (CHECK) ; "sourceRef" : référence d'origine (ex. 'node/123456'),
--    1 à 64 caractères, obligatoire pour 'OSM' (sans elle, un nouvel import créerait un doublon).
--  * Unicité "Prospect_source_sourceRef_key" (index unique simple, NULLS DISTINCT par défaut) : deux lignes
--    sans "sourceRef" (CSV / MANUAL) ne sont jamais en conflit. Import idempotent :
--      INSERT ... ON CONFLICT ("source", "sourceRef") DO UPDATE SET ..., "updatedAt" = now()
--    Une ligne dont "sourceRef" est NULL n'entre jamais en conflit : elle est toujours insérée.
--  * "category" : hairdresser | barber | beauty | cosmetics | massage | spa | nails | other (CHECK).
--  * "status" : TO_CONTACT (défaut) | CONTACTED | CUSTOMER | DECLINED (CHECK).
--  * "phone" : E.164 strict (^\+[1-9][0-9]{6,14}$, 32 caractères au plus) ; l'import normalise le numéro
--    ou écrit NULL (les étiquettes OSM contiennent souvent espaces ou plusieurs numéros séparés par ';').
--  * Longueurs bornées (CHECK) : name 1..200 (non blanc), city 120, address 300, email 254, website 500,
--    notes 2000. Coordonnées : les deux ou aucune, latitude -90..90, longitude -180..180.
--  * "updatedAt" n'a pas de déclencheur : chaque UPDATE (y compris DO UPDATE) écrit "updatedAt" = now().
--
-- Index : status, category, LOWER(city) (filtre exact lower("city") = lower($1)). Pas de pg_trgm (aucune
-- extension de ce type dans le dépôt) : une recherche ILIKE '%x%' sur name / city / phone parcourt la table,
-- ce qui reste acceptable pour quelques milliers de prospects.
--
-- Isolation (convention des tables plateforme, comme "BlogQuestion" et "AdsAgent*" dans
-- 20261115101000_platform_tables_rls) : RLS activée (ENABLE, sans FORCE : rappel_app n'est jamais
-- propriétaire), une seule politique platform_only FOR ALL limitée à rappel_platform. Droits :
-- REVOKE ALL pour PUBLIC et les quatre rôles, puis SELECT, INSERT, UPDATE, DELETE pour rappel_platform seul
-- (DELETE comme pour les autres tables du back-office : effacement d'un prospect sur demande ou d'un import
-- erroné). Ni TRUNCATE, ni REFERENCES, ni TRIGGER. rappel_app, rappel_public et rappel_job : aucun droit.
-- Attention : scripts/ops/rls-restore-grants.ts redonne SELECT/INSERT/UPDATE/DELETE sur toutes les tables aux
-- quatre rôles après une restauration ; la politique platform_only reste alors la barrière (aucune ligne
-- visible ni insérable hors rappel_platform). Rejouer ce fichier en SQL rétablit la seconde couche (REVOKE).
--
-- Sûreté du déploiement : création d'une table vide, aucune clé étrangère, aucun verrou sur une table
-- existante ; lock_timeout borne l'attente. Idempotente : IF NOT EXISTS, DROP POLICY IF EXISTS avant CREATE,
-- REVOKE / GRANT répétables.
--
-- Contrôle après migration :
--   SELECT count(*) FROM "Prospect";   -- 0
--
-- Retour arrière (retirer d'abord le code du back-office qui lit / écrit les prospects) :
--   -- Pour conserver les prospects en vue d'un redéploiement :
--   --   CREATE TABLE "Prospect_backup" AS SELECT * FROM "Prospect";
--   DROP TABLE IF EXISTS "Prospect";   -- supprime index, contraintes et politique ; perd les statuts et notes
--   DELETE FROM "_prisma_migrations" WHERE migration_name = '20261126090000_platform_prospects';
-- Restauration : une sauvegarde antérieure à cette migration n'a pas la table : rejouer
-- `prisma migrate deploy` après restauration. Après un pg_restore --no-acl, rejouer `npm run ops:rls-grants`
-- puis ce fichier (REVOKE / GRANT) pour retrouver les droits minimaux.

BEGIN;
SET LOCAL lock_timeout = '10s';

-- 1. Table
CREATE TABLE IF NOT EXISTS "Prospect" (
  "id" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "sourceRef" TEXT,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "city" TEXT,
  "address" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "phone" TEXT,
  "email" TEXT,
  "website" TEXT,
  "status" TEXT NOT NULL DEFAULT 'TO_CONTACT',
  "notes" TEXT,
  "lastSyncedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "Prospect_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Prospect_source_check" CHECK ("source" IN ('OSM', 'CSV', 'MANUAL')),
  CONSTRAINT "Prospect_sourceRef_check" CHECK ("sourceRef" IS NULL OR char_length("sourceRef") BETWEEN 1 AND 64),
  CONSTRAINT "Prospect_osm_sourceRef_check" CHECK ("source" <> 'OSM' OR "sourceRef" IS NOT NULL),
  CONSTRAINT "Prospect_name_check" CHECK (char_length("name") <= 200 AND btrim("name") <> ''),
  CONSTRAINT "Prospect_category_check"
    CHECK ("category" IN ('hairdresser', 'barber', 'beauty', 'cosmetics', 'massage', 'spa', 'nails', 'other')),
  CONSTRAINT "Prospect_city_check" CHECK ("city" IS NULL OR char_length("city") <= 120),
  CONSTRAINT "Prospect_address_check" CHECK ("address" IS NULL OR char_length("address") <= 300),
  -- IS NOT NULL explicite : sans lui, une seule coordonnée donnerait NULL, qu'un CHECK accepte.
  CONSTRAINT "Prospect_coordinates_check" CHECK (
    ("latitude" IS NULL AND "longitude" IS NULL)
    OR ("latitude" IS NOT NULL AND "longitude" IS NOT NULL
        AND "latitude" BETWEEN -90 AND 90 AND "longitude" BETWEEN -180 AND 180)
  ),
  CONSTRAINT "Prospect_phone_check"
    CHECK ("phone" IS NULL OR (char_length("phone") <= 32 AND "phone" ~ '^\+[1-9][0-9]{6,14}$')),
  CONSTRAINT "Prospect_email_check" CHECK ("email" IS NULL OR char_length("email") <= 254),
  CONSTRAINT "Prospect_website_check" CHECK ("website" IS NULL OR char_length("website") <= 500),
  CONSTRAINT "Prospect_status_check" CHECK ("status" IN ('TO_CONTACT', 'CONTACTED', 'CUSTOMER', 'DECLINED')),
  CONSTRAINT "Prospect_notes_check" CHECK ("notes" IS NULL OR char_length("notes") <= 2000)
);

-- 2. Index
CREATE UNIQUE INDEX IF NOT EXISTS "Prospect_source_sourceRef_key" ON "Prospect" ("source", "sourceRef");
CREATE INDEX IF NOT EXISTS "Prospect_status_idx" ON "Prospect" ("status");
CREATE INDEX IF NOT EXISTS "Prospect_category_idx" ON "Prospect" ("category");
CREATE INDEX IF NOT EXISTS "Prospect_city_lower_idx" ON "Prospect" (LOWER("city"));

-- 3. RLS : back-office seul (politique platform_only, comme "BlogQuestion")
ALTER TABLE "Prospect" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_only ON "Prospect";
CREATE POLICY platform_only ON "Prospect"
  FOR ALL
  USING (current_user = 'rappel_platform')
  WITH CHECK (current_user = 'rappel_platform');

-- 4. Droits par rôle : rappel_platform seul
REVOKE ALL ON TABLE "Prospect" FROM PUBLIC, rappel_app, rappel_platform, rappel_public, rappel_job;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "Prospect" TO rappel_platform;

COMMIT;
