import { randomBytes } from "crypto";
import { Pool, type PoolClient } from "pg";
import type {
  CreateStaffInput,
  CreateStaffLeaveInput,
  StaffAgendaContext,
  StaffDetail,
  StaffLeaveItem,
  StaffListItem,
  StaffPerformance,
  StaffStatus,
  UpdateStaffInput,
  UpdateStaffLeaveInput,
  UpdateStaffScheduleInput,
} from "@/types/staff";
import { staffDisplayName } from "@/types/staff";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function newId(prefix: string) {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

const STAFF_NAME_SQL = `TRIM(CONCAT(st."firstName", ' ', NULLIF(st."lastName", '')))`;

type StaffStatsRow = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  position: string | null;
  status: StaffStatus;
  hireDate: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  appointmentCount: string;
  completedCount: string;
  cancelledCount: string;
  noShowCount: string;
  revenue: string;
  serviceNames: string[] | null;
  serviceIds: string[] | null;
};

function computeRating(completed: number, noShow: number, cancelled: number): number | null {
  const total = completed + noShow + cancelled;
  if (total === 0) return null;
  const score = 10 - (noShow / total) * 3 - (cancelled / total) * 1;
  return Math.round(Math.max(5, Math.min(10, score)) * 10) / 10;
}

function rowToListItem(row: StaffStatsRow): StaffListItem {
  const appointmentCount = parseInt(row.appointmentCount, 10) || 0;
  const completed = parseInt(row.completedCount, 10) || 0;
  const noShow = parseInt(row.noShowCount, 10) || 0;
  const cancelled = parseInt(row.cancelledCount, 10) || 0;
  const revenue = parseFloat(row.revenue) || 0;

  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    displayName: staffDisplayName(row.firstName, row.lastName),
    phone: row.phone,
    email: row.email,
    position: row.position,
    status: row.status,
    hireDate: row.hireDate?.toISOString() ?? null,
    appointmentCount,
    revenue,
    rating: computeRating(completed, noShow, cancelled),
    serviceNames: row.serviceNames ?? [],
    serviceIds: row.serviceIds ?? [],
  };
}

const LIST_FROM = `
  FROM "Staff" st
  LEFT JOIN "Appointment" a ON a."staffId" = st.id
  LEFT JOIN "ServiceStaff" ss ON ss."staffId" = st.id
  LEFT JOIN "Service" s ON s.id = ss."serviceId"
  WHERE st."organizationId" = $1 AND st."deletedAt" IS NULL
`;

