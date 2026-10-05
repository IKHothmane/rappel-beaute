import { Pool } from "pg";
import { isUniqueViolation } from "@/lib/db/loyalty";
import {
  getVisitProgram,
  loadCardProgress,
  newLoyaltyId,
  type CardProgress,
} from "@/lib/loyalty/cards";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export type ScanPreview = {
  token: string;
  customerName: string;
  appointmentId: string | null;
  serviceName: string | null;
  amount: number | null;
  visits: number;
  visitsPerReward: number;
  rewardLabel: string;
  rewards: { id: string; name: string; status: string; earnedAt: string }[];
};

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

export async function markVisitRewardUsed(organizationId: string, rewardId: string): Promise<void> {
  const program = await getVisitProgram(organizationId);
  if (!program.active) throw new Error("PROGRAM_DISABLED");
  const updated = await pool.query(
    `UPDATE "LoyaltyVisitReward"
     SET status = 'USED'
     WHERE id = $1 AND "organizationId" = $2 AND status = 'AVAILABLE'`,
    [rewardId, organizationId],
  );
  if (updated.rowCount !== 1) throw new Error("REWARD_NOT_AVAILABLE");
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

    const program = await getVisitProgram(organizationId);
    const eventId = newLoyaltyId("levt");
    try {
      await client.query(
        `INSERT INTO "LoyaltyEvent" (
          id, "organizationId", "customerId", "loyaltyCardId", type,
          "appointmentId", "serviceId", amount, points, "validatedBy", "validatedAt"
        ) VALUES ($1, $2, $3, $4, 'VISIT', $5, $6, $7, 1, $8, NOW())`,
        [
          eventId,
          organizationId,
          card.rows[0].customerId,
          card.rows[0].id,
          appt.id,
          appt.serviceId,
          appt.amount,
          validatedBy,
        ],
      );
    } catch (error) {
      if (isUniqueViolation(error)) throw new Error("ALREADY_VALIDATED");
      throw error;
    }

    const countRow = await client.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM "LoyaltyEvent" WHERE "loyaltyCardId" = $1 AND type = 'VISIT'`,
      [card.rows[0].id],
    );
    const visits = Number(countRow.rows[0]?.count ?? 0);
    if (visits > 0 && visits % program.visitsPerReward === 0) {
      await client.query(
        `INSERT INTO "LoyaltyVisitReward" (
          id, "organizationId", "customerId", "loyaltyCardId", "loyaltyEventId", name, status, "earnedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, 'AVAILABLE', NOW())`,
        [
          newLoyaltyId("lrew"),
          organizationId,
          card.rows[0].customerId,
          card.rows[0].id,
          eventId,
          program.rewardLabel,
        ],
      );
    }

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
