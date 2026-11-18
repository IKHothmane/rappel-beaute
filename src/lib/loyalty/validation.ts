import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { getSessionSecret } from "@/lib/auth/env";
import { Pool, type PoolClient } from "pg";
import { writeAuditLog } from "@/lib/db/audit";
import { aliasJoin } from "@/lib/loyalty/card-alias";
import { shortCardCode, visitCycle } from "@/lib/loyalty/card-code";
import { notifyGoogleWallet } from "@/lib/loyalty/google-wallet";
import { isUniqueViolation } from "@/lib/db/loyalty";
import {
  getVisitProgram,
  loadCardProgress,
  newLoyaltyId,
  resolveLoyaltyCardToken,
  type CardProgress,
  type VisitProgram,
} from "@/lib/loyalty/cards";
import { pool } from "@/lib/db/pool";

/** Fiche créée par le QR d'adhésion : Customer.phone = « WL » + 8 hexadécimaux, jamais un numéro saisi. */
export function isAnonymousLoyaltyPhone(phone: string | null | undefined): boolean {
  return typeof phone === "string" && phone.startsWith("WL");
}

type ScanReward = {
  id: string;
  name: string;
  status: string;
  earnedAt: string;
  expiresAt: string | null;
  value: number | null;
};

type ScanPreview = {
  /** Jeton de la carte effective (celui de la survivante si la carte scannée est un alias). */
  token: string;
  customerId: string;
  /** Carte anonyme (adhésion par QR, aucun numéro saisi) : le personnel peut proposer le rattachement. */
  anonymous: boolean;
  customerName: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  appointmentId: string | null;
  serviceName: string | null;
  amount: number | null;
  visits: number;
  visitsPerReward: number;
  rewardLabel: string;
  rewards: ScanReward[];
  card: {
    organizationName: string;
    firstName: string;
    lastName: string;
    visits: number;
    cycle: number;
    visitsPerReward: number;
    remaining: number;
    rewardLabel: string;
    rewardsAvailable: number;
    rewards: ScanReward[];
    appointments: { at: string; service: string; staff: string }[];
    sessions: { name: string; used: number; total: number; remaining: number }[];
    cardBackgroundUrl: string | null;
  };
};

type VisitInsert = {
  organizationId: string;
  cardId: string;
  customerId: string;
  validatedBy: string;
  note: string;
  program: VisitProgram;
  actorName?: string | null;
} & ({ points: 1; eventId: string } | { points: -1; eventId?: never });

type LockedCard = { id: string; customerId: string; publicToken: string };

/** Une fusion de fiches a transformé la carte visée en alias pendant l'opération : la rejouer. */
class CardMovedError extends Error {
  constructor() {
    super("CARD_MOVED");
  }
}

/**
 * Carte effective d'un jeton (suivi d'alias), verrouillée FOR UPDATE. Un jeton d'alias résout vers la carte
 * survivante. Si une fusion concurrente transforme la carte en alias entre la lecture et le verrou,
 * PostgreSQL réévalue le filtre status = 'ACTIVE' : la requête est alors rejouée une fois et suit l'alias.
 */
async function lockCardByToken(client: PoolClient, organizationId: string, token: string): Promise<LockedCard | null> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const card = await client.query<LockedCard>(
      `SELECT lc.id, lc."customerId", lc."publicToken"
       FROM "LoyaltyCard" lc
       ${aliasJoin("al", "lc")}
       JOIN "Customer" c ON c.id = lc."customerId" AND c."organizationId" = lc."organizationId"
       WHERE al."publicToken" = $1 AND al."organizationId" = $2 AND lc.status = 'ACTIVE'
         AND c."deletedAt" IS NULL
       FOR UPDATE OF lc, al`,
      [token, organizationId],
    );
    if (card.rows[0]) return card.rows[0];
  }
  return null;
}

/**
 * Verrouille une carte connue par id et vérifie qu'elle est encore ACTIVE et rattachée à la même fiche
 * (sinon : CardMovedError). Une fusion en cas A rattache la carte de S à T : le passage doit alors être
 * rejoué avec la fiche de T plutôt que d'écrire un événement au nom de S.
 */
