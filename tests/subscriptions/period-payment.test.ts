import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn(), release: vi.fn(), audit: vi.fn() }));
vi.mock("@/lib/db/pool", () => ({ pool: { connect: async () => ({ query: mocks.query, release: mocks.release }) } }));
vi.mock("@/lib/db/platform-audit", () => ({ writePlatformAuditLog: mocks.audit }));

import { assertReasonablePeriodEnd, saveSubscriptionPeriodPayment } from "@/lib/db/subscription-period-payment";
import type { PlatformSessionUser } from "@/lib/auth/types";

const actor = { id: "admin", firstName: "Test", lastName: "Admin" } as PlatformSessionUser;
const sub = {
  organizationId: "institute", currentPeriodStart: new Date("2026-11-01T12:00:00Z"),
  currentPeriodEnd: new Date("2026-12-01T12:00:00Z"), trialEndsAt: null,
  status: "ACTIVE", priceSnapshot: "100", currencySnapshot: "MAD", paid: true, paidAt: new Date("2026-11-01T12:00:00Z"),
};
const unpaid = { ...sub, paid: false, paidAt: null };

function useSubscription(row: Record<string, unknown> | undefined) {
  mocks.query.mockImplementation(async (sql: string) => ({ rows: sql.includes("FOR UPDATE") && row ? [row] : [] }));
}
const updateCall = () => mocks.query.mock.calls.find(([sql]) => String(sql).includes('UPDATE "Subscription"'));
const actions = () => mocks.audit.mock.calls.map(([entry]) => entry.action);
// UPDATE "Subscription" parameters: [id, end, periodStart, trialEndsAt, status, price, paid, clearCancelled]
const P = { status: 4, paid: 6, clearCancelled: 7 };

