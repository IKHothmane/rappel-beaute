import {
  PAYMENT_KIND_LABEL,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  formatMad,
} from "@/modules/finance/service";
import type { PaymentItem, PaymentMethod } from "@/types/finance";

export type PaymentTab = "all" | "paid" | "pending" | "deposit" | "refunded" | "failed";
export type PaymentPeriod = "all" | "today" | "yesterday" | "7d" | "month";

export const PAYMENT_PAGE_SIZE = 8;

export type PaymentKpis = {
  inflow: number;
  refunds: number;
  net: number;
  count: number;
  paidCount: number;
  pendingCount: number;
  depositCount: number;
  refundedCount: number;
  failedCount: number;
  byMethod: Record<PaymentMethod, number>;
};

export type PaymentMixSlice = {
  key: PaymentMethod | "other";
  label: string;
  amount: number;
  pct: number;
  bar: string;
  dot: string;
};

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function inPaymentPeriod(iso: string, period: PaymentPeriod) {
  if (period === "all") return true;
  const paid = new Date(iso);
  const today = startOfDay(new Date());
  if (period === "today") return paid >= today;
  if (period === "yesterday") {
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    return paid >= y && paid < today;
  }
  if (period === "7d") {
    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    return paid >= from;
  }
  return paid.getFullYear() === today.getFullYear() && paid.getMonth() === today.getMonth();
}

export function periodLabel(period: PaymentPeriod) {
  const now = new Date();
  const todayTxt = now.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  const month = now.toLocaleDateString("fr-FR", { month: "long" });
  switch (period) {
    case "today":
      return `Aujourd’hui (${todayTxt})`;
    case "yesterday":
      return `Hier (${y.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })})`;
    case "7d":
      return "7 derniers jours";
    case "month":
      return `Mois en cours (${month})`;
    default:
      return "Toutes les dates";
  }
}

export function signedPaymentAmount(p: PaymentItem) {
  return p.kind === "REFUND" ? -Math.abs(p.amount) : p.amount;
}

export function paymentShortId(id: string) {
  return id.slice(-6).toUpperCase();
}

export function paymentInitials(name: string | null) {
  if (!name?.trim()) return "—";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "—";
}

export function paymentOrigin(p: PaymentItem) {
  if (p.appointmentId) return { label: "Agenda", kind: "agenda" as const };
  const notes = (p.notes ?? "").toLowerCase();
  if (notes.includes("pos") || notes.includes("vente")) {
    return { label: "POS", kind: "pos" as const };
  }
  return { label: "Comptoir", kind: "other" as const };
}

export function paymentStatusChip(p: PaymentItem) {
  if (p.kind === "REFUND" || p.status === "REFUNDED") {
    return { label: "Remboursé", className: "bg-purple-100 text-purple-900" };
  }
  if (p.status === "PENDING") {
    return { label: "En attente", className: "bg-amber-100 text-amber-900" };
  }
  if (p.status === "FAILED") {
    return { label: "Échoué", className: "bg-[#FFDAD6] text-[#93000A]" };
  }
  if (p.kind === "DEPOSIT") {
    return { label: "Acompte", className: "bg-[#FFDEA4]/70 text-[#5D4200]" };
  }
  return { label: PAYMENT_STATUS_LABEL[p.status], className: "bg-emerald-100 text-emerald-800" };
}

export function matchesPaymentTab(p: PaymentItem, tab: PaymentTab) {
  if (tab === "all") return true;
  if (tab === "paid") return p.status === "COMPLETED" && p.kind !== "REFUND";
  if (tab === "pending") return p.status === "PENDING";
  if (tab === "deposit") return p.kind === "DEPOSIT";
  if (tab === "refunded") return p.kind === "REFUND" || p.status === "REFUNDED";
  return p.status === "FAILED";
}

export function matchesPaymentSearch(p: PaymentItem, q: string) {
  if (!q) return true;
  const hay = [
    p.id,
    paymentShortId(p.id),
    p.customerName ?? "",
    p.customerPhone ?? "",
    p.serviceName ?? "",
    p.userName ?? "",
    p.notes ?? "",
    PAYMENT_KIND_LABEL[p.kind],
    PAYMENT_METHOD_LABEL[p.method],
    PAYMENT_STATUS_LABEL[p.status],
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q.toLowerCase());
}

export function filterPayments(
  rows: PaymentItem[],
  opts: {
    period: PaymentPeriod;
    method: PaymentMethod | "";
    staff: string;
    search: string;
    tab: PaymentTab;
  },
) {
  return rows.filter((p) => {
    if (!inPaymentPeriod(p.paidAt, opts.period)) return false;
    if (opts.method && p.method !== opts.method) return false;
    if (opts.staff && (p.userName ?? "") !== opts.staff) return false;
    if (!matchesPaymentSearch(p, opts.search)) return false;
    return matchesPaymentTab(p, opts.tab);
  });
}

