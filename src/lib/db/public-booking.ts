import { randomBytes } from "crypto";
import { Pool, type PoolClient } from "pg";
import { getOrgIdBySlug, isExclusionViolation, rowToDto, type AppointmentRow } from "@/lib/db/appointments";
import { findOrCreateCustomerByPhone } from "@/lib/db/customers";
import { assertResourceBookable, listResources } from "@/lib/db/resources";
import { listServices } from "@/lib/db/services";
import { listStaff } from "@/lib/db/staff";
import {
  checkAvailability,
  getAvailableSlots,
  isStaffAvailableOnDate,
} from "@/modules/appointments/availability";
import { enforcePublicBookingLimits } from "@/lib/subscriptions/guards";
import type { Appointment } from "@/types/appointment";
import type {
  PublicAvailabilitySlot,
  PublicBookingInput,
  PublicBookingResult,
  PublicOrganizationProfile,
  PublicServiceItem,
  PublicStaffItem,
} from "@/types/public-booking";
import type { ResourceAgendaContext } from "@/types/resource";
import type { ServiceAgendaOption } from "@/types/service";
import type { StaffAgendaContext } from "@/types/staff";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function newId(prefix: string) {
  return `${prefix}_${randomBytes(6).toString("hex")}`;
}

function parseSlotDateTime(date: string, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const [y, mo, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h - 1, m, 0));
}

function dayBounds(date: string): { start: Date; end: Date } {
  const start = parseSlotDateTime(date, "00:00");
  const end = parseSlotDateTime(date, "23:59");
  end.setMinutes(59, 59, 999);
  return { start, end };
}

export async function resolveOrganizationBySlug(slug: string): Promise<PublicOrganizationProfile | null> {
  const { rows } = await pool.query<PublicOrganizationProfile>(
    `SELECT id, slug, name, address, phone, email
     FROM "Organization" WHERE slug = $1 LIMIT 1`,
    [slug],
  );
  return rows[0] ?? null;
}

export async function getPublicServices(organizationId: string): Promise<PublicServiceItem[]> {
  const { rows } = await pool.query<{
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    price: string;
    durationMin: number;
    prepTimeMin: number;
    cleanupTimeMin: number;
    deposit: string | null;
  }>(
    `SELECT id, name, description, category, price::text, "durationMin", "prepTimeMin", "cleanupTimeMin", deposit::text
     FROM "Service"
     WHERE "organizationId" = $1 AND active = true
     ORDER BY name`,
    [organizationId],
  );
  return rows.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    category: s.category,
    price: parseFloat(s.price),
    durationMin: s.durationMin,
    prepTimeMin: s.prepTimeMin,
    cleanupTimeMin: s.cleanupTimeMin,
    totalBlockMin: s.prepTimeMin + s.durationMin + s.cleanupTimeMin,
    deposit: s.deposit != null ? parseFloat(s.deposit) : null,
  }));
}

async function getServiceOption(
  organizationId: string,
  serviceId: string,
): Promise<ServiceAgendaOption | null> {
  const { items } = await listServices(organizationId, {
    page: 1,
    limit: 200,
    active: true,
    agenda: true,
  });
  return (items as ServiceAgendaOption[]).find((s) => s.id === serviceId) ?? null;
}

async function loadStaffContexts(
  organizationId: string,
  serviceId: string,
): Promise<StaffAgendaContext[]> {
  const { items } = await listStaff(organizationId, {
    page: 1,
    limit: 100,
    serviceId,
    agenda: true,
  });
  return (items as StaffAgendaContext[]).filter((s) => s.status === "ACTIVE");
}

async function loadResourceContexts(
  organizationId: string,
  serviceId: string,
): Promise<ResourceAgendaContext[]> {
  const { items } = await listResources(organizationId, {
    page: 1,
    limit: 50,
    serviceId,
    agenda: true,
  });
  return items as ResourceAgendaContext[];
}

async function loadAppointmentsForDay(
  organizationId: string,
  date: string,
): Promise<Appointment[]> {
  const { start, end } = dayBounds(date);
  const { rows } = await pool.query<AppointmentRow>(
    `SELECT
      a.id, a."organizationId", a."customerId",
      c."firstName" AS "customerFirstName", c."lastName" AS "customerLastName",
      a."serviceId", s.name AS "serviceName",
      a."staffId", st."firstName" AS "staffFirstName", st."lastName" AS "staffLastName",
      a."resourceId", r.name AS "resourceName",
      a."startAt", a."endAt", a.price::text, a.deposit::text, a.status, a.notes
     FROM "Appointment" a
     JOIN "Customer" c ON c.id = a."customerId"
     JOIN "Service" s ON s.id = a."serviceId"
     JOIN "Staff" st ON st.id = a."staffId"
     LEFT JOIN "Resource" r ON r.id = a."resourceId"
     WHERE a."organizationId" = $1
       AND a."startAt" >= $2 AND a."startAt" <= $3
       AND a.status NOT IN ('CANCELLED', 'NO_SHOW')`,
    [organizationId, start, end],
  );
  return rows.map(rowToDto);
}

