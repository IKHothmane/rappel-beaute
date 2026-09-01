import { randomBytes } from "crypto";
import { Pool, type PoolClient } from "pg";
import { writeAuditLog } from "@/lib/db/audit";
import {
  PRODUCT_COMMISSIONS_ENABLED,
  type CommissionDetail,
  type CommissionKpis,
  type CommissionListItem,
  type CommissionPaidFilter,
  type CommissionPeriodInfo,
  type CommissionPeriodPreset,
  type CommissionPeriodStatus,
  type CreateCommissionAdjustmentInput,
  type StaffCommissionSummary,
} from "@/types/commission";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function newId(prefix: string) {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "23505"
  );
}

/** Résout le Staff lié à un User (email, sinon prénom+nom) — pour STAFF « ses commissions » */
export async function resolveStaffIdForUser(
  organizationId: string,
  user: { email: string; firstName: string; lastName: string },
): Promise<string | null> {
  const byEmail = await pool.query<{ id: string }>(
    `SELECT id FROM "Staff"
     WHERE "organizationId" = $1 AND "deletedAt" IS NULL
       AND lower(COALESCE(email,'')) = lower($2)
     LIMIT 1`,
    [organizationId, user.email],
  );
  if (byEmail.rows[0]) return byEmail.rows[0].id;

  const byName = await pool.query<{ id: string }>(
    `SELECT id FROM "Staff"
     WHERE "organizationId" = $1 AND "deletedAt" IS NULL
       AND lower("firstName") = lower($2) AND lower("lastName") = lower($3)
     LIMIT 1`,
    [organizationId, user.firstName, user.lastName],
  );
  return byName.rows[0]?.id ?? null;
}

export function resolvePeriodRange(
  preset: CommissionPeriodPreset,
  from?: string | null,
  to?: string | null,
  now = new Date(),
): { from: Date; to: Date; year: number; month: number } {
  const startOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const endExclusive = (d: Date) => {
    const x = startOfDay(d);
    x.setDate(x.getDate() + 1);
    return x;
  };

  if (preset === "custom" && from && to) {
    const f = startOfDay(new Date(from));
    const t = endExclusive(new Date(to));
    return { from: f, to: t, year: f.getFullYear(), month: f.getMonth() + 1 };
  }

  if (preset === "today") {
    const f = startOfDay(now);
    return { from: f, to: endExclusive(now), year: f.getFullYear(), month: f.getMonth() + 1 };
  }

  if (preset === "week") {
    const f = startOfDay(now);
    const day = f.getDay();
    const diff = day === 0 ? 6 : day - 1;
    f.setDate(f.getDate() - diff);
    const t = new Date(f);
    t.setDate(t.getDate() + 7);
    return { from: f, to: t, year: now.getFullYear(), month: now.getMonth() + 1 };
  }

  if (preset === "prev_month") {
    const f = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const t = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: f, to: t, year: f.getFullYear(), month: f.getMonth() + 1 };
  }

  // month (default)
  const f = new Date(now.getFullYear(), now.getMonth(), 1);
  const t = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { from: f, to: t, year: f.getFullYear(), month: f.getMonth() + 1 };
}

async function getPeriodStatus(
  organizationId: string,
  year: number,
  month: number,
): Promise<CommissionPeriodInfo> {
  const { rows } = await pool.query<{
    id: string;
    status: string;
    closedAt: Date | null;
    closedById: string | null;
  }>(
    `SELECT id, status::text, "closedAt", "closedById"
     FROM "CommissionPeriod"
     WHERE "organizationId" = $1 AND year = $2 AND month = $3`,
    [organizationId, year, month],
  );
  if (!rows[0]) {
    return {
      id: null,
      year,
      month,
      status: "OPEN",
      closedAt: null,
      closedById: null,
    };
  }
  return {
    id: rows[0].id,
    year,
    month,
    status: rows[0].status as CommissionPeriodStatus,
    closedAt: rows[0].closedAt ? new Date(rows[0].closedAt).toISOString() : null,
    closedById: rows[0].closedById,
  };
}

