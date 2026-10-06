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
import {
  businessDayOfWeek,
  businessParts,
  businessTimeOnDate,
  businessWallTime,
  endOfBusinessDay,
  formatBusinessDate,
  formatBusinessTime,
  isSameBusinessDay,
  startOfBusinessDay,
} from "@/lib/time/business-timezone";

function parseDate(iso: string) {
  return new Date(iso);
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
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

  // Remplacement actif → employée absente sur la période
  for (const rep of staff.replacementsAsAbsent ?? []) {
    const rStart = parseDate(rep.startAt);
    const rEnd = parseDate(rep.endAt);
    if (overlaps(start, end, rStart, rEnd)) {
      conflicts.push(
        `${staff.displayName} remplacée par ${rep.substituteName} sur ce créneau.`,
      );
      return conflicts;
    }
  }

  const day = businessDayOfWeek(start);
  const schedule = staff.schedules.find((s) => s.dayOfWeek === day && s.active);
  const coveredByOt = (staff.overtimes ?? []).some((ot) => {
    const oStart = parseDate(ot.startAt);
    const oEnd = parseDate(ot.endAt);
    return start >= oStart && end <= oEnd;
  });

  if (!schedule && !coveredByOt) {
    conflicts.push(`${staff.displayName} ne travaille pas ce jour.`);
    return conflicts;
  }

  if (schedule) {
    const workStart = businessTimeOnDate(start, schedule.startTime);
    const workEnd = businessTimeOnDate(start, schedule.endTime);
    const withinSchedule = start >= workStart && end <= workEnd;
    if (!withinSchedule && !coveredByOt) {
      conflicts.push(
        `Hors horaires de ${staff.displayName} (${schedule.startTime}–${schedule.endTime}).`,
      );
    }
  }

  for (const brk of staff.breaks) {
    if (brk.dayOfWeek !== day) continue;
    const bStart = businessTimeOnDate(start, brk.startTime);
    const bEnd = businessTimeOnDate(start, brk.endTime);
    if (overlaps(start, end, bStart, bEnd)) {
      conflicts.push(`Pause ${staff.displayName} (${brk.startTime}–${brk.endTime}).`);
    }
  }

  for (const leave of staff.leaves) {
    if (leave.status !== "APPROVED") continue;
    const lStart = parseDate(leave.startAt);
    const lEnd = endOfBusinessDay(parseDate(leave.endAt));
    if (overlaps(start, end, lStart, lEnd)) {
      conflicts.push(`${staff.displayName} en congé jusqu'au ${formatBusinessDate(lEnd)}.`);
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
      conflicts.push(`${resource.name} en maintenance jusqu'au ${formatBusinessDate(mEnd)}.`);
    }
  }
  return conflicts;
}

/**
 * Vérification dispo (client + serveur via assertAppointmentBookable).
 * Le navigateur ne doit jamais écrire le stock / RDV sans repasser par l'API.
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
    if (!isSameBusinessDay(start, aptStart)) continue;
    if (!overlaps(start, end, aptStart, aptEnd)) continue;

    if (apt.staffId === input.staffId) {
      conflicts.push(
        `${apt.staffName} occupée · ${apt.serviceName} (${formatBusinessTime(aptStart)}–${formatBusinessTime(aptEnd)}).`,
      );
    }

    if (input.resourceId && apt.resourceId === input.resourceId) {
      conflicts.push(
        `${apt.resourceName ?? "Ressource"} indisponible · ${formatBusinessTime(aptStart)}–${formatBusinessTime(aptEnd)}.`,
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
  const businessDay = businessParts(params.date);
  const now = businessParts(new Date());
  const isToday =
    now.year === businessDay.year &&
    now.month === businessDay.month &&
    now.day === businessDay.day;
  const nowMinutes = now.hour * 60 + now.minute;

  for (let h = AGENDA_OPEN_HOUR; h < AGENDA_CLOSE_HOUR; h++) {
    for (let m = 0; m < 60; m += AGENDA_SLOT_MINUTES) {
      if (isToday && h * 60 + m < nowMinutes) continue;

      const start = businessWallTime(businessDay, h, m);
      const end = new Date(start.getTime() + params.durationMinutes * 60_000);

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
        time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
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
  return filterAppointmentsForDates(appointments, [date], filters);
}

export function filterAppointmentsForDates(
  appointments: Appointment[],
  dates: Date[],
  filters: {
    staffId?: string;
    serviceId?: string;
    resourceId?: string;
    status?: Appointment["status"] | "ALL";
  },
) {
  return appointments.filter((apt) => {
    const start = parseDate(apt.startAt);
    if (!dates.some((d) => isSameBusinessDay(start, d))) return false;
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
  const day = businessDayOfWeek(date);
  const hasSchedule = staff.schedules.some((s) => s.dayOfWeek === day && s.active);
  const dayStart = startOfBusinessDay(date);
  const dayEnd = endOfBusinessDay(date);

  const hasOt = (staff.overtimes ?? []).some((ot) => {
    const oStart = parseDate(ot.startAt);
    const oEnd = parseDate(ot.endAt);
    return overlaps(dayStart, dayEnd, oStart, oEnd);
  });

  if (!hasSchedule && !hasOt) return false;

  for (const leave of staff.leaves) {
    if (leave.status !== "APPROVED") continue;
    const lStart = parseDate(leave.startAt);
    const lEnd = endOfBusinessDay(parseDate(leave.endAt));
    if (overlaps(dayStart, dayEnd, lStart, lEnd)) return false;
  }

  for (const rep of staff.replacementsAsAbsent ?? []) {
    if (overlaps(dayStart, dayEnd, parseDate(rep.startAt), parseDate(rep.endAt))) {
      return false;
    }
  }
  return true;
}

export function isResourceAvailableOnDate(
  resource: ResourceAgendaContext,
  date: Date,
): boolean {
  if (!resource.active) return false;
  const dayStart = startOfBusinessDay(date);
  const dayEnd = endOfBusinessDay(date);

  for (const m of resource.maintenances) {
    if (!isBlockingMaintenance(m.status)) continue;
    const mStart = parseDate(m.startAt);
    const mEnd = parseDate(m.endAt);
    if (overlaps(dayStart, dayEnd, mStart, mEnd)) return false;
  }
  return true;
}
