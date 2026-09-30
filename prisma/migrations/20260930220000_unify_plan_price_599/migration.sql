-- Formule unique : 599 DH / mois.
-- Retire les anciens prix catalogue 299, 499 et 899.

UPDATE "Plan"
SET price = 599,
    "updatedAt" = NOW()
WHERE price IN (299, 499, 899);

UPDATE "Subscription"
SET "priceSnapshot" = 599,
    "updatedAt" = NOW()
WHERE "priceSnapshot" IN (299, 499, 899);