function mapRow(r: Record<string, unknown>, periodClosed: boolean): CommissionListItem {
  const commissionAmount = parseFloat(String(r.commissionAmount)) || 0;
  const adjustmentsTotal = parseFloat(String(r.adjustmentsTotal ?? 0)) || 0;
  return {
    id: String(r.id),
    appointmentId: String(r.appointmentId),
    staffId: String(r.staffId),
    staffName: String(r.staffNameSnapshot ?? r.staffName ?? ""),
    serviceId: String(r.serviceId),
    serviceName: String(r.serviceNameSnapshot ?? r.serviceName ?? ""),
    appointmentAt: new Date(r.appointmentAt as Date).toISOString(),
    baseAmount: parseFloat(String(r.baseAmount)) || 0,
    type: r.type as CommissionListItem["type"],
    percentageSnapshot:
      r.percentageSnapshot != null ? parseFloat(String(r.percentageSnapshot)) : null,
    fixedSnapshot: r.fixedSnapshot != null ? parseFloat(String(r.fixedSnapshot)) : null,
    commissionAmount,
    adjustmentsTotal,
    netAmount: Math.round((commissionAmount + adjustmentsTotal) * 100) / 100,
    paid: Boolean(r.paid),
    paidAt: r.paidAt ? new Date(r.paidAt as Date).toISOString() : null,
    periodClosed,
    createdAt: new Date(r.createdAt as Date).toISOString(),
  };
}

const SELECT_BASE = `
  SELECT
    cr.id, cr."appointmentId", cr."staffId", cr."serviceId",
    cr."serviceNameSnapshot", cr."staffNameSnapshot",
    cr."baseAmount"::text, cr.type::text,
    cr."percentageSnapshot"::text, cr."fixedSnapshot"::text,
    cr."commissionAmount"::text, cr.paid, cr."paidAt",
    cr."createdAt",
    a."startAt" AS "appointmentAt",
    COALESCE((
      SELECT SUM(adj.amount) FROM "CommissionAdjustment" adj
      WHERE adj."commissionRecordId" = cr.id
    ), 0)::text AS "adjustmentsTotal"
  FROM "CommissionRecord" cr
  JOIN "Appointment" a ON a.id = cr."appointmentId"
`;

