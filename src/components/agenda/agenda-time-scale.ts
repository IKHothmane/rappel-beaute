import {
  AGENDA_CLOSE_HOUR,
  AGENDA_OPEN_HOUR,
  AGENDA_SLOT_HEIGHT_PX,
  AGENDA_SLOT_MINUTES,
} from "@/modules/appointments/constants";

/** Créneau vide court (moins de 2 h) : lisible, mais bien plus bas qu’un créneau occupé. */
export const AGENDA_EMPTY_SLOT_HEIGHT_PX = 22;

/** 4 créneaux de 30 min = 2 h vides d’affilée → un seul bandeau, plus de long trou. */
export const AGENDA_LONG_GAP_MIN_SLOTS = 4;

export const AGENDA_LONG_GAP_HEIGHT_PX = 40;

export type AgendaTimeSlot = {
  h: number;
  m: number;
  label: string;
};

export type AgendaTimeInterval = {
  start: Date;
  end: Date;
};

type AgendaSlotRow = {
  kind: "slot";
  slot: AgendaTimeSlot;
  index: number;
  top: number;
  height: number;
  empty: boolean;
};

type AgendaGapRow = {
  kind: "gap";
  start: AgendaTimeSlot;
  endLabel: string;
  startIndex: number;
  endIndex: number;
  top: number;
  height: number;
  label: string;
};

export type AgendaTimeRow = AgendaSlotRow | AgendaGapRow;

