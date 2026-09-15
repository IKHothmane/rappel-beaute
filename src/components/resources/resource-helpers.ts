import type { LucideIcon } from "lucide-react";
import {
  Armchair,
  Bath,
  Box,
  Building2,
  Cpu,
  Scissors,
  Table2,
  Wrench,
} from "lucide-react";
import type { Appointment } from "@/types/appointment";
import type { ResourceAvailabilitySlot, ResourceListItem, ResourceType } from "@/types/resource";
import { RESOURCE_TYPE_LABEL } from "@/types/resource";

export type LiveStatus = "occupied" | "available" | "maintenance" | "inactive" | "soon";

export const LIVE_STATUS_LABEL: Record<LiveStatus, string> = {
  occupied: "Occupée en soin",
  available: "Disponible",
  maintenance: "Maintenance",
  inactive: "Inactive",
  soon: "Bientôt libérée",
};

const BUSY: Appointment["status"][] = ["PENDING", "CONFIRMED", "ARRIVED", "IN_PROGRESS"];

export function todayISO(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isSameLocalDay(iso: string, day = todayISO()) {
  const d = new Date(iso);
  return todayISO(d) === day;
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function remainingMinutes(endIso: string, now = Date.now()) {
  return Math.max(0, Math.round((new Date(endIso).getTime() - now) / 60_000));
}

export function resourceTypeIcon(type: ResourceType): LucideIcon {
  if (type === "CABINE") return Bath;
  if (type === "SALLE") return Building2;
  if (type === "FAUTEUIL") return Armchair;
  if (type === "TABLE") return Table2;
  if (type === "MACHINE") return Cpu;
  if (type === "EQUIPEMENT") return Wrench;
  return Box;
}

export function typeShortLabel(type: ResourceType) {
  return RESOURCE_TYPE_LABEL[type];
}

export function activeAppointments(list: Appointment[]) {
  return list.filter((a) => BUSY.includes(a.status) && a.resourceId);
}

export function overlappingNow(list: Appointment[], resourceId: string, now = Date.now()) {
  return activeAppointments(list).find((a) => {
    if (a.resourceId !== resourceId) return false;
    const start = new Date(a.startAt).getTime();
    const end = new Date(a.endAt).getTime();
    return start <= now && now < end;
  });
}

export function nextAppointment(list: Appointment[], resourceId: string, now = Date.now()) {
  return activeAppointments(list)
    .filter((a) => a.resourceId === resourceId && new Date(a.startAt).getTime() > now)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0];
}

export function todayAppointments(list: Appointment[], resourceId: string, day = todayISO()) {
  return list.filter(
    (a) => a.resourceId === resourceId && a.status !== "CANCELLED" && isSameLocalDay(a.startAt, day),
  );
}

export function liveStatus(
  resource: ResourceListItem,
  current: Appointment | undefined,
  next: Appointment | undefined,
  now = Date.now(),
): LiveStatus {
  if (!resource.active) return "inactive";
  if (resource.upcomingMaintenance && !current) return "maintenance";
  if (current) {
    const left = remainingMinutes(current.endAt, now);
    if (left > 0 && left <= 15) return "soon";
    return "occupied";
  }
  return "available";
}

export function liveChipClass(status: LiveStatus) {
  if (status === "occupied") return "bg-primary text-white";
  if (status === "soon") return "bg-amber-50 text-amber-800";
  if (status === "maintenance") return "bg-red-50 text-red-800";
  if (status === "inactive") return "bg-[#F0DDE9] text-ink/55";
  return "bg-emerald-50 text-emerald-800";
}

export function liveDotClass(status: LiveStatus) {
  if (status === "occupied") return "bg-white";
  if (status === "soon") return "bg-amber-500";
  if (status === "maintenance") return "bg-red-500";
  if (status === "inactive") return "bg-ink/25";
  return "bg-emerald-500";
}

export function exportResourcesCsv(rows: ResourceListItem[]) {
  const header = ["Nom", "Type", "Emplacement", "Capacité", "Active", "Services", "Maintenance"];
  const lines = rows.map((r) =>
    [
      r.name,
      RESOURCE_TYPE_LABEL[r.type],
      r.location ?? "",
      String(r.capacity),
      r.active ? "oui" : "non",
      r.serviceNames.join(" | "),
      r.upcomingMaintenance ? "oui" : "non",
    ]
      .map((cell) => `"${cell.replaceAll('"', '""')}"`)
      .join(";"),
  );
  const csv = `\uFEFF${[header.join(";"), ...lines].join("\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `ressources-${todayISO()}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export type TimelineBlock = {
  left: number;
  width: number;
  label: string;
  kind: ResourceAvailabilitySlot["kind"] | "free";
  current?: boolean;
};

export function timelineBlocks(
  slots: ResourceAvailabilitySlot[],
  now = Date.now(),
  dayStartHour = 9,
  dayEndHour = 20,
): TimelineBlock[] {
  const startMin = dayStartHour * 60;
  const endMin = dayEndHour * 60;
  const span = endMin - startMin;
  const day = todayISO(new Date(now));
  const dayStart = new Date(`${day}T00:00:00`).getTime();

  const toPct = (ms: number) => {
    const minutes = (ms - dayStart) / 60_000 - startMin;
    return Math.max(0, Math.min(100, (minutes / span) * 100));
  };

  return slots
    .map((s) => {
      const left = toPct(new Date(s.startAt).getTime());
      const right = toPct(new Date(s.endAt).getTime());
      const width = Math.max(1.5, right - left);
      const current = new Date(s.startAt).getTime() <= now && now < new Date(s.endAt).getTime();
      return {
        left,
        width,
        label: `${formatTime(s.startAt)}–${formatTime(s.endAt)}`,
        kind: s.kind,
        current,
      };
    })
    .filter((b) => b.left < 100 && b.left + b.width > 0);
}

export function hairIconForType(type: ResourceType): LucideIcon {
  if (type === "FAUTEUIL") return Scissors;
  return resourceTypeIcon(type);
}