async function lockActiveCardById(client: PoolClient, cardId: string, expectedCustomerId: string): Promise<void> {
  const locked = await client.query<{ status: string; customerId: string }>(
    `SELECT status, "customerId" FROM "LoyaltyCard" WHERE id = $1 FOR UPDATE`,
    [cardId],
  );
  if (locked.rows[0]?.status !== "ACTIVE" || locked.rows[0].customerId !== expectedCustomerId) {
    throw new CardMovedError();
  }
}

/** Le code carte devient un code promo perso (1 usage), selon la récompense choisie par l’institut. */
export async function grantPersonalLoyaltyPromo(
  db: Pool | PoolClient,
  opts: {
    organizationId: string;
    customerId: string;
    publicToken: string;
    rewardId: string;
    rewardLabel: string;
    rewardKind: VisitProgram["rewardKind"];
    rewardValue: number | null;
    expiresAt: Date | null;
  },
) {
  const code = shortCardCode(opts.publicToken);
  if (code.length < 4) return;
  const description = `loyalty:${opts.rewardId}`;
  const kind = opts.rewardKind;
  const promoType =
    kind === "DISCOUNT"
      ? "FIXED_AMOUNT"
      : kind === "PERCENTAGE"
        ? "PERCENTAGE"
        : "FREE_SERVICE";
  const value =
    promoType === "FREE_SERVICE"
      ? null
      : opts.rewardValue != null && opts.rewardValue > 0
        ? opts.rewardValue
        : null;
  if (promoType !== "FREE_SERVICE" && value == null) return;
  const name =
    opts.rewardLabel.trim() ||
    (promoType === "FREE_SERVICE"
      ? "Service offert"
      : promoType === "PERCENTAGE"
        ? `Remise ${value} %`
        : `Remise ${value} MAD`);
  const existing = await db.query<{ id: string; customerId: string | null; description: string | null; status: string }>(
    `SELECT id, "customerId", description, status FROM "Promotion"
     WHERE "organizationId" = $1 AND upper(code) = $2
     LIMIT 1`,
    [opts.organizationId, code],
  );
  const row = existing.rows[0];
  if (row?.customerId && row.customerId !== opts.customerId) return;
  if (row) {
    await db.query(
      `UPDATE "Promotion"
       SET status = 'ACTIVE', type = $2::"PromotionType", name = $3, "customerId" = $4,
           value = $5, "maxUses" = 1, "maxUsesPerCustomer" = 1, "usageCount" = 0,
           "serviceId" = NULL, "endsAt" = $6, description = $7, "deletedAt" = NULL, "updatedAt" = NOW()
       WHERE id = $1`,
      [row.id, promoType, name, opts.customerId, value, opts.expiresAt, description],
    );
    return;
  }
  await db.query(
    `INSERT INTO "Promotion" (
      id, "organizationId", name, code, type, status, value, "customerId",
      "maxUses", "maxUsesPerCustomer", "usageCount", "endsAt", description, "updatedAt"
    ) VALUES ($1,$2,$3,$4,$5::"PromotionType",'ACTIVE'::"PromotionStatus",$6,$7,1,1,0,$8,$9,NOW())`,
    [
      newLoyaltyId("promo"),
      opts.organizationId,
      name,
      code,
      promoType,
      value,
      opts.customerId,
      opts.expiresAt,
      description,
    ],
  );
}

