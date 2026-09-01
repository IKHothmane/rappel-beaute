import type {
  CloseCashInput,
  CreatePaymentsInput,
  ManualCashTxnInput,
  OpenCashInput,
  PaymentKind,
  PaymentMethod,
  RefundPaymentInput,
} from "@/types/finance";
import { PAYMENT_METHODS } from "@/types/finance";

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

function method(v: unknown): PaymentMethod | undefined {
  const s = str(v);
  return s && PAYMENT_METHODS.includes(s as PaymentMethod)
    ? (s as PaymentMethod)
    : undefined;
}

export function validateOpenCash(
  raw: Record<string, unknown>,
): { ok: true; data: OpenCashInput } | { ok: false; errors: string[] } {
  const openingFloat = num(raw.openingFloat);
  if (openingFloat === undefined || openingFloat < 0) {
    return { ok: false, errors: ["openingFloat"] };
  }
  return { ok: true, data: { openingFloat, notes: str(raw.notes) } };
}

export function validateCloseCash(
  raw: Record<string, unknown>,
): { ok: true; data: CloseCashInput } | { ok: false; errors: string[] } {
  const countedAmount = num(raw.countedAmount);
  const reason = str(raw.reason);
  const errors: string[] = [];
  if (countedAmount === undefined || countedAmount < 0) errors.push("countedAmount");
  if (!reason) errors.push("reason");
  if (errors.length) return { ok: false, errors };
  return { ok: true, data: { countedAmount: countedAmount!, reason: reason! } };
}

export function validateManualCashTxn(
  raw: Record<string, unknown>,
): { ok: true; data: ManualCashTxnInput } | { ok: false; errors: string[] } {
  const type = str(raw.type);
  const amount = num(raw.amount);
  const reason = str(raw.reason);
  const errors: string[] = [];
  if (type !== "CASH_OUT" && type !== "CASH_IN") errors.push("type");
  if (amount === undefined || amount <= 0) errors.push("amount");
  if (!reason) errors.push("reason");
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    data: {
      type: type as "CASH_OUT" | "CASH_IN",
      amount: amount!,
      reason: reason!,
      idempotencyKey: str(raw.idempotencyKey),
    },
  };
}

export function validateCreatePayments(
  raw: Record<string, unknown>,
): { ok: true; data: CreatePaymentsInput } | { ok: false; errors: string[] } {
  const appointmentId = str(raw.appointmentId);
  if (!appointmentId) return { ok: false, errors: ["appointmentId"] };
  if (!Array.isArray(raw.items) || raw.items.length === 0) {
    return { ok: false, errors: ["items"] };
  }

  const items: CreatePaymentsInput["items"] = [];
  for (const row of raw.items) {
    if (!row || typeof row !== "object") return { ok: false, errors: ["items"] };
    const r = row as Record<string, unknown>;
    const amount = num(r.amount);
    const m = method(r.method);
    const kindRaw = str(r.kind);
    const kind =
      kindRaw === "DEPOSIT" || kindRaw === "PAYMENT" || kindRaw === "REFUND"
        ? (kindRaw as PaymentKind)
        : "PAYMENT";
    if (amount === undefined || amount <= 0 || !m) return { ok: false, errors: ["items"] };
    if (kind === "REFUND") return { ok: false, errors: ["items"] };
    if (m === "GIFT_CARD" && !str(r.giftCardId) && !str(r.giftCardCode)) {
      return { ok: false, errors: ["giftCard"] };
    }
    items.push({
      amount,
      method: m,
      kind,
      giftCardId: str(r.giftCardId),
      giftCardCode: str(r.giftCardCode),
    });
  }

  return {
    ok: true,
    data: {
      appointmentId,
      items,
      notes: str(raw.notes),
      idempotencyKey: str(raw.idempotencyKey),
    },
  };
}

export function validateRefund(
  raw: Record<string, unknown>,
): { ok: true; data: RefundPaymentInput } | { ok: false; errors: string[] } {
  const amount = num(raw.amount);
  const m = method(raw.method);
  const errors: string[] = [];
  if (amount === undefined || amount <= 0) errors.push("amount");
  if (!m) errors.push("method");
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    data: {
      amount: amount!,
      method: m!,
      reason: str(raw.reason),
      idempotencyKey: str(raw.idempotencyKey),
    },
  };
}