export function paymentKpis(rows: PaymentItem[]): PaymentKpis {
  const byMethod = {
    CASH: 0,
    CARD: 0,
    TRANSFER: 0,
    CHECK: 0,
    ONLINE: 0,
    GIFT_CARD: 0,
  } as Record<PaymentMethod, number>;
  let inflow = 0;
  let refunds = 0;
  let paidCount = 0;
  let pendingCount = 0;
  let depositCount = 0;
  let refundedCount = 0;
  let failedCount = 0;

  for (const p of rows) {
    if (p.kind === "REFUND" || p.status === "REFUNDED") refundedCount += 1;
    else if (p.status === "PENDING") pendingCount += 1;
    else if (p.status === "FAILED") failedCount += 1;
    else paidCount += 1;
    if (p.kind === "DEPOSIT") depositCount += 1;

    if (p.status === "FAILED") continue;
    if (p.kind === "REFUND") {
      refunds += p.amount;
      continue;
    }
    if (p.status === "COMPLETED" || p.status === "PENDING") {
      inflow += p.amount;
      byMethod[p.method] += p.amount;
    }
  }

  return {
    inflow: Math.round(inflow * 100) / 100,
    refunds: Math.round(refunds * 100) / 100,
    net: Math.round((inflow - refunds) * 100) / 100,
    count: rows.length,
    paidCount,
    pendingCount,
    depositCount,
    refundedCount,
    failedCount,
    byMethod,
  };
}

const MIX_STYLE: Record<PaymentMethod, { bar: string; dot: string }> = {
  CARD: { bar: "bg-primary", dot: "bg-primary" },
  CASH: { bar: "bg-[#FCCA66]", dot: "bg-[#FCCA66]" },
  TRANSFER: { bar: "bg-ink", dot: "bg-ink" },
  CHECK: { bar: "bg-[#FFB2BD]", dot: "bg-[#FFB2BD]" },
  ONLINE: { bar: "bg-[#B61149]", dot: "bg-[#B61149]" },
  GIFT_CARD: { bar: "bg-[#E4BDC2]", dot: "bg-[#E4BDC2]" },
};

export function paymentMix(kpis: PaymentKpis): PaymentMixSlice[] {
  const entries = (Object.keys(kpis.byMethod) as PaymentMethod[])
    .map((key) => ({
      key,
      label: PAYMENT_METHOD_LABEL[key],
      amount: kpis.byMethod[key],
      ...MIX_STYLE[key],
    }))
    .filter((r) => r.amount > 0);
  const total = entries.reduce((s, r) => s + r.amount, 0);
  return entries.map((r) => ({
    ...r,
    pct: total > 0 ? Math.round((r.amount / total) * 100) : 0,
  }));
}

export function paymentInsight(kpis: PaymentKpis, period: PaymentPeriod) {
  if (kpis.count === 0) {
    return `Aucun paiement sur « ${periodLabel(period)} ». Les totaux restent à zéro tant qu’aucun encaissement n’est enregistré.`;
  }
  const mix = paymentMix(kpis);
  const mixTxt =
    mix.length > 0
      ? mix.map((m) => `${m.label} ${m.pct} %`).join(" · ")
      : "mix indisponible";
  return `${kpis.count} opération${kpis.count > 1 ? "s" : ""} · encaissé ${formatMad(kpis.inflow)} · remboursements ${formatMad(kpis.refunds)} · net ${formatMad(kpis.net)}. ${mixTxt}.`;
}

export function staffOptions(rows: PaymentItem[]) {
  return [...new Set(rows.map((p) => p.userName).filter((n): n is string => Boolean(n)))].sort(
    (a, b) => a.localeCompare(b, "fr"),
  );
}

export function waMeLink(phone: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return null;
  const intl = digits.startsWith("212") ? digits : digits.replace(/^0/, "212");
  return `https://wa.me/${intl}`;
}

export function formatPaymentTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function formatPaymentDateTime(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function exportPaymentsCsv(rows: PaymentItem[]) {
  const header = [
    "Id",
    "Date",
    "Cliente",
    "Téléphone",
    "Prestation",
    "Type",
    "Méthode",
    "Statut",
    "Montant",
    "Opérateur",
    "Notes",
  ];
  const lines = rows.map((p) =>
    [
      p.id,
      formatPaymentDateTime(p.paidAt),
      p.customerName ?? "",
      p.customerPhone ?? "",
      p.serviceName ?? "",
      PAYMENT_KIND_LABEL[p.kind],
      PAYMENT_METHOD_LABEL[p.method],
      PAYMENT_STATUS_LABEL[p.status],
      String(signedPaymentAmount(p)),
      p.userName ?? "",
      p.notes ?? "",
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
  a.download = `paiements-${stamp}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
