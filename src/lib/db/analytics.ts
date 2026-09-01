import { Pool } from "pg";
import { pctChange, previousPeriod, resolvePreset } from "@/lib/analytics/period";
import { AT_RISK_DAYS, VIP_MIN_REVENUE, VIP_MIN_VISITS } from "@/types/customer";
import type {
  AnalyticsFilters,
  AnalyticsOverview,
  AppointmentAnalytics,
  CustomerAnalytics,
  InventoryAnalytics,
  KpiWithCompare,
  LoyaltyAnalytics,
  MarketingAnalyticsRow,
  RevenueAnalytics,
  ReviewAnalytics,
  ServiceAnalyticsRow,
  StaffAnalyticsRow,
} from "@/types/analytics";
import { PAYMENT_METHOD_LABEL } from "@/types/analytics";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const WEEKDAY_LABEL = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

type FilterParams = {
  orgId: string;
  start: Date;
  end: Date;
  staffId: string | null;
  serviceId: string | null;
  resourceId: string | null;
};

function baseParams(filters: AnalyticsFilters, orgId: string): FilterParams {
  return {
    orgId,
    start: filters.period.startAt,
    end: filters.period.endAt,
    staffId: filters.staffId,
    serviceId: filters.serviceId,
    resourceId: filters.resourceId,
  };
}

function paymentJoins(p: FilterParams): string {
  let joins = "";
  if (p.staffId || p.serviceId || p.resourceId) {
    joins += ` JOIN "Appointment" a ON a.id = p."appointmentId"`;
  }
  return joins;
}

function paymentConditions(p: FilterParams, pi: number): { sql: string; params: unknown[] } {
  const params: unknown[] = [p.orgId, p.start, p.end];
  let i = pi;
  const conds = [
    `p."organizationId" = $1`,
    `p.status = 'COMPLETED'::"PaymentStatus"`,
    `p."paidAt" >= $2`,
    `p."paidAt" <= $3`,
  ];
  if (p.staffId) {
    conds.push(`a."staffId" = $${i}`);
    params.push(p.staffId);
    i++;
  }
  if (p.serviceId) {
    conds.push(`a."serviceId" = $${i}`);
    params.push(p.serviceId);
    i++;
  }
  if (p.resourceId) {
    conds.push(`a."resourceId" = $${i}`);
    params.push(p.resourceId);
    i++;
  }
  return { sql: conds.join(" AND "), params };
}

const NET_AMOUNT = `CASE WHEN p.kind = 'REFUND'::"PaymentKind" THEN -p.amount ELSE p.amount END`;

async function sumNetRevenue(p: FilterParams): Promise<number> {
  const joins = paymentJoins(p);
  const { sql, params } = paymentConditions(p, 4);
  const { rows } = await pool.query<{ t: string }>(
    `SELECT COALESCE(SUM(${NET_AMOUNT}), 0)::text AS t
     FROM "Payment" p ${joins}
     WHERE ${sql}`,
    params,
  );
  return Math.round((parseFloat(rows[0]?.t ?? "0") || 0) * 100) / 100;
}

async function sumGrossPayments(p: FilterParams): Promise<number> {
  const joins = paymentJoins(p);
  const { sql, params } = paymentConditions(p, 4);
  const { rows } = await pool.query<{ t: string }>(
    `SELECT COALESCE(SUM(p.amount), 0)::text AS t
     FROM "Payment" p ${joins}
     WHERE ${sql} AND p.kind = 'PAYMENT'::"PaymentKind"`,
    params,
  );
  return Math.round((parseFloat(rows[0]?.t ?? "0") || 0) * 100) / 100;
}

async function sumRefunds(p: FilterParams): Promise<number> {
  const joins = paymentJoins(p);
  const { sql, params } = paymentConditions(p, 4);
  const { rows } = await pool.query<{ t: string }>(
    `SELECT COALESCE(SUM(p.amount), 0)::text AS t
     FROM "Payment" p ${joins}
     WHERE ${sql} AND p.kind = 'REFUND'::"PaymentKind"`,
    params,
  );
  return Math.round((parseFloat(rows[0]?.t ?? "0") || 0) * 100) / 100;
}

async function sumExpenses(p: FilterParams): Promise<number> {
  const { rows } = await pool.query<{ t: string }>(
    `SELECT COALESCE(SUM(amount), 0)::text AS t FROM "Expense"
     WHERE "organizationId" = $1 AND "deletedAt" IS NULL
       AND "expenseDate" >= $2 AND "expenseDate" <= $3`,
    [p.orgId, p.start, p.end],
  );
  return Math.round((parseFloat(rows[0]?.t ?? "0") || 0) * 100) / 100;
}

async function countTickets(p: FilterParams): Promise<number> {
  const joins = paymentJoins(p);
  const { sql, params } = paymentConditions(p, 4);
  const { rows } = await pool.query<{ c: string }>(
    `SELECT COUNT(DISTINCT p."appointmentId")::text AS c
     FROM "Payment" p ${joins}
     WHERE ${sql} AND p."appointmentId" IS NOT NULL
       AND p.kind = 'PAYMENT'::"PaymentKind"`,
    params,
  );
  return parseInt(rows[0]?.c ?? "0", 10);
}

