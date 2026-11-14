import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/redis/client", () => ({ getRedis: async () => null }));

import {
  checkRateLimit,
  claimIdempotency,
  pruneExpiredRateLimits,
  resetRateLimitsForTests,
} from "@/lib/rate-limit";

describe("rate limiter fallback expiry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-14T12:00:00Z"));
    resetRateLimitsForTests();
  });
  afterEach(() => {
    resetRateLimitsForTests();
    vi.useRealTimers();
  });

  it("prunes abandoned keys while preserving active limits and claims", async () => {
    await checkRateLimit({ key: "expired", limit: 1, windowMs: 1000 });
    await checkRateLimit({ key: "active", limit: 1, windowMs: 120_000 });
    await claimIdempotency("expired", 1);
    await claimIdempotency("active", 120);
    vi.setSystemTime(Date.now() + 1000);
    expect(pruneExpiredRateLimits()).toBe(2);
    expect(pruneExpiredRateLimits()).toBe(0);
    expect((await checkRateLimit({ key: "active", limit: 1, windowMs: 120_000 })).allowed).toBe(false);
    expect(await claimIdempotency("active", 120)).toBe(false);
  });

  it("cleans both maps automatically without further requests", async () => {
    await checkRateLimit({ key: "abandoned", limit: 1, windowMs: 1000 });
    await claimIdempotency("abandoned", 1);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(pruneExpiredRateLimits()).toBe(0);
  });

  it("starts cleanup for idempotency-only usage", async () => {
    expect(await claimIdempotency("only-claim", 1)).toBe(true);
    expect(await claimIdempotency("only-claim", 1)).toBe(false);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(pruneExpiredRateLimits()).toBe(0);
    expect(await claimIdempotency("only-claim", 1)).toBe(true);
  });
});
