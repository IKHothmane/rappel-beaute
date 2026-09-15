import type {
  GiftCardJournalItem,
  GiftCardKpis,
  GiftCardListItem,
  GiftCardStatus,
  GiftCardTxnType,
} from "@/types/promo";
import { GIFT_CARD_TXN_LABEL } from "@/types/promo";

export const TZ = "Africa/Casablanca";
export const PAGE_SIZE = 5;

export type GiftFilter = "all" | "active" | "used" | "ritual" | "expiring";
export type GiftFormat = "all" | "amount" | "ritual";
export type GiftSort = "issued" | "balance" | "expiry";

export const EMPTY_GIFT_KPIS: GiftCardKpis = {
  soldCount: 0,
  soldValue: 0,
  redeemedValue: 0,
  remainingBalance: 0,
  activeCount: 0,
  usedCount: 0,
  ritualCount: 0,
  soldThisMonth: 0,
  soldPrevMonth: 0,
  soldValueThisMonth: 0,
  expiringSoonCount: 0,
  expiringSoonBalance: 0,
};

export function firstNameOf(name: string | null | undefined) {
  if (!name) return "";
  return name.trim().split(/\s+/)[0] ?? name;
}

export function displayPin(code: string) {
  let h = 2166136261;
  for (let i = 0; i < code.length; i++) {
    h ^= code.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return String(h >>> 0).slice(-4).padStart(4, "0");
}

export function isRitual(card: GiftCardListItem) {
  return Boolean(card.notes?.trim());
}

export function offerLabel(card: GiftCardListItem) {
  const notes = card.notes?.trim();
  if (notes) return notes;
  return "Montant libre";
}

export function offerKind(card: GiftCardListItem) {
  return isRitual(card) ? "Prestation dédiée" : "Montant libre";
}

export function daysUntil(iso: string | null | undefined) {
  if (!iso) return null;
  const target = new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });
  const today = new Date().toLocaleDateString("en-CA", { timeZone: TZ });
  const diff = Math.round(
    (Date.parse(`${target}T00:00:00`) - Date.parse(`${today}T00:00:00`)) / 86_400_000,
  );
  return diff;
}

export function isExpiringSoon(card: GiftCardListItem) {
  if (card.status !== "ACTIVE") return false;
  const days = daysUntil(card.expiresAt);
  return days != null && days >= 0 && days <= 30;
}

export function remainingPct(card: GiftCardListItem) {
  if (card.initialValue <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((card.balance / card.initialValue) * 100)));
}

export function usageRate(kpis: GiftCardKpis) {
  if (kpis.soldValue <= 0) return 0;
  return Math.round((kpis.redeemedValue / kpis.soldValue) * 1000) / 10;
}

export function circulationRate(kpis: GiftCardKpis) {
  if (kpis.soldCount <= 0) return 0;
  return Math.round((kpis.activeCount / kpis.soldCount) * 1000) / 10;
}

export function avgTicket(kpis: GiftCardKpis) {
  if (kpis.soldThisMonth <= 0) return 0;
  return Math.round((kpis.soldValueThisMonth / kpis.soldThisMonth) * 10) / 10;
}

export function monthDelta(kpis: GiftCardKpis) {
  return kpis.soldThisMonth - kpis.soldPrevMonth;
}

export function monthDeltaPct(kpis: GiftCardKpis) {
  if (kpis.soldPrevMonth <= 0) return kpis.soldThisMonth > 0 ? 100 : 0;
  return Math.round(((kpis.soldThisMonth - kpis.soldPrevMonth) / kpis.soldPrevMonth) * 100);
}

export function formatShortDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: TZ,
  });
}

export function formatJournalStamp(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: TZ,
  });
}

export function defaultExpiryIso() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export type DisplayStatus =
  | "partial"
  | "intact"
  | "valid"
  | "used"
  | "urgent"
  | "expired"
  | "cancelled";

