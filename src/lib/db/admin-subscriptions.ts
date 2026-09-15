import { randomBytes } from "crypto";
import { Pool, type PoolClient } from "pg";
import { writePlatformAuditLog } from "@/lib/db/platform-audit";
import type { PlatformSessionUser } from "@/lib/auth/types";
import { getPlanByCode, getPlanById, listPlans } from "@/lib/subscriptions/plans";
import { addMonths } from "@/lib/subscriptions/subscription-service";
import type { PlanCode, SubscriptionStatus } from "@/types/subscription";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function actorName(actor: PlatformSessionUser) {
  return `${actor.firstName} ${actor.lastName}`.trim();
}

export type AdminSubscriptionListItem = {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationEmail: string | null;
  planId: string;
  planCode: PlanCode;
  planName: string;
  status: SubscriptionStatus;
  priceSnapshot: number;
  currencySnapshot: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt: string | null;
  startedAt: string;
  daysUntilExpiry: number;
  urgency: "ok" | "soon" | "expired";
  paymentLabel: string;
};

export type AdminSubscriptionsKpis = {
  total: number;
  active: number;
  expiringSoon: number;
  expired: number;
  mrr: number;
};

export async function getAdminSubscriptionsKpis(): Promise<AdminSubscriptionsKpis> {
  const { rows } = await pool.query<{
    total: string;
    active: string;
    soon: string;
    expired: string;
    mrr: string;
  }>(
    `SELECT
      COUNT(*)::text AS total,
      COUNT(*) FILTER (WHERE s.status IN ('ACTIVE', 'TRIAL'))::text AS active,
      COUNT(*) FILTER (
        WHERE s.status IN ('ACTIVE', 'TRIAL', 'PAST_DUE')
          AND s."currentPeriodEnd" > NOW()
          AND s."currentPeriodEnd" <= NOW() + INTERVAL '7 days'
      )::text AS soon,
      COUNT(*) FILTER (
        WHERE s.status = 'EXPIRED'
          OR (s."currentPeriodEnd" < NOW() AND s.status IN ('ACTIVE', 'TRIAL', 'PAST_DUE'))
      )::text AS expired,
      COALESCE(SUM(s."priceSnapshot") FILTER (WHERE s.status IN ('ACTIVE', 'TRIAL')), 0)::text AS mrr
     FROM "Subscription" s`,
  );
  return {
    total: parseInt(rows[0]?.total ?? "0", 10),
    active: parseInt(rows[0]?.active ?? "0", 10),
    expiringSoon: parseInt(rows[0]?.soon ?? "0", 10),
    expired: parseInt(rows[0]?.expired ?? "0", 10),
    mrr: parseFloat(rows[0]?.mrr ?? "0"),
  };
}

function mapUrgency(status: SubscriptionStatus, end: Date): {
  daysUntilExpiry: number;
  urgency: "ok" | "soon" | "expired";
  paymentLabel: string;
} {
  const days = Math.ceil((end.getTime() - Date.now()) / 86400000);
  if (status === "EXPIRED" || days < 0) {
    return { daysUntilExpiry: days, urgency: "expired", paymentLabel: "—" };
  }
  if (status === "PAUSED" || status === "CANCELLED") {
    return {
      daysUntilExpiry: days,
      urgency: days <= 7 ? "soon" : "ok",
      paymentLabel: status === "PAUSED" ? "Suspendu" : "Annulé",
    };
  }
  if (days <= 7) {
    return { daysUntilExpiry: days, urgency: "soon", paymentLabel: "Payé" };
  }
  return {
    daysUntilExpiry: days,
    urgency: "ok",
    paymentLabel: status === "PAST_DUE" ? "Impayé" : "Payé",
  };
}

