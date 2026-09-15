import { formatMad } from "@/lib/utils";
import type { Appointment } from "@/types/appointment";
import type { CustomerListItem, CustomerSegment } from "@/types/customer";
import type { ServiceListItem } from "@/types/service";
import type { WaitingListEntry, WaitingListStatus } from "@/types/waiting-list";
import { WAITING_LIST_STATUS_LABEL } from "@/types/waiting-list";

export type WaitingTab = "all" | "high" | "today" | "match" | "booked";
export type WaitingPriority = "high" | "medium" | "normal";

export const WAITING_PAGE_SIZE = 8;
export const HOLD_MS = 10 * 60 * 1000;
export const TZ = "Africa/Casablanca";

export const TIME_WINDOWS = [
  { id: "morning", label: "Matin (10h00 – 13h00)", from: "10:00", to: "13:00" },
  { id: "afternoon", label: "Après-midi (14h00 – 18h00)", from: "14:00", to: "18:00" },
  { id: "evening", label: "Fin de journée (18h00 – 20h30)", from: "18:00", to: "20:30" },
  { id: "all", label: "Toute la journée", from: "", to: "" },
] as const;

export const WEEKDAYS: { id: number; label: string }[] = [
  { id: 1, label: "Lun" },
  { id: 2, label: "Mar" },
  { id: 3, label: "Mer" },
  { id: 4, label: "Jeu" },
  { id: 5, label: "Ven" },
  { id: 6, label: "Sam" },
  { id: 0, label: "Dim" },
];

const DAY_SHORT = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

export type WaitingRow = WaitingListEntry & {
  firstName: string;
  lastName: string;
  initials: string;
  servicePrice: number | null;
  serviceDurationMin: number | null;
  customerSegment: CustomerSegment;
  customerVisits: number;
  customerCreatedAt: string | null;
  priority: WaitingPriority;
  matchScore: number;
  hasMatch: boolean;
  matchSlotLabel: string | null;
};

export type WaitingKpis = {
  waiting: number;
  addedToday: number;
  highPriority: number;
  todayReady: number;
  matches: number;
  bookedMonth: number;
  bookedMonthRevenue: number;
  avgWaitDays: number | null;
};

export type CancelledSlot = {
  appointmentId: string;
  serviceId: string;
  serviceName: string;
  staffId: string;
  staffName: string;
  startAt: string;
  price: number;
};

export type DemandSlice = { label: string; pct: number };

export function casablancaToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

export function splitName(full: string): { firstName: string; lastName: string; initials: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? "";
  const lastName = parts.slice(1).join(" ");
  const initials = `${firstName.charAt(0)}${lastName.charAt(0) || firstName.charAt(1) || ""}`.toUpperCase();
  return { firstName, lastName, initials: initials || "?" };
}

export function hhmm(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 5);
}

export function daysUntil(dateStr: string, today = casablancaToday()): number {
  const t = Date.parse(`${today}T00:00:00`);
  const d = Date.parse(`${dateStr}T00:00:00`);
  if (Number.isNaN(t) || Number.isNaN(d)) return 99;
  return Math.round((d - t) / 86_400_000);
}

export function daysSinceIso(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}

export function entryPriority(preferredDate: string, today = casablancaToday()): WaitingPriority {
  const d = daysUntil(preferredDate, today);
  if (d <= 1) return "high";
  if (d <= 7) return "medium";
  return "normal";
}

export function preferredDayShort(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return "—";
  return DAY_SHORT[new Date(y, m - 1, d).getDay()] ?? "—";
}

export function timeWindowLabel(from: string | null, to: string | null): string {
  const a = hhmm(from);
  const b = hhmm(to);
  if (!a && !b) return "Flexible";
  const hour = a ? Number(a.slice(0, 2)) : 12;
  const band = hour < 13 ? "Matin" : hour < 18 ? "Après-midi" : "Soirée";
  if (a && b) return `${band} ${a} – ${b}`;
  if (a) return `À partir de ${a}`;
  return band;
}

export function formatWaitDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  return new Date(y, m - 1, d).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: TZ,
  });
}

export function formatSlotClock(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ,
  });
}

export function formatRelativeAdded(iso: string): string {
  const days = daysSinceIso(iso);
  const date = new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: TZ,
  });
  if (days === 0) return `${date} (aujourd’hui)`;
  if (days === 1) return `${date} (hier)`;
  return `${date} (il y a ${days} j)`;
}

export function tenureLabel(createdAt: string | null): string | null {
  if (!createdAt) return null;
  const months = Math.max(
    0,
    Math.floor((Date.now() - new Date(createdAt).getTime()) / (30.44 * 86_400_000)),
  );
  if (months < 1) return "Nouvelle";
  if (months < 12) return `Depuis ${months} mois`;
  const years = Math.floor(months / 12);
  return `Depuis ${years} an${years > 1 ? "s" : ""}`;
}

