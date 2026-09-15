import { AT_RISK_DAYS } from "@/types/customer";
import type { CustomerAppointmentHistory, CustomerSegment } from "@/types/customer";

export function customerInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function shortCustomerRef(id: string) {
  const tail = id.replace(/^cust-?/i, "").slice(-6);
  return `#${tail || id.slice(-6)}`;
}

export function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}

export function formatRelativeVisit(iso: string | null): string {
  const d = daysSince(iso);
  if (d == null) return "Jamais venue";
  if (d === 0) return "Aujourd’hui";
  if (d === 1) return "Hier";
  if (d >= AT_RISK_DAYS) return `+${d} jours`;
  return `Il y a ${d} j`;
}

export function whatsappHref(phone: string, firstName: string) {
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.startsWith("212")
    ? digits
    : digits.startsWith("0")
      ? `212${digits.slice(1)}`
      : digits;
  const text = encodeURIComponent(`Bonjour ${firstName} 👋`);
  return `https://wa.me/${normalized}?text=${text}`;
}

export function favoriteStaff(history: CustomerAppointmentHistory[]): string | null {
  const names = history
    .map((h) => h.staffFirstName)
    .filter((n): n is string => Boolean(n));
  if (!names.length) return null;
  const counts = new Map<string, number>();
  for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);
  let best: string | null = null;
  let n = 0;
  for (const [name, count] of counts) {
    if (count > n) {
      best = name;
      n = count;
    }
  }
  return best;
}

export function favoriteService(history: CustomerAppointmentHistory[]): string | null {
  const done = history.filter((h) => h.status === "COMPLETED");
  if (!done.length) return null;
  const counts = new Map<string, number>();
  for (const item of done) {
    counts.set(item.serviceName, (counts.get(item.serviceName) ?? 0) + 1);
  }
  let best: string | null = null;
  let n = 0;
  for (const [name, count] of counts) {
    if (count > n) {
      best = name;
      n = count;
    }
  }
  return best;
}

export function averageVisitGapDays(history: CustomerAppointmentHistory[]): number | null {
  const dates = history
    .filter((h) => h.status === "COMPLETED")
    .map((h) => new Date(h.startAt).getTime())
    .sort((a, b) => a - b);
  if (dates.length < 2) return null;
  let total = 0;
  for (let i = 1; i < dates.length; i++) total += dates[i] - dates[i - 1];
  return Math.round(total / (dates.length - 1) / 86_400_000);
}

export const APPOINTMENT_STATUS_UI: Record<string, { label: string; className: string }> = {
  COMPLETED: { label: "Terminé", className: "bg-emerald-500/10 text-emerald-700" },
  CONFIRMED: { label: "Confirmé", className: "bg-sky-500/10 text-sky-700" },
  PENDING: { label: "En attente", className: "bg-amber-500/10 text-amber-800" },
  ARRIVED: { label: "Arrivée", className: "bg-violet-500/10 text-violet-700" },
  IN_PROGRESS: { label: "En cours", className: "bg-primary/10 text-primary" },
  CANCELLED: { label: "Annulé", className: "bg-slate-100 text-ink/55" },
  NO_SHOW: { label: "No-show", className: "bg-rose-100 text-rose-700" },
};

export function segmentBadge(segment: CustomerSegment): { label: string; className: string } {
  switch (segment) {
    case "VIP":
      return { label: "VIP", className: "bg-[#F6E3EF] text-primary" };
    case "NEW":
      return { label: "Nouvelle", className: "bg-primary/10 text-primary" };
    case "INACTIVE":
      return { label: "Inactive", className: "bg-slate-100 text-ink/60" };
    case "AT_RISK":
      return { label: "À relancer", className: "bg-amber-500/10 text-amber-800" };
    case "ACTIVE":
      return { label: "Active", className: "bg-emerald-500/10 text-emerald-700" };
    default:
      return { label: "Cliente", className: "bg-[#FCE9F4] text-ink/70" };
  }
}
