import { getWeekDates } from "@/modules/appointments/availability";
import type { Appointment } from "@/types/appointment";
import type { OrganizationClosureItem } from "@/types/planning";
import type { LeaveType, StaffAgendaContext, StaffBreakSlot, StaffScheduleSlot } from "@/types/staff";
import { DAY_LABELS, LEAVE_TYPE_LABEL } from "@/types/staff";

export const DAY_SHORT = ["DIM", "LUN", "MAR", "MER", "JEU", "VEN", "SAM"] as const;

export type PlanningView = "day" | "week" | "month";

export type DayCell =
  | { kind: "work"; start: string; end: string; hours: number }
  | { kind: "overtime"; start: string; end: string; hours: number }
  | { kind: "leave"; label: string; type: LeaveType }
  | { kind: "replaced"; substituteName: string }
  | { kind: "off" };

export type PlanningConflict = {
  kind: "leave_rdv" | "off_rdv" | "closure_rdv";
  title: string;
  detail: string;
};

export type AiSuggestion = {
  dayLabel: string;
  appointmentCount: number;
  staffOnDuty: number;
  suggestName: string;
};

export function toHHMM(raw: string): string {
  const match = String(raw).match(/(\d{1,2}):(\d{2})/);
  if (!match) return "09:00";
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

export function minutesFromTime(raw: string): number {
  const [h, m] = toHHMM(raw).split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function hoursBetween(start: string, end: string): number {
  return Math.max(0, (minutesFromTime(end) - minutesFromTime(start)) / 60);
}

export function formatShiftBadge(start: string, end: string): string {
  return `${toHHMM(start).slice(0, 2)}-${toHHMM(end).slice(0, 2)}`;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export function isThisWeek(anchor: Date): boolean {
  const now = new Date();
  const week = getWeekDates(anchor);
  return now >= startOfDay(week[0]) && now <= endOfDay(week[6]);
}

export function formatWeekTitle(dates: Date[]): string {
  const a = dates[0];
  const b = dates[6];
  if (!a || !b) return "";
  const monthYear = b.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }).toUpperCase();
  if (a.getMonth() === b.getMonth()) {
    return `SEMAINE DU ${a.getDate()} → ${b.getDate()} ${monthYear}`;
  }
  const startMonth = a.toLocaleDateString("fr-FR", { month: "short" }).toUpperCase();
  return `SEMAINE DU ${a.getDate()} ${startMonth} → ${b.getDate()} ${monthYear}`;
}

export function formatDayHead(date: Date): string {
  return `${DAY_SHORT[date.getDay()]} ${date.getDate()}`;
}

export function formatLeaveSpan(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const startLabel = start.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
  const endLabel = end.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
  if (sameDay(start, end)) return `${startLabel} (1 jour)`;
  return `${startLabel} → ${endLabel}`;
}

function breakHoursForDay(staff: StaffAgendaContext, dayOfWeek: number): number {
  return staff.breaks
    .filter((b) => b.dayOfWeek === dayOfWeek)
    .reduce((sum, b) => sum + hoursBetween(b.startTime, b.endTime), 0);
}

function netHours(start: string, end: string, breaks: number): number {
  return Math.max(0, hoursBetween(start, end) - breaks);
}

export function cellForStaffDay(staff: StaffAgendaContext, date: Date): DayCell {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);
  const dow = date.getDay();

  const leave = staff.leaves.find((item) =>
    overlaps(dayStart, dayEnd, new Date(item.startAt), new Date(item.endAt)),
  );
  if (leave) {
    return { kind: "leave", label: LEAVE_TYPE_LABEL[leave.type], type: leave.type };
  }

  const replacement = (staff.replacementsAsAbsent ?? []).find((item) =>
    overlaps(dayStart, dayEnd, new Date(item.startAt), new Date(item.endAt)),
  );
  if (replacement) {
    return { kind: "replaced", substituteName: replacement.substituteName };
  }

  const schedule = staff.schedules.find((item) => item.dayOfWeek === dow && item.active);
  if (schedule) {
    return {
      kind: "work",
      start: toHHMM(schedule.startTime),
      end: toHHMM(schedule.endTime),
      hours: netHours(schedule.startTime, schedule.endTime, breakHoursForDay(staff, dow)),
    };
  }

  const overtime = (staff.overtimes ?? []).find((item) =>
    overlaps(dayStart, dayEnd, new Date(item.startAt), new Date(item.endAt)),
  );
  if (overtime) {
    const start = new Date(overtime.startAt);
    const end = new Date(overtime.endAt);
    const startStamp = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;
    const endStamp = `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;
    return {
      kind: "overtime",
      start: startStamp,
      end: endStamp,
      hours: Math.max(0, (end.getTime() - start.getTime()) / 3_600_000),
    };
  }

  return { kind: "off" };
}

export function weekHours(staff: StaffAgendaContext, dates: Date[]): number {
  return dates.reduce((sum, date) => {
    const cell = cellForStaffDay(staff, date);
    if (cell.kind === "work" || cell.kind === "overtime") return sum + cell.hours;
    return sum;
  }, 0);
}

export function templateWeekHours(staff: StaffAgendaContext): number {
  return staff.schedules
    .filter((item) => item.active)
    .reduce(
      (sum, item) => sum + netHours(item.startTime, item.endTime, breakHoursForDay(staff, item.dayOfWeek)),
      0,
    );
}

export function isOnDutyToday(staff: StaffAgendaContext, today = new Date()): boolean {
  if (staff.status !== "ACTIVE") return false;
  const cell = cellForStaffDay(staff, today);
  return cell.kind === "work" || cell.kind === "overtime";
}

export function liveAppointments(appointments: Appointment[]): Appointment[] {
  return appointments.filter((item) => item.status !== "CANCELLED");
}

export function appointmentsInRange(appointments: Appointment[], start: Date, end: Date): Appointment[] {
  const from = startOfDay(start).getTime();
  const to = endOfDay(end).getTime();
  return liveAppointments(appointments).filter((item) => {
    const t = new Date(item.startAt).getTime();
    return t >= from && t <= to;
  });
}

export function detectConflicts(
  staff: StaffAgendaContext[],
  appointments: Appointment[],
  closures: OrganizationClosureItem[],
  dates: Date[],
): PlanningConflict[] {
  const rangeStart = startOfDay(dates[0]);
  const rangeEnd = endOfDay(dates[dates.length - 1]);
  const weekApts = appointmentsInRange(appointments, rangeStart, rangeEnd);
  const conflicts: PlanningConflict[] = [];

  for (const apt of weekApts) {
    const start = new Date(apt.startAt);
    const end = new Date(apt.endAt);
    const person = staff.find((item) => item.id === apt.staffId);
    if (!person) continue;

    const closure = closures.find((item) =>
      overlaps(start, end, new Date(item.startAt), new Date(item.endAt)),
    );
    if (closure) {
      conflicts.push({
        kind: "closure_rdv",
        title: "Conflit fermeture / Agenda",
        detail: `${person.firstName} : RDV ${apt.customerName} pendant une fermeture institut.`,
      });
      continue;
    }

    const cell = cellForStaffDay(person, start);
    if (cell.kind === "leave") {
      conflicts.push({
        kind: "leave_rdv",
        title: "Conflit congé / RDV Agenda",
        detail: `${person.firstName} : ${apt.serviceName} le ${start.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} alors qu’un ${cell.label.toLowerCase()} est posé.`,
      });
      continue;
    }
    if (cell.kind === "off" || cell.kind === "replaced") {
      conflicts.push({
        kind: "off_rdv",
        title: "Conflit planning / RDV Agenda",
        detail: `${person.firstName} : RDV ${apt.customerName} hors horaire travaillé.`,
      });
    }
  }

  const seen = new Set<string>();
  return conflicts.filter((item) => {
    const key = `${item.kind}:${item.detail}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function hourWindow(staff: StaffAgendaContext[]): { startHour: number; endHour: number } {
  let min = 9;
  let max = 19;
  for (const person of staff) {
    for (const schedule of person.schedules.filter((item) => item.active)) {
      min = Math.min(min, Math.floor(minutesFromTime(schedule.startTime) / 60));
      max = Math.max(max, Math.ceil(minutesFromTime(schedule.endTime) / 60));
    }
  }
  return { startHour: Math.max(8, min), endHour: Math.min(21, Math.max(max, min + 1)) };
}

export function staffAtHour(
  staff: StaffAgendaContext,
  date: Date,
  hour: number,
): { present: boolean; onBreak: boolean; label?: string; startedThisHour?: boolean } {
  const cell = cellForStaffDay(staff, date);
  if (cell.kind !== "work" && cell.kind !== "overtime") {
    return { present: false, onBreak: false };
  }
  const startM = minutesFromTime(cell.start);
  const endM = minutesFromTime(cell.end);
  const hourM = hour * 60;
  if (hourM < startM || hourM >= endM) {
    return { present: false, onBreak: false, label: hourM === endM ? `Fin ${cell.end}` : undefined };
  }
  const onBreak = staff.breaks.some((item) => {
    if (item.dayOfWeek !== date.getDay()) return false;
    const bStart = minutesFromTime(item.startTime);
    const bEnd = minutesFromTime(item.endTime);
    return hourM >= bStart && hourM < bEnd;
  });
  return {
    present: !onBreak,
    onBreak,
    label: formatShiftBadge(cell.start, cell.end),
    startedThisHour: Math.floor(startM / 60) === hour,
  };
}

export function openingHoursFromStaff(staff: StaffAgendaContext[]): { day: number; label: string; hours: string }[] {
  return [1, 2, 3, 4, 5, 6, 0].map((day) => {
    const label = DAY_LABELS[day];
    const slots = staff.flatMap((person) =>
      person.schedules.filter((item) => item.active && item.dayOfWeek === day),
    );
    if (!slots.length) {
      return { day, label, hours: "Fermé au public" };
    }
    const start = slots.reduce(
      (min, item) => (minutesFromTime(item.startTime) < minutesFromTime(min) ? item.startTime : min),
      slots[0].startTime,
    );
    const end = slots.reduce(
      (max, item) => (minutesFromTime(item.endTime) > minutesFromTime(max) ? item.endTime : max),
      slots[0].endTime,
    );
    return { day, label, hours: `${toHHMM(start)} → ${toHHMM(end)}` };
  });
}

export function buildAiSuggestion(
  staff: StaffAgendaContext[],
  appointments: Appointment[],
  dates: Date[],
): AiSuggestion | null {
  if (!staff.length) return null;
  let best: { date: Date; count: number; onDuty: number } | null = null;
  for (const date of dates) {
    const count = appointmentsInRange(appointments, date, date).length;
    const onDuty = staff.filter((person) => {
      const cell = cellForStaffDay(person, date);
      return cell.kind === "work" || cell.kind === "overtime";
    }).length;
    if (!best || count > best.count) best = { date, count, onDuty };
  }
  if (!best || best.count < 6 || best.onDuty === 0) return null;
  const load = best.count / best.onDuty;
  if (load < 5) return null;
  const off = staff.find((person) => {
    const cell = cellForStaffDay(person, best.date);
    return cell.kind === "off" && person.status === "ACTIVE";
  });
  if (!off) return null;
  return {
    dayLabel: best.date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }),
    appointmentCount: best.count,
    staffOnDuty: best.onDuty,
    suggestName: off.firstName,
  };
}

export function schedulesForEditor(staff: StaffAgendaContext): StaffScheduleSlot[] {
  const map = new Map(staff.schedules.map((item) => [item.dayOfWeek, item]));
  return Array.from({ length: 7 }, (_, day) => {
    const existing = map.get(day);
    return existing
      ? { ...existing, startTime: toHHMM(existing.startTime), endTime: toHHMM(existing.endTime) }
      : { dayOfWeek: day, startTime: "09:00", endTime: "18:00", active: false };
  });
}

export function breaksForEditor(staff: StaffAgendaContext): StaffBreakSlot[] {
  return staff.breaks.map((item) => ({
    ...item,
    startTime: toHHMM(item.startTime),
    endTime: toHHMM(item.endTime),
  }));
}

export function initialForDay(staff: StaffAgendaContext): string {
  return (staff.firstName?.[0] ?? staff.displayName[0] ?? "?").toUpperCase();
}
