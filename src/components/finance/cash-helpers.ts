import { CASH_TXN_LABEL, PAYMENT_METHOD_LABEL, formatMad } from "@/modules/finance/service";
import type {
  CashSessionSummary,
  CashTxnItem,
  CashTxnType,
  ClosedSessionPreview,
} from "@/types/finance";

export type CashTab = "overview" | "journal" | "out" | "refunds" | "history";

export function formatCashTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function formatCashDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-MA", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

export function formatCashDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function sumAbsTypes(txns: CashTxnItem[], types: CashTxnType[]) {
  return txns
    .filter((t) => types.includes(t.type))
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
}

export function opsCount(txns: CashTxnItem[]) {
  return txns.filter((t) => t.type !== "OPENING" && t.type !== "CLOSING").length;
}

export function saleCount(txns: CashTxnItem[]) {
  return txns.filter((t) => t.type === "SALE").length;
}

export function matchesTxnSearch(t: CashTxnItem, q: string) {
  if (!q) return true;
  const hay = [
    t.id,
    t.reason ?? "",
    t.userName ?? "",
    CASH_TXN_LABEL[t.type],
    t.method ? PAYMENT_METHOD_LABEL[t.method] : "",
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q.toLowerCase());
}

export function filterCashTxns(txns: CashTxnItem[], tab: CashTab, search: string) {
  const typed =
    tab === "out"
      ? txns.filter((t) => t.type === "CASH_OUT" || t.type === "EXPENSE")
      : tab === "refunds"
        ? txns.filter((t) => t.type === "REFUND_OUT")
        : txns;
  return typed.filter((t) => matchesTxnSearch(t, search));
}

export function cashInsight(
  session: CashSessionSummary | null,
  txns: CashTxnItem[],
): string {
  if (!session) {
    return "Aucune session. Ouvrez la caisse pour tracer le fond de tiroir et les espèces.";
  }
  if (session.status === "CLOSED") {
    const when = session.closedAt ? formatCashDateTime(session.closedAt) : null;
    const parts = [`Dernière session clôturée${when ? ` le ${when}` : ""}.`];
    if (session.difference != null) {
      parts.push(
        session.difference === 0
          ? "Écart nul."
          : `Écart ${formatMad(session.difference)}.`,
      );
    }
    return parts.join(" ");
  }

  const p = session.paymentsToday;
  const parts: string[] = [];
  parts.push(`Solde théorique du tiroir : ${formatMad(session.theoreticalBalance)}.`);
  if (session.cashIn > 0) {
    parts.push(`Encaissements espèces de la session : ${formatMad(session.cashIn)}.`);
  }
  if (session.cashOut > 0) {
    parts.push(`Sorties espèces : ${formatMad(session.cashOut)}.`);
  }
  if (p.total !== 0) {
    parts.push(`Paiements du jour (toutes méthodes) : ${formatMad(p.total)}.`);
    const mix = [
      { label: "carte", amount: p.card },
      { label: "espèces", amount: p.cash },
      { label: "virement", amount: p.transfer },
      { label: "en ligne", amount: p.online },
    ].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
    if (mix[0].amount !== 0) {
      const pct = Math.round((Math.abs(mix[0].amount) / Math.abs(p.total)) * 100);
      parts.push(`Prédominance ${mix[0].label} (${pct} %).`);
    }
  }
  const refunds = sumAbsTypes(txns, ["REFUND_OUT"]);
  if (refunds > 0) {
    parts.push(`Remboursements tiroir : ${formatMad(refunds)}.`);
  }
  return parts.join(" ");
}

export type MixSlice = {
  key: string;
  label: string;
  amount: number;
  pct: number;
  bar: string;
  dot: string;
};

export function paymentMix(session: CashSessionSummary | null): MixSlice[] {
  if (!session) return [];
  const p = session.paymentsToday;
  const total = Math.abs(p.total);
  const rows: Omit<MixSlice, "pct">[] = [
    { key: "card", label: "Carte", amount: p.card, bar: "bg-primary", dot: "bg-primary" },
    { key: "cash", label: "Espèces", amount: p.cash, bar: "bg-[#FCCA66]", dot: "bg-[#FCCA66]" },
    { key: "transfer", label: "Virement", amount: p.transfer, bar: "bg-[#7B5900]", dot: "bg-[#7B5900]" },
    { key: "online", label: "En ligne", amount: p.online, bar: "bg-[#B61149]", dot: "bg-[#B61149]" },
    { key: "other", label: "Autres", amount: p.other, bar: "bg-[#E4BDC2]", dot: "bg-[#E4BDC2]" },
  ];
  return rows
    .filter((r) => r.amount !== 0)
    .map((r) => ({
      ...r,
      pct: total > 0 ? Math.round((Math.abs(r.amount) / total) * 100) : 0,
    }));
}

export function txnTypeChip(type: CashTxnType) {
  switch (type) {
    case "SALE":
    case "CASH_IN":
      return "bg-emerald-100 text-emerald-800";
    case "REFUND_OUT":
      return "bg-[#FFDEA4]/70 text-[#5D4200]";
    case "CASH_OUT":
    case "EXPENSE":
      return "bg-[#FFDAD6] text-[#93000A]";
    case "OPENING":
    case "CLOSING":
      return "bg-[#F0DDE9] text-ink/60";
  }
}

export function closedHistoryLabel(row: ClosedSessionPreview) {
  const iso = row.closedAt ?? row.openedAt;
  const d = new Date(iso);
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  return sameDay ? `Aujourd’hui · ${formatCashTime(iso)}` : formatCashDateTime(iso);
}

export function exportCashCsv(txns: CashTxnItem[]) {
  const header = ["Heure", "Type", "Méthode", "Montant", "Opérateur", "Motif"];
  const lines = txns.map((t) =>
    [
      formatCashDateTime(t.createdAt),
      CASH_TXN_LABEL[t.type],
      t.method ? PAYMENT_METHOD_LABEL[t.method] : "",
      String(t.amount),
      t.userName ?? "",
      t.reason ?? "",
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
  a.download = `caisse-${stamp}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
