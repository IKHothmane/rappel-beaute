import type { ProductListItem, StockAlertLevel } from "@/types/inventory";
import { PRODUCT_CATEGORY_LABEL, PRODUCT_UNIT_LABEL } from "@/types/inventory";

export const STOCK_ALERT_LABEL: Record<StockAlertLevel, string> = {
  OK: "En stock",
  LOW: "Stock bas",
  OUT: "Rupture",
  EXPIRING: "Expire bientôt",
  EXPIRED: "Expiré",
};

export function usageLabel(p: { sellable: boolean; consumable: boolean }) {
  if (p.sellable && p.consumable) return "Revente & soin";
  if (p.sellable) return "Revente boutique";
  if (p.consumable) return "Consommable cabine";
  return "Usage interne";
}

export function productMargin(p: { purchasePrice: number; salePrice: number | null }) {
  if (p.salePrice == null || p.salePrice <= 0) return null;
  const abs = p.salePrice - p.purchasePrice;
  return { abs, pct: (abs / p.salePrice) * 100 };
}

export function isLowMargin(p: ProductListItem, threshold = 25) {
  if (!p.sellable) return false;
  const m = productMargin(p);
  return m != null && m.pct < threshold;
}

export function stockFillPercent(p: ProductListItem) {
  const target = p.maxStock && p.maxStock > 0 ? p.maxStock : Math.max(p.minStock * 2, p.minStock, 1);
  return Math.max(0, Math.min(100, (p.stock / target) * 100));
}

export function alertChipClass(alert: StockAlertLevel) {
  if (alert === "OUT" || alert === "EXPIRED") return "bg-red-50 text-red-800";
  if (alert === "LOW" || alert === "EXPIRING") return "bg-amber-50 text-amber-800";
  return "bg-emerald-50 text-emerald-800";
}

export function alertBarClass(alert: StockAlertLevel) {
  if (alert === "OUT" || alert === "EXPIRED") return "bg-red-500";
  if (alert === "LOW" || alert === "EXPIRING") return "bg-[#F0BF5C]";
  return "bg-emerald-600";
}

export function formatMovementTime(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function exportProductsCsv(rows: ProductListItem[]) {
  const header = [
    "Nom",
    "SKU",
    "Catégorie",
    "Marque",
    "Unité",
    "Stock",
    "Seuil min",
    "Alerte",
    "Prix achat",
    "Prix vente",
    "Valeur stock",
    "Fournisseur",
    "Vendable",
    "Consommable",
    "Actif",
  ];
  const lines = rows.map((p) =>
    [
      p.name,
      p.sku,
      PRODUCT_CATEGORY_LABEL[p.category],
      p.brand ?? "",
      PRODUCT_UNIT_LABEL[p.unit],
      String(p.stock),
      String(p.minStock),
      STOCK_ALERT_LABEL[p.alert],
      String(p.purchasePrice),
      p.salePrice != null ? String(p.salePrice) : "",
      String(p.stockValue),
      p.supplierName ?? "",
      p.sellable ? "oui" : "non",
      p.consumable ? "oui" : "non",
      p.active ? "oui" : "non",
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
  a.download = `produits-${stamp}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
