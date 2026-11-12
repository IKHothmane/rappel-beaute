import { PRODUCT_CATEGORY_LABEL, type ProductCategory } from "@/types/inventory";
import type { PosProductItem } from "@/types/pos";

export function isSameLocalDay(iso: string) {
  const d = new Date(iso);
  const n = new Date();
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  );
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

