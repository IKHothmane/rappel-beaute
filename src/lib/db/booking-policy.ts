import { randomBytes } from "crypto";
import { Pool, type PoolClient } from "pg";
import { writeAuditLog } from "@/lib/db/audit";
import type {
  BookingPolicySettings,
  DepositDefaultMode,
  DepositRequirement,
  DepositRetentionPolicy,
  DepositState,
  NoShowRiskLevel,
  UpdateBookingPolicyInput,
} from "@/types/booking-policy";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function newId(prefix: string) {
  return `${prefix}_${randomBytes(6).toString("hex")}`;
}

const DEFAULTS: BookingPolicySettings = {
  depositsEnabled: false,
  defaultMode: "NONE",
  defaultFixedAmount: null,
  defaultPercent: null,
  confirmDeadlineHours: 24,
  lateCancelHours: 24,
  onCustomerLateCancel: "KEEP",
  onNoShow: "KEEP",
  onInstituteCancel: "REFUND",
  noShowWarnAt: 1,
  noShowRequireDepositAt: 2,
  noShowStrictAt: 3,
};

function mapSettings(r: Record<string, unknown>): BookingPolicySettings {
  return {
    depositsEnabled: Boolean(r.depositsEnabled),
    defaultMode: (r.defaultMode as DepositDefaultMode) || "NONE",
    defaultFixedAmount:
      r.defaultFixedAmount != null ? Number(r.defaultFixedAmount) : null,
    defaultPercent: r.defaultPercent != null ? Number(r.defaultPercent) : null,
    confirmDeadlineHours: Number(r.confirmDeadlineHours) || 24,
    lateCancelHours: Number(r.lateCancelHours) || 24,
    onCustomerLateCancel: (r.onCustomerLateCancel as DepositRetentionPolicy) || "KEEP",
    onNoShow: (r.onNoShow as DepositRetentionPolicy) || "KEEP",
    onInstituteCancel: (r.onInstituteCancel as DepositRetentionPolicy) || "REFUND",
    noShowWarnAt: Number(r.noShowWarnAt) || 1,
    noShowRequireDepositAt: Number(r.noShowRequireDepositAt) || 2,
    noShowStrictAt: Number(r.noShowStrictAt) || 3,
  };
}

export async function getOrCreateBookingPolicy(
  organizationId: string,
  client?: PoolClient,
): Promise<BookingPolicySettings> {
  const c = client ?? pool;
  const { rows } = await c.query(
    `SELECT * FROM "BookingPolicySettings" WHERE "organizationId" = $1`,
    [organizationId],
  );
  if (rows[0]) return mapSettings(rows[0] as Record<string, unknown>);

  const id = newId("bpol");
  await c.query(
    `INSERT INTO "BookingPolicySettings" (id, "organizationId", "updatedAt")
     VALUES ($1,$2,NOW())
     ON CONFLICT ("organizationId") DO NOTHING`,
    [id, organizationId],
  );
  const again = await c.query(
    `SELECT * FROM "BookingPolicySettings" WHERE "organizationId" = $1`,
    [organizationId],
  );
  return again.rows[0]
    ? mapSettings(again.rows[0] as Record<string, unknown>)
    : { ...DEFAULTS };
}

