-- Étape 43.14 : Activation de l'IA pour le forfait Institut (100 messages/mois) et Premium (500 messages/mois)
UPDATE "Plan"
SET "features" = jsonb_set("features", '{ai}', 'true'::jsonb),
    "updatedAt" = NOW()
WHERE "code" IN ('INSTITUT', 'PREMIUM');
