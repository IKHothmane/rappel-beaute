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

export type PlatformDashboardAlert = {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  label: string;
  count: number;
  href: string;
};

export type PlatformDashboardHome = {
  stats: Awaited<ReturnType<typeof getPlatformDashboardStats>> & {
    mrrGrowthPercent: number;
    suspendedOrgs: number;
  };
  alerts: PlatformDashboardAlert[];
  mrrSeries: { label: string; value: number }[];
  orgsSeries: {
    label: string;
    newOrgs: number;
    active: number;
    suspended: number;
  }[];
  orgStatus: {
    active: number;
    suspended: number;
    archived: number;
  };
  subscriptions: {
    active: number;
    pending: number;
    expired: number;
    suspended: number;
    expiringSoon: number;
    mrr: number;
    arr: number;
  };
  users: {
    total: number;
    active: number;
    disabled: number;
    thisMonth: number;
    pending: number;
  };
  support: {
    open: number;
    inProgress: number;
    waitingCustomer: number;
    resolved: number;
    urgentOpen: number;
    highOpen: number;
    avgFirstResponseMinutes: number | null;
    avgSatisfaction: number | null;
    byCategory: { category: string; count: number }[];
  };
  topOrgs: {
    id: string;
    name: string;
    mrr: number;
    appointments: number;
    customers: number;
    lastActivityAt: string | null;
  }[];
  health: {
    api: "ok" | "degraded";
    database: "ok" | "down";
    auth: "ok" | "degraded";
    email: "ok" | "degraded";
    whatsapp: "ok" | "manual" | "down";
    storage: "ok" | "degraded";
    checkedAt: string;
  };
  payments: {
    failed: number;
    pastDue: number;
  };
};

