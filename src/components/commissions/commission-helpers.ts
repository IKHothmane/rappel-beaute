import { formatMad, formatRate } from "@/modules/commissions/service";
import type {
  CommissionKpis,
  CommissionListItem,
  CommissionPeriodPreset,
  CommissionStaffAgg,
} from "@/types/commission";

export type CommissionTab = "overview" | "unpaid" | "paid" | "goals" | "history";

export type StaffPayStatus = "unpaid" | "partial" | "paid";

export type StaffRow = {
  staffId: string;
  staffName: string;
  firstName: string;
  lastName: string;
  position: string | null;
  baseTotal: number;
  count: number;
  netTotal: number;
  paidTotal: number;
  unpaidTotal: number;
  avgRatePct: number | null;
  rateLabel: string;
  status: StaffPayStatus;
  items: CommissionListItem[];
};

export const COMMISSION_PAGE_SIZE = 8;

export function splitStaffName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: "—", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export function commissionShortId(id: string) {
  const tail = id.replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase();
  return `#COM-${tail || "0000"}`;
}

export function ticketRef(item: CommissionListItem) {
  const tail = item.appointmentId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
  return tail || commissionShortId(item.id).replace("#", "");
}

export function formatCommissionDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  });
}

export function formatCommissionTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function periodPresetLabel(preset: CommissionPeriodPreset, year?: number, month?: number) {
  if (preset === "today") return "Aujourd’hui";
  if (preset === "week") return "Cette semaine";
  if (preset === "prev_month") {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  }
  if (preset === "custom") return "Période personnalisée";
  if (year && month) {
    return new Date(year, month - 1, 1).toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    });
  }
  return new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

export function staffPayStatus(paidTotal: number, unpaidTotal: number): StaffPayStatus {
  if (unpaidTotal <= 0.009 && paidTotal > 0) return "paid";
  if (paidTotal > 0.009 && unpaidTotal > 0.009) return "partial";
  return "unpaid";
}

export function staffStatusChip(status: StaffPayStatus) {
  if (status === "paid") {
    return { label: "Réglé", className: "bg-emerald-100 text-emerald-800" };
  }
  if (status === "partial") {
    return { label: "Partiel", className: "bg-[#FFDEA4]/70 text-[#261900]" };
  }
  return { label: "À payer", className: "bg-[#FCCA66]/50 text-[#755400]" };
}

export function rateLabelFromItems(items: CommissionListItem[], fallbackPct: number | null) {
  const percents = items
    .filter((i) => i.type === "PERCENTAGE" && i.percentageSnapshot != null)
    .map((i) => i.percentageSnapshot as number);
  const uniq = [...new Set(percents.map((n) => Math.round(n * 10) / 10))].sort((a, b) => a - b);
  if (uniq.length === 1) return `${uniq[0]} %`;
  if (uniq.length > 1) return `${uniq[0]}–${uniq[uniq.length - 1]} %`;
  if (items.some((i) => i.type === "FIXED")) {
    const fixed = items.find((i) => i.type === "FIXED");
    return fixed ? `Fixe ${formatMad(fixed.fixedSnapshot ?? 0)}` : "Fixe";
  }
  return fallbackPct == null ? "—" : `${fallbackPct} %`;
}

