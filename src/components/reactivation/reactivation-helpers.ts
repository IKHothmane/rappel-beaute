import { formatLastVisit, formatMad } from "@/modules/reactivation/service";
import { REACTIVATION_BUCKET_LABEL, REACTIVATION_HIGH_SPEND } from "@/types/reactivation";
import type { ReactivationBucket, ReactivationCustomerItem, ReactivationKpis } from "@/types/reactivation";

export type ReactivationTab = "all" | "ready" | "vip" | "spend" | "first";
export type AbsenceSegment = "all" | "watch" | "relance" | "inactive" | "dormant";

export const REACTIVATION_PAGE_SIZE = 8;

export function fullName(c: ReactivationCustomerItem) {
  return `${c.firstName} ${c.lastName}`.trim();
}

export function initials(c: ReactivationCustomerItem) {
  const a = c.firstName.trim()[0] ?? "";
  const b = c.lastName.trim()[0] ?? "";
  const s = `${a}${b}`.toUpperCase();
  return s || "—";
}

export function statusLabel(status: string) {
  if (status === "VIP") return "VIP";
  if (status === "AT_RISK") return "À risque";
  if (status === "NEW") return "Nouvelle";
  if (status === "INACTIVE") return "Inactive";
  return null;
}

export function crmChip(c: ReactivationCustomerItem) {
  if (c.isSnoozed) {
    return { label: "En pause", className: "bg-[#F0DDE9] text-ink/70" };
  }
  if (c.hasUpcomingAppointment) {
    return { label: "RDV à venir", className: "bg-emerald-100 text-emerald-800" };
  }
  if (c.pendingWhatsAppTaskId) {
    return { label: "Message préparé", className: "bg-[#FFDEA4] text-[#5D4200]" };
  }
  if (c.canPrepareWhatsApp) {
    return { label: "À relancer", className: "bg-primary/10 text-primary" };
  }
  if (c.daysSinceLastVisit >= 180) {
    return { label: "Dormante", className: "bg-[#FFDAD6] text-[#93000A]" };
  }
  if (c.daysSinceLastVisit >= 90) {
    return { label: "Inactive", className: "bg-amber-100 text-amber-900" };
  }
  return { label: REACTIVATION_BUCKET_LABEL[c.bucket], className: "bg-[#FFEFF8] text-ink/70" };
}

export function matchesSegment(c: ReactivationCustomerItem, segment: AbsenceSegment) {
  const d = c.daysSinceLastVisit;
  if (segment === "all") return true;
  if (segment === "watch") return d >= 30 && d < 60;
  if (segment === "relance") return d >= 60 && d < 90;
  if (segment === "inactive") return d >= 90 && d < 180;
  return d >= 180;
}

export function matchesTab(c: ReactivationCustomerItem, tab: ReactivationTab) {
  if (tab === "all") return true;
  if (tab === "ready") return c.canPrepareWhatsApp;
  if (tab === "vip") return c.status === "VIP";
  if (tab === "spend") return c.totalRevenue >= REACTIVATION_HIGH_SPEND;
  return c.visits === 1;
}

export function matchesSearch(c: ReactivationCustomerItem, q: string) {
  const n = q.trim().toLowerCase();
  if (!n) return true;
  return (
    fullName(c).toLowerCase().includes(n) ||
    c.phone.replace(/\s/g, "").includes(n.replace(/\s/g, "")) ||
    (c.lastServiceName ?? "").toLowerCase().includes(n) ||
    (c.lastStaffName ?? "").toLowerCase().includes(n)
  );
}

export function filterCustomers(
  rows: ReactivationCustomerItem[],
  opts: {
    search: string;
    tab: ReactivationTab;
    segment: AbsenceSegment;
    service: string;
    staff: string;
  },
) {
  return rows.filter(
    (c) =>
      matchesSearch(c, opts.search) &&
      matchesTab(c, opts.tab) &&
      matchesSegment(c, opts.segment) &&
      (!opts.service || c.lastServiceName === opts.service) &&
      (!opts.staff || c.lastStaffName === opts.staff),
  );
}

export function uniqueServices(rows: ReactivationCustomerItem[]) {
  return [...new Set(rows.map((r) => r.lastServiceName).filter((n): n is string => Boolean(n)))].sort(
    (a, b) => a.localeCompare(b, "fr"),
  );
}

export function uniqueStaff(rows: ReactivationCustomerItem[]) {
  return [...new Set(rows.map((r) => r.lastStaffName).filter((n): n is string => Boolean(n)))].sort(
    (a, b) => a.localeCompare(b, "fr"),
  );
}

export function readyCustomers(rows: ReactivationCustomerItem[]) {
  return rows.filter((c) => c.canPrepareWhatsApp);
}