export async function listCommissions(
  organizationId: string,
  opts: {
    page: number;
    limit: number;
    preset: CommissionPeriodPreset;
    from?: string | null;
    to?: string | null;
    staffId?: string | null;
    serviceId?: string | null;
    paid?: CommissionPaidFilter;
    search?: string;
    /** Force scope à une employée (STAFF) */
    forceStaffId?: string | null;
  },
): Promise<{
  items: CommissionListItem[];
  total: number;
  kpis: CommissionKpis;
  period: {
    from: string;
    to: string;
    preset: CommissionPeriodPreset;
    year: number;
    month: number;
    status: CommissionPeriodStatus;
  };
}> {
  const range = resolvePeriodRange(opts.preset, opts.from, opts.to);
  const periodInfo = await getPeriodStatus(organizationId, range.year, range.month);
  const periodClosed = periodInfo.status === "CLOSED";

  const conditions = [
    `cr."organizationId" = $1`,
    `a."startAt" >= $2`,
    `a."startAt" < $3`,
  ];
  const params: unknown[] = [organizationId, range.from, range.to];
  let pi = 4;

  const staffId = opts.forceStaffId || opts.staffId;
  if (staffId) {
    conditions.push(`cr."staffId" = $${pi}`);
    params.push(staffId);
    pi++;
  }
  if (opts.serviceId) {
    conditions.push(`cr."serviceId" = $${pi}`);
    params.push(opts.serviceId);
    pi++;
  }
  if (opts.paid === "paid") conditions.push(`cr.paid = true`);
  if (opts.paid === "unpaid") conditions.push(`cr.paid = false`);
  if (opts.search) {
    conditions.push(
      `(cr."serviceNameSnapshot" ILIKE $${pi} OR cr."staffNameSnapshot" ILIKE $${pi})`,
    );
    params.push(`%${opts.search}%`);
    pi++;
  }

  const where = conditions.join(" AND ");
  const offset = (opts.page - 1) * opts.limit;

  const [countRes, listRes, kpiRes, byStaffRes] = await Promise.all([
    pool.query<{ total: number }>(
      `SELECT COUNT(*)::int AS total
       FROM "CommissionRecord" cr
       JOIN "Appointment" a ON a.id = cr."appointmentId"
       WHERE ${where}`,
      params,
    ),
    pool.query(
      `${SELECT_BASE}
       WHERE ${where}
       ORDER BY a."startAt" DESC, cr."createdAt" DESC
       LIMIT $${pi} OFFSET $${pi + 1}`,
      [...params, opts.limit, offset],
    ),
    pool.query<{
      commissionTotal: string;
      baseTotal: string;
      count: number;
      weightedRate: string | null;
    }>(
      `SELECT
         COALESCE(SUM(cr."commissionAmount" + COALESCE(adj.t, 0)), 0)::text AS "commissionTotal",
         COALESCE(SUM(cr."baseAmount"), 0)::text AS "baseTotal",
         COUNT(*)::int AS count,
         CASE WHEN SUM(cr."baseAmount") > 0
           THEN (SUM(
             CASE WHEN cr.type = 'PERCENTAGE' AND cr."percentageSnapshot" IS NOT NULL
               THEN cr."baseAmount" * cr."percentageSnapshot"
               ELSE 0 END
           ) / NULLIF(SUM(
             CASE WHEN cr.type = 'PERCENTAGE' THEN cr."baseAmount" ELSE 0 END
           ), 0))::text
           ELSE NULL END AS "weightedRate"
       FROM "CommissionRecord" cr
       JOIN "Appointment" a ON a.id = cr."appointmentId"
       LEFT JOIN LATERAL (
         SELECT SUM(amount) AS t FROM "CommissionAdjustment"
         WHERE "commissionRecordId" = cr.id
       ) adj ON true
       WHERE ${where}`,
      params,
    ),
    pool.query<{
      staffId: string;
      staffName: string;
      commissionTotal: string;
      baseTotal: string;
      count: number;
    }>(
      `SELECT
         cr."staffId",
         cr."staffNameSnapshot" AS "staffName",
         COALESCE(SUM(cr."commissionAmount" + COALESCE(adj.t, 0)), 0)::text AS "commissionTotal",
         COALESCE(SUM(cr."baseAmount"), 0)::text AS "baseTotal",
         COUNT(*)::int AS count
       FROM "CommissionRecord" cr
       JOIN "Appointment" a ON a.id = cr."appointmentId"
       LEFT JOIN LATERAL (
         SELECT SUM(amount) AS t FROM "CommissionAdjustment"
         WHERE "commissionRecordId" = cr.id
       ) adj ON true
       WHERE ${where}
       GROUP BY cr."staffId", cr."staffNameSnapshot"
       ORDER BY SUM(cr."commissionAmount" + COALESCE(adj.t, 0)) DESC`,
      params,
    ),
  ]);

  const commissionTotal =
    Math.round((parseFloat(kpiRes.rows[0]?.commissionTotal ?? "0") || 0) * 100) / 100;
  const baseTotal = Math.round((parseFloat(kpiRes.rows[0]?.baseTotal ?? "0") || 0) * 100) / 100;
  const count = kpiRes.rows[0]?.count ?? 0;
  const avgRatePct =
    kpiRes.rows[0]?.weightedRate != null
      ? Math.round(parseFloat(kpiRes.rows[0].weightedRate) * 10) / 10
      : baseTotal > 0 && commissionTotal > 0
        ? Math.round((commissionTotal / baseTotal) * 1000) / 10
        : null;

  return {
    items: listRes.rows.map((r) => mapRow(r as Record<string, unknown>, periodClosed)),
    total: countRes.rows[0]?.total ?? 0,
    kpis: {
      commissionTotal,
      baseTotal,
      count,
      avgRatePct,
      byStaff: byStaffRes.rows.map((r) => ({
        staffId: r.staffId,
        staffName: r.staffName,
        commissionTotal: Math.round((parseFloat(r.commissionTotal) || 0) * 100) / 100,
        baseTotal: Math.round((parseFloat(r.baseTotal) || 0) * 100) / 100,
        count: r.count,
      })),
    },
    period: {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      preset: opts.preset,
      year: range.year,
      month: range.month,
      status: periodInfo.status,
    },
  };
}

