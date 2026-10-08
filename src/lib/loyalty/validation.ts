import { Pool, type PoolClient } from "pg";
import { writeAuditLog } from "@/lib/db/audit";
import { isUniqueViolation } from "@/lib/db/loyalty";
import {
  getVisitProgram,
  loadCardProgress,
  newLoyaltyId,
  type CardProgress,
  type VisitProgram,
} from "@/lib/loyalty/cards";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export type ScanReward = {
  id: string;
  name: string;
  status: string;
  earnedAt: string;
  expiresAt: string | null;
  value: number | null;
};

export type ScanPreview = {
  token: string;
  customerName: string;
  appointmentId: string | null;
  serviceName: string | null;
  amount: number | null;
  visits: number;
  visitsPerReward: number;
  rewardLabel: string;
  rewards: ScanReward[];
};

type VisitInsert = {
  organizationId: string;
  cardId: string;
  customerId: string;
  appointmentId: string | null;
  serviceId: string | null;
  amount: number | string;
  points: number;
  validatedBy: string | null;
  note: string | null;
  program: VisitProgram;
  actorName?: string | null;
};

async function insertVisitAndMaybeReward(client: PoolClient, input: VisitInsert) {
  const eventId = newLoyaltyId("levt");
  try {
    await client.query(
      `INSERT INTO "LoyaltyEvent" (
        id, "organizationId", "customerId", "loyaltyCardId", type,
        "appointmentId", "serviceId", amount, points, note, "validatedBy", "validatedAt"
      ) VALUES ($1, $2, $3, $4, 'VISIT', $5, $6, $7, $8, $9, $10, NOW())`,
      [
        eventId,
        input.organizationId,
        input.customerId,
        input.cardId,
        input.appointmentId,
        input.serviceId,
        input.amount,
        input.points,
        input.note,
        input.validatedBy,
      ],
    );
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
    }
  }

  return { eventId, visits, rewardId };
}

