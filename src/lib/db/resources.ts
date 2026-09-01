import { randomBytes } from "crypto";
import { Pool } from "pg";
import type {
  CreateMaintenanceInput,
  CreateResourceInput,
  ResourceAgendaContext,
  ResourceAvailability,
  ResourceDetail,
  ResourceListItem,
  ResourceMaintenanceItem,
  ResourceType,
  UpdateMaintenanceInput,
  UpdateResourceInput,
} from "@/types/resource";
import { isBlockingMaintenance } from "@/types/resource";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function newId(prefix: string) {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

type ResourceRow = {
  id: string;
  name: string;
  type: ResourceType;
  capacity: number;
  location: string | null;
  notes: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  serviceCount: string;
  serviceNames: string[] | null;
  appointmentCount: string;
  upcomingMaintenance: boolean | null;
};

function rowToListItem(row: ResourceRow): ResourceListItem {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    capacity: row.capacity,
    location: row.location,
    notes: row.notes,
    active: row.active,
    serviceCount: parseInt(row.serviceCount, 10) || 0,
    serviceNames: row.serviceNames ?? [],
    upcomingMaintenance: Boolean(row.upcomingMaintenance),
    appointmentCount: parseInt(row.appointmentCount, 10) || 0,
  };
}

async function loadMaintenances(resourceId: string): Promise<ResourceMaintenanceItem[]> {
  const { rows } = await pool.query<{
    id: string;
    startAt: Date;
    endAt: Date;
    type: string;
    reason: string | null;
    status: string;
    createdAt: Date;
  }>(
    `SELECT id, "startAt", "endAt", type::text, reason, status::text, "createdAt"
     FROM "ResourceMaintenance"
     WHERE "resourceId" = $1
     ORDER BY "startAt" DESC`,
    [resourceId],
  );
  return rows.map((r) => ({
    id: r.id,
    startAt: r.startAt.toISOString(),
    endAt: r.endAt.toISOString(),
    type: r.type as ResourceMaintenanceItem["type"],
    reason: r.reason,
    status: r.status as ResourceMaintenanceItem["status"],
    createdAt: r.createdAt.toISOString(),
  }));
}

async function syncServices(resourceId: string, serviceIds: string[], organizationId: string) {
  await pool.query(`DELETE FROM "ServiceResource" WHERE "resourceId" = $1`, [resourceId]);
  for (const serviceId of serviceIds) {
    await pool.query(
      `INSERT INTO "ServiceResource" ("serviceId", "resourceId", quantity)
       SELECT s.id, $2, 1 FROM "Service" s
       WHERE s.id = $1 AND s."organizationId" = $3
       ON CONFLICT DO NOTHING`,
      [serviceId, resourceId, organizationId],
    );
  }
}

export async function listResources(
  organizationId: string,
  opts: {
    page: number;
    limit: number;
    search?: string;
    type?: ResourceType | null;
    active?: boolean | null;
    serviceId?: string | null;
    agenda?: boolean;
  },
): Promise<{ items: ResourceListItem[] | ResourceAgendaContext[]; total: number }> {
  const { page, limit, search, type, active, serviceId, agenda } = opts;
  const conditions = [`r."organizationId" = $1`, `r."deletedAt" IS NULL`];
  const params: unknown[] = [organizationId];
  let pi = 2;

  if (search) {
    conditions.push(
      `(r.name ILIKE $${pi} OR COALESCE(r.location, '') ILIKE $${pi} OR COALESCE(r.notes, '') ILIKE $${pi})`,
    );
    params.push(`%${search}%`);
    pi++;
  }
  if (type) {
    conditions.push(`r.type = $${pi}::"ResourceType"`);
    params.push(type);
    pi++;
  }
  if (active !== null && active !== undefined) {
    conditions.push(`r.active = $${pi}`);
    params.push(active);
    pi++;
  }
  if (serviceId) {
    conditions.push(
      `EXISTS (SELECT 1 FROM "ServiceResource" sr WHERE sr."resourceId" = r.id AND sr."serviceId" = $${pi})`,
    );
    params.push(serviceId);
    pi++;
  }

  const where = conditions.join(" AND ");

  if (agenda) {
    const { rows } = await pool.query<{
      id: string;
      name: string;
      type: ResourceType;
      active: boolean;
    }>(
      `SELECT r.id, r.name, r.type, r.active
       FROM "Resource" r
       WHERE ${where} AND r.active = true
       ORDER BY r.name`,
      params,
    );

    const items: ResourceAgendaContext[] = [];
    for (const row of rows) {
      const maintenances = await loadMaintenances(row.id);
      items.push({
        id: row.id,
        name: row.name,
        type: row.type,
        active: row.active,
        maintenances: maintenances.filter((m) => isBlockingMaintenance(m.status)),
      });
    }
    return { items, total: items.length };
  }

  const countSql = `SELECT COUNT(*)::int AS total FROM "Resource" r WHERE ${where}`;
  const listSql = `
    SELECT
      r.id, r.name, r.type, r.capacity, r.location, r.notes, r.active,
      r."createdAt", r."updatedAt",
      COUNT(DISTINCT sr."serviceId")::text AS "serviceCount",
      COALESCE(array_agg(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL), '{}') AS "serviceNames",
      COUNT(DISTINCT a.id)::text AS "appointmentCount",
      EXISTS (
        SELECT 1 FROM "ResourceMaintenance" m
        WHERE m."resourceId" = r.id
          AND m.status IN ('SCHEDULED', 'IN_PROGRESS')
          AND m."endAt" >= NOW()
      ) AS "upcomingMaintenance"
    FROM "Resource" r
    LEFT JOIN "ServiceResource" sr ON sr."resourceId" = r.id
    LEFT JOIN "Service" s ON s.id = sr."serviceId"
    LEFT JOIN "Appointment" a ON a."resourceId" = r.id AND a.status <> 'CANCELLED'
    WHERE ${where}
    GROUP BY r.id
    ORDER BY r.active DESC, r.name
    LIMIT $${pi} OFFSET $${pi + 1}
  `;

  const offset = (page - 1) * limit;
  const [countRes, listRes] = await Promise.all([
    pool.query<{ total: number }>(countSql, params),
    pool.query<ResourceRow>(listSql, [...params, limit, offset]),
  ]);

  return {
    items: listRes.rows.map(rowToListItem),
    total: countRes.rows[0]?.total ?? 0,
  };
}

