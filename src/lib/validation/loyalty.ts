import type {
  CreatePackageInput,
  CreateRewardInput,
  RedeemRewardInput,
  UpdateLoyaltyProgramInput,
} from "@/types/loyalty";
import { LOYALTY_REWARD_TYPES } from "@/lib/loyalty-constants";

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

export function validateUpdateProgram(
  raw: Record<string, unknown>,
): { ok: true; data: UpdateLoyaltyProgramInput } | { ok: false; errors: string[] } {
  const data: UpdateLoyaltyProgramInput = {};
  if (raw.madPerPoint !== undefined) {
    const n = num(raw.madPerPoint);
    if (n === undefined || n <= 0) return { ok: false, errors: ["madPerPoint"] };
    data.madPerPoint = Math.round(n * 100) / 100;
  }
  for (const key of ["bronzeMin", "silverMin", "goldMin", "vipMin"] as const) {
    if (raw[key] !== undefined) {
      const n = int(raw[key]);
      if (n === undefined || n < 0) return { ok: false, errors: [key] };
      data[key] = n;
    }
  }
  if (raw.active !== undefined) data.active = Boolean(raw.active);
  return { ok: true, data };
}

export function validateCreateReward(
  raw: Record<string, unknown>,
): { ok: true; data: CreateRewardInput } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const name = str(raw.name);
  const pointsCost = int(raw.pointsCost);
  const type = str(raw.type);
  if (!name) errors.push("name");
  if (pointsCost === undefined || pointsCost <= 0) errors.push("pointsCost");
  if (!type || !LOYALTY_REWARD_TYPES.includes(type as CreateRewardInput["type"])) {
    errors.push("type");
  }
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    data: {
      name: name!,
      description: str(raw.description),
      pointsCost: pointsCost!,
      type: type as CreateRewardInput["type"],
      value: num(raw.value),
      serviceId: str(raw.serviceId),
      maxRedemptions: int(raw.maxRedemptions) ?? undefined,
    },
  };
}

export function validateRedeem(
  raw: Record<string, unknown>,
): { ok: true; data: RedeemRewardInput } | { ok: false; errors: string[] } {
  const customerId = str(raw.customerId);
  const rewardId = str(raw.rewardId);
  if (!customerId || !rewardId) return { ok: false, errors: ["customerId", "rewardId"] };
  return {
    ok: true,
    data: {
      customerId,
      rewardId,
      appointmentId: str(raw.appointmentId),
      idempotencyKey: str(raw.idempotencyKey),
    },
  };
}

export function validateCreatePackage(
  raw: Record<string, unknown>,
): { ok: true; data: CreatePackageInput } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const customerId = str(raw.customerId);
  const name = str(raw.name);
  const serviceId = str(raw.serviceId);
  const sessionTotal = int(raw.sessionTotal);
  const pricePaid = num(raw.pricePaid);
  if (!customerId) errors.push("customerId");
  if (!name) errors.push("name");
  if (!serviceId) errors.push("serviceId");
  if (sessionTotal === undefined || sessionTotal <= 0) errors.push("sessionTotal");
  if (pricePaid === undefined || pricePaid < 0) errors.push("pricePaid");
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    data: {
      customerId: customerId!,
      name: name!,
      serviceId: serviceId!,
      sessionTotal: sessionTotal!,
      pricePaid: Math.round(pricePaid! * 100) / 100,
      expiresAt: str(raw.expiresAt),
      notes: str(raw.notes),
    },
  };
}

export function validateAdjustment(
  raw: Record<string, unknown>,
): { ok: true; data: { customerId: string; points: number; reason: string } } | { ok: false; errors: string[] } {
  const customerId = str(raw.customerId);
  const points = int(raw.points);
  const reason = str(raw.reason);
  if (!customerId || points === undefined || points === 0 || !reason) {
    return { ok: false, errors: ["customerId", "points", "reason"] };
  }
  return { ok: true, data: { customerId, points, reason } };
}