function resourceCandidates(
  service: ServiceAgendaOption,
  resources: ResourceAgendaContext[],
): (string | undefined)[] {
  if (!service.resourceIds.length) return [undefined];
  return service.resourceIds.filter((id) => resources.some((r) => r.id === id));
}

function tryAssignSlot(
  appointments: Appointment[],
  service: ServiceAgendaOption,
  staffList: StaffAgendaContext[],
  resources: ResourceAgendaContext[],
  startAt: Date,
  endAt: Date,
  preferredStaffId?: string | null,
): { staffId: string; resourceId?: string } | null {
  const staffIds = preferredStaffId
    ? staffList.filter((s) => s.id === preferredStaffId).map((s) => s.id)
    : staffList.map((s) => s.id);

  for (const staffId of staffIds) {
    const staffCtx = staffList.find((s) => s.id === staffId);
    if (!staffCtx) continue;

    for (const resourceId of resourceCandidates(service, resources)) {
      const resourceCtx = resourceId
        ? resources.find((r) => r.id === resourceId)
        : undefined;

      const result = checkAvailability(
        appointments,
        {
          staffId,
          resourceId,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
        },
        staffCtx,
        resourceCtx,
      );
      if (result.available) return { staffId, resourceId };
    }
  }
  return null;
}

export async function getPublicStaffForService(
  organizationId: string,
  serviceId: string,
  date?: string,
): Promise<PublicStaffItem[]> {
  const service = await getServiceOption(organizationId, serviceId);
  if (!service) return [];

  const staffList = await loadStaffContexts(organizationId, serviceId);
  const checkDate = date ? new Date(`${date}T12:00:00+01:00`) : null;

  return staffList.map((s) => ({
    id: s.id,
    displayName: s.displayName,
    available: checkDate ? isStaffAvailableOnDate(s, checkDate) : s.status === "ACTIVE",
  }));
}

export async function getPublicAvailabilitySlots(
  organizationId: string,
  opts: {
    serviceId: string;
    date: string;
    staffId?: string | null;
  },
): Promise<PublicAvailabilitySlot[]> {
  const service = await getServiceOption(organizationId, opts.serviceId);
  if (!service) throw new Error("SERVICE_NOT_FOUND");

  const staffList = await loadStaffContexts(organizationId, opts.serviceId);
  const resources = await loadResourceContexts(organizationId, opts.serviceId);
  const appointments = await loadAppointmentsForDay(organizationId, opts.date);
  const dateObj = new Date(`${opts.date}T12:00:00+01:00`);

  const staffToCheck = opts.staffId
    ? staffList.filter((s) => s.id === opts.staffId)
    : staffList;

  if (!staffToCheck.length) return [];

  const slotMap = new Map<string, boolean>();

  for (const staff of staffToCheck) {
    if (!isStaffAvailableOnDate(staff, dateObj)) continue;

    for (const resourceId of resourceCandidates(service, resources)) {
      const resourceCtx = resourceId
        ? resources.find((r) => r.id === resourceId)
        : undefined;

      const slots = getAvailableSlots(appointments, {
        date: dateObj,
        staffId: staff.id,
        resourceId,
        durationMinutes: service.totalBlockMin,
        staffContext: staff,
        resourceContext: resourceCtx,
      });

      for (const slot of slots) {
        if (!slot.available) continue;
        slotMap.set(slot.time, true);
      }
    }
  }

  const allTimes = new Set<string>();
  for (const staff of staffToCheck) {
    const slots = getAvailableSlots(appointments, {
      date: dateObj,
      staffId: staff.id,
      durationMinutes: service.totalBlockMin,
      staffContext: staff,
    });
    for (const s of slots) allTimes.add(s.time);
  }

  return [...allTimes]
    .sort((a, b) => a.localeCompare(b))
    .map((time) => ({ time, available: slotMap.get(time) ?? false }));
}