export async function syncLoyaltyPromoCodes(organizationId: string) {
  const program = await getVisitProgram(organizationId);
  const { rows } = await pool.query<{
    id: string;
    customerId: string;
    name: string;
    expiresAt: Date | null;
    publicToken: string;
  }>(
    `SELECT r.id, r."customerId", r.name, r."expiresAt", lc."publicToken"
     FROM "LoyaltyVisitReward" r
     JOIN "LoyaltyCard" lc ON lc.id = r."loyaltyCardId"
     WHERE r."organizationId" = $1 AND r.status = 'AVAILABLE'
       AND (r."expiresAt" IS NULL OR r."expiresAt" > NOW())
       AND NOT EXISTS (
         SELECT 1 FROM "Promotion" p
         WHERE p."organizationId" = r."organizationId"
           AND p.description = 'loyalty:' || r.id
           AND p."deletedAt" IS NULL
           AND p.status = 'ACTIVE'
       )`,
    [organizationId],
  );
  for (const row of rows) {
    await grantPersonalLoyaltyPromo(pool, {
      organizationId,
      customerId: row.customerId,
      publicToken: row.publicToken,
      rewardId: row.id,
      rewardLabel: row.name || program.rewardLabel,
      rewardKind: program.rewardKind,
      rewardValue: program.rewardValue,
      expiresAt: row.expiresAt,
    });
  }
}

async function insertVisitAndMaybeReward(client: PoolClient, input: VisitInsert) {
  const eventId = input.eventId ?? newLoyaltyId("levt");
  let validatedAt: Date;
  try {
    const result = await client.query<{ validatedAt: Date }>(
      `INSERT INTO "LoyaltyEvent" (
        id, "organizationId", "customerId", "loyaltyCardId", type,
        amount, points, note, "validatedBy", "validatedAt"
      ) VALUES ($1, $2, $3, $4, 'VISIT', 0, $5, $6, $7, clock_timestamp())
      RETURNING "validatedAt"`,
      [
        eventId,
        input.organizationId,
        input.customerId,
        input.cardId,
        input.points,
        input.note,
        input.validatedBy,
      ],
    );
    validatedAt = result.rows[0].validatedAt;
    // Remonte la carte en tête de « Clientes fidèles »
    await client.query(`UPDATE "LoyaltyCard" SET "updatedAt" = clock_timestamp() WHERE id = $1`, [input.cardId]);
  } catch (error) {
    if (isUniqueViolation(error)) throw new Error("ALREADY_VALIDATED");
    throw error;
  }

  const countRow = await client.query<{ count: string }>(
    `SELECT COALESCE(SUM(points), 0)::text AS count
     FROM "LoyaltyEvent" WHERE "loyaltyCardId" = $1 AND type = 'VISIT'`,
    [input.cardId],
  );
  const visits = Number(countRow.rows[0]?.count ?? 0);
  let rewardId: string | null = null;
  if (input.points > 0 && visits > 0 && visits % input.program.visitsPerReward === 0) {
    const openReward = input.program.stackRewards
      ? { rows: [] as unknown[] }
      : await client.query(
          `SELECT id FROM "LoyaltyVisitReward"
           WHERE "loyaltyCardId" = $1 AND status = 'AVAILABLE'
             AND ("expiresAt" IS NULL OR "expiresAt" > NOW())
           LIMIT 1`,
          [input.cardId],
        );
    if (openReward.rows.length === 0) {
      rewardId = newLoyaltyId("lrew");
      await client.query(
        `INSERT INTO "LoyaltyVisitReward" (
          id, "organizationId", "customerId", "loyaltyCardId", "loyaltyEventId",
          name, status, value, "earnedAt", "expiresAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, 'AVAILABLE', $7, NOW(), NOW() + $8::interval)`,
        [
          rewardId,
          input.organizationId,
          input.customerId,
          input.cardId,
          eventId,
          input.program.rewardLabel,
          input.program.rewardValue,
          `${input.program.rewardValidityDays} days`,
        ],
      );
      await writeAuditLog({
        organizationId: input.organizationId,
        actorId: input.validatedBy,
        actorName: input.actorName,
        entityType: "LoyaltyVisitReward",
        entityId: rewardId,
        action: "LOYALTY_REWARD_EARNED",
        before: { status: null, visits },
        after: {
          status: "AVAILABLE",
          name: input.program.rewardLabel,
          value: input.program.rewardValue,
          customerId: input.customerId,
          loyaltyEventId: eventId,
        },
        client,
      });
      const tokenRow = await client.query<{ publicToken: string }>(
        `SELECT "publicToken" FROM "LoyaltyCard" WHERE id = $1`,
        [input.cardId],
      );
      if (tokenRow.rows[0]) {
        const days = input.program.rewardValidityDays > 0 ? input.program.rewardValidityDays : 365;
        await grantPersonalLoyaltyPromo(client, {
          organizationId: input.organizationId,
          customerId: input.customerId,
          publicToken: tokenRow.rows[0].publicToken,
          rewardId,
          rewardLabel: input.program.rewardLabel,
          rewardKind: input.program.rewardKind,
          rewardValue: input.program.rewardValue,
          expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
        });
      }
    }
  }

  return { eventId, visits, rewardId, validatedAt };
}

