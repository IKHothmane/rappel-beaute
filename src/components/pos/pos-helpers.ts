import { PRODUCT_CATEGORY_LABEL, type ProductCategory } from "@/types/inventory";
import type { PosProductItem, PosSaleDetail } from "@/types/pos";

export function formatPosTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function isSameLocalDay(iso: string) {
  const d = new Date(iso);
  const n = new Date();
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  );
}

export function posDayKpis(sales: PosSaleDetail[]) {
  const today = sales.filter((s) => s.status === "COMPLETED" && isSameLocalDay(s.createdAt));
  const revenue = today.reduce((sum, s) => sum + s.total, 0);
  const count = today.length;
  return {
    revenue,
    count,
    average: count > 0 ? Math.round((revenue / count) * 100) / 100 : 0,
  };
}

export function productStockState(p: PosProductItem): "ok" | "low" | "out" {
  if (p.stock <= 0) return "out";
  if (p.minStock > 0 && p.stock < p.minStock) return "low";
  return "ok";
}

export function categoryCounts(products: PosProductItem[]) {
  const map = new Map<ProductCategory, number>();
  for (const p of products) {
    map.set(p.category, (map.get(p.category) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([category, count]) => ({
    category,
    count,
    label: PRODUCT_CATEGORY_LABEL[category],
  }));
}

export function filterPosCatalog(
  products: PosProductItem[],
  search: string,
  category: string,
) {
  const q = search.trim().toLowerCase();
  return products.filter((p) => {
    if (category && p.category !== category) return false;
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.brand ?? "").toLowerCase().includes(q)
    );
  });
}

export function findBySku(products: PosProductItem[], raw: string) {
  const q = raw.trim().toLowerCase();
  if (!q) return null;
  return products.find((p) => p.sku.toLowerCase() === q) ?? null;
}