export function buildStaffRows(
  byStaff: CommissionStaffAgg[],
  items: CommissionListItem[],
  positions: Record<string, string | null>,
): StaffRow[] {
  const grouped = new Map<string, CommissionListItem[]>();
  for (const item of items) {
    const list = grouped.get(item.staffId) ?? [];
    list.push(item);
    grouped.set(item.staffId, list);
  }

  return byStaff.map((s) => {
    const staffItems = grouped.get(s.staffId) ?? [];
    staffItems.sort((a, b) => +new Date(b.appointmentAt) - +new Date(a.appointmentAt));
    const names = splitStaffName(s.staffName);
    const avgRatePct =
      s.baseTotal > 0 && s.commissionTotal > 0
        ? Math.round((s.commissionTotal / s.baseTotal) * 1000) / 10
        : null;
    return {
      staffId: s.staffId,
      staffName: s.staffName,
      firstName: names.firstName,
      lastName: names.lastName,
      position: positions[s.staffId] ?? null,
      baseTotal: s.baseTotal,
      count: s.count,
      netTotal: s.commissionTotal,
      paidTotal: s.paidTotal,
      unpaidTotal: s.unpaidTotal,
      avgRatePct,
      rateLabel: rateLabelFromItems(staffItems, avgRatePct),
      status: staffPayStatus(s.paidTotal, s.unpaidTotal),
      items: staffItems,
    };
  });
}

export function filterStaffRows(rows: StaffRow[], tab: CommissionTab, staffId: string, search: string) {
  const q = search.trim().toLowerCase();
  return rows.filter((row) => {
    if (staffId && row.staffId !== staffId) return false;
    if (tab === "unpaid" && row.unpaidTotal <= 0.009) return false;
    if (tab === "paid" && row.status !== "paid") return false;
    if (!q) return true;
    return (
      row.staffName.toLowerCase().includes(q) ||
      (row.position ?? "").toLowerCase().includes(q) ||
      row.items.some(
        (i) =>
          i.serviceName.toLowerCase().includes(q) ||
          (i.customerName ?? "").toLowerCase().includes(q) ||
          ticketRef(i).toLowerCase().includes(q),
      )
    );
  });
}

export function rateTiers(items: CommissionListItem[]) {
  const percents = items
    .filter((i) => i.type === "PERCENTAGE" && i.percentageSnapshot != null)
    .map((i) => Math.round((i.percentageSnapshot as number) * 10) / 10);
  const uniq = [...new Set(percents)].sort((a, b) => a - b);
  return uniq.slice(0, 4).map((rate, index) => ({
    rate,
    label: index === uniq.length - 1 ? "Excellence" : index === 0 ? "Standard" : `Palier ${index + 1}`,
  }));
}

export function unpaidIds(rows: StaffRow[]) {
  return rows.flatMap((row) => row.items.filter((i) => !i.paid).map((i) => i.id));
}

export function commissionInsight(
  rows: StaffRow[],
  kpis: CommissionKpis | null,
  prevTotal: number | null,
) {
  if (!kpis || kpis.count === 0) {
    return "Aucune commission figée sur cette période. Les montants se créent au passage des RDV en COMPLETED.";
  }
  const top = rows[0];
  const waiting = rows.filter((r) => r.unpaidTotal > 0.009).length;
  const evo =
    prevTotal != null && prevTotal > 0
      ? `${kpis.commissionTotal - prevTotal >= 0 ? "+" : ""}${Math.round(((kpis.commissionTotal - prevTotal) / prevTotal) * 1000) / 10} % vs période précédente`
      : null;
  if (!top) {
    return `${formatMad(kpis.commissionTotal)} générés sur ${kpis.count} soin${kpis.count > 1 ? "s" : ""}.`;
  }
  const bits = [
    `${top.staffName} mène le mois avec ${formatMad(top.netTotal)} sur ${top.count} soin${top.count > 1 ? "s" : ""}.`,
  ];
  if (waiting) {
    bits.push(
      `${waiting} collaboratrice${waiting > 1 ? "s" : ""} ${waiting > 1 ? "attendent" : "attend"} ${formatMad(kpis.unpaidTotal)}.`,
    );
  }
  if (evo) bits.push(evo.charAt(0).toUpperCase() + evo.slice(1) + ".");
  return bits.join(" ");
}

export function evolutionPct(current: number, previous: number | null) {
  if (previous == null || previous <= 0 || current <= 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function lineCommissionLabel(item: CommissionListItem) {
  return formatRate(item);
}