export async function updateBookingPolicy(
  organizationId: string,
  input: UpdateBookingPolicyInput,
  actor: { id: string; name?: string | null },
): Promise<BookingPolicySettings> {
  const before = await getOrCreateBookingPolicy(organizationId);
  const sets: string[] = [`"updatedAt" = NOW()`];
  const params: unknown[] = [organizationId];
  let pi = 2;

  const set = (col: string, val: unknown) => {
    sets.push(`"${col}" = $${pi++}`);
    params.push(val);
  };

  if (input.depositsEnabled !== undefined) set("depositsEnabled", input.depositsEnabled);
  if (input.defaultMode !== undefined) set("defaultMode", input.defaultMode);
  if (input.defaultFixedAmount !== undefined) {
    set("defaultFixedAmount", input.defaultFixedAmount);
  }
  if (input.defaultPercent !== undefined) set("defaultPercent", input.defaultPercent);
  if (input.confirmDeadlineHours !== undefined) {
    set("confirmDeadlineHours", input.confirmDeadlineHours);
  }
  if (input.lateCancelHours !== undefined) set("lateCancelHours", input.lateCancelHours);
  if (input.onCustomerLateCancel !== undefined) {
    set("onCustomerLateCancel", input.onCustomerLateCancel);
  }
  if (input.onNoShow !== undefined) set("onNoShow", input.onNoShow);
  if (input.onInstituteCancel !== undefined) {
    set("onInstituteCancel", input.onInstituteCancel);
  }
  if (input.noShowWarnAt !== undefined) set("noShowWarnAt", input.noShowWarnAt);
  if (input.noShowRequireDepositAt !== undefined) {
    set("noShowRequireDepositAt", input.noShowRequireDepositAt);
  }
  if (input.noShowStrictAt !== undefined) set("noShowStrictAt", input.noShowStrictAt);

  await pool.query(
    `UPDATE "BookingPolicySettings" SET ${sets.join(", ")} WHERE "organizationId" = $1`,
    params,
  );

  const after = await getOrCreateBookingPolicy(organizationId);
  await writeAuditLog({
    organizationId,
    actorId: actor.id,
    actorName: actor.name ?? undefined,
    entityType: "BookingPolicySettings",
    entityId: organizationId,
    action: "UPDATE",
    before,
    after,
  }).catch(() => undefined);

  return after;
}

