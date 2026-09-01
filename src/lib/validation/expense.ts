import type {
  CreateExpenseInput,
  ExpenseCategory,
  UpdateExpenseInput,
} from "@/types/expense";
import { EXPENSE_CATEGORIES } from "@/types/expense";
import { PAYMENT_METHODS, type PaymentMethod } from "@/types/finance";

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

function category(v: unknown): ExpenseCategory | undefined {
  const s = str(v);
  return s && EXPENSE_CATEGORIES.includes(s as ExpenseCategory)
    ? (s as ExpenseCategory)
    : undefined;
}

function method(v: unknown): PaymentMethod | undefined {
  const s = str(v);
  return s && PAYMENT_METHODS.includes(s as PaymentMethod)
    ? (s as PaymentMethod)
    : undefined;
}

export function parseExpenseListQuery(sp: URLSearchParams) {
  return {
    page: Math.max(1, Number(sp.get("page")) || 1),
    limit: Math.min(100, Math.max(1, Number(sp.get("limit")) || 40)),
    search: sp.get("search")?.trim() || "",
    category: category(sp.get("category") ?? undefined) ?? null,
    method: method(sp.get("method") ?? undefined) ?? null,
    supplierId: sp.get("supplierId")?.trim() || null,
    from: sp.get("from")?.trim() || null,
    to: sp.get("to")?.trim() || null,
    minAmount: num(sp.get("minAmount") ?? undefined) ?? null,
    maxAmount: num(sp.get("maxAmount") ?? undefined) ?? null,
    includeVoid: sp.get("includeVoid") === "1",
  };
}

export function validateCreateExpense(
  raw: Record<string, unknown>,
): { ok: true; data: CreateExpenseInput } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const cat = category(raw.category);
  const amount = num(raw.amount);
  const paymentMethod = method(raw.paymentMethod);
  const expenseDate = str(raw.expenseDate);
  if (!cat) errors.push("category");
  if (amount === undefined || amount <= 0) errors.push("amount");
  if (!paymentMethod) errors.push("paymentMethod");
  if (!expenseDate) errors.push("expenseDate");
  if (errors.length || !cat || amount === undefined || !paymentMethod || !expenseDate) {
    return { ok: false, errors: errors.length ? errors : ["invalid"] };
  }
  return {
    ok: true,
    data: {
      category: cat,
      amount: Math.round(amount * 100) / 100,
      paymentMethod,
      description: str(raw.description),
      supplierId: str(raw.supplierId),
      expenseDate,
      reference: str(raw.reference),
    },
  };
}

export function validateUpdateExpense(
  raw: Record<string, unknown>,
): { ok: true; data: UpdateExpenseInput } | { ok: false; errors: string[] } {
  const data: UpdateExpenseInput = {};
  if (raw.category !== undefined) {
    const cat = category(raw.category);
    if (!cat) return { ok: false, errors: ["category"] };
    data.category = cat;
  }
  if (raw.amount !== undefined) {
    const amount = num(raw.amount);
    if (amount === undefined || amount <= 0) return { ok: false, errors: ["amount"] };
    data.amount = Math.round(amount * 100) / 100;
  }
  if (raw.paymentMethod !== undefined) {
    const m = method(raw.paymentMethod);
    if (!m) return { ok: false, errors: ["paymentMethod"] };
    data.paymentMethod = m;
  }
  if (raw.description !== undefined) data.description = str(raw.description) ?? null;
  if (raw.supplierId !== undefined) data.supplierId = str(raw.supplierId) ?? null;
  if (raw.expenseDate !== undefined) {
    const d = str(raw.expenseDate);
    if (!d) return { ok: false, errors: ["expenseDate"] };
    data.expenseDate = d;
  }
  if (raw.reference !== undefined) data.reference = str(raw.reference) ?? null;
  return { ok: true, data };
}