async function countAppointments(p: FilterParams): Promise<number> {
  const conds = [`a."organizationId" = $1`, `a."startAt" >= $2`, `a."startAt" <= $3`];
  const params: unknown[] = [p.orgId, p.start, p.end];
  let i = 4;
  if (p.staffId) {
    conds.push(`a."staffId" = $${i++}`);
    params.push(p.staffId);
  }
  if (p.serviceId) {
    conds.push(`a."serviceId" = $${i++}`);
    params.push(p.serviceId);
  }
  if (p.resourceId) {
    conds.push(`a."resourceId" = $${i++}`);
    params.push(p.resourceId);
  }
  const { rows } = await pool.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM "Appointment" a WHERE ${conds.join(" AND ")}`,
    params,
  );
  return parseInt(rows[0]?.c ?? "0", 10);
}

async function countActiveCustomers(orgId: string): Promise<number> {
  const { rows } = await pool.query<{ c: string }>(
    `SELECT COUNT(DISTINCT c.id)::text AS c
     FROM "Customer" c
     JOIN "Appointment" a ON a."customerId" = c.id AND a.status = 'COMPLETED'
     WHERE c."organizationId" = $1 AND c."deletedAt" IS NULL
       AND a."startAt" >= NOW() - ($2 || ' days')::interval`,
    [orgId, String(AT_RISK_DAYS)],
  );
  return parseInt(rows[0]?.c ?? "0", 10);
}

function kpi(current: number, previous: number | null): KpiWithCompare {
  return {
    value: current,
    previous,
    changePercent: previous != null ? pctChange(current, previous) : null,
  };
}

async function kpiPair(
  fn: (p: FilterParams) => Promise<number>,
  current: FilterParams,
  prev: FilterParams | null,
): Promise<KpiWithCompare> {
  const value = await fn(current);
  const previous = prev ? await fn(prev) : null;
  return kpi(value, previous);
}

export async function getAnalyticsOverview(
  orgId: string,
  filters: AnalyticsFilters,
): Promise<AnalyticsOverview> {
  const current = baseParams(filters, orgId);
  const comparePeriod = filters.compare ? previousPeriod(filters.period) : null;
  const prev = comparePeriod
    ? {
        ...current,
        start: comparePeriod.startAt,
        end: comparePeriod.endAt,
      }
    : null;

  const revenue = await kpiPair(sumNetRevenue, current, prev);
  const expenses = await kpiPair(sumExpenses, current, prev);
  const marginVal = revenue.value - expenses.value;
  const marginPrev =
    revenue.previous != null && expenses.previous != null
      ? revenue.previous - expenses.previous
      : null;

  const tickets = await countTickets(current);
  const ticketsPrev = prev ? await countTickets(prev) : null;
  const avgTicket = tickets > 0 ? Math.round((revenue.value / tickets) * 100) / 100 : 0;
  const avgPrev =
    ticketsPrev && ticketsPrev > 0 && revenue.previous != null
      ? Math.round((revenue.previous / ticketsPrev) * 100) / 100
      : null;

  const appointments = await kpiPair(countAppointments, current, prev);
  const customers = kpi(await countActiveCustomers(orgId), null);

  return {
    period: filters.period,
    comparePeriod,
    revenue,
    expenses,
    margin: kpi(marginVal, marginPrev),
    averageTicket: kpi(avgTicket, avgPrev),
    appointments,
    customers,
    scope: "full",
  };
}

export async function getRevenueAnalytics(
  orgId: string,
  filters: AnalyticsFilters,
): Promise<RevenueAnalytics> {
  const current = baseParams(filters, orgId);
  const comparePeriod = filters.compare ? previousPeriod(filters.period) : null;

  const today = resolvePreset("today");
  const week = resolvePreset("week");
  const month = resolvePreset("month");
  const prevMonth = resolvePreset("prev_month");
  const year = resolvePreset("year");

  const base = { ...current, staffId: filters.staffId, serviceId: filters.serviceId, resourceId: filters.resourceId };

  const [todayNet, weekNet, monthNet, prevMonthNet, yearNet, periodNet, periodGross, refunds] =
    await Promise.all([
      sumNetRevenue({ ...base, start: today.startAt, end: today.endAt }),
      sumNetRevenue({ ...base, start: week.startAt, end: week.endAt }),
      sumNetRevenue({ ...base, start: month.startAt, end: month.endAt }),
      sumNetRevenue({ ...base, start: prevMonth.startAt, end: prevMonth.endAt }),
      sumNetRevenue({ ...base, start: year.startAt, end: year.endAt }),
      sumNetRevenue(current),
      sumGrossPayments(current),
      sumRefunds(current),
    ]);

  const joins = paymentJoins(current);
  const { sql, params } = paymentConditions(current, 4);

  const { rows: dailyRows } = await pool.query<{ d: string; t: string }>(
    `SELECT (p."paidAt" AT TIME ZONE 'Africa/Casablanca')::date::text AS d,
            COALESCE(SUM(${NET_AMOUNT}), 0)::text AS t
     FROM "Payment" p ${joins}
     WHERE ${sql}
     GROUP BY 1 ORDER BY 1`,
    params,
  );

  const daily = dailyRows.map((r) => {
    const d = new Date(r.d + "T12:00:00");
    return {
      date: r.d,
      label: d.toLocaleDateString("fr-FR", { weekday: "short", timeZone: "Africa/Casablanca" }),
      revenue: Math.round(parseFloat(r.t) * 100) / 100,
    };
  });

  const { rows: methodRows } = await pool.query<{ method: string; cnt: string; amt: string }>(
    `SELECT p.method::text AS method,
            COUNT(*)::text AS cnt,
            COALESCE(SUM(CASE WHEN p.kind = 'REFUND' THEN -p.amount ELSE p.amount END), 0)::text AS amt
     FROM "Payment" p ${joins}
     WHERE ${sql}
     GROUP BY p.method ORDER BY amt DESC`,
    params,
  );

  const totalMethod = methodRows.reduce((s, r) => s + Math.abs(parseFloat(r.amt) || 0), 0);
  const byPaymentMethod = methodRows.map((r) => {
    const amount = Math.round(parseFloat(r.amt) * 100) / 100;
    return {
      method: r.method,
      label: PAYMENT_METHOD_LABEL[r.method] ?? r.method,
      count: parseInt(r.cnt, 10),
      amount,
      percent: totalMethod > 0 ? Math.round((Math.abs(amount) / totalMethod) * 1000) / 10 : 0,
    };
  });

  return {
    period: filters.period,
    comparePeriod,
    totals: {
      today: todayNet,
      week: weekNet,
      month: monthNet,
      prevMonth: prevMonthNet,
      year: yearNet,
      periodNet,
      periodGross,
      refunds,
    },
    daily,
    byPaymentMethod,
  };
}

export async function getServiceAnalytics(
  orgId: string,
  filters: AnalyticsFilters,
): Promise<ServiceAnalyticsRow[]> {
  const p = baseParams(filters, orgId);
  const aptConds = [`a."organizationId" = $1`, `a.status = 'COMPLETED'`, `a."startAt" >= $2`, `a."startAt" <= $3`];
  const params: unknown[] = [p.orgId, p.start, p.end];
  let i = 4;
  if (p.staffId) {
    aptConds.push(`a."staffId" = $${i++}`);
    params.push(p.staffId);
  }
  if (p.serviceId) {
    aptConds.push(`a."serviceId" = $${i++}`);
    params.push(p.serviceId);
  }

  const { rows } = await pool.query<{
    serviceId: string;
    serviceName: string;
    appointments: string;
    revenue: string;
    consumableCost: string;
  }>(
    `WITH apt AS (
      SELECT a.id, a."serviceId", s.name AS "serviceName", a.price
      FROM "Appointment" a
      JOIN "Service" s ON s.id = a."serviceId"
      WHERE ${aptConds.join(" AND ")}
    ),
    rev AS (
      SELECT a."serviceId",
             COUNT(DISTINCT a.id)::int AS appointments,
             COALESCE(SUM(
               CASE WHEN p.kind = 'REFUND' THEN -p.amount ELSE p.amount END
             ), 0) AS revenue
      FROM apt a
      LEFT JOIN "Payment" p ON p."appointmentId" = a.id AND p.status = 'COMPLETED'
      GROUP BY a."serviceId"
    ),
    cons AS (
      SELECT a."serviceId",
             COALESCE(SUM(ABS(im.quantity) * pr."purchasePrice"), 0) AS cost
      FROM apt a
      JOIN "InventoryMovement" im ON im."referenceId" = a.id
        AND im."referenceType" = 'APPOINTMENT' AND im.type = 'SERVICE_CONSUMPTION'
      JOIN "Product" pr ON pr.id = im."productId"
      GROUP BY a."serviceId"
    )
    SELECT r."serviceId", a."serviceName",
           r.appointments::text,
           r.revenue::text,
           COALESCE(c.cost, 0)::text AS "consumableCost"
    FROM rev r
    JOIN (SELECT DISTINCT "serviceId", "serviceName" FROM apt) a ON a."serviceId" = r."serviceId"
    LEFT JOIN cons c ON c."serviceId" = r."serviceId"
    ORDER BY r.revenue DESC
    LIMIT 50`,
    params,
  );

  return rows.map((r) => {
    const revenue = Math.round(parseFloat(r.revenue) * 100) / 100;
    const consumableCost = Math.round(parseFloat(r.consumableCost) * 100) / 100;
    const appointments = parseInt(r.appointments, 10);
    return {
      serviceId: r.serviceId,
      serviceName: r.serviceName,
      appointments,
      revenue,
      averageTicket: appointments > 0 ? Math.round((revenue / appointments) * 100) / 100 : 0,
      consumableCost,
      estimatedMargin: Math.round((revenue - consumableCost) * 100) / 100,
    };
  });
}

export async function getStaffAnalytics(
  orgId: string,
  filters: AnalyticsFilters,
): Promise<StaffAnalyticsRow[]> {
  const p = baseParams(filters, orgId);
  const conds = [`a."organizationId" = $1`, `a.status = 'COMPLETED'`, `a."startAt" >= $2`, `a."startAt" <= $3`];
  const params: unknown[] = [p.orgId, p.start, p.end];
  if (p.staffId) {
    conds.push(`a."staffId" = $4`);
    params.push(p.staffId);
  }

  const { rows } = await pool.query<{
    staffId: string;
    staffName: string;
    appointments: string;
    revenue: string;
    commission: string;
  }>(
    `SELECT st.id AS "staffId",
            st."firstName" || ' ' || st."lastName" AS "staffName",
            COUNT(DISTINCT a.id)::text AS appointments,
            COALESCE(SUM(
              CASE WHEN p.kind = 'REFUND' THEN -p.amount ELSE p.amount END
            ), 0)::text AS revenue,
            COALESCE(SUM(cr."commissionAmount"), 0)::text AS commission
     FROM "Appointment" a
     JOIN "Staff" st ON st.id = a."staffId"
     LEFT JOIN "Payment" p ON p."appointmentId" = a.id AND p.status = 'COMPLETED'
     LEFT JOIN "CommissionRecord" cr ON cr."appointmentId" = a.id
     WHERE ${conds.join(" AND ")}
     GROUP BY st.id, st."firstName", st."lastName"
     ORDER BY revenue DESC`,
    params,
  );

  return rows.map((r) => ({
    staffId: r.staffId,
    staffName: r.staffName,
    appointments: parseInt(r.appointments, 10),
    revenue: Math.round(parseFloat(r.revenue) * 100) / 100,
    commission: Math.round(parseFloat(r.commission) * 100) / 100,
  }));
}

export async function getCustomerAnalytics(
  orgId: string,
  filters: AnalyticsFilters,
): Promise<CustomerAnalytics> {
  const p = baseParams(filters, orgId);

  const { rows: kpiRows } = await pool.query<{
    total: string;
    newInPeriod: string;
    active: string;
    inactive: string;
    vip: string;
    atRisk: string;
    reactivated: string;
  }>(
    `WITH stats AS (
      SELECT c.id,
             c."createdAt",
             COUNT(a.id) FILTER (WHERE a.status = 'COMPLETED') AS visits,
             COALESCE(SUM(a.price) FILTER (WHERE a.status = 'COMPLETED'), 0) AS revenue,
             MAX(a."startAt") FILTER (WHERE a.status = 'COMPLETED') AS "lastVisitAt",
             MIN(a."startAt") FILTER (WHERE a.status = 'COMPLETED') AS "firstVisitAt"
      FROM "Customer" c
      LEFT JOIN "Appointment" a ON a."customerId" = c.id
      WHERE c."organizationId" = $1 AND c."deletedAt" IS NULL
      GROUP BY c.id, c."createdAt"
    )
    SELECT
      COUNT(*)::text AS total,
      COUNT(*) FILTER (
        WHERE "firstVisitAt" >= $2 AND "firstVisitAt" <= $3
      )::text AS "newInPeriod",
      COUNT(*) FILTER (
        WHERE "lastVisitAt" >= NOW() - ($4 || ' days')::interval
      )::text AS active,
      COUNT(*) FILTER (
        WHERE "lastVisitAt" IS NULL OR "lastVisitAt" < NOW() - ($4 || ' days')::interval
      )::text AS inactive,
      COUNT(*) FILTER (
        WHERE revenue >= $5 OR visits >= $6
      )::text AS vip,
      COUNT(*) FILTER (
        WHERE "lastVisitAt" IS NOT NULL
          AND "lastVisitAt" < NOW() - ($4 || ' days')::interval
          AND visits > 0
      )::text AS "atRisk",
      COUNT(*) FILTER (
        WHERE EXISTS (
          SELECT 1 FROM "Appointment" ax
          WHERE ax."customerId" = stats.id AND ax.status = 'COMPLETED'
            AND ax."startAt" >= $2 AND ax."startAt" <= $3
            AND EXISTS (
              SELECT 1 FROM "Appointment" prev
              WHERE prev."customerId" = stats.id AND prev.status = 'COMPLETED'
                AND prev."startAt" < ax."startAt" - ($4 || ' days')::interval
            )
        )
      )::text AS reactivated
    FROM stats`,
    [orgId, p.start, p.end, String(AT_RISK_DAYS), VIP_MIN_REVENUE, VIP_MIN_VISITS],
  );

  const k = kpiRows[0];

  const { rows: monthRows } = await pool.query<{ month: string; cnt: string }>(
    `SELECT to_char(a."startAt" AT TIME ZONE 'Africa/Casablanca', 'YYYY-MM') AS month,
            COUNT(DISTINCT a."customerId")::text AS cnt
     FROM "Appointment" a
     JOIN "Customer" c ON c.id = a."customerId"
     WHERE a."organizationId" = $1 AND a.status = 'COMPLETED'
       AND c."deletedAt" IS NULL
       AND a."startAt" >= NOW() - INTERVAL '6 months'
       AND a."startAt" = (
         SELECT MIN(a2."startAt") FROM "Appointment" a2
         WHERE a2."customerId" = a."customerId" AND a2.status = 'COMPLETED'
       )
     GROUP BY 1 ORDER BY 1 DESC LIMIT 6`,
    [orgId],
  );

  const { rows: retRows } = await pool.query<{ returningCount: string; newc: string }>(
    `WITH first_in_period AS (
      SELECT DISTINCT a."customerId"
      FROM "Appointment" a
      WHERE a."organizationId" = $1 AND a.status = 'COMPLETED'
        AND a."startAt" >= $2 AND a."startAt" <= $3
        AND NOT EXISTS (
          SELECT 1 FROM "Appointment" prev
          WHERE prev."customerId" = a."customerId" AND prev.status = 'COMPLETED'
            AND prev."startAt" < $2
        )
    ),
    repeat_visitors AS (
      SELECT DISTINCT a."customerId"
      FROM "Appointment" a
      WHERE a."organizationId" = $1 AND a.status = 'COMPLETED'
        AND a."startAt" >= $2 AND a."startAt" <= $3
        AND EXISTS (
          SELECT 1 FROM "Appointment" prev
          WHERE prev."customerId" = a."customerId" AND prev.status = 'COMPLETED'
            AND prev."startAt" < $2
        )
    )
    SELECT
      (SELECT COUNT(*)::text FROM repeat_visitors) AS "returningCount",
      (SELECT COUNT(*)::text FROM first_in_period) AS newc`,
    [orgId, p.start, p.end],
  );

  const returning = parseInt(retRows[0]?.returningCount ?? "0", 10);
  const newCustomers = parseInt(retRows[0]?.newc ?? "0", 10);
  const retTotal = returning + newCustomers;

  const { rows: topRows } = await pool.query<{
    customerId: string;
    customerName: string;
    revenue: string;
    visits: string;
  }>(
    `SELECT c.id AS "customerId",
            c."firstName" || ' ' || c."lastName" AS "customerName",
            COALESCE(SUM(CASE WHEN p.kind = 'REFUND' THEN -p.amount ELSE p.amount END), 0)::text AS revenue,
            COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'COMPLETED')::text AS visits
     FROM "Customer" c
     LEFT JOIN "Appointment" a ON a."customerId" = c.id
     LEFT JOIN "Payment" p ON p."appointmentId" = a.id AND p.status = 'COMPLETED'
     WHERE c."organizationId" = $1 AND c."deletedAt" IS NULL
     GROUP BY c.id, c."firstName", c."lastName"
     HAVING COALESCE(SUM(CASE WHEN p.kind = 'REFUND' THEN -p.amount ELSE p.amount END), 0) > 0
     ORDER BY revenue DESC LIMIT 10`,
    [orgId],
  );

  return {
    kpis: {
      total: parseInt(k?.total ?? "0", 10),
      newInPeriod: parseInt(k?.newInPeriod ?? "0", 10),
      active: parseInt(k?.active ?? "0", 10),
      inactive: parseInt(k?.inactive ?? "0", 10),
      vip: parseInt(k?.vip ?? "0", 10),
      atRisk: parseInt(k?.atRisk ?? "0", 10),
      reactivated: parseInt(k?.reactivated ?? "0", 10),
    },
    newByMonth: monthRows.reverse().map((r) => ({
      month: r.month,
      label: new Date(r.month + "-01").toLocaleDateString("fr-FR", {
        month: "long",
        year: "numeric",
      }),
      count: parseInt(r.cnt, 10),
    })),
    retention: {
      returning,
      newCustomers,
      retentionRate: retTotal > 0 ? Math.round((returning / retTotal) * 1000) / 10 : null,
      reactivationRate:
        parseInt(k?.reactivated ?? "0", 10) > 0 && returning > 0
          ? Math.round((parseInt(k?.reactivated ?? "0", 10) / returning) * 1000) / 10
          : null,
    },
    topCustomers: topRows.map((r) => {
      const revenue = Math.round(parseFloat(r.revenue) * 100) / 100;
      const visits = parseInt(r.visits, 10);
      return {
        customerId: r.customerId,
        customerName: r.customerName,
        revenue,
        visits,
        averageTicket: visits > 0 ? Math.round((revenue / visits) * 100) / 100 : 0,
        ltv: revenue,
      };
    }),
  };
}

export async function getAppointmentAnalytics(
  orgId: string,
  filters: AnalyticsFilters,
): Promise<AppointmentAnalytics> {
  const p = baseParams(filters, orgId);
  const conds = [`a."organizationId" = $1`, `a."startAt" >= $2`, `a."startAt" <= $3`];
  const params: unknown[] = [p.orgId, p.start, p.end];
  let i = 4;
  if (p.staffId) {
    conds.push(`a."staffId" = $${i++}`);
    params.push(p.staffId);
  }
  if (p.serviceId) {
    conds.push(`a."serviceId" = $${i++}`);
    params.push(p.serviceId);
  }

  const { rows: statusRows } = await pool.query<{ status: string; cnt: string }>(
    `SELECT a.status::text, COUNT(*)::text AS cnt
     FROM "Appointment" a WHERE ${conds.join(" AND ")}
     GROUP BY a.status ORDER BY cnt DESC`,
    params,
  );

  const { rows: noShowRows } = await pool.query<{ noShow: string; concerned: string }>(
    `SELECT
      COUNT(*) FILTER (WHERE a.status = 'NO_SHOW')::text AS "noShow",
      COUNT(*) FILTER (WHERE a.status IN ('COMPLETED','NO_SHOW'))::text AS concerned
     FROM "Appointment" a
     WHERE ${conds.join(" AND ")} AND a."startAt" <= NOW()`,
    params,
  );

  const noShow = parseInt(noShowRows[0]?.noShow ?? "0", 10);
  const concerned = parseInt(noShowRows[0]?.concerned ?? "0", 10);

  const { rows: occRows } = await pool.query<{
    dow: string;
    booked: string;
    available: string;
  }>(
    `WITH booked AS (
      SELECT EXTRACT(DOW FROM a."startAt" AT TIME ZONE 'Africa/Casablanca')::int AS dow,
             SUM(EXTRACT(EPOCH FROM (a."endAt" - a."startAt")) / 60)::float AS mins
      FROM "Appointment" a
      WHERE ${conds.join(" AND ")}
        AND a.status IN ('CONFIRMED','ARRIVED','IN_PROGRESS','COMPLETED')
      GROUP BY 1
    ),
    avail AS (
      SELECT ss."dayOfWeek" AS dow,
             SUM(
               EXTRACT(EPOCH FROM (
                 (ss."endTime"::time - ss."startTime"::time)
               )) / 60
             ) * GREATEST(1, (
               SELECT COUNT(DISTINCT date_trunc('week', d)::date)
               FROM generate_series($2::timestamptz, $3::timestamptz, '1 day') d
               WHERE EXTRACT(DOW FROM d AT TIME ZONE 'Africa/Casablanca') = ss."dayOfWeek"
             )) AS mins
      FROM "StaffSchedule" ss
      JOIN "Staff" st ON st.id = ss."staffId"
      WHERE st."organizationId" = $1 AND st."deletedAt" IS NULL AND ss.active = true
      GROUP BY ss."dayOfWeek"
    )
    SELECT COALESCE(b.dow, a.dow)::text AS dow,
           COALESCE(b.mins, 0)::text AS booked,
           COALESCE(a.mins, 0)::text AS available
    FROM avail a
    FULL OUTER JOIN booked b ON b.dow = a.dow
    ORDER BY dow`,
    params,
  );

  const occupationByWeekday = [1, 2, 3, 4, 5, 6, 0].map((dow) => {
    const row = occRows.find((r) => parseInt(r.dow, 10) === dow);
    const bookedMinutes = parseFloat(row?.booked ?? "0") || 0;
    const availableMinutes = parseFloat(row?.available ?? "0") || 0;
    const rate =
      availableMinutes > 0
        ? Math.round((bookedMinutes / availableMinutes) * 1000) / 10
        : null;
    let level: "high" | "medium" | "low" = "low";
    if (rate != null) {
      if (rate >= 80) level = "high";
      else if (rate >= 50) level = "medium";
    }
    return {
      weekday: dow,
      label: WEEKDAY_LABEL[dow],
      bookedMinutes: Math.round(bookedMinutes),
      availableMinutes: Math.round(availableMinutes),
      rate,
      level,
    };
  });

  return {
    total: statusRows.reduce((s, r) => s + parseInt(r.cnt, 10), 0),
    byStatus: statusRows.map((r) => ({ status: r.status, count: parseInt(r.cnt, 10) })),
    noShow: {
      count: noShow,
      concerned,
      rate: concerned > 0 ? Math.round((noShow / concerned) * 1000) / 10 : null,
    },
    occupationByWeekday,
  };
}

export async function getInventoryAnalytics(
  orgId: string,
  filters: AnalyticsFilters,
): Promise<InventoryAnalytics> {
  const p = baseParams(filters, orgId);

  const { rows: stockRows } = await pool.query<{ val: string; out: string; low: string }>(
    `SELECT
      COALESCE(SUM(stock * "purchasePrice") FILTER (WHERE active), 0)::text AS val,
      COUNT(*) FILTER (WHERE active AND stock <= 0)::text AS out,
      COUNT(*) FILTER (WHERE active AND stock > 0 AND stock < "minStock")::text AS low
     FROM "Product" WHERE "organizationId" = $1 AND "deletedAt" IS NULL`,
    [orgId],
  );

  const { rows: movRows } = await pool.query<{ type: string; val: string }>(
    `SELECT im.type::text,
            COALESCE(SUM(ABS(im.quantity) * p."purchasePrice"), 0)::text AS val
     FROM "InventoryMovement" im
     JOIN "Product" p ON p.id = im."productId"
     WHERE im."organizationId" = $1 AND im."createdAt" >= $2 AND im."createdAt" <= $3
     GROUP BY im.type`,
    [orgId, p.start, p.end],
  );

  const byType = Object.fromEntries(movRows.map((r) => [r.type, parseFloat(r.val) || 0]));

  const { rows: topRows } = await pool.query<{
    productId: string;
    productName: string;
    qty: string;
    unit: string;
  }>(
    `SELECT p.id AS "productId", p.name AS "productName",
            SUM(ABS(im.quantity))::text AS qty, p.unit::text AS unit
     FROM "InventoryMovement" im
     JOIN "Product" p ON p.id = im."productId"
     WHERE im."organizationId" = $1 AND im."createdAt" >= $2 AND im."createdAt" <= $3
       AND im.type = 'SERVICE_CONSUMPTION'
     GROUP BY p.id, p.name, p.unit
     ORDER BY SUM(ABS(im.quantity)) DESC LIMIT 10`,
    [orgId, p.start, p.end],
  );

  const lossTypes = ["EXPIRATION", "LOSS", "DAMAGE"] as const;
  const lossesByReason = lossTypes.map((reason) => ({
    reason,
    value: Math.round((byType[reason] ?? 0) * 100) / 100,
  }));

  return {
    stockValue: Math.round(parseFloat(stockRows[0]?.val ?? "0") * 100) / 100,
    consumptionValue: Math.round((byType.SERVICE_CONSUMPTION ?? 0) * 100) / 100,
    purchasesValue: Math.round((byType.PURCHASE ?? 0) * 100) / 100,
    lossesValue: Math.round(
      ((byType.LOSS ?? 0) + (byType.DAMAGE ?? 0) + (byType.EXPIRATION ?? 0)) * 100,
    ) / 100,
    adjustmentsValue: Math.round(
      ((byType.ADJUSTMENT_IN ?? 0) + (byType.ADJUSTMENT_OUT ?? 0)) * 100,
    ) / 100,
    outOfStockCount: parseInt(stockRows[0]?.out ?? "0", 10),
    lowStockCount: parseInt(stockRows[0]?.low ?? "0", 10),
    topConsumption: topRows.map((r) => ({
      productId: r.productId,
      productName: r.productName,
      quantity: Math.round(parseFloat(r.qty) * 100) / 100,
      unit: r.unit,
    })),
    lossesByReason,
  };
}

export async function getMarketingAnalytics(
  orgId: string,
  filters: AnalyticsFilters,
): Promise<MarketingAnalyticsRow[]> {
  const p = baseParams(filters, orgId);

  const { rows } = await pool.query<{
    campaignId: string;
    campaignName: string;
    targeted: string;
    sent: string;
    appts: string;
    revenue: string;
  }>(
    `SELECT c.id AS "campaignId", c.name AS "campaignName",
            c."audienceCount"::text AS targeted,
            COUNT(cr.id) FILTER (WHERE cr.status = 'SENT')::text AS sent,
            COUNT(DISTINCT a.id)::text AS appts,
            COALESCE(SUM(
              CASE WHEN pay.kind = 'REFUND' THEN -pay.amount ELSE pay.amount END
            ), 0)::text AS revenue
     FROM "Campaign" c
     LEFT JOIN "CampaignRecipient" cr ON cr."campaignId" = c.id
     LEFT JOIN "Appointment" a ON a."customerId" = cr."customerId"
       AND a.status = 'COMPLETED'
       AND a."startAt" >= COALESCE(
         (SELECT wt."sentAt" FROM "WhatsAppTask" wt WHERE wt.id = cr."whatsappTaskId"),
         cr."updatedAt"
       )
       AND a."startAt" >= $2 AND a."startAt" <= $3
     LEFT JOIN "Payment" pay ON pay."appointmentId" = a.id AND pay.status = 'COMPLETED'
     WHERE c."organizationId" = $1
       AND c."createdAt" >= $2 - INTERVAL '90 days'
     GROUP BY c.id, c.name, c."audienceCount"
     ORDER BY c."createdAt" DESC LIMIT 20`,
    [orgId, p.start, p.end],
  );

  return rows.map((r) => ({
    campaignId: r.campaignId,
    campaignName: r.campaignName,
    targeted: parseInt(r.targeted, 10),
    sent: parseInt(r.sent, 10),
    associatedAppointments: parseInt(r.appts, 10),
    associatedRevenue: Math.round(parseFloat(r.revenue) * 100) / 100,
  }));
}

export async function getReviewAnalytics(
  orgId: string,
  filters: AnalyticsFilters,
): Promise<ReviewAnalytics> {
  const p = baseParams(filters, orgId);

  const { rows: sentRows } = await pool.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM "ReviewRequest"
     WHERE "organizationId" = $1 AND status IN ('SENT','RECORDED')
       AND "sentAt" >= $2 AND "sentAt" <= $3`,
    [orgId, p.start, p.end],
  );

  const { rows: satRows } = await pool.query<{ satisfaction: string; cnt: string }>(
    `SELECT satisfaction::text, COUNT(*)::text AS cnt
     FROM "ReviewRequest"
     WHERE "organizationId" = $1 AND satisfaction IS NOT NULL
       AND "satisfactionRecordedAt" >= $2 AND "satisfactionRecordedAt" <= $3
     GROUP BY satisfaction`,
    [orgId, p.start, p.end],
  );

  const labels: Record<string, string> = {
    VERY_SATISFIED: "Très satisfaites",
    SATISFIED: "Satisfaites",
    DISSATISFIED: "Insatisfaites",
  };

  const bySatisfaction = satRows.map((r) => ({
    satisfaction: r.satisfaction,
    label: labels[r.satisfaction] ?? r.satisfaction,
    count: parseInt(r.cnt, 10),
  }));

  const totalSat = bySatisfaction.reduce((s, r) => s + r.count, 0);
  let avgScore: number | null = null;
  if (totalSat > 0) {
    const scores: Record<string, number> = {
      VERY_SATISFIED: 5,
      SATISFIED: 4,
      DISSATISFIED: 1,
    };
    const sum = bySatisfaction.reduce((s, r) => s + r.count * (scores[r.satisfaction] ?? 0), 0);
    avgScore = Math.round((sum / totalSat) * 10) / 10;
  }

  return {
    sentInPeriod: parseInt(sentRows[0]?.c ?? "0", 10),
    recordedSatisfaction: totalSat,
    bySatisfaction,
    averageInternalScore: avgScore,
  };
}