describe("period and payment save", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-14T12:00:00Z"));
    useSubscription(sub);
    mocks.audit.mockResolvedValue(undefined);
  });
  afterEach(() => vi.useRealTimers());

  it("extends a month from the current expiry and records the payment with amount and period", async () => {
    useSubscription(unpaid);
    const result = await saveSubscriptionPeriodPayment(actor, "sub", { quick: "m1", paid: true, price: 120, periodEnd: sub.currentPeriodEnd.toISOString() });
    expect(result).toEqual({ newEnd: "2027-01-01T12:00:00.000Z", paid: true });
    const paidEvent = mocks.audit.mock.calls.map(([e]) => e).find((e) => e.action === "SUBSCRIPTION_MARKED_PAID");
    expect(paidEvent.after).toEqual(expect.objectContaining({
      paid: true, priceSnapshot: 120, currency: "MAD",
      periodStart: "2026-12-01T12:00:00.000Z", periodEnd: "2027-01-01T12:00:00.000Z",
    }));
    expect(paidEvent.client).toBeDefined();
    expect(mocks.query).toHaveBeenLastCalledWith("COMMIT");
  });

  it("does not record a payment event when paid does not change, and keeps paidAt", async () => {
    await saveSubscriptionPeriodPayment(actor, "sub", { quick: "m1", paid: true, price: 100, periodEnd: sub.currentPeriodEnd.toISOString() });
    expect(actions()).toEqual(["SUBSCRIPTION_EXTENDED"]);
    expect(String(updateCall()?.[0])).toContain('WHEN paid THEN COALESCE("paidAt", NOW())');
  });

  it("a price change alone writes a price event and no fake payment", async () => {
    await saveSubscriptionPeriodPayment(actor, "sub", { quick: "", paid: true, price: 150, periodEnd: sub.currentPeriodEnd.toISOString() });
    expect(actions()).toEqual(["SUBSCRIPTION_PRICE_CHANGED"]);
  });

  it("starts an unpaid 15-day trial today, clearing the previous paid flag", async () => {
    const result = await saveSubscriptionPeriodPayment(actor, "sub", { quick: "t15", paid: false, price: 100, periodEnd: sub.currentPeriodEnd.toISOString() });
    expect(result).toEqual({ newEnd: "2026-11-29T12:00:00.000Z", paid: false });
    expect(updateCall()?.[1][P.status]).toBe("TRIAL");
    expect(updateCall()?.[1][P.paid]).toBe(false);
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "SUBSCRIPTION_MARKED_UNPAID" }));
  });

  it("a typed future end date brings an EXPIRED subscription back to ACTIVE and clears cancelledAt", async () => {
    useSubscription({ ...sub, status: "EXPIRED", currentPeriodEnd: new Date("2026-10-01T12:00:00Z") });
    await saveSubscriptionPeriodPayment(actor, "sub", { quick: "", paid: true, price: 100, periodEnd: "2026-12-31T12:00:00.000Z" });
    expect(updateCall()?.[1][P.status]).toBe("ACTIVE");
    expect(updateCall()?.[1][P.clearCancelled]).toBe(true);
    const period = mocks.audit.mock.calls.map(([e]) => e).find((e) => e.action === "SUBSCRIPTION_PERIOD_CHANGED");
    expect(period.before.status).toBe("EXPIRED");
    expect(period.after.status).toBe("ACTIVE");
  });

  it("a typed future end date reactivates a CANCELLED subscription", async () => {
    useSubscription({ ...sub, status: "CANCELLED" });
    await saveSubscriptionPeriodPayment(actor, "sub", { quick: "", paid: true, price: 100, periodEnd: "2027-03-01T12:00:00.000Z" });
    expect(updateCall()?.[1][P.status]).toBe("ACTIVE");
    expect(updateCall()?.[1][P.clearCancelled]).toBe(true);
  });

  it("a price-only save with the date untouched does not resurrect a cancelled subscription", async () => {
    useSubscription({ ...sub, status: "CANCELLED" });
    await saveSubscriptionPeriodPayment(actor, "sub", { quick: "", paid: true, price: 90, periodEnd: sub.currentPeriodEnd.toISOString() });
    expect(updateCall()?.[1][P.status]).toBe("CANCELLED");
    expect(updateCall()?.[1][P.clearCancelled]).toBe(false);
  });

  it("rejects an unreasonable manual date and rolls back", async () => {
    await expect(saveSubscriptionPeriodPayment(actor, "sub", { quick: "", paid: true, price: 100, periodEnd: "2090-01-01T00:00:00.000Z" })).rejects.toThrow("INVALID_DATE");
    await expect(saveSubscriptionPeriodPayment(actor, "sub", { quick: "", paid: true, price: 100, periodEnd: "2001-01-01T00:00:00.000Z" })).rejects.toThrow("INVALID_DATE");
    expect(updateCall()).toBeUndefined();
    expect(mocks.query).toHaveBeenLastCalledWith("ROLLBACK");
  });

  it("throws NOT_FOUND and rolls back for an unknown subscription", async () => {
    useSubscription(undefined);
    await expect(saveSubscriptionPeriodPayment(actor, "missing", { quick: "m1", paid: true, price: 100, periodEnd: "" })).rejects.toThrow("NOT_FOUND");
    expect(mocks.query).toHaveBeenLastCalledWith("ROLLBACK");
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it("rolls back the period if recording payment history fails", async () => {
    useSubscription(unpaid);
    mocks.audit.mockImplementation(async ({ action }: { action: string }) => {
      if (action === "SUBSCRIPTION_MARKED_PAID") throw new Error("history unavailable");
    });
    await expect(saveSubscriptionPeriodPayment(actor, "sub", { quick: "y1", paid: true, price: 100, periodEnd: sub.currentPeriodEnd.toISOString() })).rejects.toThrow("history unavailable");
    expect(mocks.query).toHaveBeenLastCalledWith("ROLLBACK");
    expect(mocks.query).not.toHaveBeenCalledWith("COMMIT");
    expect(mocks.release).toHaveBeenCalledOnce();
    expect(mocks.release).toHaveBeenCalledWith(undefined);
  });

  it("keeps the original error and destroys the connection when ROLLBACK itself fails", async () => {
    useSubscription(unpaid);
    const broken = new Error("connection terminated");
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql === "ROLLBACK") throw broken;
      return { rows: sql.includes("FOR UPDATE") ? [unpaid] : [] };
    });
    mocks.audit.mockRejectedValue(new Error("audit failed"));
    await expect(saveSubscriptionPeriodPayment(actor, "sub", { quick: "m1", paid: true, price: 100, periodEnd: "" })).rejects.toThrow("audit failed");
    expect(mocks.release).toHaveBeenCalledWith(broken);
  });
});

describe("assertReasonablePeriodEnd", () => {
  const now = new Date("2026-11-14T12:00:00Z");
  it("accepts dates within a year in the past and ten years ahead", () => {
    expect(() => assertReasonablePeriodEnd(new Date("2026-01-01T00:00:00Z"), now)).not.toThrow();
    expect(() => assertReasonablePeriodEnd(new Date("2036-01-01T00:00:00Z"), now)).not.toThrow();
  });
  it("rejects invalid, far past and far future dates", () => {
    expect(() => assertReasonablePeriodEnd(new Date("nope"), now)).toThrow("INVALID_DATE");
    expect(() => assertReasonablePeriodEnd(new Date("2024-01-01T00:00:00Z"), now)).toThrow("INVALID_DATE");
    expect(() => assertReasonablePeriodEnd(new Date("2037-01-01T00:00:00Z"), now)).toThrow("INVALID_DATE");
  });
});
