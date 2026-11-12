import { PAYMENT_KIND_LABEL, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL } from "@/modules/finance/service";
import type { PaymentItem, PaymentMethod } from "@/types/finance";

export type PaymentTab = "all" | "paid" | "pending" | "deposit" | "refunded" | "failed";
export type PaymentPeriod = "all" | "today" | "yesterday" | "7d" | "month";

export const PAYMENT_PAGE_SIZE = 8;

type PaymentKpis = {
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

type PaymentMixSlice = {
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

function inPaymentPeriod(iso: string, period: PaymentPeriod) {
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

export function isUnpaidDue(p: PaymentItem) {
  return p.id.startsWith("due:") || p.notes === "RDV non payé";
}

function unpaidDueId(appointmentId: string) {
  return `due:${appointmentId}`;
}

export function billableToDuePayment(b: {
  id: string;
  customerName: string;
  serviceName: string;
  price: number;
  remaining: number;
  startAt: string;
  createdAt?: string;
  customerPhone?: string | null;
}): PaymentItem {
  const createdAt = b.createdAt ?? b.startAt;
  return {
    id: unpaidDueId(b.id),
    appointmentId: b.id,
    customerId: null,
    customerName: b.customerName,
    customerPhone: b.customerPhone ?? null,
    serviceName: b.serviceName,
    amount: b.remaining,
    method: "CASH",
    kind: "PAYMENT",
    status: "PENDING",
    parentPaymentId: null,
    giftCardId: null,
    ticketNumber: null,
    notes: "RDV non payé",
    userId: null,
    userName: null,
    paidAt: b.startAt,
    createdAt,
  };
}

/** Plus récent en premier (dernier enregistré / créé en haut). */
export function sortPaymentsNewestFirst(rows: PaymentItem[]): PaymentItem[] {
  return [...rows].sort((a, b) => {
    const tb = new Date(b.createdAt || b.paidAt).getTime();
    const ta = new Date(a.createdAt || a.paidAt).getTime();
    if (tb !== ta) return tb - ta;
    return new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime();
  });
}

function paymentShortId(id: string) {
  const raw = id.startsWith("due:") ? id.slice("due:".length) : id;
  return raw.slice(-6).toUpperCase() || "—";
}

/** Affiche le n° de passage JJ/MM-NNN, sinon l’ancien id court. */
export function paymentDisplayId(p: {
  id: string;
  ticketNumber?: string | null;
}) {
  const ticket = p.ticketNumber?.trim();
  if (ticket) return ticket;
  return paymentShortId(p.id);
}

/** Découpe « Soin A + Soin B » en libellés individuels. */
export function paymentServiceLabels(serviceName: string | null | undefined): string[] {
  if (!serviceName?.trim()) return [];
  const raw = serviceName.trim();
  if (raw.includes("+") || raw.includes("·")) {
    return raw
      .split(/\+|·/)
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return [raw];
}

export function formatPaymentServices(serviceName: string | null | undefined): string {
  const labels = paymentServiceLabels(serviceName);
  return labels.length > 0 ? labels.join(" · ") : "—";
}

export function paymentInitials(name: string | null) {
  if (!name?.trim()) return "—";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "—";
}

export function isPosPayment(p: PaymentItem) {
  const notes = (p.notes ?? "").toLowerCase();
  const label = (p.serviceName ?? "").toLowerCase();
  return (
    notes.includes("pos") ||
    notes.includes("vente") ||
    label.includes("vente produits") ||
    label.includes("produits")
  );
}

export function paymentOrigin(p: PaymentItem) {
  if (isUnpaidDue(p)) return { label: "Agenda · non payé", kind: "agenda" as const };
  if (isPosPayment(p) && p.appointmentId) {
    return { label: "Agenda + Produits", kind: "mixed" as const };
  }
  if (p.appointmentId && !isPosPayment(p)) {
    return { label: "Agenda", kind: "agenda" as const };
  }
  if (isPosPayment(p)) {
    return { label: "Produits", kind: "pos" as const };
  }
  return { label: "Comptoir", kind: "other" as const };
}

export type GroupedPaymentItem = PaymentItem & {
  /** Paiements fusionnés (service + produits même cliente / même RDV). */
  groupIds?: string[];
  groupParts?: { label: string; amount: number }[];
};

/**
 * Rassemble service + produits du même client (même RDV, ou encaissés ensemble).
 */
export function groupPaymentsByClient(rows: PaymentItem[]): GroupedPaymentItem[] {
  const sorted = sortPaymentsNewestFirst(rows);
  const used = new Set<string>();
  const out: GroupedPaymentItem[] = [];

  for (const payment of sorted) {
    if (used.has(payment.id)) continue;
    if (isUnpaidDue(payment)) {
      out.push(payment);
      used.add(payment.id);
      continue;
    }

    const siblings = sorted.filter((other) => {
      if (other.id === payment.id || used.has(other.id) || isUnpaidDue(other)) return false;
      if (
        payment.appointmentId &&
        other.appointmentId &&
        payment.appointmentId === other.appointmentId
      ) {
        return true;
      }
      if (
        payment.customerId &&
        other.customerId &&
        payment.customerId === other.customerId
      ) {
        const delta = Math.abs(
          new Date(payment.paidAt).getTime() - new Date(other.paidAt).getTime(),
        );
        // Anciens encaissements : service + produits sans appointmentId commun
        if (delta > 5 * 60 * 1000) return false;
        return isPosPayment(payment) !== isPosPayment(other);
      }
      return false;
    });

    const group = [payment, ...siblings];
    if (group.length === 1) {
      out.push(payment);
      used.add(payment.id);
      continue;
    }

    const hasService = group.some((item) => !isPosPayment(item));
    const hasProducts = group.some((item) => isPosPayment(item));
    if (!(hasService && hasProducts) && !group.every((item) => item.appointmentId)) {
      out.push(payment);
      used.add(payment.id);
      continue;
    }

    const primary =
      group.find((item) => item.appointmentId && !isPosPayment(item)) ??
      group.find((item) => item.appointmentId) ??
      group[0];

    const parts = group.map((item) => {
      const productLabel = formatPaymentServices(item.serviceName);
      const isGenericProduct =
        !productLabel ||
        productLabel === "—" ||
        productLabel.toLowerCase().includes("vente produit");
      return {
        label: isPosPayment(item)
          ? isGenericProduct
            ? "Produits"
            : productLabel
          : productLabel || "Service",
        amount: signedPaymentAmount(item),
      };
    });
    const labels = Array.from(
      new Set(
        parts.map((part) => part.label).filter((label) => label && label !== "—"),
      ),
    );
    const total = Math.round(parts.reduce((sum, part) => sum + part.amount, 0) * 100) / 100;

    const serviceLabels = group
      .filter((item) => !isPosPayment(item))
      .map((item) => formatPaymentServices(item.serviceName))
      .filter((label) => label && label !== "—");
    const productLabels = group
      .filter((item) => isPosPayment(item))
      .map((item) => formatPaymentServices(item.serviceName))
      .filter(
        (label) =>
          label &&
          label !== "—" &&
          !label.toLowerCase().includes("vente produit"),
      );
    const combinedLabel = [...serviceLabels, ...productLabels]
      .filter((label, index, arr) => arr.indexOf(label) === index)
      .join(" · ");

    out.push({
      ...primary,
      amount: Math.abs(total),
      serviceName: combinedLabel || labels.join(" · ") || primary.serviceName,
      notes:
        hasService && hasProducts
          ? [primary.notes, "Service + produits"].filter(Boolean).join(" · ")
          : primary.notes,
      groupIds: group.map((item) => item.id),
      groupParts: parts,
    });
    for (const item of group) used.add(item.id);
  }

  return out;
}

export function paymentStatusChip(p: PaymentItem) {
  if (isUnpaidDue(p)) {
    return { label: "Non payé", className: "bg-[#FFF0D6] text-[#7A4E00] ring-1 ring-[#E8C56A]/50" };
  }
  if (p.kind === "REFUND" || p.status === "REFUNDED") {
    return { label: "Remboursé", className: "bg-[#F3E8FF] text-[#5B2B9E] ring-1 ring-[#D4B8F5]/60" };
  }
  if (p.status === "PENDING") {
    return { label: "En attente", className: "bg-[#FFF0D6] text-[#7A4E00] ring-1 ring-[#E8C56A]/50" };
  }
  if (p.status === "FAILED") {
    return { label: "Échoué", className: "bg-[#FFE2E0] text-[#8C1D18] ring-1 ring-[#F5B5B0]/60" };
  }
  if (p.kind === "DEPOSIT") {
    return { label: "Acompte", className: "bg-[#FFF3D6] text-[#6B4A00] ring-1 ring-[#E8C56A]/45" };
  }
  return {
    label: PAYMENT_STATUS_LABEL[p.status],
    className: "bg-[#E6F6ED] text-[#0F6B3C] ring-1 ring-[#9FD4B3]/55",
  };
}

export function paymentMethodChipClass(method: PaymentItem["method"]) {
  switch (method) {
    case "CASH":
      return "bg-[#E8F6EE] text-[#0F6B3C]";
    case "CARD":
      return "bg-[#E8F0FF] text-[#1E4B99]";
    case "TRANSFER":
      return "bg-[#EEF0F6] text-[#3A4560]";
    case "GIFT_CARD":
      return "bg-[#FCE9F4] text-[#981C52]";
    default:
      return "bg-[#F6E3EF] text-[#5C3A4A]";
  }
}

export function matchesPaymentTab(p: PaymentItem, tab: PaymentTab) {
  if (tab === "all") return true;
  if (tab === "paid") return p.status === "COMPLETED" && p.kind !== "REFUND";
  if (tab === "pending") return p.status === "PENDING";
  if (tab === "deposit") return p.kind === "DEPOSIT";
  if (tab === "refunded") return p.kind === "REFUND" || p.status === "REFUNDED";
  return p.status === "FAILED";
}

function matchesPaymentSearch(p: PaymentItem, q: string) {
  if (!q) return true;
  const hay = [
    p.id,
    paymentDisplayId(p),
    p.ticketNumber ?? "",
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
    if (opts.method) {
      if (isUnpaidDue(p)) return false;
      if (p.method !== opts.method) return false;
    }
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
    if (isUnpaidDue(p)) {
      pendingCount += 1;
      continue;
    }
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
    if (p.status === "COMPLETED") {
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

export function formatPaymentDateTime(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

