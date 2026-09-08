import type {
  CreatePosSaleInput,
  PosProductItem,
  PosSaleDetail,
} from "@/types/pos";
import type { PaymentMethod } from "@/types/finance";

async function parseJson<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      typeof data === "object" && data && "error" in data
        ? String((data as { error: string }).error)
        : "Erreur réseau",
    );
  }
  return data as T;
}

const fetchOpts = { credentials: "include" as const, cache: "no-store" as const };

export async function listPosProductsApi(params?: {
  search?: string;
  category?: string;
}): Promise<PosProductItem[]> {
  const q = new URLSearchParams();
  if (params?.search) q.set("search", params.search);
  if (params?.category) q.set("category", params.category);
  const res = await fetch(`/api/pos/products/?${q}`, fetchOpts);
  const data = await parseJson<{ data: PosProductItem[] }>(res);
  return data.data;
}

export async function searchPosCustomersApi(q: string) {
  const res = await fetch(
    `/api/pos/customers/search/?q=${encodeURIComponent(q)}`,
    fetchOpts,
  );
  return parseJson<{ data: { id: string; name: string; phone: string }[] }>(res);
}

export async function createPosSaleApi(
  input: CreatePosSaleInput,
): Promise<{ ok: true; sale: PosSaleDetail } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/pos/sales/", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error ?? "Erreur vente" };
    return { ok: true, sale: data as PosSaleDetail };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur réseau" };
  }
}

export async function listPosSalesApi(): Promise<PosSaleDetail[]> {
  const res = await fetch("/api/pos/sales/", fetchOpts);
  const data = await parseJson<{ data: PosSaleDetail[] }>(res);
  return data.data;
}

export async function refundPosSaleApi(
  saleId: string,
): Promise<{ ok: true; sale: PosSaleDetail } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api/pos/sales/${saleId}/refund/`, {
      method: "POST",
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error ?? "Erreur remboursement" };
    return { ok: true, sale: data as PosSaleDetail };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur réseau" };
  }
}

export function newPosIdempotencyKey(): string {
  return `pos_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export type { CreatePosSaleInput, PosProductItem, PosSaleDetail, PaymentMethod };
