-- Numéro de passage journalier : JJ/MM-NNN (ex. 08/11-001)
ALTER TABLE "Payment"
  ADD COLUMN IF NOT EXISTS "ticketNumber" TEXT;

CREATE TABLE IF NOT EXISTS "PaymentTicketSequence" (
  "organizationId" TEXT NOT NULL,
  "dayKey" TEXT NOT NULL,
  "lastValue" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentTicketSequence_pkey" PRIMARY KEY ("organizationId", "dayKey"),
  CONSTRAINT "PaymentTicketSequence_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Rétrofill des paiements existants (ordre chronologique par jour, fuseau Casablanca)
WITH ranked AS (
  SELECT
    id,
    "organizationId",
    to_char(("paidAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Casablanca'), 'DD/MM')
      || '-'
      || lpad(
        (
          row_number() OVER (
            PARTITION BY
              "organizationId",
              (("paidAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Casablanca')::date)
            ORDER BY "paidAt" ASC, "createdAt" ASC, id ASC
          )
        )::text,
        3,
        '0'
      ) AS "ticketNumber",
    (("paidAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Casablanca')::date) AS day_date,
    row_number() OVER (
      PARTITION BY
        "organizationId",
        (("paidAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Casablanca')::date)
      ORDER BY "paidAt" ASC, "createdAt" ASC, id ASC
    ) AS seq
  FROM "Payment"
  WHERE "ticketNumber" IS NULL
)
UPDATE "Payment" p
SET "ticketNumber" = r."ticketNumber"
FROM ranked r
WHERE p.id = r.id;

INSERT INTO "PaymentTicketSequence" ("organizationId", "dayKey", "lastValue", "updatedAt")
SELECT
  "organizationId",
  to_char(day_date, 'YYYY-MM-DD') AS "dayKey",
  MAX(seq)::int AS "lastValue",
  NOW()
FROM (
  SELECT
    "organizationId",
    (("paidAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Casablanca')::date) AS day_date,
    row_number() OVER (
      PARTITION BY
        "organizationId",
        (("paidAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Casablanca')::date)
      ORDER BY "paidAt" ASC, "createdAt" ASC, id ASC
    ) AS seq
  FROM "Payment"
  WHERE "ticketNumber" IS NOT NULL
) x
GROUP BY "organizationId", day_date
ON CONFLICT ("organizationId", "dayKey") DO UPDATE
SET "lastValue" = GREATEST("PaymentTicketSequence"."lastValue", EXCLUDED."lastValue"),
    "updatedAt" = NOW();

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_organizationId_ticketNumber_key"
  ON "Payment" ("organizationId", "ticketNumber")
  WHERE "ticketNumber" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "Payment_organizationId_ticketNumber_idx"
  ON "Payment" ("organizationId", "ticketNumber");