export async function listStaff(
  organizationId: string,
  opts: {
    page: number;
    limit: number;
    search?: string;
    status?: StaffStatus | null;
    serviceId?: string | null;
    agenda?: boolean;
  },
): Promise<{ items: StaffListItem[] | StaffAgendaContext[]; total: number }> {
  const { page, limit, search, status, serviceId, agenda } = opts;
  const conditions = [`st."organizationId" = $1`, `st."deletedAt" IS NULL`];
  const params: unknown[] = [organizationId];
  let pi = 2;

  if (search) {
    conditions.push(
      `(st."firstName" ILIKE $${pi} OR st."lastName" ILIKE $${pi} OR COALESCE(st.phone, '') ILIKE $${pi} OR COALESCE(st.email, '') ILIKE $${pi} OR COALESCE(st.position, '') ILIKE $${pi})`,
    );
    params.push(`%${search}%`);
    pi++;
  }
  if (status) {
    conditions.push(`st.status = $${pi}`);
    params.push(status);
    pi++;
  }
  if (serviceId) {
    conditions.push(`EXISTS (SELECT 1 FROM "ServiceStaff" ss2 WHERE ss2."staffId" = st.id AND ss2."serviceId" = $${pi})`);
    params.push(serviceId);
    pi++;
  }

  const where = conditions.join(" AND ");

  if (agenda) {
    const { rows } = await pool.query<{
      id: string;
      firstName: string;
      lastName: string;
      status: StaffStatus;
    }>(
      `SELECT st.id, st."firstName", st."lastName", st.status
       FROM "Staff" st
       WHERE ${where} AND st.status IN ('ACTIVE', 'ON_LEAVE')
       ORDER BY st."firstName", st."lastName"`,
      params,
    );

    const items: StaffAgendaContext[] = [];
    for (const row of rows) {
      const [schedules, breaks, leaves] = await Promise.all([
        loadSchedules(row.id),
        loadBreaks(row.id),
        loadLeaves(row.id, organizationId),
      ]);
      items.push({
        id: row.id,
        firstName: row.firstName,
        lastName: row.lastName,
        displayName: staffDisplayName(row.firstName, row.lastName),
        status: row.status,
        schedules,
        breaks,
        leaves: leaves.filter((l) => l.status === "APPROVED"),
      });
    }
    return { items, total: items.length };
  }

  const countSql = `SELECT COUNT(DISTINCT st.id)::int AS total FROM "Staff" st WHERE ${where}`;

  const listSql = `
    SELECT
      st.id,
      st."firstName",
      st."lastName",
      st.phone,
      st.email,
      st.position,
      st.status,
      st."hireDate",
      st.notes,
      st."createdAt",
      st."updatedAt",
      COUNT(DISTINCT a.id)::text AS "appointmentCount",
      COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'COMPLETED')::text AS "completedCount",
      COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'CANCELLED')::text AS "cancelledCount",
      COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'NO_SHOW')::text AS "noShowCount",
      COALESCE(SUM(a.price) FILTER (WHERE a.status = 'COMPLETED'), 0)::text AS revenue,
      COALESCE(array_agg(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL), '{}') AS "serviceNames",
      COALESCE(array_agg(DISTINCT s.id) FILTER (WHERE s.id IS NOT NULL), '{}') AS "serviceIds"
    FROM "Staff" st
    LEFT JOIN "Appointment" a ON a."staffId" = st.id
    LEFT JOIN "ServiceStaff" ss ON ss."staffId" = st.id
    LEFT JOIN "Service" s ON s.id = ss."serviceId"
    WHERE ${where}
    GROUP BY st.id
    ORDER BY st.status = 'ACTIVE' DESC, st."firstName", st."lastName"
    LIMIT $${pi} OFFSET $${pi + 1}
  `;

  const offset = (page - 1) * limit;
  const [countRes, listRes] = await Promise.all([
    pool.query<{ total: number }>(countSql, params),
    pool.query<StaffStatsRow>(listSql, [...params, limit, offset]),
  ]);

  return {
    items: listRes.rows.map(rowToListItem),
    total: countRes.rows[0]?.total ?? 0,
  };
}

async function loadSchedules(staffId: string) {
  const { rows } = await pool.query<{
    id: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    active: boolean;
  }>(
    `SELECT id, "dayOfWeek", "startTime", "endTime", active
     FROM "StaffSchedule" WHERE "staffId" = $1 ORDER BY "dayOfWeek"`,
    [staffId],
  );
  return rows.map((r) => ({
    id: r.id,
    dayOfWeek: r.dayOfWeek,
    startTime: r.startTime,
    endTime: r.endTime,
    active: r.active,
  }));
}