export async function getResourceById(
  organizationId: string,
  resourceId: string,
): Promise<ResourceDetail | null> {
  const { rows } = await pool.query<ResourceRow>(
    `SELECT
      r.id, r.name, r.type, r.capacity, r.location, r.notes, r.active,
      r."createdAt", r."updatedAt",
      COUNT(DISTINCT sr."serviceId")::text AS "serviceCount",
      COALESCE(array_agg(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL), '{}') AS "serviceNames",
      COUNT(DISTINCT a.id)::text AS "appointmentCount",
      EXISTS (
        SELECT 1 FROM "ResourceMaintenance" m
        WHERE m."resourceId" = r.id
          AND m.status IN ('SCHEDULED', 'IN_PROGRESS')
          AND m."endAt" >= NOW()
      ) AS "upcomingMaintenance"
    FROM "Resource" r
    LEFT JOIN "ServiceResource" sr ON sr."resourceId" = r.id
    LEFT JOIN "Service" s ON s.id = sr."serviceId"
    LEFT JOIN "Appointment" a ON a."resourceId" = r.id AND a.status <> 'CANCELLED'
    WHERE r.id = $1 AND r."organizationId" = $2 AND r."deletedAt" IS NULL
    GROUP BY r.id`,
    [resourceId, organizationId],
  );
  if (!rows[0]) return null;

  const [maintenances, services, reservations] = await Promise.all([
    loadMaintenances(resourceId),
    pool.query<{
      serviceId: string;
      serviceName: string;
      category: string | null;
      quantity: number;
      active: boolean;
    }>(
      `SELECT s.id AS "serviceId", s.name AS "serviceName", s.category, sr.quantity, s.active
       FROM "ServiceResource" sr
       JOIN "Service" s ON s.id = sr."serviceId"
       WHERE sr."resourceId" = $1
       ORDER BY s.name`,
      [resourceId],
    ),
    pool.query<{
      id: string;
      startAt: Date;
      endAt: Date;
      status: string;
      serviceName: string;
      staffFirst: string;
      staffLast: string;
      customerFirst: string;
      customerLast: string;
    }>(
      `SELECT a.id, a."startAt", a."endAt", a.status::text,
              s.name AS "serviceName",
              st."firstName" AS "staffFirst", st."lastName" AS "staffLast",
              c."firstName" AS "customerFirst", c."lastName" AS "customerLast"
       FROM "Appointment" a
       JOIN "Service" s ON s.id = a."serviceId"
       JOIN "Staff" st ON st.id = a."staffId"
       JOIN "Customer" c ON c.id = a."customerId"
       WHERE a."resourceId" = $1 AND a.status <> 'CANCELLED'
       ORDER BY a."startAt" DESC
       LIMIT 40`,
      [resourceId],
    ),
  ]);

  return {
    ...rowToListItem(rows[0]),
    services: services.rows,
    maintenances,
    reservations: reservations.rows.map((r) => ({
      id: r.id,
      startAt: r.startAt.toISOString(),
      endAt: r.endAt.toISOString(),
      status: r.status,
      serviceName: r.serviceName,
      staffName: `${r.staffFirst} ${r.staffLast}`.trim(),
      customerName: `${r.customerFirst} ${r.customerLast}`.trim(),
    })),
    createdAt: rows[0].createdAt.toISOString(),
    updatedAt: rows[0].updatedAt.toISOString(),
  };
}

