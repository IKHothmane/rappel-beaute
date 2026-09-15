import { INVOICE_STATUS_LABEL, formatMad } from "@/modules/invoices/service";
import { PAYMENT_METHOD_LABEL } from "@/types/finance";
import type { InvoiceDetail, InvoiceKpis, InvoiceListItem, InvoiceStatus } from "@/types/invoice";

export type InvoiceTab = "all" | "paid" | "partial" | "unpaid" | "void";
export type InvoicePeriod = "all" | "today" | "month";

export const INVOICE_PAGE_SIZE = 8;

export function formatInvoiceDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatInvoiceTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function formatInvoiceDateTime(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function invoiceWhen(inv: InvoiceListItem) {
  return inv.issuedAt ?? inv.createdAt;
}

export function periodRange(period: InvoicePeriod): { from?: string; to?: string } {
  if (period === "all") return {};
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  if (period === "today") {
    const d = `${yyyy}-${mm}-${dd}`;
    return { from: d, to: d };
  }
  const from = `${yyyy}-${mm}-01`;
  const last = new Date(yyyy, now.getMonth() + 1, 0).getDate();
  return { from, to: `${yyyy}-${mm}-${String(last).padStart(2, "0")}` };
}

export function periodLabel(period: InvoicePeriod) {
  const now = new Date();
  const month = now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const today = now.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  if (period === "today") return `Aujourd’hui (${today})`;
  if (period === "month") return `Ce mois (${month})`;
  return "Toutes les dates";
}

export function invoiceStatusChip(status: InvoiceStatus) {
  if (status === "PAID") {
    return { label: INVOICE_STATUS_LABEL.PAID, className: "bg-emerald-100 text-emerald-800" };
  }
  if (status === "PARTIALLY_PAID") {
    return { label: INVOICE_STATUS_LABEL.PARTIALLY_PAID, className: "bg-amber-100 text-amber-900" };
  }
  if (status === "VOID") {
    return { label: INVOICE_STATUS_LABEL.VOID, className: "bg-[#F0DDE9] text-ink/70" };
  }
  if (status === "DRAFT") {
    return { label: INVOICE_STATUS_LABEL.DRAFT, className: "bg-[#FFEFF8] text-ink/70" };
  }
  return { label: "Impayée", className: "bg-rose-100 text-rose-800" };
}

export function matchesInvoiceTab(inv: InvoiceListItem, tab: InvoiceTab) {
  if (tab === "all") return true;
  if (tab === "paid") return inv.status === "PAID";
  if (tab === "partial") return inv.status === "PARTIALLY_PAID";
  if (tab === "void") return inv.status === "VOID";
  return inv.status === "ISSUED" || inv.status === "DRAFT";
}

export function tabCounts(rows: InvoiceListItem[]) {
  return {
    all: rows.length,
    paid: rows.filter((r) => r.status === "PAID").length,
    partial: rows.filter((r) => r.status === "PARTIALLY_PAID").length,
    unpaid: rows.filter((r) => r.status === "ISSUED" || r.status === "DRAFT").length,
    voided: rows.filter((r) => r.status === "VOID").length,
  };
}

export function priorityInvoices(rows: InvoiceListItem[]) {
  return rows
    .filter((r) => r.status !== "VOID" && r.remaining > 0)
    .sort((a, b) => b.remaining - a.remaining)
    .slice(0, 3);
}

export function staffOptions(rows: InvoiceListItem[]) {
  return [...new Set(rows.map((r) => r.staffName).filter((n): n is string => Boolean(n)))].sort(
    (a, b) => a.localeCompare(b, "fr"),
  );
}

export function methodLabel(methods: string[]) {
  if (methods.length === 0) return "—";
  return methods.map((m) => PAYMENT_METHOD_LABEL[m as keyof typeof PAYMENT_METHOD_LABEL] ?? m).join(" · ");
}

export function waMeLink(phone: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return null;
  const intl = digits.startsWith("212") ? digits : digits.replace(/^0/, "212");
  return `https://wa.me/${intl}`;
}

export function reminderText(inv: InvoiceListItem, orgName: string) {
  return `Bonjour${inv.customerName ? ` ${inv.customerName}` : ""}, rappel de l’institut ${orgName} : facture ${inv.number}, reste ${formatMad(inv.remaining)}.`;
}

export function invoiceInsight(kpis: InvoiceKpis | null) {
  if (!kpis) return "Chargement des totaux…";
  if (kpis.monthCount === 0) {
    return "Aucune facture émise ce mois. Les totaux restent à zéro tant qu’aucun document n’est créé depuis un rendez-vous ou le POS.";
  }
  const evo =
    kpis.evolutionPct == null
      ? kpis.billedTotal > 0 && kpis.prevMonthBilled === 0
        ? "pas de mois précédent comparable"
        : "évolution indisponible"
      : `${kpis.evolutionPct > 0 ? "+" : ""}${kpis.evolutionPct} % vs mois précédent`;
  const rec =
    kpis.recoveryPct == null ? "taux de recouvrement indisponible" : `${kpis.recoveryPct} % encaissé`;
  const voids =
    kpis.voidMonthCount > 0
      ? ` ${kpis.voidMonthCount} annulation${kpis.voidMonthCount > 1 ? "s" : ""} (${formatMad(kpis.voidMonthTotal)}).`
      : "";
  return `${kpis.monthCount} facture${kpis.monthCount > 1 ? "s" : ""} ce mois · ${formatMad(kpis.billedTotal)} · encaissé ${formatMad(kpis.paidTotal)} (${rec}) · reste ${formatMad(kpis.unpaidTotal)}. ${evo}.${voids}`;
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function exportInvoicesCsv(rows: InvoiceListItem[]) {
  const header = [
    "Numéro",
    "Date",
    "Cliente",
    "Téléphone",
    "Prestation",
    "Praticienne",
    "Total",
    "Payé",
    "Reste",
    "Statut",
    "Règlements",
  ];
  const lines = rows.map((inv) =>
    [
      inv.number,
      formatInvoiceDateTime(invoiceWhen(inv)),
      inv.customerName,
      inv.customerPhone ?? "",
      inv.firstItemName ?? "",
      inv.staffName ?? "",
      String(inv.total),
      String(inv.paidAmount),
      String(inv.remaining),
      INVOICE_STATUS_LABEL[inv.status],
      methodLabel(inv.paymentMethods),
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
  a.download = `factures-${stamp}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function buildInvoiceHtml(inv: InvoiceDetail) {
  const rows = inv.items
    .map(
      (i) =>
        `<tr><td>${escapeHtml(i.nameSnapshot)}</td><td>${i.quantity}</td><td>${formatMad(i.unitPriceSnapshot)}</td><td>${formatMad(i.total)}</td></tr>`,
    )
    .join("");
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(inv.number)}</title>
<style>
body{font-family:Manrope,system-ui,sans-serif;color:#221820;padding:32px;max-width:720px;margin:0 auto}
table{width:100%;border-collapse:collapse;margin-top:24px}
th,td{text-align:left;padding:8px 0;border-bottom:1px solid #e8e0e3}
.total{font-weight:700;font-size:1.1rem}
.muted{color:#666;font-size:12px}
</style></head><body>
<p class="muted">${escapeHtml(inv.orgNameSnapshot)}</p>
${inv.orgIceSnapshot ? `<p class="muted">ICE ${escapeHtml(inv.orgIceSnapshot)}</p>` : ""}
${inv.orgAddressSnapshot ? `<p class="muted">${escapeHtml(inv.orgAddressSnapshot)}</p>` : ""}
<h1>${escapeHtml(inv.number)}</h1>
<p>${escapeHtml(inv.customerNameSnapshot)}${inv.customerPhoneSnapshot ? ` · ${escapeHtml(inv.customerPhoneSnapshot)}` : ""}</p>
<table><thead><tr><th>Prestation</th><th>Qté</th><th>P.U.</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>
${inv.discountTotal > 0 ? `<p>Remise −${formatMad(inv.discountTotal)}</p>` : ""}
<p class="total">Total ${formatMad(inv.total)}</p>
<p>Payé ${formatMad(inv.paidAmount)} · Reste ${formatMad(inv.remaining)}</p>
<p class="muted">${INVOICE_STATUS_LABEL[inv.status]}</p>
</body></html>`;
}

export function downloadInvoiceHtml(inv: InvoiceDetail) {
  const blob = new Blob([buildInvoiceHtml(inv)], { type: "text/html;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${inv.number}.html`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function printInvoiceHtml(inv: InvoiceDetail) {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(buildInvoiceHtml(inv));
  w.document.close();
  w.focus();
  w.print();
  return true;
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