export type AgendaTimeLayout = {
  slots: AgendaTimeSlot[];
  rows: AgendaTimeRow[];
  tops: number[];
  heights: number[];
  totalHeight: number;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function clockLabel(totalMinutes: number) {
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${pad(Math.floor(normalized / 60))}:${pad(normalized % 60)}`;
}

export function buildAgendaSlots(): AgendaTimeSlot[] {
  const count = ((AGENDA_CLOSE_HOUR - AGENDA_OPEN_HOUR) * 60) / AGENDA_SLOT_MINUTES;
  return Array.from({ length: count }, (_, i) => {
    const totalMin = AGENDA_OPEN_HOUR * 60 + i * AGENDA_SLOT_MINUTES;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return { h, m, label: `${pad(h)}:${pad(m)}` };
  });
}

function startOfLocalDay(date: Date) {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
}

function overlapsClockSlot(slot: AgendaTimeSlot, interval: AgendaTimeInterval) {
  if (interval.end.getTime() <= interval.start.getTime()) return false;
  const slotStartMin = slot.h * 60 + slot.m;
  const slotEndMin = slotStartMin + AGENDA_SLOT_MINUTES;
  const cursor = startOfLocalDay(interval.start);
  const last = startOfLocalDay(new Date(interval.end.getTime() - 1));
  while (cursor.getTime() <= last.getTime()) {
    const winStart = new Date(cursor);
    winStart.setMinutes(slotStartMin, 0, 0);
    const winEnd = new Date(cursor);
    winEnd.setMinutes(slotEndMin, 0, 0);
    if (interval.start < winEnd && interval.end > winStart) return true;
    cursor.setDate(cursor.getDate() + 1);
  }
  return false;
}

/** Un créneau est occupé dès qu’un rendez-vous le croise, quel que soit le jour ou la colonne. */
export function occupyAgendaSlots(slots: AgendaTimeSlot[], intervals: AgendaTimeInterval[]) {
  return slots.map((slot) => intervals.some((interval) => overlapsClockSlot(slot, interval)));
}

export function layoutAgendaTime(occupied: boolean[]): AgendaTimeLayout {
  const slots = buildAgendaSlots();
  if (occupied.length !== slots.length) {
    throw new Error("Le masque des créneaux ne correspond pas à la journée d’agenda.");
  }

  const tops = new Array<number>(slots.length);
  const heights = new Array<number>(slots.length);
  const rows: AgendaTimeRow[] = [];
  let cursor = 0;

  const pushGap = (from: number, to: number) => {
    const count = to - from;
    const top = cursor;
    const height = AGENDA_LONG_GAP_HEIGHT_PX;
    for (let i = from; i < to; i++) {
      const startFrac = (i - from) / count;
      const endFrac = (i - from + 1) / count;
      tops[i] = top + startFrac * height;
      heights[i] = (endFrac - startFrac) * height;
    }
    cursor = top + height;
    const endSlot = slots[to - 1];
    const endLabel = clockLabel(endSlot.h * 60 + endSlot.m + AGENDA_SLOT_MINUTES);
    rows.push({
      kind: "gap",
      start: slots[from],
      endLabel,
      startIndex: from,
      endIndex: to - 1,
      top,
      height,
      label: `${slots[from].label} – ${endLabel}`,
    });
  };

  const pushSlots = (from: number, to: number, empty: boolean) => {
    const height = empty ? AGENDA_EMPTY_SLOT_HEIGHT_PX : AGENDA_SLOT_HEIGHT_PX;
    for (let i = from; i < to; i++) {
      tops[i] = cursor;
      heights[i] = height;
      rows.push({
        kind: "slot",
        slot: slots[i],
        index: i,
        top: cursor,
        height,
        empty,
      });
      cursor += height;
    }
  };

  let index = 0;
  while (index < slots.length) {
    if (occupied[index]) {
      pushSlots(index, index + 1, false);
      index += 1;
      continue;
    }
    const from = index;
    while (index < slots.length && !occupied[index]) index += 1;
    if (index - from >= AGENDA_LONG_GAP_MIN_SLOTS) pushGap(from, index);
    else pushSlots(from, index, true);
  }

  return { slots, rows, tops, heights, totalHeight: cursor };
}

export function buildAgendaLayout(intervals: AgendaTimeInterval[]) {
  const slots = buildAgendaSlots();
  return layoutAgendaTime(occupyAgendaSlots(slots, intervals));
}

function minutesFromAgendaOpen(date: Date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  if (hours === 0 && minutes === 0) return (AGENDA_CLOSE_HOUR - AGENDA_OPEN_HOUR) * 60;
  return (hours - AGENDA_OPEN_HOUR) * 60 + minutes;
}

export function agendaDateToY(layout: AgendaTimeLayout, date: Date) {
  const span = (AGENDA_CLOSE_HOUR - AGENDA_OPEN_HOUR) * 60;
  const minutes = minutesFromAgendaOpen(date);
  if (minutes <= 0) return 0;
  if (minutes >= span) return layout.totalHeight;
  const index = Math.floor(minutes / AGENDA_SLOT_MINUTES);
  const fraction = (minutes % AGENDA_SLOT_MINUTES) / AGENDA_SLOT_MINUTES;
  const top = layout.tops[index];
  const height = layout.heights[index];
  if (top === undefined || height === undefined) return layout.totalHeight;
  return top + fraction * height;
}

export function agendaBlockPosition(
  layout: AgendaTimeLayout,
  start: Date,
  end: Date,
  minHeight: number,
) {
  const top = agendaDateToY(layout, start);
  const bottom = agendaDateToY(layout, end);
  return {
    top: top + 2,
    height: Math.max(bottom - top - 4, minHeight),
  };
}

export function agendaYToSlot(layout: AgendaTimeLayout, y: number): AgendaTimeSlot {
  const fallback = layout.slots[0] ?? { h: AGENDA_OPEN_HOUR, m: 0, label: "08:00" };
  if (!layout.slots.length) return fallback;
  const yClamped = Math.max(0, Math.min(y, Math.max(layout.totalHeight - 0.001, 0)));
  for (let i = 0; i < layout.slots.length; i++) {
    if (yClamped < layout.tops[i] + layout.heights[i]) return layout.slots[i];
  }
  return layout.slots[layout.slots.length - 1];
}