export function displayStatus(card: GiftCardListItem): DisplayStatus {
  if (card.status === "CANCELLED") return "cancelled";
  if (card.status === "EXPIRED") return "expired";
  if (card.status === "USED") return "used";
  if (isExpiringSoon(card)) return "urgent";
  if (card.balance >= card.initialValue && card.initialValue > 0) return "intact";
  if (isRitual(card) && card.balance >= card.initialValue) return "valid";
  if (card.balance > 0 && card.balance < card.initialValue) return "partial";
  return "valid";
}

export const DISPLAY_STATUS_LABEL: Record<DisplayStatus, string> = {
  partial: "Partielle",
  intact: "Intacte",
  valid: "Valide",
  used: "Consommée",
  urgent: "Urgent",
  expired: "Expirée",
  cancelled: "Suspendue",
};

export function filterCards(
  rows: GiftCardListItem[],
  tab: GiftFilter,
  search: string,
  format: GiftFormat,
) {
  const q = search.trim().toLowerCase();
  return rows.filter((card) => {
    if (tab === "active" && (card.status !== "ACTIVE" || card.balance <= 0)) return false;
    if (tab === "used" && card.status !== "USED") return false;
    if (tab === "ritual" && !isRitual(card)) return false;
    if (tab === "expiring" && !isExpiringSoon(card)) return false;
    if (format === "amount" && isRitual(card)) return false;
    if (format === "ritual" && !isRitual(card)) return false;
    if (!q) return true;
    return (
      card.code.toLowerCase().includes(q) ||
      (card.buyerName ?? "").toLowerCase().includes(q) ||
      (card.beneficiaryName ?? "").toLowerCase().includes(q) ||
      (card.buyerPhone ?? "").toLowerCase().includes(q) ||
      (card.beneficiaryPhone ?? "").toLowerCase().includes(q) ||
      (card.notes ?? "").toLowerCase().includes(q) ||
      displayPin(card.code).includes(q)
    );
  });
}