export async function getLoyaltyAnalytics(
  orgId: string,
  filters: AnalyticsFilters,
): Promise<LoyaltyAnalytics> {
  const p = baseParams(filters, orgId);

  const { rows } = await pool.query<{
    earned: string;
    redeemed: string;
    rewards: string;
    vip: string;
    packages: string;
    sessions: string;
  }>(
    `SELECT
      (SELECT COALESCE(SUM(lt.points), 0)::text FROM "LoyaltyTransaction" lt
       WHERE lt."organizationId" = $1 AND lt.type = 'EARN'
         AND lt."createdAt" >= $2 AND lt."createdAt" <= $3) AS earned,
      (SELECT COALESCE(SUM(ABS(lt.points)), 0)::text FROM "LoyaltyTransaction" lt
       WHERE lt."organizationId" = $1 AND lt.type = 'REDEEM'
         AND lt."createdAt" >= $2 AND lt."createdAt" <= $3) AS redeemed,
      (SELECT COUNT(*)::text FROM "LoyaltyTransaction"
       WHERE "organizationId" = $1 AND type = 'REDEEM'
         AND reason ILIKE '%récompense%' AND "createdAt" >= $2 AND "createdAt" <= $3) AS rewards,
      (SELECT COUNT(*)::text FROM (
        SELECT c.id FROM "Customer" c
        LEFT JOIN "Appointment" a ON a."customerId" = c.id AND a.status = 'COMPLETED'
        WHERE c."organizationId" = $1 AND c."deletedAt" IS NULL
        GROUP BY c.id
        HAVING COALESCE(SUM(a.price), 0) >= $4 OR COUNT(a.id) >= $5
      ) x) AS vip,
      (SELECT COUNT(*)::text FROM "Package"
       WHERE "organizationId" = $1 AND status = 'ACTIVE') AS packages,
      (SELECT COUNT(*)::text FROM "PackageSession"
       WHERE "organizationId" = $1 AND "createdAt" >= $2 AND "createdAt" <= $3) AS sessions`,
    [orgId, p.start, p.end, VIP_MIN_REVENUE, VIP_MIN_VISITS],
  );

  const r = rows[0];
  return {
    pointsEarned: parseInt(r?.earned ?? "0", 10),
    pointsRedeemed: parseInt(r?.redeemed ?? "0", 10),
    rewardsUsed: parseInt(r?.rewards ?? "0", 10),
    vipCustomers: parseInt(r?.vip ?? "0", 10),
    activePackages: parseInt(r?.packages ?? "0", 10),
    sessionsUsed: parseInt(r?.sessions ?? "0", 10),
  };
}