export async function previewLoyaltyScan(
  organizationId: string,
  rawToken: string,
): Promise<ScanPreview> {
  const token = await resolveLoyaltyCardToken(organizationId, rawToken);
  const card = await pool.query<{
    id: string;
    customerId: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    publicToken?: string;
  }>(
    `SELECT lc.id, lc."customerId", c."firstName", c."lastName", c.phone, lc."publicToken"
     FROM "LoyaltyCard" lc
     ${aliasJoin("al", "lc")}
     JOIN "Customer" c ON c.id = lc."customerId" AND c."organizationId" = lc."organizationId"
     WHERE al."publicToken" = $1 AND al."organizationId" = $2 AND lc.status = 'ACTIVE'
       AND c."deletedAt" IS NULL`,
    [token, organizationId],
  );
  if (!card.rows[0]) throw new Error("CARD_NOT_FOUND");

  const program = await getVisitProgram(organizationId);
  if (!program.active) throw new Error("PROGRAM_DISABLED");

  const appointment = await pool.query<{
    id: string;
    serviceName: string;
    amount: string;
  }>(
    `SELECT a.id,
            COALESCE(a."serviceNameSnapshot", s.name, 'Prestation') AS "serviceName",
            a.price::text AS amount
     FROM "Appointment" a
     LEFT JOIN "Service" s ON s.id = a."serviceId"
     WHERE a."organizationId" = $1
       AND a."customerId" = $2
       AND a.status = 'COMPLETED'
       AND NOT EXISTS (
         SELECT 1 FROM "LoyaltyEvent" e WHERE e."appointmentId" = a.id
       )
     ORDER BY a."startAt" DESC
     LIMIT 1`,
    [organizationId, card.rows[0].customerId],
  );

  const progress = await loadCardProgress(card.rows[0].id, organizationId);
  if (!progress) throw new Error("CARD_NOT_FOUND");
  const next = appointment.rows[0];

  return {
    token: card.rows[0].publicToken ?? token,
    customerId: card.rows[0].customerId,
    anonymous: isAnonymousLoyaltyPhone(card.rows[0].phone),
    customerName: `${card.rows[0].firstName} ${card.rows[0].lastName}`.trim(),
    firstName: card.rows[0].firstName,
    lastName: card.rows[0].lastName,
    phone: card.rows[0].phone,
    appointmentId: next?.id ?? null,
    serviceName: next?.serviceName ?? null,
    amount: next ? Number(next.amount) : null,
    visits: progress.cycle,
    visitsPerReward: program.visitsPerReward,
    rewardLabel: program.rewardLabel,
    rewards: progress.rewards.filter((reward) => reward.status === "AVAILABLE"),
    card: {
      organizationName: progress.organizationName,
      firstName: progress.firstName,
      lastName: progress.lastName,
      visits: progress.visits,
      cycle: progress.cycle,
      visitsPerReward: progress.visitsPerReward,
      remaining: progress.remaining,
      rewardLabel: progress.rewardLabel,
      rewardsAvailable: progress.rewardsAvailable,
      rewards: progress.rewards,
      appointments: progress.appointments,
      sessions: progress.sessions,
      cardBackgroundUrl: progress.cardBackgroundUrl,
    },
  };
}

