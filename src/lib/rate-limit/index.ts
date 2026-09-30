import { getRedis } from "@/lib/redis/client";
import { logger } from "@/lib/logger";
import { identityHash, phoneKey } from "./keys";

type MemoryBucket = { count: number; resetAt: number };

const memoryBuckets = new Map<string, MemoryBucket>();
const memoryIdempotency = new Map<string, number>();

export type RateLimitConfig = {
  key: string;
  limit: number;
  windowMs: number;
  /** Routes sensibles : fallback mémoire plus strict si Redis est down. */
  sensitivity?: "sensitive" | "standard";
};

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSec?: number;
};

function effectiveLimit(config: RateLimitConfig): number {
  if (config.sensitivity !== "sensitive") return config.limit;
  return Math.max(1, Math.ceil(config.limit / 3));
}

function checkMemory(config: RateLimitConfig, limit: number): RateLimitResult {
  const now = Date.now();
  const existing = memoryBuckets.get(config.key);

  if (!existing || now >= existing.resetAt) {
    memoryBuckets.set(config.key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  existing.count += 1;
  return { allowed: true };
}

async function checkRedis(config: RateLimitConfig): Promise<RateLimitResult | null> {
  const redis = await getRedis();
  if (!redis) return null;

  const redisKey = `rl:${config.key}`;
  const windowSec = Math.ceil(config.windowMs / 1000);

  const results = await redis
    .multi()
    .incr(redisKey)
    .expire(redisKey, windowSec, "NX")
    .ttl(redisKey)
    .exec();

  if (!results) return null;

  const count = results[0] as number;
  const ttl = results[2] as number;

  if (count > config.limit) {
    return {
      allowed: false,
      retryAfterSec: ttl > 0 ? ttl : windowSec,
    };
  }

  return { allowed: true };
}

export async function checkRateLimit(config: RateLimitConfig): Promise<RateLimitResult> {
  try {
    const redisResult = await checkRedis(config);
    if (redisResult) return redisResult;
  } catch (error) {
    logger.warn("rate limit redis error", {
      error: error instanceof Error ? error.message : "unknown",
    });
  }

  if (config.sensitivity === "sensitive") {
    logger.warn("rate limit redis down — fallback sensible", { keyPrefix: config.key.split(":")[0] });
  }
  return checkMemory(config, effectiveLimit(config));
}

/** Tous les compteurs sont incrémentés. Le premier refus gagne. */
export async function consumeDimensions(
  checks: RateLimitConfig[],
): Promise<RateLimitResult> {
  let denied: RateLimitResult | null = null;
  for (const check of checks) {
    const result = await checkRateLimit(check);
    if (!result.allowed) {
      const retry = result.retryAfterSec ?? 0;
      if (!denied || retry > (denied.retryAfterSec ?? 0)) denied = result;
    }
  }
  return denied ?? { allowed: true };
}

export function resetRateLimitsForTests(): void {
  memoryBuckets.clear();
  memoryIdempotency.clear();
}

/**
 * true = première demande (à traiter).
 * false = doublon dans la fenêtre.
 */
export async function claimIdempotency(key: string, ttlSec: number): Promise<boolean> {
  const redisKey = `rl:idem:${key}`;
  try {
    const redis = await getRedis();
    if (redis) {
      const set = await redis.set(redisKey, "1", { NX: true, EX: ttlSec });
      return set === "OK";
    }
  } catch {
    /* mémoire */
  }
  const now = Date.now();
  const until = memoryIdempotency.get(key);
  if (until && until > now) return false;
  memoryIdempotency.set(key, now + ttlSec * 1000);
  return true;
}

export async function releaseIdempotency(key: string): Promise<void> {
  memoryIdempotency.delete(key);
  try {
    const redis = await getRedis();
    if (redis) await redis.del(`rl:idem:${key}`);
  } catch {
    /* ignore */
  }
}

export {
  emailKey,
  identityHash,
  normalizeEmail,
  normalizePhone,
  phoneKey,
} from "./keys";
export { RATE_POLICIES } from "./policies";

/** @deprecated Préférer consumeDimensions + HMAC. Conservé pour les tests. */
export const PUBLIC_RATE_LIMITS = {
  availability: { limit: 60, windowMs: 60_000 },
  bookings: { limit: 10, windowMs: 10 * 60_000 },
  bookingsPerPhone: { limit: 3, windowMs: 60 * 60_000 },
} as const;

export const AUTH_RATE_LIMITS = {
  login: { limit: 10, windowMs: 15 * 60_000 },
  activate: { limit: 5, windowMs: 15 * 60_000 },
  platformLogin: { limit: 10, windowMs: 15 * 60_000 },
  signup: { limit: 5, windowMs: 60 * 60_000 },
} as const;

export function publicRateLimitKey(ip: string, slug: string, action: string): string {
  return `public:${action}:${slug}:${ip}`;
}

export function bookingCompositeRateLimitKey(
  ip: string,
  slug: string,
  phone: string,
): string {
  return `booking:pair:${slug}:${ip}:${phoneKey(phone)}`;
}

export function authRateLimitKey(action: string, ip: string, email?: string): string {
  const id = email ? identityHash(email.trim().toLowerCase()) : "unknown";
  return `auth:${action}:pair:${ip}:${id}`;
}
