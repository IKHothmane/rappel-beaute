import { randomBytes } from "crypto";
import { Pool, type PoolClient } from "pg";
import type {
  CreateServiceInput,
  ServiceAgendaOption,
  ServiceDetail,
  ServiceFormOptions,
  ServiceListItem,
  UpdateServiceInput,
} from "@/types/service";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function newId(prefix: string) {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

type ServiceRow = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: string;
  durationMin: number;
  prepTimeMin: number;
  cleanupTimeMin: number;
  deposit: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  staffCount: string;
  staffNames: string[] | null;
  resourceCount: string;
  productCount: string;
};

function rowToListItem(row: ServiceRow): ServiceListItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    price: parseFloat(row.price),
    durationMin: row.durationMin,
    prepTimeMin: row.prepTimeMin,
    cleanupTimeMin: row.cleanupTimeMin,
    deposit: row.deposit != null ? parseFloat(row.deposit) : null,
    active: row.active,
    staffCount: parseInt(row.staffCount, 10) || 0,
    staffNames: row.staffNames ?? [],
    resourceCount: parseInt(row.resourceCount, 10) || 0,
    productCount: parseInt(row.productCount, 10) || 0,
  };
}

const LIST_SELECT = `
  SELECT
    s.id,
    s.name,
    s.description,
    s.category,
    s.price::text,
    s."durationMin",
    s."prepTimeMin",
    s."cleanupTimeMin",
    s.deposit::text,
    s.active,
    s."createdAt",
    s."updatedAt",
    COUNT(DISTINCT ss."staffId")::text AS "staffCount",
    COALESCE(array_agg(DISTINCT TRIM(CONCAT(st."firstName", ' ', NULLIF(st."lastName", ''))) FILTER (WHERE st."firstName" IS NOT NULL), '{}') AS "staffNames",
    COUNT(DISTINCT sr."resourceId")::text AS "resourceCount",
    COUNT(DISTINCT sp."productId")::text AS "productCount"
  FROM "Service" s
  LEFT JOIN "ServiceStaff" ss ON ss."serviceId" = s.id
  LEFT JOIN "Staff" st ON st.id = ss."staffId"
  LEFT JOIN "ServiceResource" sr ON sr."serviceId" = s.id
  LEFT JOIN "ServiceProduct" sp ON sp."serviceId" = s.id
`;

export async function listServices(
  organizationId: string,
  opts: {
    page: number;
    limit: number;
    search?: string;
    category?: string | null;
    active?: boolean | null;
    agenda?: boolean;
  },
): Promise<{ items: ServiceListItem[] | ServiceAgendaOption[]; total: number; categories: string[] }> {
  const { page, limit, search, category, active, agenda } = opts;
  const conditions = [`s."organizationId" = $1`];
  const params: unknown[] = [organizationId];
  let pi = 2;

  if (search) {
    conditions.push(`(s.name ILIKE $${pi} OR COALESCE(s.category, '') ILIKE $${pi} OR COALESCE(s.description, '') ILIKE $${pi})`);
    params.push(`%${search}%`);
    pi++;
  }
  if (category) {
    conditions.push(`s.category = $${pi}`);
    params.push(category);
    pi++;
  }
  if (active !== null && active !== undefined) {
    conditions.push(`s.active = $${pi}`);
    params.push(active);
    pi++;
  }

  const where = conditions.join(" AND ");

  const { rows: catRows } = await pool.query<{ category: string }>(
    `SELECT DISTINCT category FROM "Service"
     WHERE "organizationId" = $1 AND category IS NOT NULL AND category <> ''
     ORDER BY category`,
    [organizationId],
  );

  if (agenda) {
    const { rows } = await pool.query<{
      id: string;
      name: string;
      price: string;
      durationMin: number;
      prepTimeMin: number;
      cleanupTimeMin: number;
      deposit: string | null;
      active: boolean;
      staffIds: string[];
      resourceIds: string[];
    }>(
      `SELECT
        s.id,
        s.name,
        s.price::text,
        s."durationMin",
        s."prepTimeMin",
        s."cleanupTimeMin",
        s.deposit::text,
        s.active,
        COALESCE(array_agg(DISTINCT ss."staffId") FILTER (WHERE ss."staffId" IS NOT NULL), '{}') AS "staffIds",
        COALESCE(array_agg(DISTINCT sr."resourceId") FILTER (WHERE sr."resourceId" IS NOT NULL), '{}') AS "resourceIds"
      FROM "Service" s
      LEFT JOIN "ServiceStaff" ss ON ss."serviceId" = s.id
      LEFT JOIN "ServiceResource" sr ON sr."serviceId" = s.id
      WHERE ${where} AND s.active = true
      GROUP BY s.id
      ORDER BY s.name`,
      params,
    );

    return {
      items: rows.map((r) => ({
        id: r.id,
        name: r.name,
        price: parseFloat(r.price),
        durationMin: r.durationMin,
        prepTimeMin: r.prepTimeMin,
        cleanupTimeMin: r.cleanupTimeMin,
        totalBlockMin: r.prepTimeMin + r.durationMin + r.cleanupTimeMin,
        deposit: r.deposit != null ? parseFloat(r.deposit) : null,
        active: r.active,
        staffIds: r.staffIds ?? [],
        resourceIds: r.resourceIds ?? [],
      })),
      total: rows.length,
      categories: catRows.map((c) => c.category),
    };
  }

  const countSql = `
    SELECT COUNT(DISTINCT s.id)::int AS total
    FROM "Service" s
    WHERE ${where}
  `;

  const listSql = `
    ${LIST_SELECT}
    WHERE ${where}
    GROUP BY s.id
    ORDER BY s.active DESC, s.name ASC
    LIMIT $${pi} OFFSET $${pi + 1}
  `;

  const offset = (page - 1) * limit;
  const [countRes, listRes] = await Promise.all([
    pool.query<{ total: number }>(countSql, params),
    pool.query<ServiceRow>(listSql, [...params, limit, offset]),
  ]);

  return {
    items: listRes.rows.map(rowToListItem),
    total: countRes.rows[0]?.total ?? 0,
    categories: catRows.map((c) => c.category),
  };
}