export function vipLabel(segment: CustomerSegment): string | null {
  if (segment === "VIP") return "VIP";
  if (segment === "NEW") return "Nouvelle";
  return null;
}

export function computeMatchScore(
  entry: WaitingListEntry,
  opts: { vip: boolean; slot: CancelledSlot | null },
): number {
  if (entry.status === "BOOKED" || entry.status === "CANCELLED" || entry.status === "EXPIRED") {
    return 0;
  }
  let score = 42;
  const days = daysUntil(entry.preferredDate);
  if (days === 0) score += 32;
  else if (days === 1) score += 24;
  else if (days > 1 && days <= 3) score += 14;
  else if (days < 0) score += 8;
  if (entry.staffId) score += 8;
  if (entry.preferredTimeFrom) score += 6;
  if (opts.vip) score += 5;
  if (entry.status === "NOTIFIED") score += 12;
  if (opts.slot) {
    if (opts.slot.serviceId === entry.serviceId) score += 10;
    if (entry.staffId && entry.staffId === opts.slot.staffId) score += 8;
  }
  return Math.min(98, Math.max(18, score));
}

export function matchSlotLabel(entry: WaitingListEntry, slot: CancelledSlot | null): string | null {
  if (slot && slot.serviceId === entry.serviceId) {
    const sameStaff = !entry.staffId || entry.staffId === slot.staffId;
    if (sameStaff) {
      const today = casablancaToday();
      const slotDay = new Date(slot.startAt).toLocaleDateString("en-CA", { timeZone: TZ });
      const when = slotDay === today ? "Aujourd’hui" : formatWaitDate(slotDay);
      return `${when} ${formatSlotClock(slot.startAt)}`;
    }
  }
  if (entry.status === "NOTIFIED") {
    const t = hhmm(entry.preferredTimeFrom);
    return t ? `${formatWaitDate(entry.preferredDate)} ${t}` : formatWaitDate(entry.preferredDate);
  }
  const days = daysUntil(entry.preferredDate);
  if (days === 0 || days === 1) {
    const t = hhmm(entry.preferredTimeFrom);
    const when = days === 0 ? "Aujourd’hui" : "Demain";
    return t ? `${when} ${t}` : when;
  }
  return null;
}

export function findCancelledSlot(appointments: Appointment[]): CancelledSlot | null {
  const today = casablancaToday();
  const now = Date.now();
  const candidates = appointments
    .filter((a) => a.status === "CANCELLED")
    .map((a) => ({
      appointmentId: a.id,
      serviceId: a.serviceId,
      serviceName: a.serviceName,
      staffId: a.staffId,
      staffName: a.staffName,
      startAt: a.startAt,
      price: a.price,
      day: new Date(a.startAt).toLocaleDateString("en-CA", { timeZone: TZ }),
    }))
    .filter((a) => a.day === today && new Date(a.startAt).getTime() > now)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  return candidates[0] ?? null;
}

export function enrichWaitingRows(
  items: WaitingListEntry[],
  customers: CustomerListItem[],
  services: Pick<ServiceListItem, "id" | "price" | "durationMin">[],
  slot: CancelledSlot | null,
): WaitingRow[] {
  const custById = new Map(customers.map((c) => [c.id, c]));
  const svcById = new Map(services.map((s) => [s.id, s]));
  return items.map((entry) => {
    const names = splitName(entry.customerName);
    const customer = custById.get(entry.customerId);
    const service = svcById.get(entry.serviceId);
    const vip = customer?.segment === "VIP";
    const score = computeMatchScore(entry, { vip, slot });
    return {
      ...entry,
      ...names,
      servicePrice: service?.price ?? null,
      serviceDurationMin: service?.durationMin ?? null,
      customerSegment: customer?.segment ?? "ALL",
      customerVisits: customer?.visits ?? 0,
      customerCreatedAt: customer?.createdAt ?? null,
      priority: entryPriority(entry.preferredDate),
      matchScore: score,
      hasMatch: entry.status === "NOTIFIED" || score >= 80,
      matchSlotLabel: matchSlotLabel(entry, slot),
    };
  });
}