export async function markVisitRewardUsed(
  organizationId: string,
  rewardId: string,
  usedById: string,
  actorName?: string | null,
): Promise<void> {
  const program = await getVisitProgram(organizationId);
  if (!program.active) throw new Error("PROGRAM_DISABLED");
  const updated = await pool.query<{
    id: string;
    name: string;
    customerId: string;
    value: string | null;
  }>(
    `UPDATE "LoyaltyVisitReward"
     SET status = 'REDEEMED', "usedAt" = NOW(), "usedById" = $3
     WHERE id = $1 AND "organizationId" = $2 AND status = 'AVAILABLE'
       AND ("expiresAt" IS NULL OR "expiresAt" > NOW())
     RETURNING id, name, "customerId", value::text AS value`,
    [rewardId, organizationId, usedById],
  );
  const row = updated.rows[0];
  if (!row) throw new Error("REWARD_NOT_AVAILABLE");
  await pool.query(
    `UPDATE "Promotion"
     SET status = 'INACTIVE', "updatedAt" = NOW()
     WHERE "organizationId" = $1 AND description = $2 AND "deletedAt" IS NULL AND status = 'ACTIVE'`,
    [organizationId, `loyalty:${row.id}`],
  );
  await writeAuditLog({
    organizationId,
    actorId: usedById,
    actorName,
    entityType: "LoyaltyVisitReward",
    entityId: row.id,
    action: "LOYALTY_REWARD_REDEEMED",
    before: { status: "AVAILABLE", customerId: row.customerId },
    after: {
      status: "REDEEMED",
      name: row.name,
      value: row.value != null ? Number(row.value) : null,
      customerId: row.customerId,
      usedById,
    },
  });
}

const FULL_CARD_TOKEN = /^RBLOY_[A-Z2-9]{8,32}$/;
const SCAN_LIFETIME_MS = 5 * 60 * 1000;

type ScanActor = { organizationId: string; actorId: string };
type ScanValidation = ScanActor & {
  eventId: string;
  token: string;
  cardId: string;
  customerId: string;
  expiresAt: number;
};

function parseScannedCard(raw: string): string {
  const value = raw.trim();
  if (FULL_CARD_TOKEN.test(value.toUpperCase())) return value.toUpperCase();
  try {
    const url = new URL(value);
    const token = url.pathname.toUpperCase().match(/^\/CARTE\/(RBLOY_[A-Z2-9]{8,32})\/?$/)?.[1];
    if (token && (url.protocol === "https:" || url.protocol === "http:")) return token;
  } catch {
    // La valeur ne correspond ni à un jeton complet ni à un lien de carte.
  }
  throw new Error("SCAN_INVALID");
}

function signScan(payload: string): Buffer {
  return createHmac("sha256", getSessionSecret()).update("loyalty-scan:v1:").update(payload).digest();
}

function readScanValidation(validationId: string, actor: ScanActor): ScanValidation {
  if (!/^[A-Za-z0-9_-]{1,2048}\.[A-Za-z0-9_-]{43}$/.test(validationId)) {
    throw new Error("SCAN_INVALID");
  }
  const [payload, signature] = validationId.split(".");
  const candidate = Buffer.from(signature, "base64url");
  if (!timingSafeEqual(candidate, signScan(payload))) throw new Error("SCAN_INVALID");

  const validation = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as ScanValidation;
  if (validation.organizationId !== actor.organizationId || validation.actorId !== actor.actorId) {
    throw new Error("SCAN_INVALID");
  }
  if (validation.expiresAt <= Date.now()) throw new Error("SCAN_EXPIRED");
  return validation;
}