export function sortCards(rows: GiftCardListItem[], sort: GiftSort) {
  const copy = rows.slice();
  copy.sort((a, b) => {
    if (sort === "balance") return b.balance - a.balance;
    if (sort === "expiry") {
      const da = a.expiresAt ? new Date(a.expiresAt).getTime() : Number.POSITIVE_INFINITY;
      const db = b.expiresAt ? new Date(b.expiresAt).getTime() : Number.POSITIVE_INFINITY;
      return da - db;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  return copy;
}

export function posHref(customerId: string | null | undefined) {
  return customerId ? `/pos/?customerId=${customerId}` : "/pos/";
}

export function waMeHref(phone: string | null | undefined, text: string) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return null;
  const intl = digits.startsWith("212") ? digits : digits.replace(/^0/, "212");
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}

export function giftWhatsappText(card: GiftCardListItem, orgName: string) {
  const who = firstNameOf(card.beneficiaryName) || "Madame";
  const from = firstNameOf(card.buyerName);
  const intro = from
    ? `${from} vous a offert une délicate attention chez ${orgName || "Rappel Beauté"}.`
    : `Une délicate attention vous attend chez ${orgName || "Rappel Beauté"}.`;
  return `Bonjour ${who} 👋 ${intro} Votre carte cadeau d'une valeur de ${card.initialValue.toLocaleString("fr-MA")} DH (Solde actuel : ${card.balance.toLocaleString("fr-MA")} DH) est prête pour votre prochain moment de bien-être. Code : ${card.code} (PIN : ${displayPin(card.code)}). Au plaisir de vous recevoir !`;
}

export function posSimulation(card: GiftCardListItem) {
  if (card.status !== "ACTIVE" || card.balance <= 0) return null;
  const line1 = Math.min(450, Math.max(80, card.balance));
  const line2 = 200;
  const total = Math.round((line1 + line2) * 100) / 100;
  const deduction = Math.min(card.balance, total);
  const remainder = Math.round((total - deduction) * 100) / 100;
  const newBalance = Math.round((card.balance - deduction) * 100) / 100;
  return {
    line1,
    line2,
    total,
    deduction,
    remainder,
    newBalance,
    ticket: `TK-${new Date().getFullYear()}-${card.code.replace(/[^A-Z0-9]/gi, "").slice(-4).toUpperCase()}`,
  };
}

export function txnLabel(type: GiftCardTxnType) {
  return GIFT_CARD_TXN_LABEL[type] ?? type;
}

export function balanceBefore(row: GiftCardJournalItem) {
  return Math.round((row.balanceAfter - row.amount) * 100) / 100;
}

export function giftInsight(kpis: GiftCardKpis) {
  const delta = monthDeltaPct(kpis);
  const deltaLabel = delta >= 0 ? `+${delta}% vs M-1` : `${delta}% vs M-1`;
  return {
    sales: `${kpis.soldThisMonth} carte${kpis.soldThisMonth > 1 ? "s" : ""} vendue${kpis.soldThisMonth > 1 ? "s" : ""} ce mois-ci (${deltaLabel})`,
    cash: kpis.soldValueThisMonth,
    usage: usageRate(kpis),
    expiring: kpis.expiringSoonCount,
    expiringBalance: kpis.expiringSoonBalance,
    expiringLabel:
      kpis.expiringSoonCount === 0
        ? "Aucune carte n’expire sous 30 jours."
        : `${kpis.expiringSoonCount} carte${kpis.expiringSoonCount > 1 ? "s" : ""} expire${kpis.expiringSoonCount > 1 ? "nt" : ""} sous 30 j (${kpis.expiringSoonBalance.toLocaleString("fr-MA")} MAD engagés).`,
  };
}

export function exportGiftJournalCsv(rows: GiftCardJournalItem[]) {
  const header = [
    "Horodatage",
    "Code",
    "Type",
    "Montant",
    "Solde après",
    "Ticket",
    "Opératrice",
    "Empreinte",
  ];
  const lines = rows.map((row) =>
    [
      row.createdAt,
      row.code,
      txnLabel(row.type),
      String(row.amount),
      String(row.balanceAfter),
      row.paymentId ?? "",
      row.actorName ?? "",
      row.proofHash,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(";"),
  );
  const blob = new Blob([[header.join(";"), ...lines].join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cartes-cadeaux-journal-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function printGiftCard(card: GiftCardListItem, orgName: string) {
  const pin = displayPin(card.code);
  const w = window.open("", "_blank", "noopener,noreferrer,width=480,height=720");
  if (!w) return false;
  w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/><title>Carte ${card.code}</title>
    <style>
      body{font-family:Manrope,system-ui,sans-serif;background:#fff7f9;color:#221820;padding:32px}
      .card{background:#382d36;color:#feecf7;border-radius:16px;padding:24px;min-height:220px}
      .gold{color:#ffdea4} .mono{font-family:ui-monospace,monospace}
      h1{font-size:14px;letter-spacing:.12em;text-transform:uppercase}
      .solde{font-size:36px;font-weight:800;margin:12px 0 0}
    </style></head><body>
    <div class="card">
      <h1 class="gold">${orgName || "Rappel Beauté"}</h1>
      <p class="gold">Solde disponible</p>
      <p class="solde">${card.balance.toLocaleString("fr-MA")} <span class="gold">DH</span></p>
      <p>Valeur initiale : ${card.initialValue.toLocaleString("fr-MA")} DH</p>
      <p>${card.beneficiaryName ?? "Bénéficiaire à renseigner"}</p>
      <p class="mono gold">${card.code} · PIN ${pin}</p>
    </div>
    <script>window.onload=function(){window.print();}</script>
    </body></html>`);
  w.document.close();
  return true;
}

export function statusChipClass(status: DisplayStatus) {
  if (status === "urgent") return "bg-[#FFDAD6] text-[#93000A]";
  if (status === "intact") return "bg-[#FFDEA4] text-[#261900]";
  if (status === "partial") return "bg-[#F6E3EF] text-primary";
  if (status === "used" || status === "expired" || status === "cancelled") {
    return "bg-[#F0DDE9] text-ink/50";
  }
  return "bg-[#FCE9F4] text-ink/60";
}

export function tabCounts(rows: GiftCardListItem[], kpis: GiftCardKpis) {
  return {
    all: kpis.soldCount || rows.length,
    active: kpis.activeCount,
    used: kpis.usedCount,
    ritual: kpis.ritualCount || rows.filter(isRitual).length,
    expiring: kpis.expiringSoonCount,
  };
}
