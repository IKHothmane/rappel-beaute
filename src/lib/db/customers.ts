import { Pool, type PoolClient } from "pg";
import type {
  CreateCustomerInput,
  CustomerAppointmentHistory,
  CustomerDetail,
  CustomerKpis,
  CustomerListItem,
  CustomerSegment,
  CustomerStatus,
  UpdateCustomerInput,
} from "@/types/customer";
import {
  AT_RISK_DAYS,
  NEW_CUSTOMER_DAYS,
  VIP_MIN_REVENUE,
  VIP_MIN_VISITS,
} from "@/types/customer";
import { normalizePhone } from "@/lib/validation/customer";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

type DbClient = Pool | PoolClient;

type CustomerStatsRow = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  status: CustomerStatus;
  birthDate: Date | null;
  address: string | null;
  instagram: string | null;
  notes: string | null;
  marketingWhatsapp: boolean;
  marketingEmail: boolean;
  marketingSms: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  visits: string;
  revenue: string;
  lastVisitAt: Date | null;
};

const STATS_FROM = `
  FROM "Customer" c
  LEFT JOIN "Appointment" a
    ON a."customerId" = c.id
    AND a.status = 'COMPLETED'
  WHERE c."organizationId" = $1
    AND c."deletedAt" IS NULL
`;

function computeSegment(row: {
  status: CustomerStatus;
  visits: number;
  revenue: number;
  createdAt: Date;
  lastVisitAt: Date | null;
}): CustomerSegment {
  if (row.status === "INACTIVE" || row.status === "ARCHIVED") return "INACTIVE";
  if (row.status === "AT_RISK") return "AT_RISK";
  if (row.status === "NEW") return "NEW";

  const daysSinceCreated =
    (Date.now() - row.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceCreated <= NEW_CUSTOMER_DAYS && row.visits <= 1) return "NEW";

  if (row.revenue >= VIP_MIN_REVENUE || row.visits >= VIP_MIN_VISITS) return "VIP";

  if (row.lastVisitAt) {
    const daysSinceVisit =
      (Date.now() - row.lastVisitAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceVisit > AT_RISK_DAYS) return "AT_RISK";
  } else if (daysSinceCreated > AT_RISK_DAYS) {
    return "AT_RISK";
  }

  return "ACTIVE";
}

function rowToListItem(row: CustomerStatsRow): CustomerListItem {
  const visits = parseInt(row.visits, 10) || 0;
  const revenue = parseFloat(row.revenue) || 0;
  const averageTicket = visits > 0 ? Math.round((revenue / visits) * 100) / 100 : 0;

  const base = {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    phone: row.phone,
    email: row.email,
    status: row.status,
    visits,
    revenue,
    averageTicket,
    lastVisitAt: row.lastVisitAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };

  return {
    ...base,
    segment: computeSegment({
      status: row.status,
      visits,
      revenue,
      createdAt: row.createdAt,
      lastVisitAt: row.lastVisitAt,
    }),
  };
}

