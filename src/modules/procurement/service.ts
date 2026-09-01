import type {
  CreatePurchaseInput,
  CreateSupplierInput,
  LinkProductSupplierInput,
  ProductSupplierLink,
  PurchaseDetail,
  PurchaseListResponse,
  ReceivePurchaseInput,
  SupplierDetail,
  SupplierListResponse,
  UpdatePurchaseInput,
  UpdateSupplierInput,
} from "@/types/procurement";
import { PURCHASE_STATUS_LABEL } from "@/types/procurement";

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

export async function listSuppliers(params: {
  page?: number;
  limit?: number;
  search?: string;
  active?: boolean | null;
}): Promise<SupplierListResponse> {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.search) q.set("search", params.search);
  if (params.active === true) q.set("active", "true");
  if (params.active === false) q.set("active", "false");
  const res = await fetch(`/api/suppliers/?${q}`, fetchOpts);
  return parseJson(res);
}

export async function getSupplier(id: string): Promise<SupplierDetail> {
  const res = await fetch(`/api/suppliers/${id}/`, fetchOpts);
  return parseJson(res);
}

export async function createSupplier(
  input: CreateSupplierInput,
): Promise<{ ok: true; supplier: SupplierDetail } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/suppliers/", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error ?? "Erreur" };
    return { ok: true, supplier: data as SupplierDetail };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur réseau" };
  }
}

export async function updateSupplier(
  id: string,
  input: UpdateSupplierInput,
): Promise<{ ok: true; supplier: SupplierDetail } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api/suppliers/${id}/`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error ?? "Erreur" };
    return { ok: true, supplier: data as SupplierDetail };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur réseau" };
  }
}

export async function archiveSupplier(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api/suppliers/${id}/`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error ?? "Erreur" };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur réseau" };
  }
}

export async function linkProductSupplier(
  supplierId: string,
  input: LinkProductSupplierInput,
): Promise<{ ok: true; link: ProductSupplierLink } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api/suppliers/${supplierId}/`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "link-product", ...input }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error ?? "Erreur" };
    return { ok: true, link: data.link as ProductSupplierLink };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur réseau" };
  }
}

export async function unlinkProductSupplier(
  supplierId: string,
  productId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api/suppliers/${supplierId}/`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unlink-product", productId }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error ?? "Erreur" };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur réseau" };
  }
}

export async function listPurchases(params: {
  page?: number;
  limit?: number;
  search?: string;
  supplierId?: string;
  status?: string;
}): Promise<PurchaseListResponse> {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.search) q.set("search", params.search);
  if (params.supplierId) q.set("supplierId", params.supplierId);
  if (params.status) q.set("status", params.status);
  const res = await fetch(`/api/purchases/?${q}`, fetchOpts);
  return parseJson(res);
}

export async function getPurchase(id: string): Promise<PurchaseDetail> {
  const res = await fetch(`/api/purchases/${id}/`, fetchOpts);
  return parseJson(res);
}

export async function createPurchase(
  input: CreatePurchaseInput,
): Promise<{ ok: true; purchase: PurchaseDetail } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/purchases/", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error ?? "Erreur" };
    return { ok: true, purchase: data as PurchaseDetail };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur réseau" };
  }
}

export async function updatePurchase(
  id: string,
  input: UpdatePurchaseInput,
): Promise<{ ok: true; purchase: PurchaseDetail } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api/purchases/${id}/`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error ?? "Erreur" };
    return { ok: true, purchase: data as PurchaseDetail };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur réseau" };
  }
}

export async function receivePurchase(
  id: string,
  input: ReceivePurchaseInput,
): Promise<{ ok: true; purchase: PurchaseDetail; created: boolean } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api/purchases/${id}/`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "receive", ...input }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error ?? "Erreur" };
    return {
      ok: true,
      purchase: data.purchase as PurchaseDetail,
      created: Boolean(data.created),
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur réseau" };
  }
}

export function formatMad(n: number): string {
  return `${n.toLocaleString("fr-MA", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} MAD`;
}

export function newIdempotencyKey(prefix = "recv"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export { PURCHASE_STATUS_LABEL };