export async function createResource(
  organizationId: string,
  input: CreateResourceInput,
): Promise<ResourceDetail> {
  const id = newId("res");
  await pool.query(
    `INSERT INTO "Resource" (
      id, "organizationId", name, type, capacity, location, notes, active, "updatedAt"
    ) VALUES ($1,$2,$3,$4::"ResourceType",$5,$6,$7,$8,NOW())`,
    [
      id,
      organizationId,
      input.name,
      input.type ?? "CABINE",
      input.capacity ?? 1,
      input.location ?? null,
      input.notes ?? null,
      input.active !== false,
    ],
  );
  if (input.serviceIds?.length) {
    await syncServices(id, input.serviceIds, organizationId);
  }
  const detail = await getResourceById(organizationId, id);
  if (!detail) throw new Error("Ressource introuvable après création.");
  return detail;
}

export async function updateResource(
  organizationId: string,
  resourceId: string,
  input: UpdateResourceInput,
): Promise<ResourceDetail> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let pi = 1;

  const setField = (col: string, val: unknown, cast?: string) => {
    sets.push(cast ? `"${col}" = $${pi}${cast}` : `"${col}" = $${pi}`);
    params.push(val);
    pi++;
  };

  if (input.name !== undefined) setField("name", input.name);
  if (input.type !== undefined) setField("type", input.type, '::"ResourceType"');
  if (input.capacity !== undefined) setField("capacity", input.capacity);
  if (input.location !== undefined) setField("location", input.location ?? null);
  if (input.notes !== undefined) setField("notes", input.notes ?? null);
  if (input.active !== undefined) setField("active", input.active);

  if (sets.length > 0) {
    sets.push(`"updatedAt" = NOW()`);
    params.push(resourceId, organizationId);
    await pool.query(
      `UPDATE "Resource" SET ${sets.join(", ")}
       WHERE id = $${pi} AND "organizationId" = $${pi + 1} AND "deletedAt" IS NULL`,
      params,
    );
  }

  if (input.serviceIds !== undefined) {
    await syncServices(resourceId, input.serviceIds, organizationId);
  }

  const detail = await getResourceById(organizationId, resourceId);
  if (!detail) throw new Error("NOT_FOUND");
  return detail;
}

