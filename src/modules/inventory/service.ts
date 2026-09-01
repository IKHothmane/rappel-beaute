import type {
  CreateMovementInput,
  CreateProductInput,
  InventoryMovementItem,
  MovementListResponse,
  ProductDetail,
  ProductListResponse,
  StockKpis,
  UpdateProductInput,
} from "@/types/inventory";
import {
  MOVEMENT_TYPE_LABEL,
  PRODUCT_CATEGORY_LABEL,
  PRODUCT_UNIT_LABEL,
} from "@/types/inventory";

const fetchOpts = { credentials: "include" as const, cache: "no-store" as const };

async function parseJson<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    const msg =
      typeof data === "object" && data && "error" in data
        ? String((data as { error: string }).error)
        : "Erreur réseau";
    throw new Error(msg);
  }
  return data as T;
}

export async function listProducts(params: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  active?: boolean | null;
  alert?: string;
  supplier?: string;
}): Promise<ProductListResponse> {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.search) q.set("search", params.search);
  if (params.category) q.set("category", params.category);
  if (params.active === true) q.set("active", "true");
  if (params.active === false) q.set("active", "false");
  if (params.alert) q.set("alert", params.alert);
  if (params.supplier) q.set("supplier", params.supplier);
  const res = await fetch(`/api/products/?${q.toString()}`, fetchOpts);
  return parseJson<ProductListResponse>(res);
}

export async function getProduct(id: string): Promise<ProductDetail> {
  const res = await fetch(`/api/products/${id}/`, fetchOpts);
  return parseJson<ProductDetail>(res);
}

export async function createProduct(
  input: CreateProductInput,
): Promise<{ ok: true; product: ProductDetail } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/products/", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error ?? "Erreur" };
    return { ok: true, product: data as ProductDetail };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur réseau" };
  }
}

export async function updateProduct(
  id: string,
  input: UpdateProductInput,
): Promise<{ ok: true; product: ProductDetail } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api/products/${id}/`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error ?? "Erreur" };
    return { ok: true, product: data as ProductDetail };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur réseau" };
  }
}

export async function listMovements(params: {
  page?: number;
  limit?: number;
  productId?: string;
  type?: string;
  search?: string;
}): Promise<MovementListResponse> {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.productId) q.set("productId", params.productId);
  if (params.type) q.set("type", params.type);
  if (params.search) q.set("search", params.search);
  const res = await fetch(`/api/stock/?${q.toString()}`, fetchOpts);
  return parseJson<MovementListResponse>(res);
}

export async function getStockKpis(): Promise<StockKpis> {
  const res = await fetch("/api/stock/?kpis=1", fetchOpts);
  return parseJson<StockKpis>(res);
}

export async function createMovement(
  input: CreateMovementInput,
): Promise<{ ok: true; movement: InventoryMovementItem } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/stock/", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error ?? "Erreur" };
    return { ok: true, movement: data as InventoryMovementItem };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur réseau" };
  }
}

export async function applyInventoryCount(
  items: { productId: string; countedQuantity: number }[],
): Promise<{ ok: true; adjustments: number } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/stock/", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "inventory-count", items }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error ?? "Erreur" };
    return { ok: true, adjustments: data.adjustments as number };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur réseau" };
  }
}

export function formatQty(n: number, unit: string): string {
  const label = PRODUCT_UNIT_LABEL[unit as keyof typeof PRODUCT_UNIT_LABEL] ?? unit;
  return `${n.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} ${label}`;
}

export function formatMad(n: number): string {
  return `${n.toLocaleString("fr-MA", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} MAD`;
}

export { PRODUCT_CATEGORY_LABEL, PRODUCT_UNIT_LABEL, MOVEMENT_TYPE_LABEL };