function rowToDetail(row: CustomerStatsRow): CustomerDetail {
  const list = rowToListItem(row);
  return {
    ...list,
    birthDate: row.birthDate?.toISOString() ?? null,
    address: row.address,
    instagram: row.instagram,
    notes: row.notes,
    marketingWhatsapp: row.marketingWhatsapp,
    marketingEmail: row.marketingEmail,
    marketingSms: row.marketingSms,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function segmentFilterSql(segment: CustomerSegment, paramOffset: number): string {
  switch (segment) {
    case "VIP":
      return `HAVING (
        COALESCE(SUM(a.price), 0) >= ${VIP_MIN_REVENUE}
        OR COUNT(a.id) FILTER (WHERE a.status = 'COMPLETED') >= ${VIP_MIN_VISITS}
      )`;
    case "NEW":
      return `HAVING (
        c.status = 'NEW'
        OR (c."createdAt" >= NOW() - INTERVAL '${NEW_CUSTOMER_DAYS} days'
            AND COUNT(a.id) FILTER (WHERE a.status = 'COMPLETED') <= 1)
      )`;
    case "INACTIVE":
      return `HAVING c.status IN ('INACTIVE', 'ARCHIVED')`;
    case "AT_RISK":
      return `HAVING (
        c.status = 'AT_RISK'
        OR (
          MAX(a."startAt") FILTER (WHERE a.status = 'COMPLETED') IS NOT NULL
          AND MAX(a."startAt") FILTER (WHERE a.status = 'COMPLETED') < NOW() - INTERVAL '${AT_RISK_DAYS} days'
        )
        OR (
          MAX(a."startAt") FILTER (WHERE a.status = 'COMPLETED') IS NULL
          AND c."createdAt" < NOW() - INTERVAL '${AT_RISK_DAYS} days'
          AND c.status NOT IN ('INACTIVE', 'ARCHIVED', 'NEW')
        )
      )`;
    case "ACTIVE":
      return `HAVING c.status = 'ACTIVE'`;
    default:
      return "";
  }
}

export async function listCustomers(
  organizationId: string,
  opts: {
    page: number;
    limit: number;
    search?: string;
    status?: CustomerStatus | null;
    segment?: CustomerSegment;
  },
): Promise<{ items: CustomerListItem[]; total: number; kpis: CustomerKpis }> {
  const { page, limit, search, status, segment = "ALL" } = opts;
  const offset = (page - 1) * limit;

  const conditions = [`c."organizationId" = $1`, `c."deletedAt" IS NULL`];
  const params: unknown[] = [organizationId];
  let pi = 2;

  if (search) {
    conditions.push(
      `(c."firstName" ILIKE $${pi} OR c."lastName" ILIKE $${pi} OR c.phone ILIKE $${pi} OR COALESCE(c.email, '') ILIKE $${pi})`,
    );
    params.push(`%${search}%`);
    pi++;
  }

  if (status) {
    conditions.push(`c.status = $${pi}`);
    params.push(status);
    pi++;
  }

  const where = conditions.join(" AND ");
  const having = segment !== "ALL" ? segmentFilterSql(segment, pi) : "";

  const countSql = `
    SELECT COUNT(*)::int AS total FROM (
      SELECT c.id
      FROM "Customer" c
      LEFT JOIN "Appointment" a ON a."customerId" = c.id AND a.status = 'COMPLETED'
      WHERE ${where}
      GROUP BY c.id, c.status, c."createdAt"
      ${having}
    ) sub
  `;

  const listSql = `
    SELECT
      c.id,
      c."firstName",
      c."lastName",
      c.phone,
      c.email,
      c.status,
      c."birthDate",
      c.address,
      c.instagram,
      c.notes,
      c."marketingWhatsapp",
      c."marketingEmail",
      c."marketingSms",
      c."createdAt",
      c."updatedAt",
      c."deletedAt",
      COUNT(a.id) FILTER (WHERE a.status = 'COMPLETED')::text AS visits,
      COALESCE(SUM(a.price) FILTER (WHERE a.status = 'COMPLETED'), 0)::text AS revenue,
      MAX(a."startAt") FILTER (WHERE a.status = 'COMPLETED') AS "lastVisitAt"
    FROM "Customer" c
    LEFT JOIN "Appointment" a ON a."customerId" = c.id AND a.status = 'COMPLETED'
    WHERE ${where}
    GROUP BY c.id
    ${having}
    ORDER BY c."lastName", c."firstName"
    LIMIT $${pi} OFFSET $${pi + 1}
  `;

  const kpisSql = `
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE seg = 'NEW')::int AS "newCount",
      COUNT(*) FILTER (WHERE seg = 'VIP')::int AS "vipCount",
      COUNT(*) FILTER (WHERE seg = 'INACTIVE')::int AS "inactiveCount"
    FROM (
      SELECT
        c.id,
        CASE
          WHEN c.status IN ('INACTIVE', 'ARCHIVED') THEN 'INACTIVE'
          WHEN c.status = 'NEW' OR (c."createdAt" >= NOW() - INTERVAL '${NEW_CUSTOMER_DAYS} days'
            AND COALESCE(v.visits, 0) <= 1) THEN 'NEW'
          WHEN COALESCE(v.revenue, 0) >= ${VIP_MIN_REVENUE} OR COALESCE(v.visits, 0) >= ${VIP_MIN_VISITS} THEN 'VIP'
          ELSE 'ACTIVE'
        END AS seg
      FROM "Customer" c
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int AS visits,
          COALESCE(SUM(price), 0)::float AS revenue
        FROM "Appointment" a
        WHERE a."customerId" = c.id AND a.status = 'COMPLETED'
      ) v ON true
      WHERE c."organizationId" = $1 AND c."deletedAt" IS NULL
    ) t
  `;

  const [countRes, listRes, kpisRes] = await Promise.all([
    pool.query<{ total: number }>(countSql, params),
    pool.query<CustomerStatsRow>(listSql, [...params, limit, offset]),
    pool.query<CustomerKpis>(kpisSql, [organizationId]),
  ]);

  return {
    items: listRes.rows.map(rowToListItem),
    total: countRes.rows[0]?.total ?? 0,
    kpis: kpisRes.rows[0] ?? { total: 0, newCount: 0, vipCount: 0, inactiveCount: 0 },
  };
}

export async function getCustomerById(
  id: string,
  organizationId: string,
): Promise<CustomerDetail | null> {
  const { rows } = await pool.query<CustomerStatsRow>(
    `SELECT
      c.id,
      c."firstName",
      c."lastName",
      c.phone,
      c.email,
      c.status,
      c."birthDate",
      c.address,
      c.instagram,
      c.notes,
      c."marketingWhatsapp",
      c."marketingEmail",
      c."marketingSms",
      c."createdAt",
      c."updatedAt",
      c."deletedAt",
      COUNT(a.id) FILTER (WHERE a.status = 'COMPLETED')::text AS visits,
      COALESCE(SUM(a.price) FILTER (WHERE a.status = 'COMPLETED'), 0)::text AS revenue,
      MAX(a."startAt") FILTER (WHERE a.status = 'COMPLETED') AS "lastVisitAt"
    FROM "Customer" c
    LEFT JOIN "Appointment" a ON a."customerId" = c.id AND a.status = 'COMPLETED'
    WHERE c.id = $2 AND c."organizationId" = $1 AND c."deletedAt" IS NULL
    GROUP BY c.id`,
    [organizationId, id],
  );
  return rows[0] ? rowToDetail(rows[0]) : null;
}

export async function getCustomerHistory(
  customerId: string,
  organizationId: string,
): Promise<CustomerAppointmentHistory[]> {
  const { rows } = await pool.query<{
    id: string;
    startAt: Date;
    serviceName: string;
    price: string;
    status: string;
  }>(
    `SELECT a.id, a."startAt", s.name AS "serviceName", a.price::text, a.status
     FROM "Appointment" a
     JOIN "Service" s ON s.id = a."serviceId"
     JOIN "Customer" c ON c.id = a."customerId"
     WHERE a."customerId" = $1 AND c."organizationId" = $2
     ORDER BY a."startAt" DESC
     LIMIT 50`,
    [customerId, organizationId],
  );

  return rows.map((r) => ({
    id: r.id,
    startAt: r.startAt.toISOString(),
    serviceName: r.serviceName,
    price: parseFloat(r.price),
    status: r.status,
  }));
}

export async function createCustomer(
  organizationId: string,
  input: CreateCustomerInput,
): Promise<CustomerDetail> {
  const phone = normalizePhone(input.phone);
  const id = `cust-${Date.now()}`;

  await pool.query(
    `INSERT INTO "Customer" (
      id, "organizationId", "firstName", "lastName", phone, email,
      "birthDate", address, instagram, notes, status,
      "marketingWhatsapp", "marketingEmail", "marketingSms", "updatedAt"
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'NEW',$11,$12,$13,NOW())`,
    [
      id,
      organizationId,
      input.firstName,
      input.lastName,
      phone,
      input.email ?? null,
      input.birthDate ? new Date(input.birthDate) : null,
      input.address ?? null,
      input.instagram ?? null,
      input.notes ?? null,
      input.marketingWhatsapp ?? false,
      input.marketingEmail ?? false,
      input.marketingSms ?? false,
    ],
  );

  const detail = await getCustomerById(id, organizationId);
  if (!detail) throw new Error("Cliente créée introuvable.");
  return detail;
}

export async function findCustomerByPhone(
  organizationId: string,
  phone: string,
  client?: DbClient,
): Promise<{ id: string; marketingWhatsapp: boolean; marketingEmail: boolean } | null> {
  const c = client ?? pool;
  const normalized = normalizePhone(phone);
  const { rows } = await c.query<{
    id: string;
    marketingWhatsapp: boolean;
    marketingEmail: boolean;
  }>(
    `SELECT id, "marketingWhatsapp", "marketingEmail"
     FROM "Customer"
     WHERE "organizationId" = $1 AND phone = $2 AND "deletedAt" IS NULL
     LIMIT 1`,
    [organizationId, normalized],
  );
  return rows[0] ?? null;
}

/** Réutilise une cliente existante (organizationId + phone) ou en crée une nouvelle */
export async function findOrCreateCustomerByPhone(
  organizationId: string,
  input: {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string | null;
    marketingOptIn?: boolean;
  },
  client?: DbClient,
): Promise<{ customerId: string; created: boolean }> {
  const c = client ?? pool;
  const phone = normalizePhone(input.phone);
  const existing = await findCustomerByPhone(organizationId, phone, c);

  if (existing) {
    const marketingWhatsapp = input.marketingOptIn || existing.marketingWhatsapp;
    const marketingEmail = input.marketingOptIn || existing.marketingEmail;
    await c.query(
      `UPDATE "Customer"
       SET "firstName" = $1, "lastName" = $2,
           email = COALESCE($3, email),
           "marketingWhatsapp" = $4, "marketingEmail" = $5, "updatedAt" = NOW()
       WHERE id = $6`,
      [
        input.firstName.trim(),
        input.lastName.trim(),
        input.email?.trim() || null,
        marketingWhatsapp,
        marketingEmail,
        existing.id,
      ],
    );
    return { customerId: existing.id, created: false };
  }

  const id = `cust-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const optIn = input.marketingOptIn ?? false;
  await c.query(
    `INSERT INTO "Customer" (
      id, "organizationId", "firstName", "lastName", phone, email, status,
      "marketingWhatsapp", "marketingEmail", "marketingSms", "updatedAt"
    ) VALUES ($1,$2,$3,$4,$5,$6,'NEW',$7,$8,false,NOW())`,
    [
      id,
      organizationId,
      input.firstName.trim(),
      input.lastName.trim(),
      phone,
      input.email?.trim() || null,
      optIn,
      optIn,
    ],
  );
  return { customerId: id, created: true };
}

export async function updateCustomer(
  id: string,
  organizationId: string,
  input: UpdateCustomerInput,
): Promise<CustomerDetail | null> {
  if (input.archived) {
    await pool.query(
      `UPDATE "Customer"
       SET status = 'ARCHIVED', "deletedAt" = NOW(), "updatedAt" = NOW()
       WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,
      [id, organizationId],
    );
    return getCustomerById(id, organizationId);
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  const set = (col: string, val: unknown) => {
    fields.push(`"${col}" = $${i++}`);
    values.push(val);
  };

  if (input.firstName !== undefined) set("firstName", input.firstName);
  if (input.lastName !== undefined) set("lastName", input.lastName);
  if (input.phone !== undefined) set("phone", normalizePhone(input.phone));
  if (input.email !== undefined) set("email", input.email ?? null);
  if (input.birthDate !== undefined) {
    set("birthDate", input.birthDate ? new Date(input.birthDate) : null);
  }
  if (input.address !== undefined) set("address", input.address ?? null);
  if (input.instagram !== undefined) set("instagram", input.instagram ?? null);
  if (input.notes !== undefined) set("notes", input.notes ?? null);
  if (input.status !== undefined) set("status", input.status);
  if (input.marketingWhatsapp !== undefined) set("marketingWhatsapp", input.marketingWhatsapp);
  if (input.marketingEmail !== undefined) set("marketingEmail", input.marketingEmail);
  if (input.marketingSms !== undefined) set("marketingSms", input.marketingSms);

  if (fields.length === 0) return getCustomerById(id, organizationId);

  fields.push(`"updatedAt" = NOW()`);
  values.push(id, organizationId);

  const result = await pool.query(
    `UPDATE "Customer" SET ${fields.join(", ")}
     WHERE id = $${i} AND "organizationId" = $${i + 1} AND "deletedAt" IS NULL`,
    values,
  );

  if (result.rowCount === 0) return null;
  return getCustomerById(id, organizationId);
}

export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "23505"
  );
}
