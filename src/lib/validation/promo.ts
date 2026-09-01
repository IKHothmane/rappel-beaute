import type {
  CreateGiftCardInput,
  CreatePromotionInput,
  PromotionStatus,
  PromotionType,
} from "@/types/promo";
import { PROMOTION_TYPES } from "@/types/promo";

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

function int(v: unknown): number | undefined {
  const n = num(v);
  if (n === undefined || !Number.isInteger(n)) return undefined;
  return n;
}

export function parsePromotionListQuery(sp: URLSearchParams) {
  return {
    page: Math.max(1, Number(sp.get("page")) || 1),
    limit: Math.min(100, Math.max(1, Number(sp.get("limit")) || 40)),
    status: sp.get("status")?.trim() || null,
    search: sp.get("search")?.trim() || "",
  };
}

export function validateCreatePromotion(
  raw: Record<string, unknown>,
): { ok: true; data: CreatePromotionInput } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const name = str(raw.name);
  const type = str(raw.type) as PromotionType | undefined;
  if (!name) errors.push("name");
  if (!type || !PROMOTION_TYPES.includes(type)) errors.push("type");
  if (errors.length || !name || !type) return { ok: false, errors };
  return {
    ok: true,
    data: {
      name,
      code: str(raw.code)?.toUpperCase(),
      type,
      status: (str(raw.status) as PromotionStatus) || "ACTIVE",
      value: num(raw.value),
      serviceId: str(raw.serviceId),
      category: str(raw.category),
      customerId: str(raw.customerId),
      minAmount: num(raw.minAmount),
      maxUses: int(raw.maxUses),
      maxUsesPerCustomer: int(raw.maxUsesPerCustomer),
      startsAt: str(raw.startsAt),
      endsAt: str(raw.endsAt),
      timeStart: str(raw.timeStart),
      timeEnd: str(raw.timeEnd),
      weekdays: str(raw.weekdays),
      description: str(raw.description),
    },
  };
}

export function validateCreateGiftCard(
  raw: Record<string, unknown>,
): { ok: true; data: CreateGiftCardInput } | { ok: false; errors: string[] } {
  const amount = num(raw.amount);
  if (amount === undefined || amount <= 0) return { ok: false, errors: ["amount"] };
  return {
    ok: true,
    data: {
      amount: Math.round(amount * 100) / 100,
      buyerCustomerId: str(raw.buyerCustomerId),
      beneficiaryCustomerId: str(raw.beneficiaryCustomerId),
      expiresAt: str(raw.expiresAt),
      notes: str(raw.notes),
    },
  };
}

export function parseGiftCardListQuery(sp: URLSearchParams) {
  return {
    page: Math.max(1, Number(sp.get("page")) || 1),
    limit: Math.min(100, Math.max(1, Number(sp.get("limit")) || 40)),
    status: sp.get("status")?.trim() || null,
    search: sp.get("search")?.trim() || "",
  };
}
