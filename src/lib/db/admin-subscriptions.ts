import { randomBytes } from "crypto";
import { Pool, type PoolClient } from "pg";
import { writePlatformAuditLog } from "@/lib/db/platform-audit";
import type { PlatformSessionUser } from "@/lib/auth/types";
import { getPlanById } from "@/lib/subscriptions/plans";
import {
  addMonths,
  getOrganizationSubscription,
} from "@/lib/subscriptions/subscription-service";
import type { SubscriptionStatus } from "@/types/subscription";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function actorName(actor: PlatformSessionUser) {
  return `${actor.firstName} ${actor.lastName}`.trim();
}

export type AdminSubscriptionListItem = {
  id: string;
  organizationId: string;
  organizationName: string;
  planCode: string;
  planName: string;
  status: SubscriptionStatus;
  priceSnapshot: number;
  currencySnapshot: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt: string | null;
};

export async function listAdminSubscriptions(opts?: {
  planCode?: string;
  status?: SubscriptionStatus;
  organizationId?: string;
}): Promise<AdminSubscriptionListItem[]> {
  const params: unknown[] = [];
  const clauses: string[] = [];

  if (opts?.planCode) {
    params.push(opts.planCode);
    clauses.push(`p.code = $${params.length}`);
  }
  if (opts?.status) {
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
    planCode: string;
    planName: string;
    status: SubscriptionStatus;
    priceSnapshot: string;
    currencySnapshot: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    trialEndsAt: Date | null;
  }>(
    `SELECT s.id, s."organizationId", o.name AS "organizationName",
            p.code AS "planCode", p.name AS "planName", s.status,
            s."priceSnapshot"::text, s."currencySnapshot",
            s."currentPeriodStart", s."currentPeriodEnd", s."trialEndsAt"
     FROM "Subscription" s
     JOIN "Organization" o ON o.id = s."organizationId"
     JOIN "Plan" p ON p.id = s."planId"
     ${where}
     ORDER BY s."createdAt" DESC`,
    params,
  );

  return rows.map((r) => ({
    id: r.id,
    organizationId: r.organizationId,
    organizationName: r.organizationName,
    planCode: r.planCode,
    planName: r.planName,
    status: r.status,
    priceSnapshot: parseFloat(r.priceSnapshot),
    currencySnapshot: r.currencySnapshot,
    currentPeriodStart: r.currentPeriodStart.toISOString(),
    currentPeriodEnd: r.currentPeriodEnd.toISOString(),
    trialEndsAt: r.trialEndsAt?.toISOString() ?? null,
  }));
}

export async function changeSubscriptionPlan(
  actor: PlatformSessionUser,
  subscriptionId: string,
  newPlanId: string,
): Promise<void> {
  const plan = await getPlanById(newPlanId);
  if (!plan || !plan.active) throw new Error("PLAN_NOT_FOUND");

  const { rows } = await pool.query<{
    organizationId: string;
    planId: string;
    priceSnapshot: string;
    status: SubscriptionStatus;
  }>(
    `SELECT "organizationId", "planId", "priceSnapshot"::text, status
     FROM "Subscription" WHERE id = $1`,
    [subscriptionId],
  );
  const sub = rows[0];
  if (!sub) throw new Error("NOT_FOUND");

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
    after: { status },
  });
}

export async function extendSubscriptionPeriod(
  actor: PlatformSessionUser,
  subscriptionId: string,
  months = 1,
): Promise<void> {
  const { rows } = await pool.query<{ organizationId: string; currentPeriodEnd: Date }>(
    `SELECT "organizationId", "currentPeriodEnd" FROM "Subscription" WHERE id = $1`,
    [subscriptionId],
  );
  const sub = rows[0];
  if (!sub) throw new Error("NOT_FOUND");

  const newEnd = addMonths(sub.currentPeriodEnd, months);
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
    after: { currentPeriodEnd: newEnd.toISOString() },
  });
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