export async function createResourceMaintenance(
  organizationId: string,
  resourceId: string,
  input: CreateMaintenanceInput,
): Promise<ResourceMaintenanceItem> {
  const exists = await pool.query(
    `SELECT id FROM "Resource" WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,
    [resourceId, organizationId],
  );
  if (!exists.rows[0]) throw new Error("NOT_FOUND");

  const id = newId("mnt");
  await pool.query(
    `INSERT INTO "ResourceMaintenance" (id, "resourceId", "startAt", "endAt", type, reason, status, "updatedAt")
     VALUES ($1,$2,$3,$4,$5::"MaintenanceType",$6,$7::"MaintenanceStatus",NOW())`,
    [
      id,
      resourceId,
      new Date(input.startAt),
      new Date(input.endAt),
      input.type ?? "PREVENTIVE",
      input.reason ?? null,
      input.status ?? "SCHEDULED",
    ],
  );
  const list = await loadMaintenances(resourceId);
  const created = list.find((m) => m.id === id);
  if (!created) throw new Error("Maintenance introuvable.");
  return created;
}

export async function updateResourceMaintenance(
  organizationId: string,
  resourceId: string,
  maintenanceId: string,
  input: UpdateMaintenanceInput,
): Promise<ResourceMaintenanceItem> {
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
    sets.push(`type = $${pi}::"MaintenanceType"`);
    params.push(input.type);
    pi++;
  }
  if (input.reason !== undefined) {
    sets.push(`reason = $${pi}`);
    params.push(input.reason ?? null);
    pi++;
  }
  if (input.status !== undefined) {
    sets.push(`status = $${pi}::"MaintenanceStatus"`);
    params.push(input.status);
    pi++;
  }

  if (sets.length === 0) {
    const list = await loadMaintenances(resourceId);
    const found = list.find((m) => m.id === maintenanceId);
    if (!found) throw new Error("NOT_FOUND");
    return found;
  }

  sets.push(`"updatedAt" = NOW()`);
  params.push(maintenanceId, resourceId, organizationId);
  const { rowCount } = await pool.query(
    `UPDATE "ResourceMaintenance" m SET ${sets.join(", ")}
     FROM "Resource" r
     WHERE m.id = $${pi} AND m."resourceId" = $${pi + 1}
       AND r.id = m."resourceId" AND r."organizationId" = $${pi + 2}`,
    params,
  );
  if (!rowCount) throw new Error("NOT_FOUND");

  const list = await loadMaintenances(resourceId);
  const updated = list.find((m) => m.id === maintenanceId);
  if (!updated) throw new Error("NOT_FOUND");
  return updated;
}

export async function getResourceAvailability(
  organizationId: string,
  resourceId: string,
  dateIso: string,
): Promise<ResourceAvailability | null> {
  const resource = await pool.query<{ id: string; name: string; active: boolean }>(
    `SELECT id, name, active FROM "Resource"
     WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,
    [resourceId, organizationId],
  );
  if (!resource.rows[0]) return null;

  const day = new Date(`${dateIso}T00:00:00`);
  if (Number.isNaN(day.getTime())) throw new Error("INVALID_DATE");
  const next = new Date(day);
  next.setDate(next.getDate() + 1);

  const [apts, mnts] = await Promise.all([
    pool.query<{ startAt: Date; endAt: Date; serviceName: string }>(
      `SELECT a."startAt", a."endAt", s.name AS "serviceName"
       FROM "Appointment" a
       JOIN "Service" s ON s.id = a."serviceId"
       WHERE a."resourceId" = $1
         AND a.status NOT IN ('CANCELLED')
         AND a."startAt" < $3 AND a."endAt" > $2
       ORDER BY a."startAt"`,
      [resourceId, day, next],
    ),
    pool.query<{ startAt: Date; endAt: Date; type: string }>(
      `SELECT "startAt", "endAt", type::text
       FROM "ResourceMaintenance"
       WHERE "resourceId" = $1
         AND status IN ('SCHEDULED', 'IN_PROGRESS')
         AND "startAt" < $3 AND "endAt" > $2
       ORDER BY "startAt"`,
      [resourceId, day, next],
    ),
  ]);

  return {
    resourceId,
    date: dateIso,
    active: resource.rows[0].active,
    slots: [
      ...apts.rows.map((a) => ({
        startAt: a.startAt.toISOString(),
        endAt: a.endAt.toISOString(),
        kind: "appointment" as const,
        label: a.serviceName,
      })),
      ...mnts.rows.map((m) => ({
        startAt: m.startAt.toISOString(),
        endAt: m.endAt.toISOString(),
        kind: "maintenance" as const,
        label: `Maintenance ${m.type}`,
      })),
    ],
  };
}

export async function assertResourceBookable(opts: {
  organizationId: string;
  resourceId: string;
  serviceId: string;
  startAt: Date;
  endAt: Date;
}): Promise<void> {
  const { organizationId, resourceId, serviceId, startAt, endAt } = opts;

  const { rows } = await pool.query<{ id: string; active: boolean }>(
    `SELECT id, active FROM "Resource"
     WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,
    [resourceId, organizationId],
  );
  if (!rows[0]) throw new Error("RESOURCE_NOT_FOUND");
  if (!rows[0].active) throw new Error("RESOURCE_INACTIVE");

  const linked = await pool.query<{ ok: boolean }>(
    `SELECT EXISTS (
      SELECT 1 FROM "ServiceResource" sr
      JOIN "Service" s ON s.id = sr."serviceId"
      WHERE sr."resourceId" = $1 AND sr."serviceId" = $2 AND s."organizationId" = $3
    ) AS ok`,
    [resourceId, serviceId, organizationId],
  );
  const required = await pool.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "ServiceResource" WHERE "serviceId" = $1`,
    [serviceId],
  );
  if ((parseInt(required.rows[0]?.n ?? "0", 10) || 0) > 0 && !linked.rows[0]?.ok) {
    throw new Error("RESOURCE_NOT_ALLOWED");
  }

  const mnt = await pool.query<{ id: string }>(
    `SELECT id FROM "ResourceMaintenance"
     WHERE "resourceId" = $1
       AND status IN ('SCHEDULED', 'IN_PROGRESS')
       AND "startAt" < $3 AND "endAt" > $2
     LIMIT 1`,
    [resourceId, startAt, endAt],
  );
  if (mnt.rows[0]) throw new Error("RESOURCE_MAINTENANCE");
}