/** Export pour tests — CA net sur période */
export async function computeNetRevenue(orgId: string, filters: AnalyticsFilters): Promise<number> {
  return sumNetRevenue(baseParams(filters, orgId));
}

export { sumNetRevenue, sumGrossPayments, sumRefunds, sumExpenses };

export async function getOrganizationName(orgId: string): Promise<string> {
  const { rows } = await pool.query<{ name: string }>(
    `SELECT name FROM "Organization" WHERE id = $1`,
    [orgId],
  );
  return rows[0]?.name ?? "Institut";
}

export type RefundStats = { count: number; amount: number };

export async function getRefundStats(
  orgId: string,
  filters: AnalyticsFilters,
): Promise<RefundStats> {
  const p = baseParams(filters, orgId);
  const joins = paymentJoins(p);
  const { sql, params } = paymentConditions(p, 4);
  const { rows } = await pool.query<{ count: string; amount: string }>(
    `SELECT COUNT(*)::text AS count, COALESCE(SUM(p.amount), 0)::text AS amount
     FROM "Payment" p ${joins}
     WHERE ${sql} AND p.kind = 'REFUND'::"PaymentKind"`,
    params,
  );
  return {
    count: parseInt(rows[0]?.count ?? "0", 10),
    amount: Math.round((parseFloat(rows[0]?.amount ?? "0") || 0) * 100) / 100,
  };
}

