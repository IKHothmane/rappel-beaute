import type {
  CreateExpenseInput,
  ExpenseDetail,
  ExpenseListResponse,
  UpdateExpenseInput,
} from "@/types/expense";
import { EXPENSE_CATEGORY_LABEL, EXPENSE_STATUS_LABEL } from "@/types/expense";

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

export async function listExpenses(params: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  method?: string;
  supplierId?: string;
  from?: string;
  to?: string;
  minAmount?: number;
  maxAmount?: number;
  includeVoid?: boolean;
}): Promise<ExpenseListResponse> {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.search) q.set("search", params.search);
  if (params.category) q.set("category", params.category);
  if (params.method) q.set("method", params.method);
  if (params.supplierId) q.set("supplierId", params.supplierId);
  if (params.from) q.set("from", params.from);
  if (params.to) q.set("to", params.to);
  if (params.minAmount != null) q.set("minAmount", String(params.minAmount));
  if (params.maxAmount != null) q.set("maxAmount", String(params.maxAmount));
  if (params.includeVoid) q.set("includeVoid", "1");
  const res = await fetch(`/api/expenses/?${q}`, fetchOpts);
  return parseJson(res);
}

export async function getExpense(id: string): Promise<ExpenseDetail> {
  const res = await fetch(`/api/expenses/${id}/`, fetchOpts);
  return parseJson(res);
}

export async function createExpense(
  input: CreateExpenseInput,
): Promise<{ ok: true; expense: ExpenseDetail } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/expenses/", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error ?? "Erreur" };
    return { ok: true, expense: data as ExpenseDetail };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur réseau" };
  }
}

export async function updateExpense(
  id: string,
  input: UpdateExpenseInput,
): Promise<{ ok: true; expense: ExpenseDetail } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api/expenses/${id}/`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error ?? "Erreur" };
    return { ok: true, expense: data as ExpenseDetail };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur réseau" };
  }
}

export async function voidExpense(
  id: string,
  reason?: string,
): Promise<{ ok: true; expense: ExpenseDetail } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api/expenses/${id}/`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "void", reason }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error ?? "Erreur" };
    return { ok: true, expense: data as ExpenseDetail };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur réseau" };
  }
}

export function formatMad(n: number): string {
  return `${n.toLocaleString("fr-MA", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} MAD`;
}

export { EXPENSE_CATEGORY_LABEL, EXPENSE_STATUS_LABEL };