async function loadRelations(serviceId: string, organizationId: string) {
  const [staff, resources, products, commissions] = await Promise.all([
    pool.query<{ staffId: string; staffName: string }>(
      `SELECT ss."staffId", TRIM(CONCAT(st."firstName", ' ', NULLIF(st."lastName", ''))) AS "staffName"
       FROM "ServiceStaff" ss
       JOIN "Staff" st ON st.id = ss."staffId"
       WHERE ss."serviceId" = $1 AND st."organizationId" = $2
       ORDER BY st.name`,
      [serviceId, organizationId],
    ),
    pool.query<{ resourceId: string; resourceName: string; resourceType: string; quantity: number }>(
      `SELECT sr."resourceId", r.name AS "resourceName", r.type AS "resourceType", sr.quantity
       FROM "ServiceResource" sr
       JOIN "Resource" r ON r.id = sr."resourceId"
       WHERE sr."serviceId" = $1 AND r."organizationId" = $2
       ORDER BY r.name`,
      [serviceId, organizationId],
    ),
    pool.query<{ productId: string; productName: string; productSku: string; quantity: string; unit: string }>(
      `SELECT sp."productId", p.name AS "productName", p.sku AS "productSku", sp.quantity::text, sp.unit
       FROM "ServiceProduct" sp
       JOIN "Product" p ON p.id = sp."productId"
       WHERE sp."serviceId" = $1 AND p."organizationId" = $2
       ORDER BY p.name`,
      [serviceId, organizationId],
    ),
    pool.query<{
      id: string;
      staffId: string;
      staffName: string;
      type: string;
      percentage: string | null;
      fixedAmount: string | null;
    }>(
      `SELECT sc.id, sc."staffId", TRIM(CONCAT(st."firstName", ' ', NULLIF(st."lastName", ''))) AS "staffName", sc.type::text,
              sc.percentage::text, sc."fixedAmount"::text
       FROM "ServiceCommission" sc
       JOIN "Staff" st ON st.id = sc."staffId"
       WHERE sc."serviceId" = $1 AND st."organizationId" = $2
       ORDER BY st.name`,
      [serviceId, organizationId],
    ),
  ]);

  return { staff: staff.rows, resources: resources.rows, products: products.rows, commissions: commissions.rows };
}