export async function listAdminSubscriptions(opts?: {
  search?: string;
  planCode?: string;
  status?: SubscriptionStatus | "EXPIRING_SOON" | "EXPIRED_VIEW";
  organizationId?: string;
}): Promise<AdminSubscriptionListItem[]> {
  const params: unknown[] = [];
  const clauses: string[] = [];

  if (opts?.search?.trim()) {
    params.push(`%${opts.search.trim().toLowerCase()}%`);
    clauses.push(
      `(LOWER(o.name) LIKE $${params.length} OR LOWER(COALESCE(o.email, '')) LIKE $${params.length})`,
    );
  }
  if (opts?.planCode) {
    params.push(opts.planCode);
    clauses.push(`p.code = $${params.length}`);
  }
  if (opts?.status === "EXPIRING_SOON") {
    clauses.push(
      `s.status IN ('ACTIVE', 'TRIAL', 'PAST_DUE')
       AND s."currentPeriodEnd" > NOW()
       AND s."currentPeriodEnd" <= NOW() + INTERVAL '7 days'`,
    );
  } else if (opts?.status === "EXPIRED_VIEW") {
    clauses.push(
      `(s.status = 'EXPIRED' OR (s."currentPeriodEnd" < NOW() AND s.status IN ('ACTIVE', 'TRIAL', 'PAST_DUE')))`,
    );
  } else if (opts?.status) {
    params.push(opts.status);
    clauses.push(`s.status = $${params.length}::"SubscriptionStatus"`);
  }
  if (opts?.organizationId) {
    params.push(opts.organizationId);
    clauses.push(`s."organizationId" = $${params.length}`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const { rows } = await pool.query<{
    id: string;
    organizationId: string;
    organizationName: string;
    organizationEmail: string | null;
    planId: string;
    planCode: string;
    planName: string;
    status: SubscriptionStatus;
    priceSnapshot: string;
    currencySnapshot: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    trialEndsAt: Date | null;
    startedAt: Date;
  }>(
    `SELECT s.id, s."organizationId", o.name AS "organizationName", o.email AS "organizationEmail",
            s."planId", p.code AS "planCode", p.name AS "planName", s.status,
            s."priceSnapshot"::text, s."currencySnapshot",
            s."currentPeriodStart", s."currentPeriodEnd", s."trialEndsAt", s."startedAt"
     FROM "Subscription" s
     JOIN "Organization" o ON o.id = s."organizationId"
     JOIN "Plan" p ON p.id = s."planId"
     ${where}
     ORDER BY s."currentPeriodEnd" ASC`,
    params,
  );

  return rows.map((r) => {
    const u = mapUrgency(r.status, r.currentPeriodEnd);
    return {
      id: r.id,
      organizationId: r.organizationId,
      organizationName: r.organizationName,
      organizationEmail: r.organizationEmail,
      planId: r.planId,
      planCode: r.planCode as PlanCode,
      planName: r.planName,
      status: r.status,
      priceSnapshot: parseFloat(r.priceSnapshot),
      currencySnapshot: r.currencySnapshot,
      currentPeriodStart: r.currentPeriodStart.toISOString(),
      currentPeriodEnd: r.currentPeriodEnd.toISOString(),
      trialEndsAt: r.trialEndsAt?.toISOString() ?? null,
      startedAt: r.startedAt.toISOString(),
      ...u,
    };
  });
}

export async function fetchAdminSubscription(
  id: string,
): Promise<AdminSubscriptionListItem | null> {
  const { rows } = await pool.query<{
    id: string;
    organizationId: string;
    organizationName: string;
    organizationEmail: string | null;
    planId: string;
    planCode: string;
    planName: string;
    status: SubscriptionStatus;
    priceSnapshot: string;
    currencySnapshot: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    trialEndsAt: Date | null;
    startedAt: Date;
  }>(
    `SELECT s.id, s."organizationId", o.name AS "organizationName", o.email AS "organizationEmail",
            s."planId", p.code AS "planCode", p.name AS "planName", s.status,
            s."priceSnapshot"::text, s."currencySnapshot",
            s."currentPeriodStart", s."currentPeriodEnd", s."trialEndsAt", s."startedAt"
     FROM "Subscription" s
     JOIN "Organization" o ON o.id = s."organizationId"
     JOIN "Plan" p ON p.id = s."planId"
     WHERE s.id = $1`,
    [id],
  );
  const r = rows[0];
  if (!r) return null;
  const u = mapUrgency(r.status, r.currentPeriodEnd);
  return {
    id: r.id,
    organizationId: r.organizationId,
    organizationName: r.organizationName,
    organizationEmail: r.organizationEmail,
    planId: r.planId,
    planCode: r.planCode as PlanCode,
    planName: r.planName,
    status: r.status,
    priceSnapshot: parseFloat(r.priceSnapshot),
    currencySnapshot: r.currencySnapshot,
    currentPeriodStart: r.currentPeriodStart.toISOString(),
    currentPeriodEnd: r.currentPeriodEnd.toISOString(),
    trialEndsAt: r.trialEndsAt?.toISOString() ?? null,
    startedAt: r.startedAt.toISOString(),
    ...u,
  };
}

export async function listSubscriptionHistory(subscriptionId: string, organizationId: string) {
  const { rows } = await pool.query<{
    id: string;
    platformUserName: string | null;
    action: string;
    before: unknown;
    after: unknown;
    createdAt: Date;
  }>(
    `SELECT id, "platformUserName", action, "before", "after", "createdAt"
     FROM "PlatformAuditLog"
     WHERE ("entityId" = $1 OR ("organizationId" = $2 AND "entityType" = 'Subscription'))
     ORDER BY "createdAt" DESC
     LIMIT 50`,
    [subscriptionId, organizationId],
  );
  return rows.map((r) => ({
    id: r.id,
    platformUserName: r.platformUserName,
    action: r.action,
    before: r.before,
    after: r.after,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function changeSubscriptionPlan(
  actor: PlatformSessionUser,
  subscriptionId: string,
  newPlanId: string,
  opts?: { applyAt?: "now" | "next_period" },
): Promise<void> {
  const plan = await getPlanById(newPlanId);
  if (!plan || !plan.active) throw new Error("PLAN_NOT_FOUND");

  const { rows } = await pool.query<{
    organizationId: string;
    planId: string;
    priceSnapshot: string;
    status: SubscriptionStatus;
    currentPeriodEnd: Date;
  }>(
    `SELECT "organizationId", "planId", "priceSnapshot"::text, status, "currentPeriodEnd"
     FROM "Subscription" WHERE id = $1`,
    [subscriptionId],
  );
  const sub = rows[0];
  if (!sub) throw new Error("NOT_FOUND");

  const applyAt = opts?.applyAt ?? "now";
  if (applyAt === "next_period") {
    await pool.query(
      `UPDATE "Subscription" SET "planId" = $2, "priceSnapshot" = $3, "updatedAt" = NOW() WHERE id = $1`,
      [subscriptionId, newPlanId, plan.price],
    );
    await writePlatformAuditLog({
      platformUserId: actor.id,
      platformUserName: actorName(actor),
      organizationId: sub.organizationId,
      entityType: "Subscription",
      entityId: subscriptionId,
      action: "SUBSCRIPTION_PLAN_CHANGE_SCHEDULED",
      before: { planId: sub.planId, priceSnapshot: parseFloat(sub.priceSnapshot) },
      after: {
        planId: newPlanId,
        priceSnapshot: plan.price,
        planCode: plan.code,
        applyAt: sub.currentPeriodEnd.toISOString(),
      },
    });
    return;
  }

  const now = new Date();
  const periodEnd = addMonths(now, 1);

  await pool.query(
    `UPDATE "Subscription" SET
      "planId" = $2,
      "priceSnapshot" = $3,
      status = CASE
        WHEN status = 'TRIAL'::"SubscriptionStatus" THEN 'TRIAL'::"SubscriptionStatus"
        ELSE 'ACTIVE'::"SubscriptionStatus"
      END,
      "currentPeriodStart" = $4,
      "currentPeriodEnd" = $5,
      "updatedAt" = NOW()
     WHERE id = $1`,
    [subscriptionId, newPlanId, plan.price, now, periodEnd],
  );

  await writePlatformAuditLog({
    platformUserId: actor.id,
    platformUserName: actorName(actor),
    organizationId: sub.organizationId,
    entityType: "Subscription",
    entityId: subscriptionId,
    action: "SUBSCRIPTION_CHANGED",
    before: { planId: sub.planId, priceSnapshot: parseFloat(sub.priceSnapshot) },
    after: { planId: newPlanId, priceSnapshot: plan.price, planCode: plan.code },
  });
}

export async function setSubscriptionStatus(
  actor: PlatformSessionUser,
  subscriptionId: string,
  status: SubscriptionStatus,
  action: string,
  reason?: string,
): Promise<void> {
  const { rows } = await pool.query<{ organizationId: string; status: SubscriptionStatus }>(
    `SELECT "organizationId", status FROM "Subscription" WHERE id = $1`,
    [subscriptionId],
  );
  const sub = rows[0];
  if (!sub) throw new Error("NOT_FOUND");

  await pool.query(
    `UPDATE "Subscription" SET status = $2::"SubscriptionStatus", "updatedAt" = NOW(),
      "cancelledAt" = CASE WHEN $2::text = 'CANCELLED' THEN NOW() ELSE "cancelledAt" END
     WHERE id = $1`,
    [subscriptionId, status],
  );

  await writePlatformAuditLog({
    platformUserId: actor.id,
    platformUserName: actorName(actor),
    organizationId: sub.organizationId,
    entityType: "Subscription",
    entityId: subscriptionId,
    action,
    before: { status: sub.status },
    after: { status, reason: reason ?? null },
  });
}

export async function extendSubscriptionPeriod(
  actor: PlatformSessionUser,
  subscriptionId: string,
  months = 1,
): Promise<{ newEnd: string }> {
  const { rows } = await pool.query<{ organizationId: string; currentPeriodEnd: Date }>(
    `SELECT "organizationId", "currentPeriodEnd" FROM "Subscription" WHERE id = $1`,
    [subscriptionId],
  );
  const sub = rows[0];
  if (!sub) throw new Error("NOT_FOUND");

  const base = sub.currentPeriodEnd.getTime() < Date.now() ? new Date() : sub.currentPeriodEnd;
  const newEnd = addMonths(base, months);
  await pool.query(
    `UPDATE "Subscription" SET "currentPeriodEnd" = $2, status = 'ACTIVE', "updatedAt" = NOW() WHERE id = $1`,
    [subscriptionId, newEnd],
  );

  await writePlatformAuditLog({
    platformUserId: actor.id,
    platformUserName: actorName(actor),
    organizationId: sub.organizationId,
    entityType: "Subscription",
    entityId: subscriptionId,
    action: "SUBSCRIPTION_EXTENDED",
    before: { currentPeriodEnd: sub.currentPeriodEnd.toISOString() },
    after: { currentPeriodEnd: newEnd.toISOString(), months },
  });

  return { newEnd: newEnd.toISOString() };
}

export async function grantFreePeriod(
  actor: PlatformSessionUser,
  subscriptionId: string,
  days: number,
  reason: string,
): Promise<{ newEnd: string }> {
  const { rows } = await pool.query<{ organizationId: string; currentPeriodEnd: Date }>(
    `SELECT "organizationId", "currentPeriodEnd" FROM "Subscription" WHERE id = $1`,
    [subscriptionId],
  );
  const sub = rows[0];
  if (!sub) throw new Error("NOT_FOUND");

  const base = sub.currentPeriodEnd.getTime() < Date.now() ? new Date() : sub.currentPeriodEnd;
  const newEnd = new Date(base.getTime() + days * 86400000);
  await pool.query(
    `UPDATE "Subscription" SET "currentPeriodEnd" = $2, status = 'ACTIVE', "updatedAt" = NOW() WHERE id = $1`,
    [subscriptionId, newEnd],
  );

  await writePlatformAuditLog({
    platformUserId: actor.id,
    platformUserName: actorName(actor),
    organizationId: sub.organizationId,
    entityType: "Subscription",
    entityId: subscriptionId,
    action: "SUBSCRIPTION_TRIAL_GRANTED",
    before: { currentPeriodEnd: sub.currentPeriodEnd.toISOString() },
    after: { currentPeriodEnd: newEnd.toISOString(), days, reason },
  });

  return { newEnd: newEnd.toISOString() };
}

export async function createAdminSubscription(
  actor: PlatformSessionUser,
  opts: { organizationId: string; planCode: PlanCode },
): Promise<string> {
  const plan = await getPlanByCode(opts.planCode);
  if (!plan) throw new Error("PLAN_NOT_FOUND");

  const { rows: existing } = await pool.query<{ id: string }>(
    `SELECT id FROM "Subscription" WHERE "organizationId" = $1 ORDER BY "createdAt" DESC LIMIT 1`,
    [opts.organizationId],
  );
  if (existing[0]) {
    await changeSubscriptionPlan(actor, existing[0].id, plan.id, { applyAt: "now" });
    return existing[0].id;
  }

  const id = await startTrialSubscription(opts.organizationId, plan.id);
  await pool.query(
    `UPDATE "Subscription" SET status = 'ACTIVE', "trialEndsAt" = NULL, "updatedAt" = NOW() WHERE id = $1`,
    [id],
  );
  await writePlatformAuditLog({
    platformUserId: actor.id,
    platformUserName: actorName(actor),
    organizationId: opts.organizationId,
    entityType: "Subscription",
    entityId: id,
    action: "SUBSCRIPTION_CREATED",
    after: { planCode: opts.planCode, planId: plan.id },
  });
  return id;
}

export async function startTrialSubscription(
  organizationId: string,
  planId: string,
  client?: PoolClient,
): Promise<string> {
  const plan = await getPlanById(planId);
  if (!plan) throw new Error("PLAN_NOT_FOUND");
  const c = client ?? pool;
  const now = new Date();
  const trialEnds = new Date(now.getTime() + plan.trialDays * 86400000);
  const periodEnd = addMonths(now, 1);
  const id = `sub_${randomBytes(6).toString("hex")}`;

  await c.query(
    `INSERT INTO "Subscription" (
      id, "organizationId", "planId", status, "priceSnapshot", "currencySnapshot",
      "startedAt", "currentPeriodStart", "currentPeriodEnd", "trialEndsAt", "updatedAt"
    ) VALUES ($1,$2,$3,'TRIAL',$4,$5,$6,$6,$7,$8,NOW())`,
    [id, organizationId, planId, plan.price, plan.currency, now, periodEnd, trialEnds],
  );
  return id;
}

export { listPlans };
