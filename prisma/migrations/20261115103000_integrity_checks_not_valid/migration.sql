-- Contraintes d'intégrité manquantes, toutes ajoutées NOT VALID :
--  * les lignes existantes ne sont pas relues (pas de balayage, verrou très court) ni modifiées,
--    aucune donnée n'est supprimée ;
--  * en revanche, toute ligne insérée ou mise à jour est contrôlée immédiatement. Une ligne
--    ancienne hors règle ne bloque pas le déploiement, mais sa prochaine mise à jour (même d'une
--    autre colonne) échouera avec le code 23514 / 23503 tant qu'elle n'est pas corrigée.
-- Idempotente : chaque ajout vérifie d'abord pg_constraint.
--
-- Choix de bornes :
--  * Payment.amount >= 0 et non > 0 : une vente de caisse remisée à 100 % (pos.ts : remise plafonnée
--    au sous-total, total = 0) enregistre un Payment de 0. redeemGiftCard plafonne le débit au solde
--    et refuse un solde nul (GIFT_CARD_EMPTY), il ne produit donc pas de 0.
--  * Review.rating reste nullable (avis sans note) : NULL ou entre 1 et 5.
--
-- Détection AVANT validation (chaque requête doit renvoyer 0 ligne ; lecture seule) :
--   SELECT id FROM "Payment" WHERE amount < 0;
--   SELECT id FROM "GiftCard" WHERE balance < 0;
--   SELECT id FROM "LoyaltyAccount" WHERE balance < 0;
--   SELECT id FROM "Subscription" WHERE "currentPeriodEnd" < "currentPeriodStart";
--   SELECT id FROM "Subscription" WHERE NOT paid AND "paidAt" IS NOT NULL;
--   SELECT id FROM "Subscription" WHERE "priceSnapshot" < 0;
--   SELECT id FROM "Review" WHERE rating IS NOT NULL AND rating NOT BETWEEN 1 AND 5;
--   -- Orphelins de la clé étrangère (à examiner, ne pas supprimer sans accord) :
--   SELECT c.id, c."organizationId" FROM "AssistantVerificationChallenge" c
--     LEFT JOIN "Organization" o ON o.id = c."organizationId" WHERE o.id IS NULL;
--
-- Validation, plus tard et séparément, hors heures de pointe (verrou SHARE UPDATE EXCLUSIVE, les
-- lectures et écritures continuent) une fois les détections vides :
--   ALTER TABLE "Payment" VALIDATE CONSTRAINT "Payment_amount_nonnegative_check";
--   ALTER TABLE "GiftCard" VALIDATE CONSTRAINT "GiftCard_balance_nonnegative_check";
--   ALTER TABLE "LoyaltyAccount" VALIDATE CONSTRAINT "LoyaltyAccount_balance_nonnegative_check";
--   ALTER TABLE "Subscription" VALIDATE CONSTRAINT "Subscription_period_order_check";
--   ALTER TABLE "Subscription" VALIDATE CONSTRAINT "Subscription_paid_paidAt_check";
--   ALTER TABLE "Subscription" VALIDATE CONSTRAINT "Subscription_priceSnapshot_nonnegative_check";
--   ALTER TABLE "Review" VALIDATE CONSTRAINT "Review_rating_range_check";
--   ALTER TABLE "AssistantVerificationChallenge" VALIDATE CONSTRAINT "AssistantVerificationChallenge_organizationId_fkey";
--
-- Retour arrière (sans perte de données) :
--   ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "Payment_amount_nonnegative_check";
--   ALTER TABLE "GiftCard" DROP CONSTRAINT IF EXISTS "GiftCard_balance_nonnegative_check";
--   ALTER TABLE "LoyaltyAccount" DROP CONSTRAINT IF EXISTS "LoyaltyAccount_balance_nonnegative_check";
--   ALTER TABLE "Subscription" DROP CONSTRAINT IF EXISTS "Subscription_period_order_check";
--   ALTER TABLE "Subscription" DROP CONSTRAINT IF EXISTS "Subscription_paid_paidAt_check";
--   ALTER TABLE "Subscription" DROP CONSTRAINT IF EXISTS "Subscription_priceSnapshot_nonnegative_check";
--   ALTER TABLE "Review" DROP CONSTRAINT IF EXISTS "Review_rating_range_check";
--   ALTER TABLE "AssistantVerificationChallenge" DROP CONSTRAINT IF EXISTS "AssistantVerificationChallenge_organizationId_fkey";
--
-- Verrous : ADD CONSTRAINT ... NOT VALID prend un verrou exclusif bref (SHARE ROW EXCLUSIVE pour la
-- clé étrangère). lock_timeout fait échouer la migration plutôt que de bloquer le trafic.

SET lock_timeout = '10s';

DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT * FROM (VALUES
      ('Payment',        'Payment_amount_nonnegative_check',           'CHECK (amount >= 0)'),
      ('GiftCard',       'GiftCard_balance_nonnegative_check',         'CHECK (balance >= 0)'),
      ('LoyaltyAccount', 'LoyaltyAccount_balance_nonnegative_check',   'CHECK (balance >= 0)'),
      ('Subscription',   'Subscription_period_order_check',            'CHECK ("currentPeriodEnd" >= "currentPeriodStart")'),
      ('Subscription',   'Subscription_paid_paidAt_check',             'CHECK (paid OR "paidAt" IS NULL)'),
      ('Subscription',   'Subscription_priceSnapshot_nonnegative_check', 'CHECK ("priceSnapshot" >= 0)'),
      ('Review',         'Review_rating_range_check',                  'CHECK (rating IS NULL OR rating BETWEEN 1 AND 5)'),
      ('AssistantVerificationChallenge', 'AssistantVerificationChallenge_organizationId_fkey',
        'FOREIGN KEY ("organizationId") REFERENCES "Organization" (id) ON DELETE CASCADE ON UPDATE CASCADE')
    ) AS v(tbl, name, definition)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = c.name AND conrelid = to_regclass(format('public.%I', c.tbl))
    ) THEN
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I %s NOT VALID', c.tbl, c.name, c.definition);
    END IF;
  END LOOP;
END $$;

RESET lock_timeout;
