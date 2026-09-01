import { getRedis } from "@/lib/redis/client";

type MemoryBucket = { count: number; resetAt: number };

const memoryBuckets = new Map<string, MemoryBucket>();

export type RateLimitConfig = {
  key: string;
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSec?: number;
};

function checkMemory(config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const existing = memoryBuckets.get(config.key);

  if (!existing || now >= existing.resetAt) {
    memoryBuckets.set(config.key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true };
  }

  if (existing.count >= config.limit) {
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

  const count = await redis.incr(redisKey);
  if (count === 1) {
    await redis.expire(redisKey, windowSec);
  }

  if (count > config.limit) {
    const ttl = await redis.ttl(redisKey);
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
  } catch {
    // fallback mémoire
  }
  return checkMemory(config);
}

export function resetRateLimitsForTests(): void {
  memoryBuckets.clear();
}

export function publicRateLimitKey(ip: string, slug: string, action: string): string {
  return `${action}:${slug}:${ip}`;
}

export function bookingCompositeRateLimitKey(
  ip: string,
  slug: string,
  phone: string,
): string {
  const normalizedPhone = phone.replace(/\D/g, "").slice(-9);
  return `book:${slug}:${ip}:${normalizedPhone || "unknown"}`;
}

export const PUBLIC_RATE_LIMITS = {
  availability: { limit: 60, windowMs: 60_000 },
  bookings: { limit: 10, windowMs: 60_000 },
  bookingsPerPhone: { limit: 3, windowMs: 60 * 60_000 },
} as const;

export const AUTH_RATE_LIMITS = {
  login: { limit: 10, windowMs: 15 * 60_000 },
  activate: { limit: 5, windowMs: 15 * 60_000 },
  platformLogin: { limit: 10, windowMs: 15 * 60_000 },
} as const;

export function authRateLimitKey(action: string, ip: string, email?: string): string {
  const normalized = email?.trim().toLowerCase() ?? "unknown";
  return `auth:${action}:${ip}:${normalized}`;
}
