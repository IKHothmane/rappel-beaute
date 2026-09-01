import { Pool } from "pg";
import type { Appointment, CreateAppointmentInput } from "@/types/appointment";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export type AppointmentRow = {
  id: string;
  organizationId: string;
  customerId: string;
  customerFirstName: string;
  customerLastName: string;
  serviceId: string;
  serviceName: string;
  staffId: string;
  staffFirstName: string;
  staffLastName: string;
  resourceId: string | null;
  resourceName: string | null;
  startAt: Date;
  endAt: Date;
  price: string;
  deposit: string | null;
  status: Appointment["status"];
  notes: string | null;
};

const SELECT = `
  SELECT
    a.id,
    a."organizationId",
    a."customerId",
    c."firstName" AS "customerFirstName",
    c."lastName" AS "customerLastName",
    a."serviceId",
    s.name AS "serviceName",
    a."staffId",
    st."firstName" AS "staffFirstName",
    st."lastName" AS "staffLastName",
    a."resourceId",
    r.name AS "resourceName",
    a."startAt",
    a."endAt",
    a.price::text,
    a.deposit::text,
    a.status,
    a.notes
  FROM "Appointment" a
  JOIN "Customer" c ON c.id = a."customerId"
  JOIN "Service" s ON s.id = a."serviceId"
  JOIN "Staff" st ON st.id = a."staffId"
  LEFT JOIN "Resource" r ON r.id = a."resourceId"
`;

export function rowToDto(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    organizationId: row.organizationId,
    customerId: row.customerId,
    customerName: `${row.customerFirstName} ${row.customerLastName}`.trim(),
    serviceId: row.serviceId,
    serviceName: row.serviceName,
    staffId: row.staffId,
    staffName: `${row.staffFirstName} ${row.staffLastName}`.trim(),
    resourceId: row.resourceId ?? undefined,
    resourceName: row.resourceName ?? undefined,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    price: Number(row.price),
    deposit: row.deposit != null ? Number(row.deposit) : undefined,
    status: row.status,
    notes: row.notes ?? undefined,
  };
}

export async function getOrgIdBySlug(slug: string): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `SELECT id FROM "Organization" WHERE slug = $1 LIMIT 1`,
    [slug],
  );
  if (!rows[0]) throw new Error(`Organisation introuvable: ${slug}`);
  return rows[0].id;
}

export async function listAppointmentsByOrg(organizationId: string): Promise<Appointment[]> {
  const { rows } = await pool.query<AppointmentRow>(
    `${SELECT} WHERE a."organizationId" = $1 ORDER BY a."startAt" ASC`,
    [organizationId],
  );
  return rows.map(rowToDto);
}

export async function createAppointmentRow(
  organizationId: string,
  input: CreateAppointmentInput,
): Promise<Appointment> {
  const id = `apt-${Date.now()}`;
  await pool.query(
    `INSERT INTO "Appointment" (
      id, "organizationId", "customerId", "serviceId", "staffId", "resourceId",
      "startAt", "endAt", price, deposit, status, source, notes, "updatedAt"
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'PENDING',$11::"AppointmentSource",$12,NOW())`,
    [
      id,
      organizationId,
      input.customerId,
      input.serviceId,
      input.staffId,
      input.resourceId ?? null,
      new Date(input.startAt),
      new Date(input.endAt),
      input.price,
      input.deposit ?? null,
      input.source ?? "MANUAL",
      input.notes ?? null,
    ],
  );

  const { rows } = await pool.query<AppointmentRow>(`${SELECT} WHERE a.id = $1`, [id]);
  const appointment = rowToDto(rows[0]);

  try {
    const { notifyAppointmentCreated } = await import("@/lib/notifications/emitter");
    await notifyAppointmentCreated(organizationId, appointment);
  } catch (e) {
    console.error("[createAppointmentRow] notification", e);
  }

  return appointment;
}

export async function getAppointmentById(
  id: string,
  organizationId: string,
): Promise<Appointment | null> {
  const { rows } = await pool.query<AppointmentRow>(
    `${SELECT} WHERE a.id = $1 AND a."organizationId" = $2`,
    [id, organizationId],
  );
  return rows[0] ? rowToDto(rows[0]) : null;
}

export async function updateAppointmentRow(
  id: string,
  organizationId: string,
  patch: Partial<CreateAppointmentInput & { status: Appointment["status"] }>,
): Promise<Appointment | null> {
  const previous = await getAppointmentById(id, organizationId);

  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  const set = (col: string, val: unknown) => {
    fields.push(`"${col}" = $${i++}`);
    values.push(val);
  };

  if (patch.customerId) set("customerId", patch.customerId);
  if (patch.serviceId) set("serviceId", patch.serviceId);
  if (patch.staffId) set("staffId", patch.staffId);
  if (patch.resourceId !== undefined) set("resourceId", patch.resourceId ?? null);
  if (patch.startAt) set("startAt", new Date(patch.startAt));
  if (patch.endAt) set("endAt", new Date(patch.endAt));
  if (patch.price !== undefined) set("price", patch.price);
  if (patch.deposit !== undefined) set("deposit", patch.deposit ?? null);
  if (patch.notes !== undefined) set("notes", patch.notes ?? null);
  if (patch.status) set("status", patch.status);

  if (fields.length === 0) return null;

  fields.push(`"updatedAt" = NOW()`);
  values.push(id, organizationId);

  const updated = await pool.query(
    `UPDATE "Appointment" SET ${fields.join(", ")} WHERE id = $${i} AND "organizationId" = $${i + 1}`,
    values,
  );

  if (updated.rowCount === 0) return null;

  const { rows } = await pool.query<AppointmentRow>(
    `${SELECT} WHERE a.id = $1 AND a."organizationId" = $2`,
    [id, organizationId],
  );
  const appointment = rows[0] ? rowToDto(rows[0]) : null;

  if (appointment && previous && patch.status && patch.status !== previous.status) {
    try {
      const { notifyAppointmentStatusChange } = await import("@/lib/notifications/emitter");
      await notifyAppointmentStatusChange(organizationId, appointment, previous.status);
    } catch (e) {
      console.error("[updateAppointmentRow] notification", e);
    }
  }

  return appointment;
}

export function isExclusionViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "23P01"
  );
}