export type CustomerReportRow = {
  customerId: string;
  customerName: string;
  phone: string;
  visits: number;
  netRevenue: number;
  averageTicket: number;
  lastVisitAt: string | null;
  segment: string;
};

export async function getCustomerReportRows(
  orgId: string,
  filters: AnalyticsFilters,
): Promise<CustomerReportRow[]> {
  const { rows } = await pool.query<{
    customerId: string;
    customerName: string;
    phone: string;
    visits: string;
    revenue: string;
    lastVisitAt: Date | null;
    createdAt: Date;
  }>(
    `SELECT c.id AS "customerId",
            c."firstName" || ' ' || c."lastName" AS "customerName",
            c.phone,
            COUNT(a.id) FILTER (WHERE a.status = 'COMPLETED')::text AS visits,
            COALESCE(SUM(
              CASE WHEN p.kind = 'REFUND' THEN -p.amount ELSE p.amount END
            ) FILTER (WHERE p.status = 'COMPLETED'), 0)::text AS revenue,
            MAX(a."startAt") FILTER (WHERE a.status = 'COMPLETED') AS "lastVisitAt",
            c."createdAt"
     FROM "Customer" c
     LEFT JOIN "Appointment" a ON a."customerId" = c.id
     LEFT JOIN "Payment" p ON p."appointmentId" = a.id
     WHERE c."organizationId" = $1 AND c."deletedAt" IS NULL
     GROUP BY c.id, c."firstName", c."lastName", c.phone, c."createdAt"
     HAVING COALESCE(SUM(
       CASE WHEN p.kind = 'REFUND' THEN -p.amount ELSE p.amount END
     ) FILTER (WHERE p.status = 'COMPLETED'), 0) > 0
        OR COUNT(a.id) FILTER (WHERE a.status = 'COMPLETED') > 0
     ORDER BY revenue DESC
     LIMIT 200`,
    [orgId],
  );

  return rows.map((r) => {
    const visits = parseInt(r.visits, 10);
    const netRevenue = Math.round(parseFloat(r.revenue) * 100) / 100;
    const daysSince =
      r.lastVisitAt != null
        ? (Date.now() - new Date(r.lastVisitAt).getTime()) / (86400000)
        : Infinity;
    let segment = "ACTIVE";
    if (netRevenue >= VIP_MIN_REVENUE || visits >= VIP_MIN_VISITS) segment = "VIP";
    else if (daysSince > AT_RISK_DAYS) segment = "INACTIVE";
    else if (daysSince > AT_RISK_DAYS * 0.7) segment = "AT_RISK";

    return {
      customerId: r.customerId,
      customerName: r.customerName,
      phone: r.phone,
      visits,
      netRevenue,
      averageTicket: visits > 0 ? Math.round((netRevenue / visits) * 100) / 100 : 0,
      lastVisitAt: r.lastVisitAt ? new Date(r.lastVisitAt).toISOString() : null,
      segment,
    };
  });
}

