import type {
  CreateInvoiceFromAppointmentInput,
  InvoiceDetail,
  InvoiceListResponse,
  VoidInvoiceInput,
} from "@/types/invoice";
import { INVOICE_STATUS_LABEL } from "@/types/invoice";

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

export async function listInvoices(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  customerId?: string;
  method?: string;
  from?: string;
  to?: string;
}): Promise<InvoiceListResponse> {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.search) q.set("search", params.search);
  if (params.status) q.set("status", params.status);
  if (params.customerId) q.set("customerId", params.customerId);
  if (params.method) q.set("method", params.method);
  if (params.from) q.set("from", params.from);
  if (params.to) q.set("to", params.to);
  const res = await fetch(`/api/invoices/?${q}`, fetchOpts);
  return parseJson(res);
}

export async function getInvoice(id: string): Promise<InvoiceDetail> {
  const res = await fetch(`/api/invoices/${id}/`, fetchOpts);
  return parseJson(res);
}

export async function createInvoiceFromAppointment(
  input: CreateInvoiceFromAppointmentInput,
): Promise<{ ok: true; invoice: InvoiceDetail; created: boolean } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/invoices/", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error ?? "Erreur" };
    return {
      ok: true,
      invoice: data.invoice as InvoiceDetail,
      created: Boolean(data.created),
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur réseau" };
  }
}

export async function voidInvoice(
  id: string,
  input: VoidInvoiceInput,
): Promise<{ ok: true; invoice: InvoiceDetail } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api/invoices/${id}/`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "void", ...input }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error ?? "Erreur" };
    return { ok: true, invoice: data as InvoiceDetail };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur réseau" };
  }
}

export function formatMad(n: number): string {
  return `${n.toLocaleString("fr-MA", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} MAD`;
}

export { INVOICE_STATUS_LABEL };