export async function beginLoyaltyScan(opts: ScanActor & { rawToken: string }) {
  const token = parseScannedCard(opts.rawToken);
  const { rows } = await pool.query<{
    id: string;
    customerId: string;
    firstName: string;
    lastName: string;
    organizationName: string;
    visits: string;
  }>(
    `SELECT lc.id, lc."customerId", c."firstName", c."lastName", o.name AS "organizationName",
            (
              SELECT COALESCE(SUM(e.points), 0)::text
              FROM "LoyaltyEvent" e
              WHERE e."organizationId" = al."organizationId" AND e."loyaltyCardId" = lc.id AND e.type = 'VISIT'
            ) AS visits
     FROM "LoyaltyCard" lc
     ${aliasJoin("al", "lc")}
     JOIN "Customer" c ON c.id = lc."customerId" AND c."organizationId" = lc."organizationId"
     JOIN "Organization" o ON o.id = lc."organizationId"
     WHERE al."publicToken" = $1 AND al."organizationId" = $2 AND lc.status = 'ACTIVE'
       AND c."deletedAt" IS NULL`,
    [token, opts.organizationId],
  );
  const card = rows[0];
  if (!card) throw new Error("CARD_NOT_FOUND");
  const program = await getVisitProgram(opts.organizationId);
  if (!program.active) throw new Error("PROGRAM_DISABLED");

  const visits = Number(card.visits);
  const visitsPerReward = program.visitsPerReward;
  const cycle = visitCycle(visits, visitsPerReward);
  const validation: ScanValidation = {
    eventId: `levt_scan_${randomUUID()}`,
    organizationId: opts.organizationId,
    actorId: opts.actorId,
    token,
    cardId: card.id,
    customerId: card.customerId,
    expiresAt: Date.now() + SCAN_LIFETIME_MS,
  };
  const payload = Buffer.from(JSON.stringify(validation), "utf8").toString("base64url");
  return {
    validationId: `${payload}.${signScan(payload).toString("base64url")}`,
    customerId: card.customerId,
    customerName: `${card.firstName} ${card.lastName}`.trim(),
    card: {
      organizationName: card.organizationName,
      visits,
      cycle,
      visitsPerReward,
      remaining: visitsPerReward - cycle,
      rewardLabel: program.rewardLabel,
    },
  };
}

type ConfirmedScan = CardProgress & {
  customerId: string;
  customerName: string;
  promoCode: string | null;
  validatedAt: string;
};

