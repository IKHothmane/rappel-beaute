import type { InvoiceStatus, VoidInvoiceInput } from "@/types/invoice";
import { INVOICE_STATUSES } from "@/types/invoice";

function str(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

function num(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) {
    return Number(v);
  }
  return undefined;
}

export function parseInvoiceListQuery(sp: URLSearchParams) {
  const status = sp.get("status");
  return {
    page: Math.max(1, Number(sp.get("page")) || 1),
    limit: Math.min(100, Math.max(1, Number(sp.get("limit")) || 30)),
    search: sp.get("search")?.trim() || "",
    customerId: sp.get("customerId")?.trim() || null,
    status:
      status && INVOICE_STATUSES.includes(status as InvoiceStatus)
        ? (status as InvoiceStatus)
        : null,
    method: sp.get("method")?.trim() || null,
    from: sp.get("from")?.trim() || null,
    to: sp.get("to")?.trim() || null,
  };
}

export function validateCreateFromAppointment(raw: Record<string, unknown>) {
  const appointmentId = str(raw.appointmentId);
  if (!appointmentId) return { ok: false as const, errors: ["appointmentId"] };
  return {
    ok: true as const,
    data: {
      appointmentId,
      discountTotal: num(raw.discountTotal),
      notes: str(raw.notes),
      issue: raw.issue !== false,
    },
  };
}

export function validateVoidInvoice(
  raw: Record<string, unknown>,
): { ok: true; data: VoidInvoiceInput } | { ok: false; errors: string[] } {
  const reason = str(raw.reason);
  if (!reason) return { ok: false, errors: ["reason"] };
  return { ok: true, data: { reason } };
}
