import type {
  CommissionPaidFilter,
  CommissionPeriodPreset,
  CreateCommissionAdjustmentInput,
} from "@/types/commission";

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

const PRESETS: CommissionPeriodPreset[] = [
  "today",
  "week",
  "month",
  "prev_month",
  "custom",
];

export function parseCommissionListQuery(sp: URLSearchParams) {
  const presetRaw = sp.get("preset")?.trim() || "month";
  const preset = PRESETS.includes(presetRaw as CommissionPeriodPreset)
    ? (presetRaw as CommissionPeriodPreset)
    : "month";
  const paidRaw = sp.get("paid")?.trim() || "all";
  const paid: CommissionPaidFilter =
    paidRaw === "paid" || paidRaw === "unpaid" ? paidRaw : "all";

  return {
    page: Math.max(1, Number(sp.get("page")) || 1),
    limit: Math.min(200, Math.max(1, Number(sp.get("limit")) || 50)),
    preset,
    from: sp.get("from")?.trim() || null,
    to: sp.get("to")?.trim() || null,
    staffId: sp.get("staffId")?.trim() || null,
    serviceId: sp.get("serviceId")?.trim() || null,
    paid,
    search: sp.get("search")?.trim() || "",
  };
}

export function validateCommissionAdjustment(
  raw: Record<string, unknown>,
): { ok: true; data: CreateCommissionAdjustmentInput } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const amount = num(raw.amount);
  const reason = str(raw.reason);
  if (amount === undefined || amount === 0) errors.push("amount");
  if (!reason) errors.push("reason");
  if (errors.length || amount === undefined || !reason) {
    return { ok: false, errors: errors.length ? errors : ["invalid"] };
  }
  return {
    ok: true,
    data: {
      amount: Math.round(amount * 100) / 100,
      reason,
      paymentId: str(raw.paymentId),
      idempotencyKey: str(raw.idempotencyKey),
    },
  };
}

export function validateClosePeriod(
  raw: Record<string, unknown>,
): { ok: true; data: { year: number; month: number } } | { ok: false; errors: string[] } {
  const year = num(raw.year);
  const month = num(raw.month);
  if (
    year === undefined ||
    month === undefined ||
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    return { ok: false, errors: ["year", "month"] };
  }
  return { ok: true, data: { year, month } };
}