export async function confirmLoyaltyScan(
  opts: ScanActor & { validationId: string; actorName?: string | null },
): Promise<ConfirmedScan> {
  const validation = readScanValidation(opts.validationId, opts);
  const program = await getVisitProgram(opts.organizationId);
  if (!program.active) throw new Error("PROGRAM_DISABLED");

  const client = await pool.connect();
  let card: LockedCard;
  let result: ConfirmedScan;
  try {
    await client.query("BEGIN");
    // Même ordre de verrouillage que la fusion, qui peut déplacer un jeton vers une autre carte.
    await client.query("SELECT pg_advisory_xact_lock(hashtext('loyalty-merge:' || $1::text))", [
      opts.organizationId,
    ]);
    if (validation.expiresAt <= Date.now()) throw new Error("SCAN_EXPIRED");
    const previous = await client.query(
      `SELECT 1 FROM "LoyaltyEvent" WHERE id = $1 AND "organizationId" = $2`,
      [validation.eventId, opts.organizationId],
    );
    if (previous.rows.length) throw new Error("ALREADY_VALIDATED");
    const locked = await lockCardByToken(client, opts.organizationId, validation.token);
    if (!locked) throw new Error("CARD_NOT_FOUND");
    if (locked.id !== validation.cardId || locked.customerId !== validation.customerId) {
      throw new Error("CARD_CHANGED");
    }
    card = locked;

    // L'identifiant signé devient la clé primaire de l'événement. Un rejeu ne peut ni
    // insérer un second passage ni déclencher à nouveau la récompense ou sa notification.
    const saved = await insertVisitAndMaybeReward(client, {
      eventId: validation.eventId,
      organizationId: opts.organizationId,
      cardId: card.id,
      customerId: card.customerId,
      points: 1,
      validatedBy: opts.actorId,
      note: "Passage",
      program,
      actorName: opts.actorName,
    });
    await writeAuditLog({
      organizationId: opts.organizationId,
      actorId: opts.actorId,
      actorName: opts.actorName,
      entityType: "LoyaltyEvent",
      entityId: saved.eventId,
      action: "LOYALTY_VISIT_CONFIRMED",
      after: { customerId: card.customerId, visits: saved.visits },
      client,
    });
    const progress = await loadCardProgress(card.id, opts.organizationId, client, program);
    if (!progress) throw new Error("CARD_NOT_FOUND");
    result = {
      ...progress,
      customerId: card.customerId,
      customerName: `${progress.firstName} ${progress.lastName}`.trim(),
      promoCode: saved.rewardId ? shortCardCode(card.publicToken) : null,
      validatedAt: saved.validatedAt.toISOString(),
    };
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
  notifyGoogleWallet(card.publicToken);
  return result;
}

export async function adjustLoyaltyVisit(opts: {
  organizationId: string;
  customerId: string;
  delta: -1;
  reason: string;
  actorId: string;
  actorName?: string | null;
}): Promise<{ visits: number }> {
  try {
    return await adjustLoyaltyVisitOnce(opts);
  } catch (error) {
    if (error instanceof CardMovedError) return adjustLoyaltyVisitOnce(opts);
    throw error;
  }
}

async function adjustLoyaltyVisitOnce(opts: {
  organizationId: string;
  customerId: string;
  delta: -1;
  reason: string;
  actorId: string;
  actorName?: string | null;
}): Promise<{ visits: number }> {
  const reason = opts.reason.trim();
  if (reason.length < 3) throw new Error("REASON_REQUIRED");
  if (opts.delta !== -1) throw new Error("INVALID_DELTA");

  const program = await getVisitProgram(opts.organizationId);
  if (!program.active) throw new Error("PROGRAM_DISABLED");

  // Un customerId de fiche fusionnée (alias) est résolu vers la fiche survivante ; sinon NO_CARD.
  const card = await pool.query<{ id: string; publicToken: string; customerId: string }>(
    `SELECT lc.id, lc."publicToken", lc."customerId"
     FROM "LoyaltyCard" lc
     ${aliasJoin("src", "lc")}
     WHERE src."organizationId" = $1 AND src."customerId" = $2 AND lc.status = 'ACTIVE'
     ORDER BY (src.id = lc.id) DESC
     LIMIT 1`,
    [opts.organizationId, opts.customerId],
  );
  if (!card.rows[0]) throw new Error("NO_CARD");
  const customerId = card.rows[0].customerId;

  const client = await pool.connect();
  let finished = false;
  try {
    await client.query("BEGIN");
    await lockActiveCardById(client, card.rows[0].id, customerId);
    const current = await client.query<{ count: string }>(
      `SELECT COALESCE(SUM(points), 0)::text AS count
       FROM "LoyaltyEvent" WHERE "loyaltyCardId" = $1 AND type = 'VISIT'`,
      [card.rows[0].id],
    );
    const before = Number(current.rows[0]?.count ?? 0);
    if (before + opts.delta < 0) throw new Error("VISIT_BELOW_ZERO");

    const saved = await insertVisitAndMaybeReward(client, {
      organizationId: opts.organizationId,
      cardId: card.rows[0].id,
      customerId,
      points: opts.delta,
      validatedBy: opts.actorId,
      note: reason,
      program,
    });
    await writeAuditLog({
      organizationId: opts.organizationId,
      actorId: opts.actorId,
      actorName: opts.actorName,
      entityType: "LoyaltyEvent",
      entityId: saved.eventId,
      action: "LOYALTY_VISIT_ADJUSTED",
      before: { visits: before, customerId },
      after: { visits: saved.visits, delta: opts.delta, reason, customerId },
      client,
    });
    await client.query("COMMIT");
    finished = true;
    notifyGoogleWallet(card.rows[0].publicToken);
    return { visits: saved.visits };
  } catch (error) {
    if (!finished) {
      try {
        await client.query("ROLLBACK");
      } catch {
        /* transaction déjà terminée */
      }
    }
    throw error;
  } finally {
    client.release();
  }
}