export async function getCommissionById(
  organizationId: string,
  id: string,
): Promise<CommissionDetail | null> {
  const { rows } = await pool.query(
    `${SELECT_BASE}
     WHERE cr.id = $1 AND cr."organizationId" = $2`,
    [id, organizationId],
  );
  if (!rows[0]) return null;
  const aptAt = new Date(rows[0].appointmentAt as Date);
  const periodInfo = await getPeriodStatus(
    organizationId,
    aptAt.getFullYear(),
    aptAt.getMonth() + 1,
  );
  const item = mapRow(rows[0] as Record<string, unknown>, periodInfo.status === "CLOSED");

  const adj = await pool.query<{
    id: string;
    amount: string;
    reason: string;
    paymentId: string | null;
    createdById: string | null;
    createdAt: Date;
  }>(
    `SELECT id, amount::text, reason, "paymentId", "createdById", "createdAt"
     FROM "CommissionAdjustment"
     WHERE "commissionRecordId" = $1
     ORDER BY "createdAt" ASC`,
    [id],
  );

  return {
    ...item,
    adjustments: adj.rows.map((a) => ({
      id: a.id,
      amount: parseFloat(a.amount) || 0,
      reason: a.reason,
      paymentId: a.paymentId,
      createdById: a.createdById,
      createdAt: new Date(a.createdAt).toISOString(),
    })),
  };
}

export async function getStaffCommissionSummary(
  organizationId: string,
  staffId: string,
  opts?: { year?: number; month?: number },
): Promise<StaffCommissionSummary | null> {
  const staff = await pool.query<{ firstName: string; lastName: string }>(
    `SELECT "firstName", "lastName" FROM "Staff"
     WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,
    [staffId, organizationId],
  );
  if (!staff.rows[0]) return null;

  const now = new Date();
  const year = opts?.year ?? now.getFullYear();
  const month = opts?.month ?? now.getMonth() + 1;
  const from = new Date(year, month - 1, 1);
  const periodLabel = from.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();
  const fromStr = `${year}-${pad(month)}-01`;
  const toStr = `${year}-${pad(month)}-${pad(lastDay)}`;

  const { items, kpis } = await listCommissions(organizationId, {
    page: 1,
    limit: 200,
    preset: "custom",
    from: fromStr,
    to: toStr,
    forceStaffId: staffId,
  });

  return {
    staffId,
    staffName: `${staff.rows[0].firstName} ${staff.rows[0].lastName}`.trim(),
    periodLabel: periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1),
    baseTotal: kpis.baseTotal,
    count: kpis.count,
    commissionTotal:
      Math.round(items.reduce((s, i) => s + i.commissionAmount, 0) * 100) / 100,
    netTotal: kpis.commissionTotal,
    items,
  };
}

/**
 * Figé la commission employée au COMPLETED — idempotent.
 * Jamais appelée pour CANCELLED / NO_SHOW.
 * Commissions produits : désactivées (PRODUCT_COMMISSIONS_ENABLED).
 */
export async function createCommissionForAppointment(opts: {
  organizationId: string;
  appointmentId: string;
}): Promise<{ created: number; skipped: number }> {
  void PRODUCT_COMMISSIONS_ENABLED;
  const { organizationId, appointmentId } = opts;

  const apt = await pool.query<{
    status: string;
    staffId: string;
    serviceId: string;
    price: string;
    serviceName: string;
    staffFirst: string;
    staffLast: string;
  }>(
    `SELECT
      a.status::text, a."staffId", a."serviceId", a.price::text,
      s.name AS "serviceName",
      st."firstName" AS "staffFirst", st."lastName" AS "staffLast"
     FROM "Appointment" a
     JOIN "Service" s ON s.id = a."serviceId"
     JOIN "Staff" st ON st.id = a."staffId"
     WHERE a.id = $1 AND a."organizationId" = $2`,
    [appointmentId, organizationId],
  );
  if (!apt.rows[0]) return { created: 0, skipped: 0 };
  if (apt.rows[0].status !== "COMPLETED") return { created: 0, skipped: 0 };

  const key = `apt:${appointmentId}:commission:${apt.rows[0].staffId}`;
  const exists = await pool.query(
    `SELECT 1 FROM "CommissionRecord"
     WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,
    [organizationId, key],
  );
  if (exists.rows[0]) return { created: 0, skipped: 1 };

  const rule = await pool.query<{
    type: string;
    percentage: string | null;
    fixedAmount: string | null;
  }>(
    `SELECT type::text, percentage::text, "fixedAmount"::text
     FROM "ServiceCommission"
     WHERE "serviceId" = $1 AND "staffId" = $2`,
    [apt.rows[0].serviceId, apt.rows[0].staffId],
  );
  if (!rule.rows[0]) return { created: 0, skipped: 0 };

  const base = parseFloat(apt.rows[0].price) || 0;
  const percentage =
    rule.rows[0].percentage != null ? parseFloat(rule.rows[0].percentage) : null;
  const fixed =
    rule.rows[0].fixedAmount != null ? parseFloat(rule.rows[0].fixedAmount) : null;
  let commissionAmount = 0;
  if (rule.rows[0].type === "PERCENTAGE" && percentage != null) {
    commissionAmount = Math.round(base * (percentage / 100) * 100) / 100;
  } else if (rule.rows[0].type === "FIXED" && fixed != null) {
    commissionAmount = fixed;
  }

  try {
    await pool.query(
      `INSERT INTO "CommissionRecord" (
        id, "organizationId", "appointmentId", "staffId", "serviceId",
        "serviceNameSnapshot", "staffNameSnapshot", "baseAmount", type,
        "percentageSnapshot", "fixedSnapshot", "commissionAmount",
        "idempotencyKey", "updatedAt"
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9::"CommissionType",$10,$11,$12,$13,NOW()
      )`,
      [
        newId("com"),
        organizationId,
        appointmentId,
        apt.rows[0].staffId,
        apt.rows[0].serviceId,
        apt.rows[0].serviceName,
        `${apt.rows[0].staffFirst} ${apt.rows[0].staffLast}`.trim(),
        base,
        rule.rows[0].type,
        percentage,
        fixed,
        commissionAmount,
        key,
      ],
    );
    return { created: 1, skipped: 0 };
  } catch (e) {
    if (isUniqueViolation(e)) return { created: 0, skipped: 1 };
    throw e;
  }
}