export async function countCustomerNoShows(
  organizationId: string,
  customerId: string,
  client?: PoolClient,
): Promise<number> {
  const c = client ?? pool;
  const { rows } = await c.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "Appointment"
     WHERE "organizationId" = $1 AND "customerId" = $2 AND status = 'NO_SHOW'`,
    [organizationId, customerId],
  );
  return parseInt(rows[0]?.n ?? "0", 10);
}

export function noShowRiskLevel(
  count: number,
  policy: BookingPolicySettings,
): NoShowRiskLevel {
  if (count >= policy.noShowStrictAt) return "STRICT";
  if (count >= policy.noShowRequireDepositAt) return "REQUIRE_DEPOSIT";
  if (count >= policy.noShowWarnAt) return "WARN";
  return "NONE";
}

function orgDefaultDeposit(policy: BookingPolicySettings, price: number): number {
  if (policy.defaultMode === "FIXED" && policy.defaultFixedAmount != null) {
    return Math.max(0, Math.round(policy.defaultFixedAmount * 100) / 100);
  }
  if (policy.defaultMode === "PERCENT" && policy.defaultPercent != null) {
    return Math.max(
      0,
      Math.round(price * (policy.defaultPercent / 100) * 100) / 100,
    );
  }
  return 0;
}

/**
 * Calcule l'acompte exigé (snapshot) — n'enregistre rien.
 */
export async function resolveDepositRequirement(input: {
  organizationId: string;
  customerId: string;
  serviceDeposit: number | null | undefined;
  price: number;
  client?: PoolClient;
}): Promise<DepositRequirement> {
  const policy = await getOrCreateBookingPolicy(input.organizationId, input.client);
  const noShowCount = await countCustomerNoShows(
    input.organizationId,
    input.customerId,
    input.client,
  );
  const risk = noShowRiskLevel(noShowCount, policy);
  const forcedByNoShow = risk === "REQUIRE_DEPOSIT" || risk === "STRICT";

  let amount = 0;
  if (policy.depositsEnabled) {
    if (input.serviceDeposit != null && input.serviceDeposit > 0) {
      amount = input.serviceDeposit;
    } else {
      amount = orgDefaultDeposit(policy, input.price);
    }
  }

  if (forcedByNoShow) {
    const floor = orgDefaultDeposit(policy, input.price);
    const minFloor =
      floor > 0
        ? floor
        : policy.defaultFixedAmount && policy.defaultFixedAmount > 0
          ? policy.defaultFixedAmount
          : Math.max(50, Math.round(input.price * 0.2 * 100) / 100);
    amount = Math.max(amount, minFloor);
  }

  amount = Math.round(amount * 100) / 100;

  if (amount <= 0) {
    return {
      amount: 0,
      state: "NOT_REQUIRED",
      dueAt: null,
      forcedByNoShow: false,
    };
  }

  const dueAt = new Date(
    Date.now() + Math.max(1, policy.confirmDeadlineHours) * 3600_000,
  );

  return {
    amount,
    state: "AWAITING",
    dueAt,
    forcedByNoShow,
  };
}

export async function sumDepositPaid(
  organizationId: string,
  appointmentId: string,
  client?: PoolClient,
): Promise<number> {
  const c = client ?? pool;
  const { rows } = await c.query<{ paid: string }>(
    `SELECT COALESCE(SUM(
       CASE
         WHEN kind = 'DEPOSIT'::"PaymentKind" AND status = 'COMPLETED'::"PaymentStatus" THEN amount
         WHEN kind = 'REFUND'::"PaymentKind" AND status = 'COMPLETED'::"PaymentStatus"
           AND "parentPaymentId" IN (
             SELECT id FROM "Payment"
             WHERE "appointmentId" = $2 AND kind = 'DEPOSIT'::"PaymentKind"
           ) THEN -amount
         ELSE 0
       END
     ), 0)::text AS paid
     FROM "Payment"
     WHERE "organizationId" = $1 AND "appointmentId" = $2`,
    [organizationId, appointmentId],
  );
  return Math.round(parseFloat(rows[0]?.paid ?? "0") * 100) / 100;
}

/** Après création de Payment DEPOSIT : confirme le RDV si acompte couvert. */
export async function applyDepositPaymentEffects(
  organizationId: string,
  appointmentId: string,
  actor: { id: string; name?: string | null },
): Promise<{ depositState: DepositState; statusChanged: boolean }> {
  const { rows } = await pool.query<{
    status: string;
    deposit: string | null;
    depositState: DepositState;
  }>(
    `SELECT status::text, deposit::text, "depositState"::text AS "depositState"
     FROM "Appointment"
     WHERE id = $1 AND "organizationId" = $2`,
    [appointmentId, organizationId],
  );
  const apt = rows[0];
  if (!apt) throw new Error("APPOINTMENT_NOT_FOUND");

  const required = apt.deposit != null ? parseFloat(apt.deposit) : 0;
  if (required <= 0 || apt.depositState === "NOT_REQUIRED") {
    return { depositState: apt.depositState, statusChanged: false };
  }

  const paid = await sumDepositPaid(organizationId, appointmentId);
  if (paid + 0.01 < required) {
    return { depositState: apt.depositState, statusChanged: false };
  }

  let statusChanged = false;
  await pool.query(
    `UPDATE "Appointment"
     SET "depositState" = 'PAID'::"DepositState",
         status = CASE
           WHEN status = 'PENDING'::"AppointmentStatus"
           THEN 'CONFIRMED'::"AppointmentStatus"
           ELSE status
         END,
         "updatedAt" = NOW()
     WHERE id = $1 AND "organizationId" = $2`,
    [appointmentId, organizationId],
  );
  statusChanged = apt.status === "PENDING";

  await writeAuditLog({
    organizationId,
    actorId: actor.id,
    actorName: actor.name ?? undefined,
    entityType: "Appointment",
    entityId: appointmentId,
    action: "UPDATE",
    before: { depositState: apt.depositState, status: apt.status },
    after: { depositState: "PAID", status: statusChanged ? "CONFIRMED" : apt.status },
  }).catch(() => undefined);

  return { depositState: "PAID", statusChanged };
}

export async function applyDepositOnStatusChange(input: {
  organizationId: string;
  appointmentId: string;
  previousStatus: string;
  nextStatus: string;
  /** true = annulation côté institut (staff), false = cliente / publique */
  cancelledByInstitute?: boolean;
  actor: { id: string; name?: string | null };
}): Promise<void> {
  const policy = await getOrCreateBookingPolicy(input.organizationId);
  const { rows } = await pool.query<{
    deposit: string | null;
    depositState: DepositState;
    startAt: Date;
  }>(
    `SELECT deposit::text, "depositState"::text AS "depositState", "startAt"
     FROM "Appointment"
     WHERE id = $1 AND "organizationId" = $2`,
    [input.appointmentId, input.organizationId],
  );
  const apt = rows[0];
  if (!apt) return;
  if (apt.depositState !== "PAID" && apt.depositState !== "AWAITING") return;

  let retention: DepositRetentionPolicy | null = null;

  if (input.nextStatus === "NO_SHOW") {
    retention = policy.onNoShow;
  } else if (input.nextStatus === "CANCELLED") {
    if (input.cancelledByInstitute) {
      retention = policy.onInstituteCancel;
    } else {
      const hoursLeft =
        (apt.startAt.getTime() - Date.now()) / 3600_000;
      retention =
        hoursLeft < policy.lateCancelHours
          ? policy.onCustomerLateCancel
          : "REFUND";
    }
  } else {
    return;
  }

  if (apt.depositState === "AWAITING") {
    // Pas encore payé : annuler simplement, pas de forfeit monétaire
    await pool.query(
      `UPDATE "Appointment"
       SET "depositState" = 'NOT_REQUIRED'::"DepositState", "updatedAt" = NOW()
       WHERE id = $1 AND "organizationId" = $2 AND "depositState" = 'AWAITING'::"DepositState"`,
      [input.appointmentId, input.organizationId],
    );
    return;
  }

  if (retention === "KEEP") {
    await pool.query(
      `UPDATE "Appointment"
       SET "depositState" = 'FORFEITED'::"DepositState", "updatedAt" = NOW()
       WHERE id = $1 AND "organizationId" = $2`,
      [input.appointmentId, input.organizationId],
    );
    await writeAuditLog({
      organizationId: input.organizationId,
      actorId: input.actor.id,
      actorName: input.actor.name ?? undefined,
      entityType: "Appointment",
      entityId: input.appointmentId,
      action: "UPDATE",
      after: { depositState: "FORFEITED", reason: input.nextStatus },
    }).catch(() => undefined);
    return;
  }

  // REFUND : crée remboursements des DEPOSIT parents s'il en reste
  const { rows: deposits } = await pool.query<{
    id: string;
    amount: string;
    method: string;
    refunded: string;
  }>(
    `SELECT p.id, p.amount::text, p.method::text,
       COALESCE((
         SELECT SUM(r.amount) FROM "Payment" r
         WHERE r."parentPaymentId" = p.id AND r.kind = 'REFUND'::"PaymentKind"
           AND r.status = 'COMPLETED'::"PaymentStatus"
       ), 0)::text AS refunded
     FROM "Payment" p
     WHERE p."organizationId" = $1 AND p."appointmentId" = $2
       AND p.kind = 'DEPOSIT'::"PaymentKind"
       AND p.status = 'COMPLETED'::"PaymentStatus"`,
    [input.organizationId, input.appointmentId],
  );

  for (const d of deposits) {
    const remaining =
      Math.round((parseFloat(d.amount) - parseFloat(d.refunded)) * 100) / 100;
    if (remaining <= 0.01) continue;
    try {
      const { refundPayment } = await import("@/lib/db/finance");
      await refundPayment(
        input.organizationId,
        d.id,
        {
          amount: remaining,
          method: d.method as import("@/types/finance").PaymentMethod,
          reason: `Remboursement acompte (${input.nextStatus})`,
        },
        input.actor.id,
      );
    } catch (e) {
      console.error("[applyDepositOnStatusChange] refund", e);
    }
  }

  await pool.query(
    `UPDATE "Appointment"
     SET "depositState" = 'REFUNDED'::"DepositState", "updatedAt" = NOW()
     WHERE id = $1 AND "organizationId" = $2`,
    [input.appointmentId, input.organizationId],
  );
}

/** Expire les RDV PENDING dont l'acompte n'a pas été payé à temps. */
export async function expireOverdueDepositAppointments(
  organizationId: string,
): Promise<number> {
  const { rows } = await pool.query<{ id: string }>(
    `UPDATE "Appointment"
     SET status = 'CANCELLED'::"AppointmentStatus",
         "depositState" = CASE
           WHEN "depositState" = 'AWAITING'::"DepositState"
           THEN 'NOT_REQUIRED'::"DepositState"
           ELSE "depositState"
         END,
         "updatedAt" = NOW()
     WHERE "organizationId" = $1
       AND status = 'PENDING'::"AppointmentStatus"
       AND "depositState" = 'AWAITING'::"DepositState"
       AND "depositDueAt" IS NOT NULL
       AND "depositDueAt" < NOW()
     RETURNING id`,
    [organizationId],
  );
  return rows.length;
}

export async function assertCanConfirmWithoutDeposit(input: {
  organizationId: string;
  appointmentId: string;
  nextStatus: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (input.nextStatus !== "CONFIRMED") return { ok: true };

  const { rows } = await pool.query<{
    depositState: DepositState;
    deposit: string | null;
    customerId: string;
  }>(
    `SELECT "depositState"::text AS "depositState", deposit::text, "customerId"
     FROM "Appointment"
     WHERE id = $1 AND "organizationId" = $2`,
    [input.appointmentId, input.organizationId],
  );
  const apt = rows[0];
  if (!apt) return { ok: false, error: "RDV introuvable." };

  if (apt.depositState === "AWAITING") {
    const required = apt.deposit != null ? parseFloat(apt.deposit) : 0;
    const paid = await sumDepositPaid(input.organizationId, input.appointmentId);
    if (paid + 0.01 < required) {
      return {
        ok: false,
        error: `Acompte de ${required.toLocaleString("fr-MA")} MAD requis avant confirmation.`,
      };
    }
  }

  const policy = await getOrCreateBookingPolicy(input.organizationId);
  const noShows = await countCustomerNoShows(input.organizationId, apt.customerId);
  if (noShowRiskLevel(noShows, policy) === "STRICT") {
    const paidEnough =
      apt.depositState === "PAID" || apt.depositState === "FORFEITED";
    if (!paidEnough) {
      const required = apt.deposit != null ? parseFloat(apt.deposit) : 0;
      const paid = await sumDepositPaid(input.organizationId, input.appointmentId);
      if (required > 0 && paid + 0.01 < required) {
        return {
          ok: false,
          error: "Cliente à risque no-show : acompte obligatoire avant confirmation.",
        };
      }
      if (required <= 0 && apt.depositState !== "NOT_REQUIRED") {
        return {
          ok: false,
          error: "Cliente à risque no-show : acompte obligatoire avant confirmation.",
        };
      }
      // Force deposit even if none set yet
      const req = await resolveDepositRequirement({
        organizationId: input.organizationId,
        customerId: apt.customerId,
        serviceDeposit: apt.deposit != null ? parseFloat(apt.deposit) : null,
        price: required > 0 ? required * 5 : 500,
      });
      if (req.amount > 0 && paid + 0.01 < req.amount) {
        return {
          ok: false,
          error: "Cliente à risque no-show : acompte obligatoire avant confirmation.",
        };
      }
    }
  }

  return { ok: true };
}
