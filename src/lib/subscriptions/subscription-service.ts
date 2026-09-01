import { randomBytes } from "crypto";
import { Pool, type PoolClient } from "pg";
import {
  APPOINTMENT_COUNT_STATUSES,
  type SubscriptionDto,
  type SubscriptionStatus,
  type UsageDto,
} from "@/types/subscription";
import { parsePlanFeatures } from "@/lib/subscriptions/features";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const ACTIVE_SUB_STATUSES: SubscriptionStatus[] = ["TRIAL", "ACTIVE", "PAST_DUE"];

type SubRow = {
  id: string;
  organizationId: string;
  planId: string;
  planCode: string;
  planName: string;
  status: SubscriptionStatus;
  priceSnapshot: string;
  currencySnapshot: string;
  startedAt: Date;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelledAt: Date | null;
  trialEndsAt: Date | null;
  maxStaff: number | null;
  maxCustomers: number | null;
  maxAppointmentsPerMonth: number | null;
  maxResources: number | null;
  features: unknown;
};

function mapSubscription(row: SubRow): SubscriptionDto {
  return {
    id: row.id,
    organizationId: row.organizationId,
    planId: row.planId,
    planCode: row.planCode as SubscriptionDto["planCode"],
    planName: row.planName,
    status: row.status,
    priceSnapshot: parseFloat(row.priceSnapshot),
    currencySnapshot: row.currencySnapshot,
    startedAt: row.startedAt.toISOString(),
    currentPeriodStart: row.currentPeriodStart.toISOString(),
    currentPeriodEnd: row.currentPeriodEnd.toISOString(),
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    trialEndsAt: row.trialEndsAt?.toISOString() ?? null,
    features: parsePlanFeatures(row.features),
    limits: {
      maxStaff: row.maxStaff,
      maxCustomers: row.maxCustomers,
      maxAppointmentsPerMonth: row.maxAppointmentsPerMonth,
      maxResources: row.maxResources,
    },
  };
}

const SUB_SELECT = `
  SELECT
    s.id, s."organizationId", s."planId", s.status, s."priceSnapshot"::text,
    s."currencySnapshot", s."startedAt", s."currentPeriodStart", s."currentPeriodEnd",
    s."cancelledAt", s."trialEndsAt",
    p.code AS "planCode", p.name AS "planName",
    p."maxStaff", p."maxCustomers", p."maxAppointmentsPerMonth", p."maxResources",
    p.features
  FROM "Subscription" s
  JOIN "Plan" p ON p.id = s."planId"
`;

export async function getOrganizationSubscription(
  organizationId: string,
): Promise<SubscriptionDto | null> {
  const { rows } = await pool.query<SubRow>(
    `${SUB_SELECT}
     WHERE s."organizationId" = $1
     ORDER BY s."createdAt" DESC LIMIT 1`,
    [organizationId],
  );
  return rows[0] ? mapSubscription(rows[0]) : null;
}

export function isSubscriptionOperational(sub: SubscriptionDto): boolean {
  if (sub.status === "CANCELLED" || sub.status === "EXPIRED" || sub.status === "PAUSED") {
    return false;
  }
  if (sub.status === "TRIAL" && sub.trialEndsAt) {
    if (new Date(sub.trialEndsAt).getTime() < Date.now()) return false;
  }
  return ["TRIAL", "ACTIVE", "PAST_DUE"].includes(sub.status);
}

export async function getSubscriptionUsage(organizationId: string): Promise<UsageDto | null> {
  const sub = await getOrganizationSubscription(organizationId);
  if (!sub) return null;

  const periodStart = sub.currentPeriodStart;
  const periodEnd = sub.currentPeriodEnd;

  const statusList = APPOINTMENT_COUNT_STATUSES.map((s) => `'${s}'`).join(", ");

  const { rows } = await pool.query<{
    staff: string;
    customers: string;
    appointments: string;
    resources: string;
  }>(
    `SELECT
      (SELECT COUNT(*)::text FROM "Staff"
       WHERE "organizationId" = $1 AND status NOT IN ('ARCHIVED', 'INACTIVE')) AS staff,
      (SELECT COUNT(*)::text FROM "Customer"
       WHERE "organizationId" = $1 AND status NOT IN ('ARCHIVED')) AS customers,
      (SELECT COUNT(*)::text FROM "Appointment"
       WHERE "organizationId" = $1
         AND "startAt" >= $2::timestamptz AND "startAt" < $3::timestamptz
         AND status IN (${statusList})) AS appointments,
      (SELECT COUNT(*)::text FROM "Resource"
       WHERE "organizationId" = $1 AND active = true) AS resources`,
    [organizationId, periodStart, periodEnd],
  );

  const r = rows[0];
  return {
    staff: { used: parseInt(r?.staff ?? "0", 10), max: sub.limits.maxStaff },
    customers: { used: parseInt(r?.customers ?? "0", 10), max: sub.limits.maxCustomers },
    appointments: {
      used: parseInt(r?.appointments ?? "0", 10),
      max: sub.limits.maxAppointmentsPerMonth,
      periodStart,
      periodEnd,
    },
    resources: { used: parseInt(r?.resources ?? "0", 10), max: sub.limits.maxResources },
  };
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export async function createSubscriptionForOrg(opts: {
  organizationId: string;
  planId: string;
  priceSnapshot: number;
  currencySnapshot?: string;
  status?: SubscriptionStatus;
  trialDays?: number;
  client?: import("pg").PoolClient;
}): Promise<string> {
  const c = opts.client ?? pool;
  const now = new Date();
  const periodEnd = addMonths(now, 1);
  const trialDays = opts.trialDays ?? 14;
  const trialEnds = opts.status === "TRIAL" ? new Date(now.getTime() + trialDays * 86400000) : null;
  const id = `sub_${randomBytes(6).toString("hex")}`;

  await c.query(
    `INSERT INTO "Subscription" (
      id, "organizationId", "planId", status, "priceSnapshot", "currencySnapshot",
      "startedAt", "currentPeriodStart", "currentPeriodEnd", "trialEndsAt", "updatedAt"
    ) VALUES ($1,$2,$3,$4::"SubscriptionStatus",$5,$6,$7,$7,$8,$9,NOW())`,
    [
      id,
      opts.organizationId,
      opts.planId,
      opts.status ?? "ACTIVE",
      opts.priceSnapshot,
      opts.currencySnapshot ?? "MAD",
      now,
      periodEnd,
      trialEnds,
    ],
  );
  return id;
}
