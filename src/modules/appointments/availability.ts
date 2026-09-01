import {
  AGENDA_CLOSE_HOUR,
  AGENDA_OPEN_HOUR,
  AGENDA_SLOT_MINUTES,
} from "./constants";
import type {
  Appointment,
  AvailabilityCheckInput,
  AvailabilityResult,
} from "@/types/appointment";
import type { StaffAgendaContext } from "@/types/staff";
import type { ResourceAgendaContext } from "@/types/resource";
import { isBlockingMaintenance } from "@/types/resource";

function parseDate(iso: string) {
  return new Date(iso);
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatTime(d: Date) {
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function parseTimeOnDate(base: Date, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}

function checkStaffAvailability(
  staff: StaffAgendaContext | undefined,
  start: Date,
  end: Date,
): string[] {
  const conflicts: string[] = [];
  if (!staff) return conflicts;

  if (staff.status === "ON_LEAVE" || staff.status === "INACTIVE" || staff.status === "ARCHIVED") {
    conflicts.push(`${staff.displayName} n'est pas disponible (${staff.status}).`);
    return conflicts;
  }

  const day = start.getDay();
  const schedule = staff.schedules.find((s) => s.dayOfWeek === day && s.active);

  if (!schedule) {
    conflicts.push(`${staff.displayName} ne travaille pas ce jour.`);
    return conflicts;
  }

  const workStart = parseTimeOnDate(start, schedule.startTime);
  const workEnd = parseTimeOnDate(start, schedule.endTime);
  if (start < workStart || end > workEnd) {
    conflicts.push(
      `Hors horaires de ${staff.displayName} (${schedule.startTime}–${schedule.endTime}).`,
    );
  }

  for (const brk of staff.breaks) {
    if (brk.dayOfWeek !== day) continue;
    const bStart = parseTimeOnDate(start, brk.startTime);
    const bEnd = parseTimeOnDate(start, brk.endTime);
    if (overlaps(start, end, bStart, bEnd)) {
      conflicts.push(`Pause ${staff.displayName} (${brk.startTime}–${brk.endTime}).`);
    }
  }

  for (const leave of staff.leaves) {
    if (leave.status !== "APPROVED") continue;
    const lStart = parseDate(leave.startAt);
    const lEnd = parseDate(leave.endAt);
    lEnd.setHours(23, 59, 59, 999);
    if (overlaps(start, end, lStart, lEnd)) {
      conflicts.push(`${staff.displayName} en congé jusqu'au ${lEnd.toLocaleDateString("fr-FR")}.`);
    }
  }

  return conflicts;
}

function checkResourceAvailability(
  resource: ResourceAgendaContext | undefined,
  start: Date,
  end: Date,
): string[] {
  const conflicts: string[] = [];
  if (!resource) return conflicts;
  if (!resource.active) {
    conflicts.push(`${resource.name} est inactive.`);
    return conflicts;
  }
  for (const m of resource.maintenances) {
    if (!isBlockingMaintenance(m.status)) continue;
    const mStart = parseDate(m.startAt);
    const mEnd = parseDate(m.endAt);
    if (overlaps(start, end, mStart, mEnd)) {
      conflicts.push(`${resource.name} en maintenance jusqu'au ${mEnd.toLocaleDateString("fr-FR")}.`);
    }
  }
  return conflicts;
}

/**
 * Vérification frontend — le backend devra revérifier en transaction + EXCLUDE.
 */
export function checkAvailability(
  appointments: Appointment[],
  input: AvailabilityCheckInput,
  staffContext?: StaffAgendaContext,
  resourceContext?: ResourceAgendaContext,
): AvailabilityResult {
  const conflicts: string[] = [];
  const start = parseDate(input.startAt);
  const end = parseDate(input.endAt);

  if (end <= start) {
    conflicts.push("L'heure de fin doit être après l'heure de début.");
  }

  conflicts.push(...checkStaffAvailability(staffContext, start, end));
  if (input.resourceId) {
    conflicts.push(...checkResourceAvailability(resourceContext, start, end));
  }

  for (const apt of appointments) {
    if (apt.id === input.excludeAppointmentId) continue;
    if (apt.status === "CANCELLED") continue;

    const aptStart = parseDate(apt.startAt);
    const aptEnd = parseDate(apt.endAt);
    if (!sameDay(start, aptStart)) continue;
    if (!overlaps(start, end, aptStart, aptEnd)) continue;

    if (apt.staffId === input.staffId) {
      conflicts.push(
        `${apt.staffName} occupée · ${apt.serviceName} (${formatTime(aptStart)}–${formatTime(aptEnd)}).`,
      );
    }

    if (input.resourceId && apt.resourceId === input.resourceId) {
      conflicts.push(
        `${apt.resourceName ?? "Ressource"} indisponible · ${formatTime(aptStart)}–${formatTime(aptEnd)}.`,
      );
    }
  }

  return { available: conflicts.length === 0, conflicts };
}

export function getAvailableSlots(
  appointments: Appointment[],
  params: {
    date: Date;
    staffId: string;
    resourceId?: string;
    durationMinutes: number;
    excludeAppointmentId?: string;
    staffContext?: StaffAgendaContext;
    resourceContext?: ResourceAgendaContext;
  },
): { time: string; available: boolean; reason?: string }[] {
  const slots: { time: string; available: boolean; reason?: string }[] = [];
  const day = params.date.getDay();
  const schedule = params.staffContext?.schedules.find((s) => s.dayOfWeek === day && s.active);

  const openHour = schedule
    ? parseInt(schedule.startTime.split(":")[0], 10)
    : AGENDA_OPEN_HOUR;
  const closeHour = schedule
    ? parseInt(schedule.endTime.split(":")[0], 10) +
      (parseInt(schedule.endTime.split(":")[1], 10) > 0 ? 1 : 0)
    : AGENDA_CLOSE_HOUR;

  if (params.staffContext && !schedule) return slots;

  for (let h = openHour; h < closeHour; h++) {
    for (let m = 0; m < 60; m += AGENDA_SLOT_MINUTES) {
      const start = new Date(params.date);
      start.setHours(h, m, 0, 0);
      const end = new Date(start.getTime() + params.durationMinutes * 60_000);

      if (schedule) {
        const workEnd = parseTimeOnDate(params.date, schedule.endTime);
        if (end > workEnd) continue;
      }

      const result = checkAvailability(
        appointments,
        {
          staffId: params.staffId,
          resourceId: params.resourceId,
          startAt: start.toISOString(),
          endAt: end.toISOString(),
          excludeAppointmentId: params.excludeAppointmentId,
        },
        params.staffContext,
        params.resourceContext,
      );

      slots.push({
        time: formatTime(start),
        available: result.available,
        reason: result.conflicts[0],
      });
    }
  }

  return slots;
}

export function appointmentDurationMinutes(apt: Appointment) {
  const start = parseDate(apt.startAt);
  const end = parseDate(apt.endAt);
  return Math.round((end.getTime() - start.getTime()) / 60_000);
}

export function filterAppointmentsForDay(
  appointments: Appointment[],
  date: Date,
  filters: {
    staffId?: string;
    serviceId?: string;
    resourceId?: string;
    status?: Appointment["status"] | "ALL";
  },
) {
  return appointments.filter((apt) => {
    const start = parseDate(apt.startAt);
    if (!sameDay(start, date)) return false;
    if (filters.staffId && apt.staffId !== filters.staffId) return false;
    if (filters.serviceId && apt.serviceId !== filters.serviceId) return false;
    if (filters.resourceId && apt.resourceId !== filters.resourceId) return false;
    if (filters.status && filters.status !== "ALL" && apt.status !== filters.status) {
      return false;
    }
    return true;
  });
}

export function getWeekDates(anchor: Date) {
  const d = new Date(anchor);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(d);
    x.setDate(d.getDate() + i);
    return x;
  });
}

export function getMonthGrid(anchor: Date) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = new Date(first);
  const dow = first.getDay();
  start.setDate(first.getDate() - (dow === 0 ? 6 : dow - 1));

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export function isStaffAvailableOnDate(
  staff: StaffAgendaContext,
  date: Date,
): boolean {
  if (staff.status !== "ACTIVE") return false;
  const day = date.getDay();
  if (!staff.schedules.some((s) => s.dayOfWeek === day && s.active)) return false;

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  for (const leave of staff.leaves) {
    if (leave.status !== "APPROVED") continue;
    const lStart = parseDate(leave.startAt);
    const lEnd = parseDate(leave.endAt);
    lEnd.setHours(23, 59, 59, 999);
    if (overlaps(dayStart, dayEnd, lStart, lEnd)) return false;
  }
  return true;
}

export function isResourceAvailableOnDate(
  resource: ResourceAgendaContext,
  date: Date,
): boolean {
  if (!resource.active) return false;
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  for (const m of resource.maintenances) {
    if (!isBlockingMaintenance(m.status)) continue;
    const mStart = parseDate(m.startAt);
    const mEnd = parseDate(m.endAt);
    if (overlaps(dayStart, dayEnd, mStart, mEnd)) return false;
  }
  return true;
}