export async function createCommissionAdjustment(
  organizationId: string,
  commissionRecordId: string,
  input: CreateCommissionAdjustmentInput,
  actor: { id: string; name?: string | null },
): Promise<CommissionDetail> {
  const existing = await getCommissionById(organizationId, commissionRecordId);
  if (!existing) throw new Error("NOT_FOUND");

  const key =
    input.idempotencyKey ??
    `adj:${commissionRecordId}:${input.amount}:${Date.now()}`;

  if (input.idempotencyKey) {
    const dup = await pool.query<{ id: string }>(
      `SELECT id FROM "CommissionAdjustment"
       WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,
      [organizationId, input.idempotencyKey],
    );
    if (dup.rows[0]) {
      const d = await getCommissionById(organizationId, commissionRecordId);
      if (d) return d;
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const id = newId("cadj");
    await client.query(
      `INSERT INTO "CommissionAdjustment" (
        id, "organizationId", "commissionRecordId", amount, reason,
        "paymentId", "createdById", "idempotencyKey"
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        id,
        organizationId,
        commissionRecordId,
        input.amount,
        input.reason,
        input.paymentId ?? null,
        actor.id,
        key,
      ],
    );

    await writeAuditLog({
      organizationId,
      actorId: actor.id,
      actorName: actor.name,
      entityType: "CommissionRecord",
      entityId: commissionRecordId,
      action: "COMMISSION_ADJUSTMENT",
      before: { netAmount: existing.netAmount, commissionAmount: existing.commissionAmount },
      after: {
        adjustment: input.amount,
        netAmount: Math.round((existing.netAmount + input.amount) * 100) / 100,
        reason: input.reason,
      },
      client,
    });

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    if (isUniqueViolation(e) && input.idempotencyKey) {
      const d = await getCommissionById(organizationId, commissionRecordId);
      if (d) return d;
    }
    throw e;
  } finally {
    client.release();
  }

  const detail = await getCommissionById(organizationId, commissionRecordId);
  if (!detail) throw new Error("NOT_FOUND");
  return detail;
}

/**
 * Lors d'un remboursement lié à un RDV : adjustment proportionnel (idempotent).
 * Ne supprime jamais le CommissionRecord.
 */
