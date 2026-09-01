import type { ReactivationBucket, UpdateReactivationSettingsInput } from "@/types/reactivation";
import { REACTIVATION_BUCKETS } from "@/types/reactivation";

function str(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

function int(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) {
    return Math.trunc(Number(v));
  }
  return undefined;
}

export function parseReactivationListQuery(sp: URLSearchParams) {
  const bucket = sp.get("bucket")?.trim() as ReactivationBucket | null;
  const relanceOnly = sp.get("relanceOnly") !== "false";
  return {
    bucket: bucket && REACTIVATION_BUCKETS.includes(bucket) ? bucket : null,
    relanceOnly,
  };
}

export function validateUpdateReactivationSettings(
  raw: Record<string, unknown>,
): { ok: true; data: UpdateReactivationSettingsInput } | { ok: false; errors: string[] } {
  const data: UpdateReactivationSettingsInput = {};
  const minDays = int(raw.minimumDaysBetweenMarketingMessages);
  if (minDays !== undefined) {
    if (minDays < 7 || minDays > 365) return { ok: false, errors: ["minimumDaysBetweenMarketingMessages"] };
    data.minimumDaysBetweenMarketingMessages = minDays;
  }
  for (const key of [
    "threshold30Enabled",
    "threshold45Enabled",
    "threshold60Enabled",
    "threshold90Enabled",
    "autoCreateWhatsAppTasks",
  ] as const) {
    if (typeof raw[key] === "boolean") data[key] = raw[key];
  }
  for (const key of [
    "promoCode30",
    "promoCode45",
    "promoCode60",
    "promoCode90",
    "promoDiscount30",
    "promoDiscount45",
    "promoDiscount60",
    "promoDiscount90",
  ] as const) {
    if (raw[key] !== undefined) {
      const v = str(raw[key]);
      (data as Record<string, string | null>)[key] = v ?? null;
    }
  }
  return { ok: true, data };
}

export function parseReactivationAction(raw: Record<string, unknown>):
  | { action: "prepareWhatsApp"; customerId: string }
  | { action: "snooze"; customerId: string; days: number }
  | { action: "updateSettings"; data: UpdateReactivationSettingsInput }
  | { action: "invalid" } {
  const action = str(raw.action);
  if (action === "prepareWhatsApp") {
    const customerId = str(raw.customerId);
    if (!customerId) return { action: "invalid" };
    return { action: "prepareWhatsApp", customerId };
  }
  if (action === "snooze") {
    const customerId = str(raw.customerId);
    const days = int(raw.days) ?? 30;
    if (!customerId) return { action: "invalid" };
    return { action: "snooze", customerId, days };
  }
  if (action === "updateSettings") {
    const validated = validateUpdateReactivationSettings(raw);
    if (!validated.ok) return { action: "invalid" };
    return { action: "updateSettings", data: validated.data };
  }
  return { action: "invalid" };
}