export function todayPotential(rows: ReactivationCustomerItem[]) {
  return rows.reduce((s, c) => s + (c.averageTicket || c.lastServicePrice || 0), 0);
}

export function reactivationInsight(kpis: ReactivationKpis | null) {
  if (!kpis) return "Chargement des segments…";
  if (kpis.inactiveCount === 0) {
    return "Aucune cliente inactive (≥ 30 j sans visite). Le vivier reste vide tant qu’aucune cliente n’a dépassé ce seuil.";
  }
  const conv =
    kpis.conversionPct == null
      ? "taux de retour indisponible (aucune relance WhatsApp envoyée)"
      : `${kpis.conversionPct} % de retour après relance envoyée`;
  const rec =
    kpis.recoveredRevenue > 0
      ? ` CA attribué aux relances envoyées : ${formatMad(kpis.recoveredRevenue)}.`
      : "";
  return `${kpis.inactiveCount} cliente${kpis.inactiveCount > 1 ? "s" : ""} inactive${kpis.inactiveCount > 1 ? "s" : ""} · ${kpis.toRelance} à relancer · ${kpis.contactedCount} déjà contactée${kpis.contactedCount > 1 ? "s" : ""} · ${kpis.returnedCount} revenue${kpis.returnedCount > 1 ? "s" : ""} (${conv}). Potentiel panier moyen × à relancer : ${formatMad(kpis.estimatedRevenue)}.${rec}`;
}

export function segmentCounts(kpis: ReactivationKpis | null) {
  if (!kpis) return { watch: 0, relance: 0, inactive: 0, dormant: 0 };
  return {
    watch: kpis.days30 + kpis.days45,
    relance: kpis.days60,
    inactive: Math.max(0, kpis.days90 - kpis.days180),
    dormant: kpis.days180,
  };
}

export function funnelSteps(kpis: ReactivationKpis | null) {
  if (!kpis) return [];
  const base = Math.max(kpis.inactiveCount, 1);
  const pct = (n: number) => Math.round((n / base) * 1000) / 10;
  return [
    { label: "Inactives identifiées", value: kpis.inactiveCount, hint: "≥ 30 j sans visite", width: 100 },
    { label: "À relancer (hors pause)", value: kpis.toRelance, hint: `${pct(kpis.toRelance)} % du vivier`, width: Math.min(100, pct(kpis.toRelance)) },
    { label: "Déjà contactées", value: kpis.contactedCount, hint: "Dernier message marketing envoyé", width: Math.min(100, pct(kpis.contactedCount)) },
    { label: "Messages préparés", value: kpis.pendingCount, hint: "Tâches WhatsApp en attente", width: Math.min(100, pct(kpis.pendingCount)) },
    { label: "RDV repris", value: kpis.upcomingCount, hint: "Rendez-vous à venir", width: Math.min(100, pct(kpis.upcomingCount)) },
    { label: "Revenues facturées", value: kpis.returnedCount, hint: kpis.recoveredRevenue > 0 ? formatMad(kpis.recoveredRevenue) : "après une relance envoyée", width: Math.min(100, pct(kpis.returnedCount)) },
  ];
}

export function waMeLink(phone: string, marketing: boolean) {
  if (!marketing || !phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return null;
  const intl = digits.startsWith("212") ? digits : digits.replace(/^0/, "212");
  return `https://wa.me/${intl}`;
}

export function exportReactivationCsv(rows: ReactivationCustomerItem[]) {
  const header = [
    "Cliente",
    "Téléphone",
    "Opt-in WhatsApp",
    "Statut",
    "Jours d’absence",
    "Dernière visite",
    "Dernier rituel",
    "Praticienne",
    "Visites",
    "CA",
    "Panier moyen",
    "Peut relancer",
    "Blocage",
  ];
  const lines = rows.map((c) =>
    [
      fullName(c),
      c.phone,
      c.marketingWhatsapp ? "oui" : "non",
      c.status,
      String(c.daysSinceLastVisit),
      formatLastVisit(c.lastVisitAt),
      c.lastServiceName ?? "",
      c.lastStaffName ?? "",
      String(c.visits),
      String(c.totalRevenue),
      String(c.averageTicket),
      c.canPrepareWhatsApp ? "oui" : "non",
      c.blockReason ?? "",
    ]
      .map((cell) => `"${cell.replaceAll('"', '""')}"`)
      .join(";"),
  );
  const pad = (n: number) => String(n).padStart(2, "0");
  const d = new Date();
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const csv = `\uFEFF${[header.join(";"), ...lines].join("\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `reactivation-${stamp}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export { REACTIVATION_HIGH_SPEND };