export async function adjustCommissionsForRefund(opts: {
  organizationId: string;
  appointmentId: string | null;
  refundPaymentId: string;
  refundAmount: number;
  originalPaymentAmount: number;
  actorId: string;
  reason?: string;
}): Promise<void> {
  if (!opts.appointmentId || opts.refundAmount <= 0) return;

  const { rows } = await pool.query<{
    id: string;
    commissionAmount: string;
    baseAmount: string;
  }>(
    `SELECT id, "commissionAmount"::text, "baseAmount"::text
     FROM "CommissionRecord"
     WHERE "organizationId" = $1 AND "appointmentId" = $2`,
    [opts.organizationId, opts.appointmentId],
  );
  if (!rows.length) return;

  const ratio = Math.min(
    1,
    opts.refundAmount / Math.max(opts.originalPaymentAmount, 0.01),
  );

  for (const rec of rows) {
    const commissionAmount = parseFloat(rec.commissionAmount) || 0;
    const adjAmount = Math.round(-commissionAmount * ratio * 100) / 100;
    if (adjAmount === 0) continue;

    await createCommissionAdjustment(
      opts.organizationId,
      rec.id,
      {
        amount: adjAmount,
        reason: opts.reason ?? "Remboursement cliente",
        paymentId: opts.refundPaymentId,
        idempotencyKey: `refund:${opts.refundPaymentId}:commission:${rec.id}`,
      },
      { id: opts.actorId },
    );
  }
}

export async function closeCommissionPeriod(
  organizationId: string,
  year: number,
  month: number,
  actor: { id: string; name?: string | null },
): Promise<CommissionPeriodInfo> {
  const existing = await getPeriodStatus(organizationId, year, month);
  if (existing.status === "CLOSED") return existing;

  const id = existing.id ?? newId("cper");
  await pool.query(
    `INSERT INTO "CommissionPeriod" (
      id, "organizationId", year, month, status, "closedAt", "closedById", "updatedAt"
    ) VALUES ($1,$2,$3,$4,'CLOSED'::"CommissionPeriodStatus",NOW(),$5,NOW())
    ON CONFLICT ("organizationId", year, month) DO UPDATE SET
      status = 'CLOSED'::"CommissionPeriodStatus",
      "closedAt" = NOW(),
      "closedById" = EXCLUDED."closedById",
      "updatedAt" = NOW()`,
    [id, organizationId, year, month, actor.id],
  );

  await writeAuditLog({
    organizationId,
    actorId: actor.id,
    actorName: actor.name,
    entityType: "CommissionPeriod",
    entityId: id,
    action: "CLOSE_PERIOD",
    before: { status: "OPEN", year, month },
    after: { status: "CLOSED", year, month },
  });

  return getPeriodStatus(organizationId, year, month);
}

export async function setCommissionPaid(
  organizationId: string,
  commissionRecordId: string,
  paid: boolean,
  actor: { id: string; name?: string | null },
): Promise<CommissionDetail> {
  const existing = await getCommissionById(organizationId, commissionRecordId);
  if (!existing) throw new Error("NOT_FOUND");

  await pool.query(
    `UPDATE "CommissionRecord"
     SET paid = $1, "paidAt" = CASE WHEN $1 THEN NOW() ELSE NULL END, "updatedAt" = NOW()
     WHERE id = $2 AND "organizationId" = $3`,
    [paid, commissionRecordId, organizationId],
  );

  await writeAuditLog({
    organizationId,
    actorId: actor.id,
    actorName: actor.name,
    entityType: "CommissionRecord",
    entityId: commissionRecordId,
    action: paid ? "MARK_PAID" : "MARK_UNPAID",
    before: { paid: existing.paid },
    after: { paid },
  });

  const detail = await getCommissionById(organizationId, commissionRecordId);
  if (!detail) throw new Error("NOT_FOUND");
  return detail;
}

export function buildCommissionsCsv(items: CommissionListItem[]): string {
  const header = [
    "Date",
    "Employée",
    "Service",
    "Base MAD",
    "Type",
    "Taux %",
    "Fixe MAD",
    "Commission MAD",
    "Ajustements MAD",
    "Net MAD",
    "Payée",
  ].join(";");
  const lines = items.map((i) =>
    [
      new Date(i.appointmentAt).toLocaleDateString("fr-FR"),
      i.staffName,
      i.serviceName,
      i.baseAmount.toFixed(2),
      i.type,
      i.percentageSnapshot ?? "",
      i.fixedSnapshot ?? "",
      i.commissionAmount.toFixed(2),
      i.adjustmentsTotal.toFixed(2),
      i.netAmount.toFixed(2),
      i.paid ? "oui" : "non",
    ].join(";"),
  );
  return [header, ...lines].join("\n");
}

/** Export pour transactions externes éventuelles */
export { pool as commissionsPool };
