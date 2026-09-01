import type {
  AppointmentPaymentSummary,
  CashRegisterState,
  CashTxnItem,
  CloseCashInput,
  CreatePaymentsInput,
  ManualCashTxnInput,
  OpenCashInput,
  PaymentItem,
  RefundPaymentInput,
} from "@/types/finance";
import {
  CASH_TXN_LABEL,
  PAYMENT_KIND_LABEL,
  PAYMENT_METHOD_LABEL,
} from "@/types/finance";

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

export async function getCashRegister(): Promise<CashRegisterState> {
  const res = await fetch("/api/cash-register/", fetchOpts);
  return parseJson(res);
}

export async function openCashRegister(
  input: OpenCashInput,
): Promise<{ ok: true; state: CashRegisterState } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/cash-register/open/", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error ?? "Erreur" };
    return { ok: true, state: data as CashRegisterState };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur réseau" };
  }
}

export async function closeCashRegister(
  input: CloseCashInput,
): Promise<{ ok: true; state: CashRegisterState } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/cash-register/close/", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error ?? "Erreur" };
    return { ok: true, state: data as CashRegisterState };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur réseau" };
  }
}

export async function createCashTxn(
  input: ManualCashTxnInput,
): Promise<{ ok: true; txn: CashTxnItem } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/cash-register/transactions/", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error ?? "Erreur" };
    return { ok: true, txn: data as CashTxnItem };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur réseau" };
  }
}

export async function listPayments(params?: {
  appointmentId?: string;
  limit?: number;
}): Promise<PaymentItem[]> {
  const q = new URLSearchParams();
  if (params?.appointmentId) q.set("appointmentId", params.appointmentId);
  if (params?.limit) q.set("limit", String(params.limit));
  const res = await fetch(`/api/payments/?${q}`, fetchOpts);
  const data = await parseJson<{ data: PaymentItem[] }>(res);
  return data.data;
}

export async function listBillableAppointments(): Promise<
  {
    id: string;
    customerName: string;
    serviceName: string;
    price: number;
    remaining: number;
    status: string;
    startAt: string;
  }[]
> {
  const res = await fetch("/api/payments/?billable=1", fetchOpts);
  const data = await parseJson<{ data: Awaited<ReturnType<typeof listBillableAppointments>> }>(
    res,
  );
  return data.data;
}

export async function getPaymentSummary(
  appointmentId: string,
): Promise<AppointmentPaymentSummary> {
  const res = await fetch(
    `/api/payments/?appointmentId=${appointmentId}&summary=1`,
    fetchOpts,
  );
  return parseJson(res);
}

export async function createPayments(
  input: CreatePaymentsInput,
): Promise<
  | { ok: true; payments: PaymentItem[]; summary: AppointmentPaymentSummary }
  | { ok: false; error: string }
> {
  try {
    const res = await fetch("/api/payments/", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error ?? "Erreur" };
    return {
      ok: true,
      payments: data.payments as PaymentItem[],
      summary: data.summary as AppointmentPaymentSummary,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur réseau" };
  }
}

export async function refundPayment(
  paymentId: string,
  input: RefundPaymentInput,
): Promise<{ ok: true; payment: PaymentItem } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api/payments/${paymentId}/refund/`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error ?? "Erreur" };
    return { ok: true, payment: data as PaymentItem };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur réseau" };
  }
}

export function formatMad(n: number): string {
  return `${n.toLocaleString("fr-MA", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} MAD`;
}

export function newIdempotencyKey(prefix = "pay"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export { CASH_TXN_LABEL, PAYMENT_KIND_LABEL, PAYMENT_METHOD_LABEL };
