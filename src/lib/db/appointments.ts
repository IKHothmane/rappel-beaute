import { Pool } from "pg";
import type { Appointment, CreateAppointmentInput } from "@/types/appointment";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export type AppointmentRow = {
  id: string;
  organizationId: string;
  customerId: string;
  customerFirstName: string | null;
  customerLastName: string | null;
  serviceId: string;
  serviceName: string | null;
  staffId: string;
  staffFirstName: string | null;
  staffLastName: string | null;
  resourceId: string | null;
  resourceName: string | null;
  startAt: Date;
  endAt: Date;
  price: string;
  deposit: string | null;
  depositState: string;
  depositDueAt: Date | null;
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
    a."depositState"::text AS "depositState",
    a."depositDueAt",
    a.status,
    a.notes
  FROM "Appointment" a
  LEFT JOIN "Customer" c ON c.id = a."customerId"
  LEFT JOIN "Service" s ON s.id = a."serviceId"
  LEFT JOIN "Staff" st ON st.id = a."staffId"
  LEFT JOIN "Resource" r ON r.id = a."resourceId"
`;

function personName(
  first: string | null,
  last: string | null,
  fallback: string,
): string {
  const name = `${first ?? ""} ${last ?? ""}`.trim();
  return name || fallback;
}

export function rowToDto(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    organizationId: row.organizationId,
    customerId: row.customerId,
    customerName: personName(row.customerFirstName, row.customerLastName, "Cliente inconnue"),
    serviceId: row.serviceId,
    serviceName: row.serviceName?.trim() || "Service inconnu",
    staffId: row.staffId,
    staffName: personName(row.staffFirstName, row.staffLastName, "Employée inconnue"),
    resourceId: row.resourceId ?? undefined,
    resourceName: row.resourceName ?? undefined,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    price: Number(row.price),
    deposit: row.deposit != null ? Number(row.deposit) : undefined,
    depositState: (row.depositState as Appointment["depositState"]) ?? "NOT_REQUIRED",
    depositDueAt: row.depositDueAt?.toISOString() ?? null,
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
  try {
    const { expireOverdueDepositAppointments } = await import("@/lib/db/booking-policy");
    await expireOverdueDepositAppointments(organizationId);
  } catch {
    /* ignore */
  }
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

  let depositAmount = input.deposit ?? null;
  let depositState = "NOT_REQUIRED";
  let depositDueAt: Date | null = null;

  try {
    const { resolveDepositRequirement } = await import("@/lib/db/booking-policy");
    let serviceDeposit = input.deposit ?? null;
    if (serviceDeposit == null) {
      const svc = await pool.query<{ deposit: string | null }>(
        `SELECT deposit::text FROM "Service" WHERE id = $1 AND "organizationId" = $2`,
        [input.serviceId, organizationId],
      );
      serviceDeposit =
        svc.rows[0]?.deposit != null ? parseFloat(svc.rows[0].deposit) : null;
    }
    const req = await resolveDepositRequirement({
      organizationId,
      customerId: input.customerId,
      serviceDeposit,
      price: input.price,
    });
    if (req.amount > 0) {
      depositAmount = req.amount;
      depositState = req.state;
      depositDueAt = req.dueAt;
    }
  } catch (e) {
    console.error("[createAppointmentRow] deposit resolve", e);
  }

  await pool.query(
    `INSERT INTO "Appointment" (
      id, "organizationId", "customerId", "serviceId", "staffId", "resourceId",
      "startAt", "endAt", price, deposit, "depositState", "depositDueAt",
      status, source, notes, "updatedAt"
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::"DepositState",$12,
      'PENDING',$13::"AppointmentSource",$14,NOW()
    )`,
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
      depositAmount,
      depositState,
      depositDueAt,
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
  opts?: {
    actor?: { id: string; name?: string | null };
    cancelledByInstitute?: boolean;
  },
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

  if (appointment && previous) {
    const moved =
      (patch.startAt && patch.startAt !== previous.startAt) ||
      (patch.endAt && patch.endAt !== previous.endAt) ||
      (patch.staffId && patch.staffId !== previous.staffId) ||
      (patch.resourceId !== undefined && patch.resourceId !== previous.resourceId);

    if (moved) {
      try {
        const { writeAuditLog } = await import("@/lib/db/audit");
        await writeAuditLog({
          organizationId,
          actorId: opts?.actor?.id ?? "system",
          actorName: opts?.actor?.name,
          entityType: "Appointment",
          entityId: id,
          action: "APPOINTMENT_RESCHEDULED",
          before: {
            startAt: previous.startAt,
            endAt: previous.endAt,
            staffId: previous.staffId,
            resourceId: previous.resourceId,
          },
          after: {
            startAt: appointment.startAt,
            endAt: appointment.endAt,
            staffId: appointment.staffId,
            resourceId: appointment.resourceId,
          },
        });
      } catch (e) {
        console.error("[updateAppointmentRow] audit move", e);
      }
      try {
        const { notifyAppointmentRescheduled } = await import("@/lib/notifications/emitter");
        await notifyAppointmentRescheduled(organizationId, appointment, {
          startAt: previous.startAt,
          staffId: previous.staffId,
          staffName: previous.staffName,
        });
      } catch (e) {
        console.error("[updateAppointmentRow] notify move", e);
      }
    }
  }

  if (appointment && previous && patch.status && patch.status !== previous.status) {
    try {
      const { notifyAppointmentStatusChange } = await import("@/lib/notifications/emitter");
      await notifyAppointmentStatusChange(organizationId, appointment, previous.status);
    } catch (e) {
      console.error("[updateAppointmentRow] notification", e);
    }
    try {
      const { applyDepositOnStatusChange } = await import("@/lib/db/booking-policy");
      await applyDepositOnStatusChange({
        organizationId,
        appointmentId: id,
        previousStatus: previous.status,
        nextStatus: patch.status,
        cancelledByInstitute:
          opts?.cancelledByInstitute ??
          (patch.status === "CANCELLED" || patch.status === "NO_SHOW"),
        actor: opts?.actor ?? { id: "system", name: "Système" },
      });
    } catch (e) {
      console.error("[updateAppointmentRow] deposit policy", e);
    }

    if (patch.status === "CANCELLED" && previous.status !== "CANCELLED") {
      try {
        const { notifyWaitingListOnCancellation } = await import("@/lib/db/waiting-list");
        await notifyWaitingListOnCancellation({
          organizationId,
          appointmentId: id,
          serviceId: previous.serviceId,
          staffId: previous.staffId,
          startAt: new Date(previous.startAt),
          actor: opts?.actor ?? { id: "system", name: "Système" },
        });
      } catch (e) {
        console.error("[updateAppointmentRow] waiting list", e);
      }
    }
  }

  return appointment ? await getAppointmentById(id, organizationId) : null;
}

export function isExclusionViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "23P01"
  );
}
