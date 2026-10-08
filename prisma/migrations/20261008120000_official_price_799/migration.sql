-- Tarif officiel : 799 DH / mois, 7 990 DH / an, essai 7 jours.
-- Les anciens catalogues 299, 399, 499, 599 et 899 sont alignés.
-- Un prix négocié différent n'est pas modifié.

ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "annualPrice" DECIMAL(10,2);

UPDATE "Plan"
SET price = 799,
    "annualPrice" = 7990,
    currency = 'MAD',
    "trialDays" = 7,
    "updatedAt" = NOW()
WHERE price IN (299, 399, 499, 599, 899)
   OR code IN ('STARTER', 'INSTITUT', 'PREMIUM');

UPDATE "Subscription"
SET "priceSnapshot" = 799,
    "currencySnapshot" = 'MAD',
    "updatedAt" = NOW()
WHERE "priceSnapshot" IN (299, 399, 499, 599, 899);

UPDATE "PlatformConfig"
SET data = jsonb_set(
      jsonb_set(
        jsonb_set(
          COALESCE(data, '{}'::jsonb),
          '{billing,price}',
          '799'::jsonb,
          true
        ),
        '{billing,publicPrice}',
        '799'::jsonb,
        true
      ),
      '{billing,annualPrice}',
      '7990'::jsonb,
      true
    ),
    "updatedAt" = NOW()
WHERE id = 'default'
  AND (
    (data->'billing'->>'price') IS NULL
    OR (data->'billing'->>'price')::numeric IN (299, 399, 400, 499, 599, 899)
    OR (data->'billing'->>'publicPrice')::numeric IN (299, 399, 499, 599, 899)
  );
