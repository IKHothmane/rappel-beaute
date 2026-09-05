/**
 * Métriques plateforme Super Admin — dérivées de PostgreSQL (Subscription, Organization, …).
 * Pas de paiements SaaS séparés : le MRR vient des abonnements actifs.
 */
import { Pool } from "pg";
import type { PlanCode } from "@/types/subscription";
import type { PlatformAnalytics, PlatformBillingSnapshot } from "@/types/platform";
import { getPlatformDashboardStats } from "@/lib/db/admin-organizations";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/** Dernière subscription par organisation (même règle que le dashboard) */
const LATEST_SUB_FILTER = `s.id = (
  SELECT s2.id FROM "Subscription" s2
  WHERE s2."organizationId" = s."organizationId"
  ORDER BY s2."createdAt" DESC LIMIT 1
)`;

export async function getPlanShare(): Promise<Record<PlanCode, number>> {
  const { rows } = await pool.query<{ plan: PlanCode; cnt: string }>(
    `SELECT p.code AS plan, COUNT(*)::text AS cnt
     FROM "Subscription" s
     JOIN "Plan" p ON p.id = s."planId"
     WHERE ${LATEST_SUB_FILTER}
       AND s.status IN ('ACTIVE', 'TRIAL', 'PAST_DUE')
     GROUP BY p.code`,
  );
  const total = rows.reduce((a, r) => a + parseInt(r.cnt, 10), 0);
  const share: Record<PlanCode, number> = { STARTER: 0, INSTITUT: 0, PREMIUM: 0 };
  if (total === 0) return share;
  for (const r of rows) {
    if (r.plan in share) {
      share[r.plan] = Math.round((parseInt(r.cnt, 10) / total) * 1000) / 10;
    }
  }
  return share;
}

/** MRR estimé fin de mois pour les N derniers mois */
export async function getMrrSeries(months = 6): Promise<{ label: string; value: number }[]> {
  const series: { label: string; value: number }[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    const { rows } = await pool.query<{ mrr: string }>(
      `SELECT COALESCE(SUM(s."priceSnapshot"), 0)::text AS mrr
       FROM "Subscription" s
       WHERE ${LATEST_SUB_FILTER}
         AND s."startedAt" <= $1
         AND (s."cancelledAt" IS NULL OR s."cancelledAt" > $2)`,
      [end, d],
    );
    series.push({
      label: d.toLocaleDateString("fr-FR", { month: "short" }),
      value: Math.round(parseFloat(rows[0]?.mrr ?? "0") * 100) / 100,
    });
  }
  return series;
}

export async function getPlatformAnalytics(): Promise<PlatformAnalytics> {
  const [stats, planShare, mrrSeries, extra] = await Promise.all([
    getPlatformDashboardStats(),
    getPlanShare(),
    getMrrSeries(6),
    pool.query<{ services: string; customers: string; staff: string }>(
      `SELECT
        (SELECT COUNT(*)::text FROM "Service" WHERE active = true) AS services,
        (SELECT COUNT(*)::text FROM "Customer" WHERE "deletedAt" IS NULL AND status != 'ARCHIVED') AS customers,
        (SELECT COUNT(*)::text FROM "Staff" WHERE "deletedAt" IS NULL) AS staff`,
    ),
  ]);

  const prev = mrrSeries.length >= 2 ? mrrSeries[mrrSeries.length - 2].value : null;
  const mrrGrowth =
    prev != null && prev > 0
      ? Math.round(((stats.mrr - prev) / prev) * 1000) / 10
      : stats.mrr > 0
        ? 100
        : 0;

  const arpu =
    stats.orgsActive > 0 ? Math.round((stats.mrr / stats.orgsActive) * 100) / 100 : 0;

  return {
    ...stats,
    planShare,
    mrrSeries,
    mrrGrowthPercent: mrrGrowth,
    arpu,
    services: parseInt(extra.rows[0]?.services ?? "0", 10),
    customersTotal: parseInt(extra.rows[0]?.customers ?? "0", 10),
    staffTotal: parseInt(extra.rows[0]?.staff ?? "0", 10),
  };
}

export async function getPlatformBilling(): Promise<PlatformBillingSnapshot> {
  const [stats, mrrSeries, planShare, lines] = await Promise.all([
    getPlatformDashboardStats(),
    getMrrSeries(6),
    getPlanShare(),
    pool.query<{
      id: string;
      orgId: string;
      orgName: string;
      amount: string;
      plan: PlanCode;
      periodStart: Date;
      status: string;
    }>(
      `SELECT s.id, o.id AS "orgId", o.name AS "orgName",
              s."priceSnapshot"::text AS amount, p.code AS plan,
              s."currentPeriodStart" AS "periodStart", s.status::text
       FROM "Subscription" s
       JOIN "Organization" o ON o.id = s."organizationId"
       JOIN "Plan" p ON p.id = s."planId"
       WHERE ${LATEST_SUB_FILTER}
       ORDER BY s."currentPeriodStart" DESC
       LIMIT 50`,
    ),
  ]);

  const prev = mrrSeries.length >= 2 ? mrrSeries[mrrSeries.length - 2].value : 0;
  const growth =
    prev > 0 ? Math.round(((stats.mrr - prev) / prev) * 1000) / 10 : stats.mrr > 0 ? 100 : 0;

  return {
    mrr: stats.mrr,
    arr: stats.arr,
    mrrGrowthPercent: growth,
    activeSubs: stats.activeSubs,
    mrrSeries,
    planShare,
    lines: lines.rows.map((r) => ({
      id: r.id,
      organizationId: r.orgId,
      organizationName: r.orgName,
      amount: parseFloat(r.amount),
      plan: r.plan,
      periodStart: r.periodStart.toISOString(),
      status: r.status,
    })),
  };
}
