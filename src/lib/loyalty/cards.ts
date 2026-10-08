import { randomBytes } from "crypto";
import { Pool, type PoolClient } from "pg";
import { getOrCreateLoyaltyProgram } from "@/lib/db/loyalty";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function newLoyaltyId(prefix: string) {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

export function newPublicToken() {
  const bytes = randomBytes(12);
  let token = "RBLOY_";
  for (const byte of bytes) token += ALPHABET[byte % ALPHABET.length];
  return token;
}

export type VisitProgram = {
  visitsPerReward: number;
  rewardLabel: string;
  active: boolean;
  rewardValidityDays: number;
  stackRewards: boolean;
  eligibleServiceIds: string[];
  rewardValue: number | null;
};

export async function getVisitProgram(organizationId: string): Promise<VisitProgram> {
  await getOrCreateLoyaltyProgram(organizationId);
  const { rows } = await pool.query<{
    visitsPerReward: number;
    rewardLabel: string;
    active: boolean;
    rewardValidityDays: number;
    stackRewards: boolean;
    eligibleServiceIds: string[] | null;
    rewardValue: string | null;
  }>(
    `SELECT "visitsPerReward", "rewardLabel", active, "rewardValidityDays", "stackRewards", "eligibleServiceIds",
            "rewardValue"::text AS "rewardValue"
     FROM "LoyaltyProgram" WHERE "organizationId" = $1`,
    [organizationId],
  );
  const row = rows[0];
  return {
    visitsPerReward: row?.visitsPerReward && row.visitsPerReward > 0 ? row.visitsPerReward : 10,
    rewardLabel: row?.rewardLabel?.trim() || "Récompense",
    active: row?.active ?? true,
    rewardValidityDays: row?.rewardValidityDays && row.rewardValidityDays > 0 ? row.rewardValidityDays : 30,
    stackRewards: row?.stackRewards ?? true,
    eligibleServiceIds: row?.eligibleServiceIds ?? [],
    rewardValue: row?.rewardValue != null ? parseFloat(row.rewardValue) : null,
  };
}

export type IssuedCard = {
  id: string;
  publicToken: string;
  customerId: string;
  firstName: string;
  lastName: string;
};

export async function issueLoyaltyCard(
  organizationId: string,
  customerId: string,
): Promise<IssuedCard> {
  const customer = await pool.query<{ id: string; firstName: string; lastName: string }>(
    `SELECT id, "firstName", "lastName"
     FROM "Customer"
     WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,
    [customerId, organizationId],
  );
  if (!customer.rows[0]) throw new Error("CUSTOMER_NOT_FOUND");

  const existing = await pool.query<{ id: string; publicToken: string }>(
    `SELECT id, "publicToken" FROM "LoyaltyCard"
     WHERE "organizationId" = $1 AND "customerId" = $2`,
    [organizationId, customerId],
  );
  if (existing.rows[0]) {
    return {
      id: existing.rows[0].id,
      publicToken: existing.rows[0].publicToken,
      customerId,
      firstName: customer.rows[0].firstName,
      lastName: customer.rows[0].lastName,
    };
  }

  const id = newLoyaltyId("lcard");
  const publicToken = newPublicToken();
  try {
    await pool.query(
      `INSERT INTO "LoyaltyCard" (id, "organizationId", "customerId", "publicToken", status, "updatedAt")
       VALUES ($1, $2, $3, $4, 'ACTIVE', NOW())`,
      [id, organizationId, customerId, publicToken],
    );
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code !== "23505") throw error;
    const again = await pool.query<{ id: string; publicToken: string }>(
      `SELECT id, "publicToken" FROM "LoyaltyCard"
       WHERE "organizationId" = $1 AND "customerId" = $2`,
      [organizationId, customerId],
    );
    if (!again.rows[0]) throw error;
    return {
      id: again.rows[0].id,
      publicToken: again.rows[0].publicToken,
      customerId,
      firstName: customer.rows[0].firstName,
      lastName: customer.rows[0].lastName,
    };
  }
  return {
    id,
    publicToken,
    customerId,
    firstName: customer.rows[0].firstName,
    lastName: customer.rows[0].lastName,
  };
}

export type CardAppointment = {
  at: string;
  service: string;
  staff: string;
};

export type CardSession = {
  name: string;
  used: number;
  total: number;
  remaining: number;
};

export type CardProgress = {
  organizationName: string;
  firstName: string;
  visits: number;
  visitsPerReward: number;
  cycle: number;
  remaining: number;
  rewardLabel: string;
  rewardsAvailable: number;
  history: { at: string; service: string; amount: number; points: number }[];
  rewards: {
    id: string;
    name: string;
    status: string;
    earnedAt: string;
    expiresAt: string | null;
    value: number | null;
  }[];
  appointments: CardAppointment[];
  sessions: CardSession[];
};

export async function loadCardProgress(
  cardId: string,
  organizationId: string,
  client?: PoolClient,
): Promise<CardProgress | null> {
  const db = client ?? pool;
  const card = await db.query<{
    organizationName: string;
    firstName: string;
  }>(
    `SELECT o.name AS "organizationName", c."firstName"
     FROM "LoyaltyCard" lc
     JOIN "Organization" o ON o.id = lc."organizationId"
     JOIN "Customer" c ON c.id = lc."customerId"
     WHERE lc.id = $1 AND lc."organizationId" = $2 AND lc.status = 'ACTIVE'`,
    [cardId, organizationId],
  );
  if (!card.rows[0]) return null;

  const program = await getVisitProgram(organizationId);
  const visitsRow = await db.query<{ count: string }>(
    `SELECT COALESCE(SUM(points), 0)::text AS count FROM "LoyaltyEvent" WHERE "loyaltyCardId" = $1 AND type = 'VISIT'`,
    [cardId],
  );
  const visits = Number(visitsRow.rows[0]?.count ?? 0);
  const threshold = program.visitsPerReward;
  const mod = visits % threshold;
  const cycle = visits > 0 && mod === 0 ? threshold : mod;
  const remaining = threshold - cycle;

  const history = await db.query<{ at: Date; service: string; amount: string; points: number }>(
    `SELECT e."validatedAt" AS at,
            COALESCE(a."serviceNameSnapshot", s.name, e.note, 'Ajustement') AS service,
            e.amount::text AS amount,
            e.points
     FROM "LoyaltyEvent" e
     LEFT JOIN "Appointment" a ON a.id = e."appointmentId"
     LEFT JOIN "Service" s ON s.id = e."serviceId"
     WHERE e."loyaltyCardId" = $1
     ORDER BY e."validatedAt" DESC
     LIMIT 30`,
    [cardId],
  );
  await db.query(
    `UPDATE "LoyaltyVisitReward"
     SET status = 'EXPIRED'
     WHERE "loyaltyCardId" = $1 AND status = 'AVAILABLE'
       AND "expiresAt" IS NOT NULL AND "expiresAt" < NOW()`,
    [cardId],
  );
  const rewards = await db.query<{
    id: string;
    name: string;
    status: string;
    earnedAt: Date;
    expiresAt: Date | null;
    value: string | null;
  }>(
    `SELECT id, name, status, "earnedAt", "expiresAt", value::text AS value
     FROM "LoyaltyVisitReward"
     WHERE "loyaltyCardId" = $1
     ORDER BY "earnedAt" DESC
     LIMIT 20`,
    [cardId],
  );
  const available = rewards.rows.filter((row) => row.status === "AVAILABLE").length;

  const owner = await db.query<{ customerId: string }>(
    `SELECT "customerId" FROM "LoyaltyCard" WHERE id = $1 AND "organizationId" = $2`,
    [cardId, organizationId],
  );
  const customerId = owner.rows[0]?.customerId;
  const appointments = customerId
    ? await db.query<{ at: Date; service: string; staff: string }>(
        `SELECT a."startAt" AS at,
                COALESCE(a."serviceNameSnapshot", s.name, 'Rendez-vous') AS service,
                COALESCE(st."firstName", '') AS staff
         FROM "Appointment" a
         LEFT JOIN "Service" s ON s.id = a."serviceId"
         LEFT JOIN "Staff" st ON st.id = a."staffId"
         WHERE a."organizationId" = $1 AND a."customerId" = $2
           AND a.status IN ('PENDING', 'CONFIRMED', 'ARRIVED', 'IN_PROGRESS')
           AND a."startAt" >= NOW() - INTERVAL '2 hours'
         ORDER BY a."startAt" ASC
         LIMIT 8`,
        [organizationId, customerId],
      )
    : { rows: [] as { at: Date; service: string; staff: string }[] };
  const sessions = customerId
    ? await db.query<{ name: string; used: number; total: number }>(
        `SELECT name, "sessionUsed" AS used, "sessionTotal" AS total
         FROM "Package"
         WHERE "organizationId" = $1 AND "customerId" = $2 AND status = 'ACTIVE'
         ORDER BY "purchasedAt" DESC
         LIMIT 12`,
        [organizationId, customerId],
      )
    : { rows: [] as { name: string; used: number; total: number }[] };

  return {
    organizationName: card.rows[0].organizationName,
    firstName: card.rows[0].firstName,
    visits,
    visitsPerReward: threshold,
    cycle,
    remaining,
    rewardLabel: program.rewardLabel,
    rewardsAvailable: available,
    history: history.rows.map((row) => ({
      at: row.at.toISOString(),
      service: row.service,
      amount: Number(row.amount),
      points: row.points,
    })),
    rewards: rewards.rows.map((row) => ({
      id: row.id,
      name: row.name,
      status: row.status,
      earnedAt: row.earnedAt.toISOString(),
      expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
      value: row.value != null ? Number(row.value) : null,
    })),
    appointments: appointments.rows.map((row) => ({
      at: row.at.toISOString(),
      service: row.service,
      staff: row.staff,
    })),
    sessions: sessions.rows.map((row) => ({
      name: row.name,
      used: Number(row.used),
      total: Number(row.total),
      remaining: Math.max(0, Number(row.total) - Number(row.used)),
    })),
  };
}

export async function getPublicCardByToken(token: string): Promise<CardProgress | null> {
  const normalized = token.trim().toUpperCase();
  if (!/^RBLOY_[A-Z2-9]{8,32}$/.test(normalized)) return null;
  const { rows } = await pool.query<{ id: string; organizationId: string }>(
    `SELECT id, "organizationId" FROM "LoyaltyCard" WHERE "publicToken" = $1 AND status = 'ACTIVE'`,
    [normalized],
  );
  if (!rows[0]) return null;
  return loadCardProgress(rows[0].id, rows[0].organizationId);
}