async function loadBreaks(staffId: string) {
  const { rows } = await pool.query<{
    id: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>(
    `SELECT id, "dayOfWeek", "startTime", "endTime"
     FROM "StaffBreak" WHERE "staffId" = $1 ORDER BY "dayOfWeek", "startTime"`,
    [staffId],
  );
  return rows.map((r) => ({
    id: r.id,
    dayOfWeek: r.dayOfWeek,
    startTime: r.startTime,
    endTime: r.endTime,
  }));
}

async function loadLeaves(staffId: string, organizationId: string): Promise<StaffLeaveItem[]> {
  const { rows } = await pool.query<{
    id: string;
    startAt: Date;
    endAt: Date;
    type: string;
    reason: string | null;
    status: string;
    createdAt: Date;
  }>(
    `SELECT l.id, l."startAt", l."endAt", l.type::text, l.reason, l.status::text, l."createdAt"
     FROM "StaffLeave" l
     JOIN "Staff" st ON st.id = l."staffId"
     WHERE l."staffId" = $1 AND st."organizationId" = $2
     ORDER BY l."startAt" DESC`,
    [staffId, organizationId],
  );
  return rows.map((r) => ({
    id: r.id,
    startAt: r.startAt.toISOString(),
    endAt: r.endAt.toISOString(),
    type: r.type as StaffLeaveItem["type"],
    reason: r.reason,
    status: r.status as StaffLeaveItem["status"],
    createdAt: r.createdAt.toISOString(),
  }));
}

async function loadPerformance(staffId: string): Promise<StaffPerformance> {
  const { rows } = await pool.query<{
    appointmentCount: string;
    completedCount: string;
    cancelledCount: string;
    noShowCount: string;
    revenue: string;
  }>(
    `SELECT
      COUNT(*)::text AS "appointmentCount",
      COUNT(*) FILTER (WHERE status = 'COMPLETED')::text AS "completedCount",
      COUNT(*) FILTER (WHERE status = 'CANCELLED')::text AS "cancelledCount",
      COUNT(*) FILTER (WHERE status = 'NO_SHOW')::text AS "noShowCount",
      COALESCE(SUM(price) FILTER (WHERE status = 'COMPLETED'), 0)::text AS revenue
     FROM "Appointment" WHERE "staffId" = $1`,
    [staffId],
  );

  const monthly = await pool.query<{ month: string; revenue: string }>(
    `SELECT to_char("startAt", 'YYYY-MM') AS month,
            COALESCE(SUM(price), 0)::text AS revenue
     FROM "Appointment"
     WHERE "staffId" = $1 AND status = 'COMPLETED'
       AND "startAt" >= NOW() - INTERVAL '6 months'
     GROUP BY 1 ORDER BY 1`,
    [staffId],
  );

  const completed = parseInt(rows[0]?.completedCount ?? "0", 10);
  const noShow = parseInt(rows[0]?.noShowCount ?? "0", 10);
  const cancelled = parseInt(rows[0]?.cancelledCount ?? "0", 10);
  const revenue = parseFloat(rows[0]?.revenue ?? "0") || 0;

  return {
    appointmentCount: parseInt(rows[0]?.appointmentCount ?? "0", 10),
    completedCount: completed,
    cancelledCount: cancelled,
    noShowCount: noShow,
    revenue,
    averageTicket: completed > 0 ? Math.round((revenue / completed) * 100) / 100 : 0,
    rating: computeRating(completed, noShow, cancelled),
    monthlyRevenue: monthly.rows.map((r) => ({
      month: r.month,
      revenue: parseFloat(r.revenue) || 0,
    })),
  };
}

export async function getStaffById(
  organizationId: string,
  staffId: string,
): Promise<StaffDetail | null> {
  const { rows } = await pool.query<StaffStatsRow>(
    `SELECT
      st.id, st."firstName", st."lastName", st.phone, st.email, st.position,
      st.status, st."hireDate", st.notes, st."createdAt", st."updatedAt",
      COUNT(DISTINCT a.id)::text AS "appointmentCount",
      COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'COMPLETED')::text AS "completedCount",
      COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'CANCELLED')::text AS "cancelledCount",
      COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'NO_SHOW')::text AS "noShowCount",
      COALESCE(SUM(a.price) FILTER (WHERE a.status = 'COMPLETED'), 0)::text AS revenue,
      COALESCE(array_agg(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL), '{}') AS "serviceNames",
      COALESCE(array_agg(DISTINCT s.id) FILTER (WHERE s.id IS NOT NULL), '{}') AS "serviceIds"
    FROM "Staff" st
    LEFT JOIN "Appointment" a ON a."staffId" = st.id
    LEFT JOIN "ServiceStaff" ss ON ss."staffId" = st.id
    LEFT JOIN "Service" s ON s.id = ss."serviceId"
    WHERE st.id = $1 AND st."organizationId" = $2 AND st."deletedAt" IS NULL
    GROUP BY st.id`,
    [staffId, organizationId],
  );
  if (!rows[0]) return null;

  const base = rowToListItem(rows[0]);
  const [schedules, breaks, leaves, services, commissions, performance] = await Promise.all([
    loadSchedules(staffId),
    loadBreaks(staffId),
    loadLeaves(staffId, organizationId),
    pool.query<{ serviceId: string; serviceName: string; category: string | null; active: boolean }>(
      `SELECT s.id AS "serviceId", s.name AS "serviceName", s.category, s.active
       FROM "ServiceStaff" ss JOIN "Service" s ON s.id = ss."serviceId"
       WHERE ss."staffId" = $1 ORDER BY s.name`,
      [staffId],
    ),
    pool.query<{
      id: string;
      serviceId: string;
      serviceName: string;
      type: string;
      percentage: string | null;
      fixedAmount: string | null;
    }>(
      `SELECT sc.id, sc."serviceId", s.name AS "serviceName", sc.type::text,
              sc.percentage::text, sc."fixedAmount"::text
       FROM "ServiceCommission" sc
       JOIN "Service" s ON s.id = sc."serviceId"
       WHERE sc."staffId" = $1 ORDER BY s.name`,
      [staffId],
    ),
    loadPerformance(staffId),
  ]);

  return {
    ...base,
    notes: rows[0].notes,
    schedules,
    breaks,
    leaves,
    services: services.rows.map((s) => ({
      serviceId: s.serviceId,
      serviceName: s.serviceName,
      category: s.category,
      active: s.active,
    })),
    commissions: commissions.rows.map((c) => ({
      id: c.id,
      serviceId: c.serviceId,
      serviceName: c.serviceName,
      type: c.type as "PERCENTAGE" | "FIXED",
      percentage: c.percentage != null ? parseFloat(c.percentage) : null,
      fixedAmount: c.fixedAmount != null ? parseFloat(c.fixedAmount) : null,
    })),
    performance,
    createdAt: rows[0].createdAt.toISOString(),
    updatedAt: rows[0].updatedAt.toISOString(),
  };
}

export async function createStaff(
  organizationId: string,
  input: CreateStaffInput,
): Promise<StaffDetail> {
  const id = newId("emp");
  await pool.query(
    `INSERT INTO "Staff" (
      id, "organizationId", "firstName", "lastName", phone, email, position,
      status, "hireDate", notes, "updatedAt"
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())`,
    [
      id,
      organizationId,
      input.firstName,
      input.lastName ?? "",
      input.phone ?? null,
      input.email ?? null,
      input.position ?? null,
      input.status ?? "ACTIVE",
      input.hireDate ? new Date(input.hireDate) : null,
      input.notes ?? null,
    ],
  );

  const detail = await getStaffById(organizationId, id);
  if (!detail) throw new Error("Staff introuvable après création.");
  return detail;
}

export async function updateStaff(
  organizationId: string,
  staffId: string,
  input: UpdateStaffInput,
): Promise<StaffDetail> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let pi = 1;

  const setField = (col: string, val: unknown) => {
    sets.push(`"${col}" = $${pi}`);
    params.push(val);
    pi++;
  };

  if (input.firstName !== undefined) setField("firstName", input.firstName);
  if (input.lastName !== undefined) setField("lastName", input.lastName);
  if (input.phone !== undefined) setField("phone", input.phone ?? null);
  if (input.email !== undefined) setField("email", input.email ?? null);
  if (input.position !== undefined) setField("position", input.position ?? null);
  if (input.status !== undefined) setField("status", input.status);
  if (input.hireDate !== undefined) {
    setField("hireDate", input.hireDate ? new Date(input.hireDate) : null);
  }
  if (input.notes !== undefined) setField("notes", input.notes ?? null);

  if (sets.length > 0) {
    sets.push(`"updatedAt" = NOW()`);
    params.push(staffId, organizationId);
    await pool.query(
      `UPDATE "Staff" SET ${sets.join(", ")} WHERE id = $${pi} AND "organizationId" = $${pi + 1} AND "deletedAt" IS NULL`,
      params,
    );
  }

  const detail = await getStaffById(organizationId, staffId);
  if (!detail) throw new Error("NOT_FOUND");
  return detail;
}