export async function getPublicAvailableDates(
  organizationId: string,
  opts: { serviceId: string; from: string; to: string; staffId?: string | null },
): Promise<string[]> {
  const from = new Date(`${opts.from}T00:00:00+01:00`);
  const to = new Date(`${opts.to}T23:59:59+01:00`);
  const dates: string[] = [];
  const cursor = new Date(from);

  while (cursor <= to) {
    const iso = cursor.toISOString().slice(0, 10);
    const slots = await getPublicAvailabilitySlots(organizationId, {
      serviceId: opts.serviceId,
      date: iso,
      staffId: opts.staffId,
    });
    if (slots.some((s) => s.available)) dates.push(iso);
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export async function createPublicBooking(
  slug: string,
  input: PublicBookingInput,
): Promise<PublicBookingResult> {
  const org = await resolveOrganizationBySlug(slug);
  if (!org) throw new Error("ORG_NOT_FOUND");

  const organizationId = org.id;

  const subCheck = await enforcePublicBookingLimits(organizationId);
  if (!subCheck.ok) {
    if (subCheck.code === "LIMIT_REACHED") throw new Error("LIMIT_REACHED");
    if (subCheck.code === "FEATURE_NOT_INCLUDED") throw new Error("FEATURE_NOT_INCLUDED");
    throw new Error("SUBSCRIPTION_INACTIVE");
  }

  const service = await getServiceOption(organizationId, input.serviceId);
  if (!service || !service.active) throw new Error("SERVICE_NOT_FOUND");

  const startAt = parseSlotDateTime(input.date, input.time);
  const endAt = new Date(startAt.getTime() + service.totalBlockMin * 60_000);

  if (startAt.getTime() < Date.now() - 60_000) {
    throw new Error("SLOT_PAST");
  }

  const staffList = await loadStaffContexts(organizationId, input.serviceId);
  const resources = await loadResourceContexts(organizationId, input.serviceId);
  const appointments = await loadAppointmentsForDay(organizationId, input.date);

  const preferredStaff =
    input.staffId && input.staffId !== "any" ? input.staffId : null;

  const assignment = tryAssignSlot(
    appointments,
    service,
    staffList,
    resources,
    startAt,
    endAt,
    preferredStaff,
  );

  if (!assignment) throw new Error("SLOT_UNAVAILABLE");

  const client = await pool.connect();
  const appointmentId = newId("apt");

  try {
    await client.query("BEGIN");

    if (assignment.resourceId) {
      await assertResourceBookable({
        organizationId,
        resourceId: assignment.resourceId,
        serviceId: service.id,
        startAt,
        endAt,
      });
    }

    const { customerId, created } = await findOrCreateCustomerByPhone(
      organizationId,
      {
        firstName: input.customer.firstName,
        lastName: input.customer.lastName,
        phone: input.customer.phone,
        email: input.customer.email,
        marketingOptIn: input.customer.marketingOptIn,
      },
      client,
    );

    await client.query(
      `INSERT INTO "Appointment" (
        id, "organizationId", "customerId", "serviceId", "staffId", "resourceId",
        "startAt", "endAt", price, deposit, status, source, notes, "updatedAt"
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'PENDING','ONLINE_BOOKING'::"AppointmentSource",$11,NOW()
      )`,
      [
        appointmentId,
        organizationId,
        customerId,
        service.id,
        assignment.staffId,
        assignment.resourceId ?? null,
        startAt,
        endAt,
        service.price,
        service.deposit,
        input.notes ?? null,
      ],
    );

    await client.query("COMMIT");

    const { rows } = await pool.query<AppointmentRow>(
      `SELECT
        a.id, a."organizationId", a."customerId",
        c."firstName" AS "customerFirstName", c."lastName" AS "customerLastName",
        a."serviceId", s.name AS "serviceName",
        a."staffId", st."firstName" AS "staffFirstName", st."lastName" AS "staffLastName",
        a."resourceId", r.name AS "resourceName",
        a."startAt", a."endAt", a.price::text, a.deposit::text, a.status, a.notes
       FROM "Appointment" a
       JOIN "Customer" c ON c.id = a."customerId"
       JOIN "Service" s ON s.id = a."serviceId"
       JOIN "Staff" st ON st.id = a."staffId"
       LEFT JOIN "Resource" r ON r.id = a."resourceId"
       WHERE a.id = $1`,
      [appointmentId],
    );
    const apt = rowToDto(rows[0]);

    try {
      const { notifyAppointmentCreated } = await import("@/lib/notifications/emitter");
      await notifyAppointmentCreated(organizationId, apt);
    } catch (e) {
      console.error("[createPublicBooking] notification", e);
    }

    try {
      const { enqueueOnlineBookingConfirmation } = await import("@/lib/db/whatsapp");
      await enqueueOnlineBookingConfirmation(organizationId, appointmentId);
    } catch (e) {
      console.error("[createPublicBooking] whatsapp", e);
    }

    return {
      appointmentId,
      customerId,
      customerCreated: created,
      staffId: assignment.staffId,
      staffName: apt.staffName,
      serviceName: service.name,
      startAt: apt.startAt,
      endAt: apt.endAt,
      price: service.price,
      durationMin: service.durationMin,
      source: "ONLINE_BOOKING",
    };
  } catch (e) {
    await client.query("ROLLBACK");
    if (isExclusionViolation(e)) throw new Error("SLOT_CONFLICT");
    throw e;
  } finally {
    client.release();
  }
}

export { getOrgIdBySlug };
