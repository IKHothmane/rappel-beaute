import type {
  BookingPolicySettings,
  DepositDefaultMode,
  DepositRetentionPolicy,
  UpdateBookingPolicyInput,
} from "@/types/booking-policy";

const MODES = new Set<DepositDefaultMode>(["NONE", "FIXED", "PERCENT"]);
const RETENTIONS = new Set<DepositRetentionPolicy>(["KEEP", "REFUND"]);

function num(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function bool(v: unknown): boolean | undefined {
  if (v === undefined) return undefined;
  if (typeof v === "boolean") return v;
  return undefined;
}

export function validateUpdateBookingPolicy(
  raw: Record<string, unknown>,
): { ok: true; data: UpdateBookingPolicyInput } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const data: UpdateBookingPolicyInput = {};

  const de = bool(raw.depositsEnabled);
  if (de !== undefined) data.depositsEnabled = de;

  if (raw.defaultMode !== undefined) {
    const m = String(raw.defaultMode).toUpperCase() as DepositDefaultMode;
    if (!MODES.has(m)) errors.push("defaultMode");
    else data.defaultMode = m;
  }

  if (raw.defaultFixedAmount !== undefined) {
    if (raw.defaultFixedAmount === null) data.defaultFixedAmount = null;
    else {
      const n = num(raw.defaultFixedAmount);
      if (n === undefined || n < 0) errors.push("defaultFixedAmount");
      else data.defaultFixedAmount = n;
    }
  }

  if (raw.defaultPercent !== undefined) {
    if (raw.defaultPercent === null) data.defaultPercent = null;
    else {
      const n = num(raw.defaultPercent);
      if (n === undefined || n < 0 || n > 100) errors.push("defaultPercent");
      else data.defaultPercent = n;
    }
  }

  for (const key of [
    "confirmDeadlineHours",
    "lateCancelHours",
    "noShowWarnAt",
    "noShowRequireDepositAt",
    "noShowStrictAt",
  ] as const) {
    if (raw[key] !== undefined) {
      const n = num(raw[key]);
      if (n === undefined || n < 0 || !Number.isInteger(n)) errors.push(key);
      else data[key] = n;
    }
  }

  for (const key of [
    "onCustomerLateCancel",
    "onNoShow",
    "onInstituteCancel",
  ] as const) {
    if (raw[key] !== undefined) {
      const v = String(raw[key]).toUpperCase() as DepositRetentionPolicy;
      if (!RETENTIONS.has(v)) errors.push(key);
      else data[key] = v;
    }
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, data };
}

export type { BookingPolicySettings };