export function waitingKpis(rows: WaitingRow[]): WaitingKpis {
  const today = casablancaToday();
  const monthPrefix = today.slice(0, 7);
  const active = rows.filter((r) => r.status === "WAITING" || r.status === "NOTIFIED");
  const bookedMonth = rows.filter(
    (r) => r.status === "BOOKED" && r.createdAt.slice(0, 7) === monthPrefix,
  );
  const waits = active.map((r) => daysSinceIso(r.createdAt));
  const avg = waits.length ? waits.reduce((a, b) => a + b, 0) / waits.length : null;
  return {
    waiting: active.length,
    addedToday: rows.filter(
      (r) =>
        r.createdAt.slice(0, 10) === today &&
        (r.status === "WAITING" || r.status === "NOTIFIED"),
    ).length,
    highPriority: active.filter((r) => r.priority === "high").length,
    todayReady: active.filter((r) => r.preferredDate === today).length,
    matches: active.filter((r) => r.hasMatch).length,
    bookedMonth: bookedMonth.length,
    bookedMonthRevenue: bookedMonth.reduce((sum, r) => sum + (r.servicePrice ?? 0), 0),
    avgWaitDays: avg == null ? null : Math.round(avg * 10) / 10,
  };
}

export function filterWaitingRows(
  rows: WaitingRow[],
  tab: WaitingTab,
  search: string,
  serviceId: string,
  staffId: string,
  priority: WaitingPriority | "",
): WaitingRow[] {
  const q = search.trim().toLowerCase();
  const monthPrefix = casablancaToday().slice(0, 7);
  return rows
    .filter((r) => {
      if (tab === "all") return r.status === "WAITING" || r.status === "NOTIFIED";
      if (tab === "high") {
        return (r.status === "WAITING" || r.status === "NOTIFIED") && r.priority === "high";
      }
      if (tab === "today") {
        return (r.status === "WAITING" || r.status === "NOTIFIED") && r.preferredDate === casablancaToday();
      }
      if (tab === "match") return (r.status === "WAITING" || r.status === "NOTIFIED") && r.hasMatch;
      if (tab === "booked") return r.status === "BOOKED" && r.createdAt.slice(0, 7) === monthPrefix;
      return true;
    })
    .filter((r) => {
      if (serviceId && r.serviceId !== serviceId) return false;
      if (staffId && r.staffId !== staffId) return false;
      if (priority && r.priority !== priority) return false;
      if (!q) return true;
      const hay = `${r.customerName} ${r.customerPhone} ${r.serviceName} ${r.staffName ?? ""}`.toLowerCase();
      return hay.includes(q);
    })
    .sort((a, b) => b.matchScore - a.matchScore || a.preferredDate.localeCompare(b.preferredDate));
}

export function tabCounts(rows: WaitingRow[]) {
  const monthPrefix = casablancaToday().slice(0, 7);
  const active = rows.filter((r) => r.status === "WAITING" || r.status === "NOTIFIED");
  return {
    all: active.length,
    high: active.filter((r) => r.priority === "high").length,
    today: active.filter((r) => r.preferredDate === casablancaToday()).length,
    match: active.filter((r) => r.hasMatch).length,
    booked: rows.filter((r) => r.status === "BOOKED" && r.createdAt.slice(0, 7) === monthPrefix).length,
  };
}

export function bestOpportunity(
  rows: WaitingRow[],
  slot: CancelledSlot | null,
): WaitingRow | null {
  const active = rows.filter((r) => r.status === "WAITING" || r.status === "NOTIFIED");
  if (!active.length) return null;
  if (slot) {
    const match = active.find(
      (r) => r.serviceId === slot.serviceId && (!r.staffId || r.staffId === slot.staffId),
    );
    if (match) return match;
  }
  return [...active].sort((a, b) => b.matchScore - a.matchScore)[0] ?? null;
}

export function nextBest(rows: WaitingRow[], excludeId: string): WaitingRow | null {
  return (
    rows
      .filter((r) => r.id !== excludeId && (r.status === "WAITING" || r.status === "NOTIFIED"))
      .sort((a, b) => b.matchScore - a.matchScore)[0] ?? null
  );
}

export function demandMix(rows: WaitingRow[]): DemandSlice[] {
  const active = rows.filter((r) => r.status === "WAITING" || r.status === "NOTIFIED");
  const counts = new Map<string, number>();
  for (const r of active) {
    const key = r.serviceName || "Autre";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const total = active.length || 1;
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([label, n]) => ({ label, pct: Math.round((n / total) * 100) }));
}

export function saturdayOpportunity(rows: WaitingRow[]): {
  count: number;
  revenue: number;
  staffName: string | null;
} | null {
  const longWait = rows.filter((r) => {
    if (r.status !== "WAITING" && r.status !== "NOTIFIED") return false;
    if (daysSinceIso(r.createdAt) < 5) return false;
    const [y, m, d] = r.preferredDate.split("-").map(Number);
    if (!y || !m || !d) return false;
    return new Date(y, m - 1, d).getDay() === 6;
  });
  if (longWait.length < 2) return null;
  const names = longWait.map((r) => r.staffName).filter(Boolean);
  return {
    count: longWait.length,
    revenue: longWait.reduce((sum, r) => sum + (r.servicePrice ?? 0), 0),
    staffName: names[0] ?? null,
  };
}

