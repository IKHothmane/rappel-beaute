import type { PurchaseKpis, PurchaseListItem, PurchaseStatus } from "@/types/procurement";
import { formatMad } from "@/modules/procurement/service";

export function formatPurchaseDate(iso: string | null | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("fr-MA");
}

export function canReceiveStatus(status: PurchaseStatus) {
  return status === "ORDERED" || status === "PARTIALLY_RECEIVED";
}

export function purchaseStatusChip(status: PurchaseStatus) {
  switch (status) {
    case "DRAFT":
      return "bg-[#FFDEA4]/70 text-[#5D4200]";
    case "ORDERED":
      return "bg-[#FCE9F4] text-primary";
    case "PARTIALLY_RECEIVED":
      return "bg-[#FCCA66]/50 text-[#5D4200]";
    case "RECEIVED":
      return "bg-emerald-100 text-emerald-800";
    case "CANCELLED":
      return "bg-[#F0DDE9] text-ink/45";
  }
}

export function purchaseInsight(kpis: PurchaseKpis | null, lowStockCount: number): string {
  if (!kpis || kpis.purchaseCount === 0) {
    return "Aucune commande. Créez un bon fournisseur : le stock n’augmente qu’à la réception.";
  }
  const parts: string[] = [];
  if (kpis.awaitingReceiptCount > 0) {
    parts.push(
      `${kpis.awaitingReceiptCount} commande${kpis.awaitingReceiptCount > 1 ? "s" : ""} en attente de réception — seules les quantités pointées incrémentent le stock.`,
    );
  }
  if (kpis.monthTotal > 0) {
    parts.push(`Achats du mois : ${formatMad(kpis.monthTotal)}.`);
  }
  if (lowStockCount > 0) {
    parts.push(
      `${lowStockCount} référence${lowStockCount > 1 ? "s" : ""} du catalogue sous le seuil ou en rupture.`,
    );
  }
  return parts.join(" ") || `${kpis.purchaseCount} commande${kpis.purchaseCount > 1 ? "s" : ""} au journal.`;
}

export function purchaseSummaryLine(p: PurchaseListItem) {
  return `${p.itemCount} réf.`;
}