export async function getPlatformDashboardHome(): Promise<PlatformDashboardHome> {
  const { getAdminSubscriptionsKpis } = await import("@/lib/db/admin-subscriptions");
  const { getPlatformUsersKpis } = await import("@/lib/db/admin-users");
  const {
    adminSupportKpis,
    adminSupportAttention,
    adminSupportAnalytics,
  } = await import("@/lib/db/support-tickets");
  const { getIntegrationsStatus } = await import("@/lib/db/platform-settings");

  const started = Date.now();
  let dbOk = true;
  try {
    await pool.query("SELECT 1");
  } catch {
    dbOk = false;
  }

  const [stats, mrrSeries, subKpis, userKpis, supportKpis, attention, supportAnalytics, orgStatusRows, orgsSeriesRows, topOrgsRows, subStatusRows, pastDueRows] =
    await Promise.all([
      getPlatformDashboardStats(),
      getMrrSeries(12),
      getAdminSubscriptionsKpis().catch(() => ({
        total: 0,
        active: 0,
        expiringSoon: 0,
        expired: 0,
        mrr: 0,
      })),
      getPlatformUsersKpis().catch(() => ({
        total: 0,
        active: 0,
        disabled: 0,
        thisMonth: 0,
      })),
      adminSupportKpis().catch(() => null),
      adminSupportAttention().catch(() => null),
      adminSupportAnalytics().catch(() => null),
      pool.query<{ status: string; n: string }>(
        `SELECT status::text, COUNT(*)::text AS n FROM "Organization" GROUP BY status`,
      ),
      pool.query<{ ym: string; n: string }>(
        `SELECT to_char(date_trunc('month', "createdAt"), 'YYYY-MM') AS ym,
                COUNT(*)::text AS n
         FROM "Organization"
         WHERE "createdAt" >= date_trunc('month', NOW()) - INTERVAL '5 months'
         GROUP BY 1
         ORDER BY 1`,
      ),
      pool.query<{
        id: string;
        name: string;
        mrr: string;
        appointments: string;
        customers: string;
        lastActivity: Date | null;
      }>(
        `SELECT o.id, o.name,
           COALESCE((
             SELECT s."priceSnapshot" FROM "Subscription" s
             WHERE s."organizationId" = o.id
             ORDER BY s."createdAt" DESC LIMIT 1
           ), 0)::text AS mrr,
           (SELECT COUNT(*)::text FROM "Appointment" a
             WHERE a."organizationId" = o.id
               AND a."startAt" >= date_trunc('month', NOW())
               AND a.status != 'CANCELLED') AS appointments,
           (SELECT COUNT(*)::text FROM "Customer" c
             WHERE c."organizationId" = o.id AND c."deletedAt" IS NULL) AS customers,
           (SELECT MAX(a."createdAt") FROM "PlatformAuditLog" a
             WHERE a."organizationId" = o.id) AS "lastActivity"
         FROM "Organization" o
         WHERE o.status = 'ACTIVE'
         ORDER BY COALESCE((
           SELECT s."priceSnapshot" FROM "Subscription" s
           WHERE s."organizationId" = o.id
           ORDER BY s."createdAt" DESC LIMIT 1
         ), 0) DESC, o."createdAt" DESC
         LIMIT 5`,
      ),
      pool.query<{ status: string; n: string }>(
        `SELECT status::text, COUNT(*)::text AS n
         FROM "Subscription" s
         WHERE ${LATEST_SUB_FILTER}
         GROUP BY status`,
      ),
      pool.query<{ n: string }>(
        `SELECT COUNT(*)::text AS n FROM "Subscription" s
         WHERE ${LATEST_SUB_FILTER} AND s.status = 'PAST_DUE'`,
      ),
    ]);

  const orgMap = Object.fromEntries(
    orgStatusRows.rows.map((r) => [r.status, parseInt(r.n, 10)]),
  );
  const subMap = Object.fromEntries(
    subStatusRows.rows.map((r) => [r.status, parseInt(r.n, 10)]),
  );

  const prev = mrrSeries.length >= 2 ? mrrSeries[mrrSeries.length - 2].value : 0;
  const mrrGrowth =
    prev > 0 ? Math.round(((stats.mrr - prev) / prev) * 1000) / 10 : stats.mrr > 0 ? 100 : 0;

  const suspendedOrgs = orgMap.SUSPENDED ?? 0;
  const pastDue = parseInt(pastDueRows.rows[0]?.n ?? "0", 10);

  const alerts: PlatformDashboardAlert[] = [];
  if ((attention?.urgentOpen ?? 0) > 0) {
    alerts.push({
      id: "urgent-tickets",
      severity: "critical",
      label: "tickets urgents",
      count: attention!.urgentOpen,
      href: "/support/tickets/?attention=urgent",
    });
  }
  if (pastDue > 0) {
    alerts.push({
      id: "failed-payments",
      severity: "high",
      label: "paiements / abonnements en retard",
      count: pastDue,
      href: "/subscriptions/?status=PAST_DUE",
    });
  }
  if (subKpis.expiringSoon > 0) {
    alerts.push({
      id: "expiring",
      severity: "medium",
      label: "abonnements arrivent à échéance",
      count: subKpis.expiringSoon,
      href: "/subscriptions/",
    });
  }
  if (suspendedOrgs > 0) {
    alerts.push({
      id: "suspended",
      severity: "low",
      label: "organisations suspendues",
      count: suspendedOrgs,
      href: "/organizations/?status=SUSPENDED",
    });
  }

  const monthLabels: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthLabels.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("fr-FR", { month: "short" }),
    });
  }

  const orgsSeries = monthLabels.map((m) => {
    const row = orgsSeriesRows.rows.find((r) => r.ym === m.key);
    return {
      label: m.label,
      newOrgs: parseInt(row?.n ?? "0", 10),
      active: orgMap.ACTIVE ?? stats.orgsActive,
      suspended: suspendedOrgs,
    };
  });

  const integrations = getIntegrationsStatus();

  return {
    stats: {
      ...stats,
      mrrGrowthPercent: mrrGrowth,
      suspendedOrgs,
    },
    alerts,
    mrrSeries,
    orgsSeries,
    orgStatus: {
      active: orgMap.ACTIVE ?? 0,
      suspended: suspendedOrgs,
      archived: orgMap.ARCHIVED ?? 0,
    },
    subscriptions: {
      active: subMap.ACTIVE ?? 0,
      pending: (subMap.TRIAL ?? 0) + (subMap.PAST_DUE ?? 0),
      expired: subMap.EXPIRED ?? subKpis.expired,
      suspended: (subMap.PAUSED ?? 0) + (subMap.CANCELLED ?? 0),
      expiringSoon: subKpis.expiringSoon,
      mrr: stats.mrr,
      arr: stats.arr,
    },
    users: {
      total: userKpis.total,
      active: userKpis.active,
      disabled: userKpis.disabled,
      thisMonth: userKpis.thisMonth,
      pending: 0,
    },
    support: {
      open: supportKpis?.open ?? 0,
      inProgress: supportKpis?.inProgress ?? 0,
      waitingCustomer: supportKpis?.waitingCustomer ?? 0,
      resolved: supportKpis?.resolved ?? 0,
      urgentOpen: attention?.urgentOpen ?? 0,
      highOpen: attention?.highOpen ?? 0,
      avgFirstResponseMinutes: supportKpis?.avgFirstResponseMinutes ?? null,
      avgSatisfaction: supportKpis?.avgSatisfaction ?? null,
      byCategory: (supportAnalytics?.byCategory ?? []).slice(0, 6).map((c) => ({
        category: c.category,
        count: c.count,
      })),
    },
    topOrgs: topOrgsRows.rows.map((r) => ({
      id: r.id,
      name: r.name,
      mrr: parseFloat(r.mrr),
      appointments: parseInt(r.appointments, 10),
      customers: parseInt(r.customers, 10),
      lastActivityAt: r.lastActivity?.toISOString() ?? null,
    })),
    health: {
      api: Date.now() - started < 5000 ? "ok" : "degraded",
      database: dbOk ? "ok" : "down",
      auth: "ok",
      email: integrations.email.resendConfigured ? "ok" : "degraded",
      whatsapp: integrations.whatsapp.autoSendEnabled
        ? "ok"
        : integrations.whatsapp.webhookConfigured
          ? "manual"
          : "manual",
      storage: "ok",
      checkedAt: new Date().toISOString(),
    },
    payments: {
      failed: pastDue,
      pastDue,
    },
  };
}