export async function getServiceById(
  organizationId: string,
  serviceId: string,
): Promise<ServiceDetail | null> {
  const { rows } = await pool.query<ServiceRow>(
    `${LIST_SELECT}
     WHERE s.id = $1 AND s."organizationId" = $2
     GROUP BY s.id`,
    [serviceId, organizationId],
  );
  if (!rows[0]) return null;

  const base = rowToListItem(rows[0]);
  const rel = await loadRelations(serviceId, organizationId);

  return {
    ...base,
    totalBlockMin: base.prepTimeMin + base.durationMin + base.cleanupTimeMin,
    createdAt: rows[0].createdAt.toISOString(),
    updatedAt: rows[0].updatedAt.toISOString(),
    staff: rel.staff.map((s) => ({ staffId: s.staffId, staffName: s.staffName })),
    resources: rel.resources.map((r) => ({
      resourceId: r.resourceId,
      resourceName: r.resourceName,
      resourceType: r.resourceType,
      quantity: r.quantity,
    })),
    products: rel.products.map((p) => ({
      productId: p.productId,
      productName: p.productName,
      productSku: p.productSku,
      quantity: parseFloat(p.quantity),
      unit: p.unit,
    })),
    commissions: rel.commissions.map((c) => ({
      id: c.id,
      staffId: c.staffId,
      staffName: c.staffName,
      type: c.type as "PERCENTAGE" | "FIXED",
      percentage: c.percentage != null ? parseFloat(c.percentage) : null,
      fixedAmount: c.fixedAmount != null ? parseFloat(c.fixedAmount) : null,
    })),
  };
}

async function syncStaff(client: PoolClient, serviceId: string, staffIds: string[], organizationId: string) {
  await client.query(`DELETE FROM "ServiceStaff" WHERE "serviceId" = $1`, [serviceId]);
  for (const staffId of staffIds) {
    await client.query(
      `INSERT INTO "ServiceStaff" ("serviceId", "staffId")
       SELECT $1, st.id FROM "Staff" st
       WHERE st.id = $2 AND st."organizationId" = $3
       ON CONFLICT DO NOTHING`,
      [serviceId, staffId, organizationId],
    );
  }
}

async function syncResources(
  client: PoolClient,
  serviceId: string,
  resources: { resourceId: string; quantity?: number }[],
  organizationId: string,
) {
  await client.query(`DELETE FROM "ServiceResource" WHERE "serviceId" = $1`, [serviceId]);
  for (const r of resources) {
    await client.query(
      `INSERT INTO "ServiceResource" ("serviceId", "resourceId", quantity)
       SELECT $1, res.id, $3 FROM "Resource" res
       WHERE res.id = $2 AND res."organizationId" = $4
       ON CONFLICT DO NOTHING`,
      [serviceId, r.resourceId, r.quantity ?? 1, organizationId],
    );
  }
}

async function syncProducts(
  client: PoolClient,
  serviceId: string,
  products: { productId: string; quantity: number; unit: string }[],
  organizationId: string,
) {
  await client.query(`DELETE FROM "ServiceProduct" WHERE "serviceId" = $1`, [serviceId]);
  for (const p of products) {
    await client.query(
      `INSERT INTO "ServiceProduct" ("serviceId", "productId", quantity, unit)
       SELECT $1, pr.id, $3, $4 FROM "Product" pr
       WHERE pr.id = $2 AND pr."organizationId" = $5
       ON CONFLICT DO NOTHING`,
      [serviceId, p.productId, p.quantity, p.unit, organizationId],
    );
  }
}

async function syncCommissions(
  client: PoolClient,
  serviceId: string,
  commissions: NonNullable<CreateServiceInput["commissions"]>,
  organizationId: string,
) {
  await client.query(`DELETE FROM "ServiceCommission" WHERE "serviceId" = $1`, [serviceId]);
  for (const c of commissions) {
    const id = newId("sc");
    await client.query(
      `INSERT INTO "ServiceCommission" (id, "serviceId", "staffId", type, percentage, "fixedAmount")
       SELECT $1, $2, st.id, $4::"CommissionType", $5, $6
       FROM "Staff" st
       WHERE st.id = $3 AND st."organizationId" = $7`,
      [
        id,
        serviceId,
        c.staffId,
        c.type,
        c.type === "PERCENTAGE" ? c.percentage ?? null : null,
        c.type === "FIXED" ? c.fixedAmount ?? null : null,
        organizationId,
      ],
    );
  }
}

