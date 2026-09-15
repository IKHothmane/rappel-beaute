import type { StaffCommissionItem, StaffLeaveItem, StaffScheduleSlot, StaffStatus } from "@/types/staff";

export function staffInitials(firstName: string, lastName: string) {
  const a = firstName.trim().charAt(0);
  const b = lastName.trim().charAt(0);
  const initials = `${a}${b}`.toUpperCase();
  return initials || "?";
}

export function shortStaffRef(id: string) {
  const tail = id.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
  return `#${tail || id.slice(-4).toUpperCase()}`;
}

export function formatHireLabel(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const label = d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const months = Math.max(0, Math.floor((Date.now() - d.getTime()) / (30.44 * 86_400_000)));
  if (months < 1) return `${label} (ce mois)`;
  if (months < 12) return `${label} (${months} mois)`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (!rem) return `${label} (${years} an${years > 1 ? "s" : ""})`;
  return `${label} (${years} an${years > 1 ? "s" : ""} ${rem} mois)`;
}

export function statusDotClass(status: StaffStatus) {
  if (status === "ACTIVE") return "bg-emerald-500";
  if (status === "ON_LEAVE") return "bg-amber-500";
  return "bg-ink/25";
}

export function statusChipClass(status: StaffStatus) {
  if (status === "ACTIVE") return "bg-emerald-50 text-emerald-800";
  if (status === "ON_LEAVE") return "bg-amber-50 text-amber-800";
  if (status === "INACTIVE") return "bg-[#F0DDE9] text-ink/55";
  return "bg-[#F6E3EF] text-ink/45";
}

export function commissionRuleLabel(rules: StaffCommissionItem[]): string {
  if (!rules.length) return "Non définie";
  const percents = rules
    .filter((r) => r.type === "PERCENTAGE" && r.percentage != null)
    .map((r) => r.percentage as number);
  if (percents.length === rules.length) {
    const uniq = [...new Set(percents)];
    if (uniq.length === 1) return `Fixe + ${uniq[0]} % com. soins`;
  }
  return `${rules.length} règle${rules.length > 1 ? "s" : ""}`;
}

export function todayScheduleLabel(schedules: StaffScheduleSlot[]): string {
  const dow = new Date().getDay();
  const slots = schedules.filter((s) => s.dayOfWeek === dow && s.active);
  if (!slots.length) return "Pas de créneau aujourd’hui";
  return slots.map((s) => `${s.startTime}–${s.endTime}`).join(" · ");
}

export function currentApprovedLeave(leaves: StaffLeaveItem[]): StaffLeaveItem | null {
  const now = Date.now();
  return (
    leaves.find(
      (l) =>
        l.status === "APPROVED" &&
        new Date(l.startAt).getTime() <= now &&
        new Date(l.endAt).getTime() >= now,
    ) ?? null
  );
}