export type StockLedgerReportRow = {
  productId: string;
  productName: string;
  unit: string;
  purchases: number;
  consumption: number;
  sales: number;
  losses: number;
  adjustments: number;
  ledgerBalance: number;
};

export async function getStockLedgerReport(
  orgId: string,
  filters: AnalyticsFilters,
): Promise<StockLedgerReportRow[]> {
  const p = baseParams(filters, orgId);
  const { rows } = await pool.query<{
    productId: string;
    productName: string;
    unit: string;
    purchases: string;
    consumption: string;
    sales: string;
    losses: string;
    adjustments: string;
    ledgerBalance: string;
  }>(
    `SELECT p.id AS "productId", p.name AS "productName", p.unit::text AS unit,
      COALESCE(SUM(im.quantity) FILTER (
        WHERE im.type = 'PURCHASE' AND im."createdAt" >= $2 AND im."createdAt" <= $3
      ), 0)::text AS purchases,
      COALESCE(SUM(im.quantity) FILTER (
        WHERE im.type = 'SERVICE_CONSUMPTION' AND im."createdAt" >= $2 AND im."createdAt" <= $3
      ), 0)::text AS consumption,
      COALESCE(SUM(im.quantity) FILTER (
        WHERE im.type = 'SALE' AND im."createdAt" >= $2 AND im."createdAt" <= $3
      ), 0)::text AS sales,
      COALESCE(SUM(im.quantity) FILTER (
        WHERE im.type IN ('LOSS','DAMAGE','EXPIRATION') AND im."createdAt" >= $2 AND im."createdAt" <= $3
      ), 0)::text AS losses,
      COALESCE(SUM(im.quantity) FILTER (
        WHERE im.type IN ('ADJUSTMENT_IN','ADJUSTMENT_OUT') AND im."createdAt" >= $2 AND im."createdAt" <= $3
      ), 0)::text AS adjustments,
      COALESCE(SUM(im.quantity), 0)::text AS "ledgerBalance"
     FROM "Product" p
     LEFT JOIN "InventoryMovement" im ON im."productId" = p.id AND im."organizationId" = p."organizationId"
     WHERE p."organizationId" = $1 AND p."deletedAt" IS NULL
     GROUP BY p.id, p.name, p.unit
     HAVING COUNT(im.id) FILTER (WHERE im."createdAt" >= $2 AND im."createdAt" <= $3) > 0
        OR COALESCE(SUM(im.quantity), 0) <> 0
     ORDER BY p.name
     LIMIT 100`,
    [orgId, p.start, p.end],
  );

  return rows.map((r) => ({
    productId: r.productId,
    productName: r.productName,
    unit: r.unit,
    purchases: parseFloat(r.purchases) || 0,
    consumption: parseFloat(r.consumption) || 0,
    sales: parseFloat(r.sales) || 0,
    losses: parseFloat(r.losses) || 0,
    adjustments: parseFloat(r.adjustments) || 0,
    ledgerBalance: Math.round((parseFloat(r.ledgerBalance) || 0) * 100) / 100,
  }));
}