export function waitlistWhatsappHref(row: WaitingRow, orgName: string, slotTime?: string | null) {
  const digits = row.customerPhone.replace(/\D/g, "");
  const normalized = digits.startsWith("212")
    ? digits
    : digits.startsWith("0")
      ? `212${digits.slice(1)}`
      : digits;
  const time = slotTime || hhmm(row.preferredTimeFrom);
  const timeLabel = time ? ` à ${time.replace(":", "h")}` : "";
  const staff = row.staffName ? ` avec ${row.staffName.split(" ")[0]}` : "";
  const text = encodeURIComponent(
    `Bonjour ${row.firstName} 👋 Un créneau vient de se libérer${timeLabel} pour votre ${row.serviceName}${staff}. Souhaitez-vous le réserver ? ${orgName}`,
  );
  return `https://wa.me/${normalized}?text=${text}`;
}

export function waitlistWhatsappPreview(row: WaitingRow, orgName: string, slotTime?: string | null) {
  const time = slotTime || hhmm(row.preferredTimeFrom);
  const timeLabel = time ? ` à ${time.replace(":", "h")}` : "";
  const staff = row.staffName ? ` avec ${row.staffName.split(" ")[0]}` : "";
  return `Bonjour ${row.firstName} 👋 Un créneau vient de se libérer${timeLabel} pour votre ${row.serviceName}${staff}. Souhaitez-vous le réserver ? ${orgName}`;
}

export function statusChip(status: WaitingListStatus) {
  if (status === "NOTIFIED") {
    return { label: "Créneau proposé", className: "text-primary font-semibold" };
  }
  if (status === "BOOKED") {
    return { label: WAITING_LIST_STATUS_LABEL.BOOKED, className: "text-emerald-700 font-semibold" };
  }
  if (status === "CANCELLED") {
    return { label: WAITING_LIST_STATUS_LABEL.CANCELLED, className: "text-ink/45" };
  }
  if (status === "EXPIRED") {
    return { label: WAITING_LIST_STATUS_LABEL.EXPIRED, className: "text-ink/45" };
  }
  return { label: "En attente", className: "text-ink/55" };
}

export function priorityChip(priority: WaitingPriority) {
  if (priority === "high") {
    return { label: "Haute", className: "bg-primary text-white" };
  }
  if (priority === "medium") {
    return { label: "Moyenne", className: "bg-[#FCCA66] text-[#755400]" };
  }
  return { label: "Normale", className: "bg-[#F6E3EF] text-ink" };
}

export function nextDateForWeekdays(days: number[]): string {
  const todayStr = casablancaToday();
  const [y, m, d] = todayStr.split("-").map(Number);
  const base = new Date(y, m - 1, d);
  const selected = days.length ? days : [base.getDay()];
  for (let i = 0; i < 14; i++) {
    const dt = new Date(base);
    dt.setDate(base.getDate() + i);
    if (selected.includes(dt.getDay())) {
      const yyyy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, "0");
      const dd = String(dt.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }
  }
  return todayStr;
}

export function slotToLocalParts(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("en-CA", { timeZone: TZ }),
    time: d.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: TZ,
    }),
  };
}

export function buildAppointmentTimes(
  date: string,
  time: string,
  durationMin: number,
): { startAt: string; endAt: string } {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  const start = new Date(y, mo - 1, d, h || 10, min || 0, 0);
  const end = new Date(start.getTime() + Math.max(15, durationMin) * 60_000);
  return { startAt: start.toISOString(), endAt: end.toISOString() };
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function exportWaitingCsv(rows: WaitingRow[]) {
  const header = [
    "Cliente",
    "Téléphone",
    "Prestation",
    "Prix",
    "Date souhaitée",
    "Horaire",
    "Praticienne",
    "Priorité",
    "Score",
    "Statut",
  ];
  const lines = rows.map((r) =>
    [
      r.customerName,
      r.customerPhone,
      r.serviceName,
      r.servicePrice ?? "",
      r.preferredDate,
      `${hhmm(r.preferredTimeFrom)}${r.preferredTimeTo ? `-${hhmm(r.preferredTimeTo)}` : ""}`,
      r.staffName ?? "",
      r.priority,
      r.matchScore,
      WAITING_LIST_STATUS_LABEL[r.status],
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(";"),
  );
  const csv = [header.join(";"), ...lines].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `liste-attente-${casablancaToday()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function formatWaitMad(n: number | null | undefined) {
  if (n == null) return "—";
  return formatMad(n);
}

export function staffShort(name: string | null): string {
  if (!name) return "Toutes dispo";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1].charAt(0)}.`;
}
