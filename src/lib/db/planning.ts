import { randomBytes } from "crypto";
import { Pool } from "pg";
import { writeAuditLog } from "@/lib/db/audit";
import { listAppointmentsByOrg } from "@/lib/db/appointments";
import { listStaff } from "@/lib/db/staff";
import { listResources } from "@/lib/db/resources";
import { checkAvailability } from "@/modules/appointments/availability";
import type {
  CreateOrganizationClosureInput,
  CreateStaffOvertimeInput,
  CreateStaffReplacementInput,
  OrganizationClosureItem,
  StaffOvertimeItem,
  StaffReplacementItem,
} from "@/types/planning";
import type { StaffAgendaContext } from "@/types/staff";
import type { ResourceAgendaContext } from "@/types/resource";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function newId(prefix: string) {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

export async function listOrganizationClosures(
  organizationId: string,
  opts?: { from?: Date; to?: Date },
): Promise<OrganizationClosureItem[]> {
  const params: unknown[] = [organizationId];
  let sql = `SELECT id, "startAt", "endAt", reason FROM "OrganizationClosure"
             WHERE "organizationId" = $1`;
  if (opts?.from) {
    params.push(opts.from);
    sql += ` AND "endAt" >= $${params.length}`;
  }
  if (opts?.to) {
    params.push(opts.to);
    sql += ` AND "startAt" <= $${params.length}`;
  }
  sql += ` ORDER BY "startAt"`;
  const { rows } = await pool.query<{
    id: string;
    startAt: Date;
    endAt: Date;
    reason: string | null;
  }>(sql, params);
  return rows.map((r) => ({
    id: r.id,
    startAt: r.startAt.toISOString(),
    endAt: r.endAt.toISOString(),
    reason: r.reason,
  }));
}

export async function createOrganizationClosure(
  organizationId: string,
  input: CreateOrganizationClosureInput,
  actor: { id: string; name?: string | null },
): Promise<OrganizationClosureItem> {
  const start = new Date(input.startAt);
  const end = new Date(input.endAt);
  if (!(end > start)) throw new Error("INVALID_RANGE");
  const id = newId("ocl");
  await pool.query(
    `INSERT INTO "OrganizationClosure" (
      id, "organizationId", "startAt", "endAt", reason, "updatedAt"
    ) VALUES ($1,$2,$3,$4,$5,NOW())`,
    [id, organizationId, start, end, input.reason ?? null],
  );
  await writeAuditLog({
    organizationId,
    actorId: actor.id,
    actorName: actor.name,
    entityType: "OrganizationClosure",
    entityId: id,
    action: "ORG_CLOSURE_CREATED",
    after: { startAt: start.toISOString(), endAt: end.toISOString(), reason: input.reason },
  });
  const list = await listOrganizationClosures(organizationId);
  return list.find((c) => c.id === id)!;
}

export async function deleteOrganizationClosure(
  organizationId: string,
  id: string,
  actor: { id: string; name?: string | null },
): Promise<void> {
  const { rowCount } = await pool.query(
    `DELETE FROM "OrganizationClosure" WHERE id = $1 AND "organizationId" = $2`,
    [id, organizationId],
  );
  if (!rowCount) throw new Error("NOT_FOUND");
  await writeAuditLog({
    organizationId,
    actorId: actor.id,
    actorName: actor.name,
    entityType: "OrganizationClosure",
    entityId: id,
    action: "ORG_CLOSURE_DELETED",
  });
}

export async function listStaffOvertimes(
  organizationId: string,
  opts?: { staffId?: string; from?: Date; to?: Date },
): Promise<StaffOvertimeItem[]> {
  const conditions = [`o."organizationId" = $1`];
  const params: unknown[] = [organizationId];
  if (opts?.staffId) {
    params.push(opts.staffId);
    conditions.push(`o."staffId" = $${params.length}`);
  }
  if (opts?.from) {
    params.push(opts.from);
    conditions.push(`o."endAt" >= $${params.length}`);
  }
  if (opts?.to) {
    params.push(opts.to);
    conditions.push(`o."startAt" <= $${params.length}`);
  }
  const { rows } = await pool.query<{
    id: string;
    staffId: string;
    startAt: Date;
    endAt: Date;
    reason: string | null;
  }>(
    `SELECT o.id, o."staffId", o."startAt", o."endAt", o.reason
     FROM "StaffOvertime" o
     WHERE ${conditions.join(" AND ")}
     ORDER BY o."startAt"`,
    params,
  );
  return rows.map((r) => ({
    id: r.id,
    staffId: r.staffId,
    startAt: r.startAt.toISOString(),
    endAt: r.endAt.toISOString(),
    reason: r.reason,
  }));
}

export async function createStaffOvertime(
  organizationId: string,
  input: CreateStaffOvertimeInput,
  actor: { id: string; name?: string | null },
): Promise<StaffOvertimeItem> {
  const start = new Date(input.startAt);
  const end = new Date(input.endAt);
  if (!(end > start)) throw new Error("INVALID_RANGE");

  const staff = await pool.query(
    `SELECT id FROM "Staff" WHERE id = $1 AND "organizationId" = $2 AND "deletedAt" IS NULL`,
    [input.staffId, organizationId],
  );
  if (!staff.rows[0]) throw new Error("STAFF_NOT_FOUND");

  const id = newId("ot");
  await pool.query(
    `INSERT INTO "StaffOvertime" (
      id, "organizationId", "staffId", "startAt", "endAt", reason, "updatedAt"
    ) VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
    [id, organizationId, input.staffId, start, end, input.reason ?? null],
  );
  await writeAuditLog({
    organizationId,
    actorId: actor.id,
    actorName: actor.name,
    entityType: "StaffOvertime",
    entityId: id,
    action: "STAFF_OVERTIME_CREATED",
    after: { staffId: input.staffId, startAt: start.toISOString(), endAt: end.toISOString() },
  });
  return {
    id,
    staffId: input.staffId,
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    reason: input.reason ?? null,
  };
}

export async function deleteStaffOvertime(
  organizationId: string,
  id: string,
  actor: { id: string; name?: string | null },
): Promise<void> {
  const { rowCount } = await pool.query(
    `DELETE FROM "StaffOvertime" WHERE id = $1 AND "organizationId" = $2`,
    [id, organizationId],
  );
  if (!rowCount) throw new Error("NOT_FOUND");
  await writeAuditLog({
    organizationId,
    actorId: actor.id,
    actorName: actor.name,
    entityType: "StaffOvertime",
    entityId: id,
    action: "STAFF_OVERTIME_DELETED",
  });
}

export async function listStaffReplacements(
  organizationId: string,
  opts?: { from?: Date; to?: Date },
): Promise<StaffReplacementItem[]> {
  const conditions = [`r."organizationId" = $1`, `r.active = true`];
  const params: unknown[] = [organizationId];
  if (opts?.from) {
    params.push(opts.from);
    conditions.push(`r."endAt" >= $${params.length}`);
  }
  if (opts?.to) {
    params.push(opts.to);
    conditions.push(`r."startAt" <= $${params.length}`);
  }
  const { rows } = await pool.query<{
    id: string;
    absentStaffId: string;
    absentName: string;
    substituteStaffId: string;
    substituteName: string;
    startAt: Date;
    endAt: Date;
    reason: string | null;
    active: boolean;
  }>(
    `SELECT r.id, r."absentStaffId",
            CONCAT(a."firstName", ' ', a."lastName") AS "absentName",
            r."substituteStaffId",
            CONCAT(s."firstName", ' ', s."lastName") AS "substituteName",
            r."startAt", r."endAt", r.reason, r.active
     FROM "StaffReplacement" r
     JOIN "Staff" a ON a.id = r."absentStaffId"
     JOIN "Staff" s ON s.id = r."substituteStaffId"
     WHERE ${conditions.join(" AND ")}
     ORDER BY r."startAt"`,
    params,
  );
  return rows.map((r) => ({
    id: r.id,
    absentStaffId: r.absentStaffId,
    absentName: r.absentName.trim(),
    substituteStaffId: r.substituteStaffId,
    substituteName: r.substituteName.trim(),
    startAt: r.startAt.toISOString(),
    endAt: r.endAt.toISOString(),
    reason: r.reason,
    active: r.active,
  }));
}

export async function createStaffReplacement(
  organizationId: string,
  input: CreateStaffReplacementInput,
  actor: { id: string; name?: string | null },
): Promise<StaffReplacementItem> {
  if (input.absentStaffId === input.substituteStaffId) {
    throw new Error("SAME_STAFF");
  }
  const start = new Date(input.startAt);
  const end = new Date(input.endAt);
  if (!(end > start)) throw new Error("INVALID_RANGE");

  const staffCheck = await pool.query(
    `SELECT id FROM "Staff"
     WHERE "organizationId" = $1 AND "deletedAt" IS NULL
       AND id IN ($2, $3)`,
    [organizationId, input.absentStaffId, input.substituteStaffId],
  );
  if (staffCheck.rows.length !== 2) throw new Error("STAFF_NOT_FOUND");

  const id = newId("rep");
  await pool.query(
    `INSERT INTO "StaffReplacement" (
      id, "organizationId", "absentStaffId", "substituteStaffId",
      "startAt", "endAt", reason, active, "updatedAt"
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,true,NOW())`,
    [
      id,
      organizationId,
      input.absentStaffId,
      input.substituteStaffId,
      start,
      end,
      input.reason ?? null,
    ],
  );
  await writeAuditLog({
    organizationId,
    actorId: actor.id,
    actorName: actor.name,
    entityType: "StaffReplacement",
    entityId: id,
    action: "STAFF_REPLACEMENT_CREATED",
    after: {
      absentStaffId: input.absentStaffId,
      substituteStaffId: input.substituteStaffId,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
    },
  });
  const list = await listStaffReplacements(organizationId);
  const found = list.find((r) => r.id === id);
  if (!found) throw new Error("NOT_FOUND");
  return found;
}

export async function deactivateStaffReplacement(
  organizationId: string,
  id: string,
  actor: { id: string; name?: string | null },
): Promise<void> {
  const { rowCount } = await pool.query(
    `UPDATE "StaffReplacement"
     SET active = false, "updatedAt" = NOW()
     WHERE id = $1 AND "organizationId" = $2`,
    [id, organizationId],
  );
  if (!rowCount) throw new Error("NOT_FOUND");
  await writeAuditLog({
    organizationId,
    actorId: actor.id,
    actorName: actor.name,
    entityType: "StaffReplacement",
    entityId: id,
    action: "STAFF_REPLACEMENT_CANCELLED",
  });
}

export async function isOrganizationClosed(
  organizationId: string,
  start: Date,
  end: Date,
): Promise<{ closed: boolean; reason: string | null }> {
  const { rows } = await pool.query<{ reason: string | null }>(
    `SELECT reason FROM "OrganizationClosure"
     WHERE "organizationId" = $1
       AND "startAt" < $3 AND "endAt" > $2
     LIMIT 1`,
    [organizationId, start, end],
  );
  if (!rows[0]) return { closed: false, reason: null };
  return { closed: true, reason: rows[0].reason };
}

/**
 * Validation serveur unique — création / déplacement / booking public.
 * N'écrit pas en DB ; lève AVAILABILITY_CONFLICT si hors dispo.
 */
export async function assertAppointmentBookable(params: {
  organizationId: string;
  staffId: string;
  resourceId?: string | null;
  startAt: Date | string;
  endAt: Date | string;
  excludeAppointmentId?: string;
}): Promise<void> {
  const start = typeof params.startAt === "string" ? new Date(params.startAt) : params.startAt;
  const end = typeof params.endAt === "string" ? new Date(params.endAt) : params.endAt;
  if (!(end > start)) throw new Error("INVALID_RANGE");

  const closure = await isOrganizationClosed(params.organizationId, start, end);
  if (closure.closed) {
    const err = new Error("AVAILABILITY_CONFLICT");
    (err as Error & { conflicts: string[] }).conflicts = [
      closure.reason
        ? `Institut fermé (${closure.reason}).`
        : "Institut fermé sur ce créneau.",
    ];
    throw err;
  }

  const dayStart = new Date(start);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(start);
  dayEnd.setHours(23, 59, 59, 999);

  const [staffRes, resourceRes, appointments] = await Promise.all([
    listStaff(params.organizationId, { page: 1, limit: 500, agenda: true }),
    listResources(params.organizationId, { page: 1, limit: 500, agenda: true }),
    listAppointmentsByOrg(params.organizationId),
  ]);

  const staffContext = (staffRes.items as StaffAgendaContext[]).find(
    (s) => s.id === params.staffId,
  );
  const resourceContext = params.resourceId
    ? (resourceRes.items as ResourceAgendaContext[]).find((r) => r.id === params.resourceId)
    : undefined;

  const dayAppointments = appointments.filter((a) => {
    const aStart = new Date(a.startAt);
    return aStart >= dayStart && aStart <= dayEnd;
  });

  const result = checkAvailability(
    dayAppointments,
    {
      staffId: params.staffId,
      resourceId: params.resourceId ?? undefined,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      excludeAppointmentId: params.excludeAppointmentId,
    },
    staffContext,
    resourceContext,
  );

  if (!result.available) {
    const err = new Error("AVAILABILITY_CONFLICT");
    (err as Error & { conflicts: string[] }).conflicts = result.conflicts;
    throw err;
  }
}

/** Couverture OT : le créneau est entièrement inclus dans une plage OT */
export function isCoveredByOvertime(
  start: Date,
  end: Date,
  overtimes: { startAt: string; endAt: string }[],
): boolean {
  return overtimes.some((ot) => {
    const oStart = new Date(ot.startAt);
    const oEnd = new Date(ot.endAt);
    return start >= oStart && end <= oEnd;
  });
}

export function hasActiveReplacement(
  start: Date,
  end: Date,
  replacements: { startAt: string; endAt: string }[],
): boolean {
  return replacements.some((r) =>
    overlaps(start, end, new Date(r.startAt), new Date(r.endAt)),
  );
}