export async function updateStaffSchedule(
  organizationId: string,
  staffId: string,
  input: UpdateStaffScheduleInput,
): Promise<StaffDetail> {
  const exists = await pool.query(
    `SELECT id FROM "Staff" WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,
    [staffId, organizationId],
  );
  if (!exists.rows[0]) throw new Error("NOT_FOUND");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM "StaffSchedule" WHERE "staffId" = $1`, [staffId]);
    await client.query(`DELETE FROM "StaffBreak" WHERE "staffId" = $1`, [staffId]);

    for (const s of input.schedules) {
      await client.query(
        `INSERT INTO "StaffSchedule" (id, "staffId", "dayOfWeek", "startTime", "endTime", active)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [newId("sch"), staffId, s.dayOfWeek, s.startTime, s.endTime, s.active],
      );
    }
    for (const b of input.breaks) {
      await client.query(
        `INSERT INTO "StaffBreak" (id, "staffId", "dayOfWeek", "startTime", "endTime")
         VALUES ($1,$2,$3,$4,$5)`,
        [newId("brk"), staffId, b.dayOfWeek, b.startTime, b.endTime],
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  const detail = await getStaffById(organizationId, staffId);
  if (!detail) throw new Error("NOT_FOUND");
  return detail;
}

export async function createStaffLeave(
  organizationId: string,
  staffId: string,
  input: CreateStaffLeaveInput,
): Promise<StaffLeaveItem> {
  const exists = await pool.query(
    `SELECT id FROM "Staff" WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,
    [staffId, organizationId],
  );
  if (!exists.rows[0]) throw new Error("NOT_FOUND");

  const id = newId("lv");
  await pool.query(
    `INSERT INTO "StaffLeave" (id, "staffId", "startAt", "endAt", type, reason, status, "updatedAt")
     VALUES ($1,$2,$3,$4,$5::"LeaveType",$6,$7::"LeaveStatus",NOW())`,
    [
      id,
      staffId,
      new Date(input.startAt),
      new Date(input.endAt),
      input.type ?? "CONGE",
      input.reason ?? null,
      input.status ?? "APPROVED",
    ],
  );

  const leaves = await loadLeaves(staffId, organizationId);
  const created = leaves.find((l) => l.id === id);
  if (!created) throw new Error("Leave introuvable.");
  return created;
}

export async function updateStaffLeave(
  organizationId: string,
  staffId: string,
  leaveId: string,
  input: UpdateStaffLeaveInput,
): Promise<StaffLeaveItem> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let pi = 1;

  if (input.startAt !== undefined) {
    sets.push(`"startAt" = $${pi}`);
    params.push(new Date(input.startAt));
    pi++;
  }
  if (input.endAt !== undefined) {
    sets.push(`"endAt" = $${pi}`);
    params.push(new Date(input.endAt));
    pi++;
  }
  if (input.type !== undefined) {
    sets.push(`type = $${pi}::"LeaveType"`);
    params.push(input.type);
    pi++;
  }
  if (input.reason !== undefined) {
    sets.push(`reason = $${pi}`);
    params.push(input.reason ?? null);
    pi++;
  }
  if (input.status !== undefined) {
    sets.push(`status = $${pi}::"LeaveStatus"`);
    params.push(input.status);
    pi++;
  }

  if (sets.length === 0) {
    const leaves = await loadLeaves(staffId, organizationId);
    const found = leaves.find((l) => l.id === leaveId);
    if (!found) throw new Error("NOT_FOUND");
    return found;
  }

  sets.push(`"updatedAt" = NOW()`);
  params.push(leaveId, staffId, organizationId);

  const { rowCount } = await pool.query(
    `UPDATE "StaffLeave" l SET ${sets.join(", ")}
     FROM "Staff" st
     WHERE l.id = $${pi} AND l."staffId" = $${pi + 1} AND st.id = l."staffId" AND st."organizationId" = $${pi + 2}`,
    params,
  );
  if (!rowCount) throw new Error("NOT_FOUND");

  const leaves = await loadLeaves(staffId, organizationId);
  const updated = leaves.find((l) => l.id === leaveId);
  if (!updated) throw new Error("NOT_FOUND");
  return updated;
}

export { STAFF_NAME_SQL };