export async function createService(
  organizationId: string,
  input: CreateServiceInput,
): Promise<ServiceDetail> {
  const id = newId("svc");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO "Service" (
        id, "organizationId", name, description, category, price, "durationMin",
        "prepTimeMin", "cleanupTimeMin", deposit, active, "updatedAt"
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())`,
      [
        id,
        organizationId,
        input.name,
        input.description ?? null,
        input.category ?? null,
        input.price,
        input.durationMin,
        input.prepTimeMin ?? 0,
        input.cleanupTimeMin ?? 0,
        input.deposit ?? null,
        input.active !== false,
      ],
    );

    if (input.staffIds?.length) await syncStaff(client, id, input.staffIds, organizationId);
    if (input.resources?.length) await syncResources(client, id, input.resources, organizationId);
    if (input.products?.length) await syncProducts(client, id, input.products, organizationId);
    if (input.commissions?.length) await syncCommissions(client, id, input.commissions, organizationId);

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  const detail = await getServiceById(organizationId, id);
  if (!detail) throw new Error("Service introuvable après création.");
  return detail;
}

export type PriceChangeAudit = {
  serviceId: string;
  serviceName: string;
  oldPrice: number;
  newPrice: number;
};

export async function updateService(
  organizationId: string,
  serviceId: string,
  input: UpdateServiceInput,
): Promise<{ service: ServiceDetail; priceChange: PriceChangeAudit | null }> {
  const existing = await getServiceById(organizationId, serviceId);
  if (!existing) throw new Error("NOT_FOUND");

  const client = await pool.connect();
  let priceChange: PriceChangeAudit | null = null;

  try {
    await client.query("BEGIN");

    const sets: string[] = [];
    const params: unknown[] = [];
    let pi = 1;

    const setField = (col: string, val: unknown) => {
      sets.push(`"${col}" = $${pi}`);
      params.push(val);
      pi++;
    };

    if (input.name !== undefined) setField("name", input.name);
    if (input.description !== undefined) setField("description", input.description ?? null);
    if (input.category !== undefined) setField("category", input.category ?? null);
    if (input.price !== undefined) {
      if (input.price !== existing.price) {
        priceChange = {
          serviceId,
          serviceName: existing.name,
          oldPrice: existing.price,
          newPrice: input.price,
        };
      }
      setField("price", input.price);
    }
    if (input.durationMin !== undefined) setField("durationMin", input.durationMin);
    if (input.prepTimeMin !== undefined) setField("prepTimeMin", input.prepTimeMin);
    if (input.cleanupTimeMin !== undefined) setField("cleanupTimeMin", input.cleanupTimeMin);
    if (input.deposit !== undefined) setField("deposit", input.deposit ?? null);
    if (input.active !== undefined) setField("active", input.active);

    if (sets.length > 0) {
      sets.push(`"updatedAt" = NOW()`);
      params.push(serviceId, organizationId);
      await client.query(
        `UPDATE "Service" SET ${sets.join(", ")} WHERE id = $${pi} AND "organizationId" = $${pi + 1}`,
        params,
      );
    }

    if (input.staffIds !== undefined) await syncStaff(client, serviceId, input.staffIds, organizationId);
    if (input.resources !== undefined) await syncResources(client, serviceId, input.resources, organizationId);
    if (input.products !== undefined) await syncProducts(client, serviceId, input.products, organizationId);
    if (input.commissions !== undefined) await syncCommissions(client, serviceId, input.commissions, organizationId);

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  const service = await getServiceById(organizationId, serviceId);
  if (!service) throw new Error("NOT_FOUND");
  return { service, priceChange };
}

export async function getServiceFormOptions(organizationId: string): Promise<ServiceFormOptions> {
  const [staff, resources, products] = await Promise.all([
    pool.query<{ id: string; firstName: string; lastName: string; position: string | null }>(
      `SELECT id, "firstName", "lastName", position FROM "Staff"
       WHERE "organizationId" = $1 AND status = 'ACTIVE' AND "deletedAt" IS NULL
       ORDER BY "firstName", "lastName"`,
      [organizationId],
    ),
    pool.query<{ id: string; name: string; type: string }>(
      `SELECT id, name, type::text AS type FROM "Resource"
       WHERE "organizationId" = $1 AND active = true AND "deletedAt" IS NULL
       ORDER BY name`,
      [organizationId],
    ),
    pool.query<{ id: string; name: string; sku: string; unit: string }>(
      `SELECT id, name, sku, unit::text AS unit FROM "Product"
       WHERE "organizationId" = $1 AND "deletedAt" IS NULL AND active = true
       ORDER BY name`,
      [organizationId],
    ),
  ]);

  return {
    staff: staff.rows.map((s) => ({
      id: s.id,
      name: `${s.firstName} ${s.lastName}`.trim(),
      role: s.position,
    })),
    resources: resources.rows,
    products: products.rows,
  };
}

export async function verifyStaffBelongsToService(
  organizationId: string,
  serviceId: string,
  staffId: string,
): Promise<boolean> {
  const { rows } = await pool.query<{ ok: boolean }>(
    `SELECT EXISTS (
      SELECT 1 FROM "ServiceStaff" ss
      JOIN "Service" s ON s.id = ss."serviceId"
      WHERE ss."serviceId" = $1 AND ss."staffId" = $2 AND s."organizationId" = $3
    ) AS ok`,
    [serviceId, staffId, organizationId],
  );
  return rows[0]?.ok ?? false;
}