export async function previewLoyaltyScan(
  organizationId: string,
  rawToken: string,
): Promise<ScanPreview> {
  const token = rawToken.trim().toUpperCase();
  const card = await pool.query<{
    id: string;
    customerId: string;
    firstName: string;
    lastName: string;
  }>(
    `SELECT lc.id, lc."customerId", c."firstName", c."lastName"
     FROM "LoyaltyCard" lc
     JOIN "Customer" c ON c.id = lc."customerId"
     WHERE lc."publicToken" = $1 AND lc."organizationId" = $2 AND lc.status = 'ACTIVE'`,
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
    token,
    customerName: `${card.rows[0].firstName} ${card.rows[0].lastName}`.trim(),
    appointmentId: next?.id ?? null,
    serviceName: next?.serviceName ?? null,
    amount: next ? Number(next.amount) : null,
    visits: progress.visits,
    visitsPerReward: program.visitsPerReward,
    rewardLabel: program.rewardLabel,
    rewards: progress.rewards.filter((reward) => reward.status === "AVAILABLE"),
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

export async function validateLoyaltyVisit(
  organizationId: string,
  rawToken: string,
  appointmentId: string,
  validatedBy: string,
): Promise<CardProgress & { customerName: string; serviceName: string; amount: number }> {
  const program = await getVisitProgram(organizationId);
  if (!program.active) throw new Error("PROGRAM_DISABLED");

  const token = rawToken.trim().toUpperCase();
  const client = await pool.connect();
  let finished = false;
  try {
    await client.query("BEGIN");
    const card = await client.query<{ id: string; customerId: string; firstName: string; lastName: string }>(
      `SELECT lc.id, lc."customerId", c."firstName", c."lastName"
       FROM "LoyaltyCard" lc
       JOIN "Customer" c ON c.id = lc."customerId"
       WHERE lc."publicToken" = $1 AND lc."organizationId" = $2 AND lc.status = 'ACTIVE'
       FOR UPDATE OF lc`,
      [token, organizationId],
    );
    if (!card.rows[0]) throw new Error("CARD_NOT_FOUND");

    const appointment = await client.query<{
      id: string;
      customerId: string;
      serviceId: string | null;
      serviceName: string;
      amount: string;
      status: string;
    }>(
      `SELECT a.id, a."customerId", a."serviceId", a.status, a.price::text AS amount,
              COALESCE(a."serviceNameSnapshot", s.name, 'Prestation') AS "serviceName"
       FROM "Appointment" a
       LEFT JOIN "Service" s ON s.id = a."serviceId"
       WHERE a.id = $1 AND a."organizationId" = $2
       FOR UPDATE OF a`,
      [appointmentId, organizationId],
    );
    const appt = appointment.rows[0];
    if (!appt || appt.customerId !== card.rows[0].customerId) throw new Error("APPOINTMENT_MISMATCH");
    if (appt.status !== "COMPLETED") throw new Error("APPOINTMENT_NOT_COMPLETED");
    if (
      program.eligibleServiceIds.length > 0 &&
      (!appt.serviceId || !program.eligibleServiceIds.includes(appt.serviceId))
    ) {
      throw new Error("SERVICE_NOT_ELIGIBLE");
    }

    await insertVisitAndMaybeReward(client, {
      organizationId,
      cardId: card.rows[0].id,
      customerId: card.rows[0].customerId,
      appointmentId: appt.id,
      serviceId: appt.serviceId,
      amount: appt.amount,
      points: 1,
      validatedBy,
      note: null,
      program,
    });

    await client.query("COMMIT");
    const saved = {
      cardId: card.rows[0].id,
      customerName: `${card.rows[0].firstName} ${card.rows[0].lastName}`.trim(),
      serviceName: appt.serviceName,
      amount: Number(appt.amount),
    };
    finished = true;
    client.release();
    const progress = await loadCardProgress(saved.cardId, organizationId);
    if (!progress) throw new Error("CARD_NOT_FOUND");
    return {
      ...progress,
      customerName: saved.customerName,
      serviceName: saved.serviceName,
      amount: saved.amount,
    };
  } catch (error) {
    if (!finished) {
      try {
        await client.query("ROLLBACK");
      } catch {
        /* transaction déjà terminée */
      }
      client.release();
    }
    throw error;
  }
}

/**
 * +1 passage quand le rendez-vous est terminé, le paiement soldé et le service éligible.
 * Idempotent : un rendez-vous ne crée qu'un LoyaltyEvent.
 */
export async function creditVisitIfEligible(opts: {
  organizationId: string;
  appointmentId: string;
  actorId?: string | null;
}): Promise<{ credited: boolean }> {
  const program = await getVisitProgram(opts.organizationId);
  if (!program.active) return { credited: false };

  const appointment = await pool.query<{
    customerId: string;
    serviceId: string | null;
    amount: string;
    status: string;
    netPaid: string;
  }>(
    `SELECT a."customerId", a."serviceId", a.price::text AS amount, a.status::text AS status,
            COALESCE((
              SELECT SUM(CASE WHEN p.kind = 'REFUND' THEN -p.amount ELSE p.amount END)
              FROM "Payment" p
              WHERE p."appointmentId" = a.id AND p.status = 'COMPLETED'
            ), 0)::text AS "netPaid"
     FROM "Appointment" a
     WHERE a.id = $1 AND a."organizationId" = $2`,
    [opts.appointmentId, opts.organizationId],
  );
  const appt = appointment.rows[0];
  if (!appt || appt.status !== "COMPLETED") return { credited: false };
  const price = Number(appt.amount) || 0;
  const paid = Number(appt.netPaid) || 0;
  if (paid + 0.009 < price) return { credited: false };
  if (
    program.eligibleServiceIds.length > 0 &&
    (!appt.serviceId || !program.eligibleServiceIds.includes(appt.serviceId))
  ) {
    return { credited: false };
  }

  const card = await pool.query<{ id: string }>(
    `SELECT id FROM "LoyaltyCard"
     WHERE "organizationId" = $1 AND "customerId" = $2 AND status = 'ACTIVE'
     LIMIT 1`,
    [opts.organizationId, appt.customerId],
  );
  if (!card.rows[0]) return { credited: false };

  const client = await pool.connect();
  let finished = false;
  try {
    await client.query("BEGIN");
    await client.query(`SELECT id FROM "LoyaltyCard" WHERE id = $1 FOR UPDATE`, [card.rows[0].id]);
    await insertVisitAndMaybeReward(client, {
      organizationId: opts.organizationId,
      cardId: card.rows[0].id,
      customerId: appt.customerId,
      appointmentId: opts.appointmentId,
      serviceId: appt.serviceId,
      amount: appt.amount,
      points: 1,
      validatedBy: opts.actorId ?? null,
      note: null,
      program,
    });
    await client.query("COMMIT");
    finished = true;
    return { credited: true };
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_VALIDATED") {
      return { credited: false };
    }
    throw error;
  } finally {
    if (!finished) {
      try {
        await client.query("ROLLBACK");
      } catch {
        /* transaction déjà terminée */
      }
    }
    client.release();
  }
}

export async function adjustLoyaltyVisit(opts: {
  organizationId: string;
  customerId: string;
  delta: 1 | -1;
  reason: string;
  actorId: string;
  actorName?: string | null;
}): Promise<{ visits: number }> {
  const reason = opts.reason.trim();
  if (reason.length < 3) throw new Error("REASON_REQUIRED");
  if (opts.delta !== 1 && opts.delta !== -1) throw new Error("INVALID_DELTA");

  const program = await getVisitProgram(opts.organizationId);
  if (!program.active) throw new Error("PROGRAM_DISABLED");

  const card = await pool.query<{ id: string }>(
    `SELECT id FROM "LoyaltyCard"
     WHERE "organizationId" = $1 AND "customerId" = $2 AND status = 'ACTIVE'
     LIMIT 1`,
    [opts.organizationId, opts.customerId],
  );
  if (!card.rows[0]) throw new Error("NO_CARD");

  const client = await pool.connect();
  let finished = false;
  try {
    await client.query("BEGIN");
    await client.query(`SELECT id FROM "LoyaltyCard" WHERE id = $1 FOR UPDATE`, [card.rows[0].id]);
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
      customerId: opts.customerId,
      appointmentId: null,
      serviceId: null,
      amount: 0,
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
      before: { visits: before, customerId: opts.customerId },
      after: { visits: saved.visits, delta: opts.delta, reason, customerId: opts.customerId },
      client,
    });
    await client.query("COMMIT");
    finished = true;
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
