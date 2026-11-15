import { randomBytes } from "crypto";
import { type PoolClient } from "pg";
import { writePlatformAuditLog } from "@/lib/db/platform-audit";
import type { PlatformSessionUser } from "@/lib/auth/types";
import { getPlanByCode, getPlanById, listPlans } from "@/lib/subscriptions/plans";
import { addMonths } from "@/lib/subscriptions/subscription-service";
import type { PlanCode, PlanDto, SubscriptionStatus } from "@/types/subscription";
import { pool } from "@/lib/db/pool";
import { withTransaction } from "@/lib/db/transaction";
import {
  assertPeriodEndNotBeforeStart,
  assertReasonablePeriodEnd,
  writePaymentChangedAudit,
} from "@/lib/db/subscription-period-payment";

function actorName(actor: PlatformSessionUser) {
  return `${actor.firstName} ${actor.lastName}`.trim();
}

type AdminSubscriptionListItem = {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationEmail: string | null;
  organizationCity: string | null;
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

type AdminSubscriptionsKpis = {
  total: number;
  active: number;
  trial: number;
  pastDue: number;
  suspended: number;
  expiringSoon: number;
  expired: number;
  mrr: number;
};

export async function getAdminSubscriptionsKpis(): Promise<AdminSubscriptionsKpis> {
  const { rows } = await pool.query<{
    total: string;
    active: string;
    trial: string;
    pastDue: string;
    suspended: string;
    soon: string;
    expired: string;
    mrr: string;
  }>(
    `SELECT
      COUNT(*)::text AS total,
      COUNT(*) FILTER (WHERE s.status = 'ACTIVE')::text AS active,
      COUNT(*) FILTER (WHERE s.status = 'TRIAL')::text AS trial,
      COUNT(*) FILTER (WHERE s.status = 'PAST_DUE')::text AS pastDue,
      COUNT(*) FILTER (WHERE s.status = 'PAUSED')::text AS suspended,
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
    trial: parseInt(rows[0]?.trial ?? "0", 10),
    pastDue: parseInt(rows[0]?.pastDue ?? "0", 10),
    suspended: parseInt(rows[0]?.suspended ?? "0", 10),
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
    return {
      daysUntilExpiry: days,
      urgency: "expired",
      paymentLabel: status === "PAST_DUE" ? "Impayé" : "Échu",
    };
  }
  if (status === "PAUSED" || status === "CANCELLED") {
    return {
      daysUntilExpiry: days,
      urgency: days <= 7 ? "soon" : "ok",
      paymentLabel: status === "PAUSED" ? "Suspendu" : "Annulé",
    };
  }
  if (status === "TRIAL") {
    return {
      daysUntilExpiry: days,
      urgency: days <= 7 ? "soon" : "ok",
      paymentLabel: days <= 7 ? `Essai (J-${Math.max(0, days)})` : "En essai",
    };
  }
  if (status === "PAST_DUE") {
    return {
      daysUntilExpiry: days,
      urgency: "soon",
      paymentLabel: "Impayé",
    };
  }
  if (days <= 7) {
    return { daysUntilExpiry: days, urgency: "soon", paymentLabel: "Renouvellement" };
  }
  return {
    daysUntilExpiry: days,
    urgency: "ok",
    paymentLabel: "Payé",
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
    organizationCity: string | null;
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
            o.city AS "organizationCity",
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
      organizationCity: r.organizationCity,
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
    organizationCity: string | null;
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
            o.city AS "organizationCity",
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
    organizationCity: r.organizationCity,
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
     WHERE ("entityId" = $1 OR (
              ("organizationId" = $2 OR ("organizationId" IS NULL AND "organizationIdSnapshot" = $2))
              AND "entityType" = 'Subscription'
            ))
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

type LockedSubscription = {
  organizationId: string;
  planId: string;
  priceSnapshot: string;
  currencySnapshot: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEndsAt: Date | null;
  paid: boolean;
  paidAt: Date | null;
};

/** Reads and locks the subscription row for the rest of the transaction. */
async function lockSubscription(client: PoolClient, subscriptionId: string): Promise<LockedSubscription> {
  const { rows } = await client.query<LockedSubscription>(
    `SELECT "organizationId", "planId", "priceSnapshot"::text, "currencySnapshot", status,
            "currentPeriodStart", "currentPeriodEnd", "trialEndsAt", paid, "paidAt"
     FROM "Subscription" WHERE id = $1 FOR UPDATE`,
    [subscriptionId],
  );
  if (!rows[0]) throw new Error("NOT_FOUND");
  return rows[0];
}

function auditBase(actor: PlatformSessionUser, client: PoolClient, organizationId: string, subscriptionId: string) {
  return {
    client,
    platformUserId: actor.id,
    platformUserName: actorName(actor),
    organizationId,
    entityType: "Subscription",
    entityId: subscriptionId,
  };
}

function assertPositiveInt(value: unknown, max: number): asserts value is number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > max) {
    throw new Error("INVALID_INPUT");
  }
}

async function changePlanInTransaction(
  client: PoolClient,
  actor: PlatformSessionUser,
  subscriptionId: string,
  plan: PlanDto,
  applyAt: "now" | "next_period",
): Promise<void> {
  const sub = await lockSubscription(client, subscriptionId);
  const audit = auditBase(actor, client, sub.organizationId, subscriptionId);

  if (applyAt === "next_period") {
    await client.query(
      `UPDATE "Subscription" SET "planId" = $2, "priceSnapshot" = $3, "updatedAt" = NOW() WHERE id = $1`,
      [subscriptionId, plan.id, plan.price],
    );
    await writePlatformAuditLog({
      ...audit,
      action: "SUBSCRIPTION_PLAN_CHANGE_SCHEDULED",
      before: { planId: sub.planId, priceSnapshot: parseFloat(sub.priceSnapshot) },
      after: {
        planId: plan.id,
        priceSnapshot: plan.price,
        planCode: plan.code,
        applyAt: sub.currentPeriodEnd.toISOString(),
      },
    });
    return;
  }

  const now = new Date();
  const periodEnd = addMonths(now, 1);
  await client.query(
    `UPDATE "Subscription" SET
      "planId" = $2,
      "priceSnapshot" = $3,
      status = CASE
        WHEN status = 'TRIAL'::"SubscriptionStatus" THEN 'TRIAL'::"SubscriptionStatus"
        ELSE 'ACTIVE'::"SubscriptionStatus"
      END,
      "cancelledAt" = CASE WHEN status = 'TRIAL'::"SubscriptionStatus" THEN "cancelledAt" ELSE NULL END,
      "currentPeriodStart" = $4,
      "currentPeriodEnd" = $5,
      "updatedAt" = NOW()
     WHERE id = $1`,
    [subscriptionId, plan.id, plan.price, now, periodEnd],
  );
  await writePlatformAuditLog({
    ...audit,
    action: "SUBSCRIPTION_CHANGED",
    before: { planId: sub.planId, priceSnapshot: parseFloat(sub.priceSnapshot) },
    after: { planId: plan.id, priceSnapshot: plan.price, planCode: plan.code },
  });
}

export async function changeSubscriptionPlan(
  actor: PlatformSessionUser,
  subscriptionId: string,
  newPlanId: string,
  opts?: { applyAt?: "now" | "next_period" },
): Promise<void> {
  const plan = await getPlanById(newPlanId);
  if (!plan || !plan.active) throw new Error("PLAN_NOT_FOUND");
  const applyAt = opts?.applyAt ?? "now";
  if (applyAt !== "now" && applyAt !== "next_period") throw new Error("INVALID_INPUT");
  await withTransaction((client) => changePlanInTransaction(client, actor, subscriptionId, plan, applyAt));
}

export const SUBSCRIPTION_STATUSES: readonly SubscriptionStatus[] = [
  "TRIAL", "ACTIVE", "PAST_DUE", "PAUSED", "CANCELLED", "EXPIRED",
];

export async function setSubscriptionStatus(
  actor: PlatformSessionUser,
  subscriptionId: string,
  status: SubscriptionStatus,
  action: string,
  reason?: string,
): Promise<void> {
  if (!SUBSCRIPTION_STATUSES.includes(status)) throw new Error("INVALID_INPUT");
  await withTransaction(async (client) => {
    const sub = await lockSubscription(client, subscriptionId);
    await client.query(
      `UPDATE "Subscription" SET status = $2::"SubscriptionStatus", "updatedAt" = NOW(),
        "cancelledAt" = CASE
          WHEN $2::text = 'CANCELLED' THEN COALESCE("cancelledAt", NOW())
          WHEN $2::text IN ('ACTIVE', 'TRIAL') THEN NULL
          ELSE "cancelledAt" END
       WHERE id = $1`,
      [subscriptionId, status],
    );
    await writePlatformAuditLog({
      ...auditBase(actor, client, sub.organizationId, subscriptionId),
      action,
      before: { status: sub.status },
      after: { status, reason: reason ?? null },
    });
  });
}

export async function setSubscriptionPaid(
  actor: PlatformSessionUser,
  subscriptionId: string,
  paid: boolean,
): Promise<void> {
  await withTransaction(async (client) => {
    const sub = await lockSubscription(client, subscriptionId);
    // Idempotent: repeating the same value neither rewrites paidAt nor adds a payment event.
    if (Boolean(sub.paid) === paid) return;
    await client.query(
      `UPDATE "Subscription" SET paid = $2, "paidAt" = CASE WHEN $2::boolean THEN NOW() ELSE NULL END,
        "updatedAt" = NOW() WHERE id = $1`,
      [subscriptionId, paid],
    );
    await writePaymentChangedAudit(
      client,
      { platformUserId: actor.id, platformUserName: actorName(actor), organizationId: sub.organizationId, entityId: subscriptionId },
      { paid: sub.paid, paidAt: sub.paidAt },
      {
        paid,
        priceSnapshot: parseFloat(sub.priceSnapshot),
        currency: sub.currencySnapshot,
        periodStart: sub.currentPeriodStart.toISOString(),
        periodEnd: sub.currentPeriodEnd.toISOString(),
      },
    );
  });
}

export async function extendSubscriptionPeriod(
  actor: PlatformSessionUser,
  subscriptionId: string,
  months = 1,
): Promise<{ newEnd: string }> {
  assertPositiveInt(months, 36);
  return withTransaction(async (client) => {
    const sub = await lockSubscription(client, subscriptionId);
    const base = sub.currentPeriodEnd.getTime() < Date.now() ? new Date() : sub.currentPeriodEnd;
    const newEnd = addMonths(base, months);
    await client.query(
      `UPDATE "Subscription" SET "currentPeriodEnd" = $2, status = 'ACTIVE', "cancelledAt" = NULL,
        "updatedAt" = NOW() WHERE id = $1`,
      [subscriptionId, newEnd],
    );
    await writePlatformAuditLog({
      ...auditBase(actor, client, sub.organizationId, subscriptionId),
      action: "SUBSCRIPTION_EXTENDED",
      before: { currentPeriodEnd: sub.currentPeriodEnd.toISOString(), status: sub.status },
      after: { currentPeriodEnd: newEnd.toISOString(), months, status: "ACTIVE" },
    });
    return { newEnd: newEnd.toISOString() };
  });
}

export async function grantFreePeriod(
  actor: PlatformSessionUser,
  subscriptionId: string,
  days: number,
  reason: string,
): Promise<{ newEnd: string }> {
  assertPositiveInt(days, 3650);
  return withTransaction(async (client) => {
    const sub = await lockSubscription(client, subscriptionId);
    const base = sub.currentPeriodEnd.getTime() < Date.now() ? new Date() : sub.currentPeriodEnd;
    const newEnd = new Date(base.getTime() + days * 86400000);
    await client.query(
      `UPDATE "Subscription" SET "currentPeriodEnd" = $2, status = 'ACTIVE', "cancelledAt" = NULL,
        "updatedAt" = NOW() WHERE id = $1`,
      [subscriptionId, newEnd],
    );
    await writePlatformAuditLog({
      ...auditBase(actor, client, sub.organizationId, subscriptionId),
      action: "SUBSCRIPTION_TRIAL_GRANTED",
      before: { currentPeriodEnd: sub.currentPeriodEnd.toISOString(), status: sub.status },
      after: { currentPeriodEnd: newEnd.toISOString(), days, reason, status: "ACTIVE" },
    });
    return { newEnd: newEnd.toISOString() };
  });
}

export async function grantDemoTrial(
  actor: PlatformSessionUser,
  subscriptionId: string,
  days = 7,
): Promise<{ newEnd: string }> {
  assertPositiveInt(days, 365);
  return withTransaction(async (client) => {
    const sub = await lockSubscription(client, subscriptionId);
    const now = new Date();
    const newEnd = new Date(now.getTime() + days * 86400000);

    await client.query(
      `UPDATE "Subscription" SET
        status = 'TRIAL',
        "trialEndsAt" = $2,
        "currentPeriodStart" = $3,
        "currentPeriodEnd" = $2,
        "cancelledAt" = NULL,
        "updatedAt" = NOW()
       WHERE id = $1`,
      [subscriptionId, newEnd, now],
    );
    await client.query(
      `UPDATE "Organization" SET status = 'ACTIVE', "updatedAt" = NOW()
       WHERE id = $1 AND status != 'ARCHIVED'`,
      [sub.organizationId],
    );
    await writePlatformAuditLog({
      ...auditBase(actor, client, sub.organizationId, subscriptionId),
      action: "SUBSCRIPTION_TRIAL_GRANTED",
      before: {
        status: sub.status,
        currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
        trialEndsAt: sub.trialEndsAt?.toISOString() ?? null,
      },
      after: {
        status: "TRIAL",
        currentPeriodEnd: newEnd.toISOString(),
        trialEndsAt: newEnd.toISOString(),
        days,
        mode: "demo",
      },
    });
    return { newEnd: newEnd.toISOString() };
  });
}

export async function setSubscriptionPrice(
  actor: PlatformSessionUser,
  subscriptionId: string,
  price: number,
): Promise<{ price: number }> {
  if (!Number.isFinite(price) || price < 0 || price > 1_000_000) {
    throw new Error("INVALID_PRICE");
  }
  const next = Math.round(price * 100) / 100;
  return withTransaction(async (client) => {
    const sub = await lockSubscription(client, subscriptionId);
    await client.query(
      `UPDATE "Subscription" SET "priceSnapshot" = $2, "updatedAt" = NOW() WHERE id = $1`,
      [subscriptionId, next],
    );
    await writePlatformAuditLog({
      ...auditBase(actor, client, sub.organizationId, subscriptionId),
      action: "SUBSCRIPTION_PRICE_CHANGED",
      before: { priceSnapshot: parseFloat(sub.priceSnapshot) },
      after: { priceSnapshot: next },
    });
    return { price: next };
  });
}

export async function setSubscriptionPeriodEnd(
  actor: PlatformSessionUser,
  subscriptionId: string,
  periodEnd: Date,
): Promise<{ newEnd: string }> {
  if (!(periodEnd instanceof Date) || Number.isNaN(periodEnd.getTime())) throw new Error("INVALID_DATE");
  return withTransaction(async (client) => {
    const sub = await lockSubscription(client, subscriptionId);
    const changed = periodEnd.getTime() !== sub.currentPeriodEnd.getTime();
    if (changed) {
      assertReasonablePeriodEnd(periodEnd);
      // CHECK en base : fin >= début. L'erreur est métier (400), pas une violation 23514 (500).
      assertPeriodEndNotBeforeStart(sub.currentPeriodStart, periodEnd);
    }
    const reactivated = changed && (sub.status === "CANCELLED" || sub.status === "EXPIRED");
    await client.query(
      `UPDATE "Subscription" SET
        "currentPeriodEnd" = $2,
        status = CASE WHEN $3::boolean THEN 'ACTIVE'::"SubscriptionStatus" ELSE status END,
        "cancelledAt" = CASE WHEN $3::boolean THEN NULL ELSE "cancelledAt" END,
        "updatedAt" = NOW()
       WHERE id = $1`,
      [subscriptionId, periodEnd, reactivated],
    );
    await writePlatformAuditLog({
      ...auditBase(actor, client, sub.organizationId, subscriptionId),
      action: "SUBSCRIPTION_EXTENDED",
      before: { currentPeriodEnd: sub.currentPeriodEnd.toISOString(), status: sub.status },
      after: { currentPeriodEnd: periodEnd.toISOString(), status: reactivated ? "ACTIVE" : sub.status },
    });
    return { newEnd: periodEnd.toISOString() };
  });
}

export async function createAdminSubscription(
  actor: PlatformSessionUser,
  opts: { organizationId: string; planCode: PlanCode },
): Promise<string> {
  const plan = await getPlanByCode(opts.planCode);
  if (!plan || !plan.active) throw new Error("PLAN_NOT_FOUND");

  return withTransaction(async (client) => {
    // The institute row is the mutex: two concurrent creations queue here, and the
    // second one then finds the first subscription and only changes its plan.
    const { rows: org } = await client.query<{ id: string }>(
      `SELECT id FROM "Organization" WHERE id = $1 FOR UPDATE`,
      [opts.organizationId],
    );
    if (!org[0]) throw new Error("ORGANIZATION_NOT_FOUND");

    const { rows: existing } = await client.query<{ id: string }>(
      `SELECT id FROM "Subscription" WHERE "organizationId" = $1 ORDER BY "createdAt" DESC LIMIT 1`,
      [opts.organizationId],
    );
    if (existing[0]) {
      await changePlanInTransaction(client, actor, existing[0].id, plan, "now");
      return existing[0].id;
    }

    const now = new Date();
    const id = `sub_${randomBytes(6).toString("hex")}`;
    await client.query(
      `INSERT INTO "Subscription" (
        id, "organizationId", "planId", status, "priceSnapshot", "currencySnapshot",
        "startedAt", "currentPeriodStart", "currentPeriodEnd", "trialEndsAt", "updatedAt"
      ) VALUES ($1,$2,$3,'ACTIVE',$4,$5,$6,$6,$7,NULL,NOW())`,
      [id, opts.organizationId, plan.id, plan.price, plan.currency, now, addMonths(now, 1)],
    );
    await writePlatformAuditLog({
      ...auditBase(actor, client, opts.organizationId, id),
      action: "SUBSCRIPTION_CREATED",
      after: { planCode: opts.planCode, planId: plan.id },
    });
    return id;
  });
}

export { listPlans };
