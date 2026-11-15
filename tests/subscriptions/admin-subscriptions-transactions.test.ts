import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn(), release: vi.fn(), audit: vi.fn(), plan: vi.fn(), planById: vi.fn() }));
vi.mock("@/lib/db/pool", () => ({ pool: { connect: async () => ({ query: mocks.query, release: mocks.release }), query: vi.fn() } }));
vi.mock("@/lib/db/platform-audit", () => ({ writePlatformAuditLog: mocks.audit }));
vi.mock("@/lib/subscriptions/plans", () => ({
  getPlanByCode: mocks.plan, getPlanById: mocks.planById, listPlans: vi.fn(),
}));

import {
  createAdminSubscription, extendSubscriptionPeriod, setSubscriptionPaid, setSubscriptionPeriodEnd,
  setSubscriptionPrice, setSubscriptionStatus,
} from "@/lib/db/admin-subscriptions";
import type { PlatformSessionUser } from "@/lib/auth/types";

const actor = { id: "admin", firstName: "Test", lastName: "Admin" } as PlatformSessionUser;
const sub = {
  organizationId: "org1", planId: "plan_a", priceSnapshot: "100", currencySnapshot: "MAD", status: "ACTIVE",
  currentPeriodStart: new Date("2026-11-01T12:00:00Z"), currentPeriodEnd: new Date("2026-12-01T12:00:00Z"),
  trialEndsAt: null, paid: false, paidAt: null,
};
const plan = { id: "plan_b", code: "PREMIUM", price: 299, currency: "MAD", active: true, trialDays: 14 };

function db(rows: Record<string, unknown[]> = {}) {
  mocks.query.mockImplementation(async (sql: string) => {
    if (sql.includes('FROM "Subscription" WHERE id = $1 FOR UPDATE')) return { rows: rows.sub ?? [sub] };
    if (sql.includes('FROM "Organization" WHERE id = $1 FOR UPDATE')) return { rows: rows.org ?? [{ id: "org1" }] };
    if (sql.includes('"organizationId" = $1 ORDER BY "createdAt" DESC LIMIT 1')) return { rows: rows.existing ?? [] };
    return { rows: [] };
  });
}
const sqls = () => mocks.query.mock.calls.map(([sql]) => String(sql));

describe("admin subscription writes are transactional", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    mocks.audit.mockResolvedValue(undefined);
    mocks.plan.mockResolvedValue(plan);
    mocks.planById.mockResolvedValue(plan);
    db();
  });

  it("locks the row, writes the audit with the same client and commits", async () => {
    await setSubscriptionStatus(actor, "sub1", "PAUSED", "SUBSCRIPTION_SUSPENDED", "impaye");
    expect(sqls()[0]).toBe("BEGIN");
    expect(sqls()[1]).toContain("FOR UPDATE");
    expect(sqls().at(-1)).toBe("COMMIT");
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ client: expect.anything(), action: "SUBSCRIPTION_SUSPENDED" }));
  });

  it("rolls back the status change when the audit insert fails", async () => {
    mocks.audit.mockRejectedValue(new Error("audit down"));
    await expect(setSubscriptionStatus(actor, "sub1", "CANCELLED", "SUBSCRIPTION_CANCELLED")).rejects.toThrow("audit down");
    expect(sqls().at(-1)).toBe("ROLLBACK");
    expect(sqls()).not.toContain("COMMIT");
    expect(mocks.release).toHaveBeenCalledOnce();
  });

  it("rejects an unknown status before touching the database", async () => {
    await expect(setSubscriptionStatus(actor, "sub1", "WHATEVER" as never, "X")).rejects.toThrow("INVALID_INPUT");
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("returns NOT_FOUND and rolls back for an unknown subscription", async () => {
    db({ sub: [] });
    await expect(setSubscriptionPrice(actor, "missing", 50)).rejects.toThrow("NOT_FOUND");
    expect(sqls().at(-1)).toBe("ROLLBACK");
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it("setSubscriptionPaid is idempotent: same value writes nothing", async () => {
    await setSubscriptionPaid(actor, "sub1", false);
    expect(sqls().some((sql) => sql.includes('UPDATE "Subscription"'))).toBe(false);
    expect(mocks.audit).not.toHaveBeenCalled();
    expect(sqls().at(-1)).toBe("COMMIT");
  });

  it("setSubscriptionPaid records amount, currency and period from the locked row", async () => {
    await setSubscriptionPaid(actor, "sub1", true);
    expect(mocks.audit).toHaveBeenCalledTimes(1);
    const event = mocks.audit.mock.calls[0][0];
    expect(event.action).toBe("SUBSCRIPTION_MARKED_PAID");
    expect(event.after).toEqual({
      paid: true, priceSnapshot: 100, currency: "MAD",
      periodStart: "2026-11-01T12:00:00.000Z", periodEnd: "2026-12-01T12:00:00.000Z",
    });
  });

  it("validates extension inputs", async () => {
    await expect(extendSubscriptionPeriod(actor, "sub1", 0)).rejects.toThrow("INVALID_INPUT");
    await expect(extendSubscriptionPeriod(actor, "sub1", Number.NaN)).rejects.toThrow("INVALID_INPUT");
  });

  it("setSubscriptionPeriodEnd reactivates a cancelled subscription and clears cancelledAt", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-14T12:00:00Z"));
    db({ sub: [{ ...sub, status: "CANCELLED" }] });
    await setSubscriptionPeriodEnd(actor, "sub1", new Date("2027-02-01T00:00:00Z"));
    const update = mocks.query.mock.calls.find(([sql]) => String(sql).includes('UPDATE "Subscription"'));
    expect(update?.[1][2]).toBe(true);
    expect(String(update?.[0])).toContain('"cancelledAt" = CASE WHEN $3::boolean THEN NULL');
    vi.useRealTimers();
  });

  it("setSubscriptionPeriodEnd rejects an absurd date", async () => {
    await expect(setSubscriptionPeriodEnd(actor, "sub1", new Date("2100-01-01T00:00:00Z"))).rejects.toThrow("INVALID_DATE");
    expect(sqls().at(-1)).toBe("ROLLBACK");
  });
});

describe("createAdminSubscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.audit.mockResolvedValue(undefined);
    mocks.plan.mockResolvedValue(plan);
    mocks.planById.mockResolvedValue(plan);
  });

  it("serialises on the institute row and creates one subscription when none exists", async () => {
    db();
    const id = await createAdminSubscription(actor, { organizationId: "org1", planCode: "PREMIUM" });
    expect(id).toMatch(/^sub_/);
    const order = sqls();
    expect(order.findIndex((sql) => sql.includes('FROM "Organization"') && sql.includes("FOR UPDATE")))
      .toBeLessThan(order.findIndex((sql) => sql.includes('INSERT INTO "Subscription"')));
    expect(order.filter((sql) => sql.includes('INSERT INTO "Subscription"'))).toHaveLength(1);
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "SUBSCRIPTION_CREATED", client: expect.anything() }));
    expect(order.at(-1)).toBe("COMMIT");
  });

  it("changes the plan of the existing subscription instead of creating a second one", async () => {
    db({ existing: [{ id: "sub_existing" }] });
    const id = await createAdminSubscription(actor, { organizationId: "org1", planCode: "PREMIUM" });
    expect(id).toBe("sub_existing");
    expect(sqls().some((sql) => sql.includes('INSERT INTO "Subscription"'))).toBe(false);
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "SUBSCRIPTION_CHANGED", entityId: "sub_existing" }));
  });

  it("fails with ORGANIZATION_NOT_FOUND and rolls back for an unknown institute", async () => {
    db({ org: [] });
    await expect(createAdminSubscription(actor, { organizationId: "nope", planCode: "PREMIUM" })).rejects.toThrow("ORGANIZATION_NOT_FOUND");
    expect(sqls().at(-1)).toBe("ROLLBACK");
  });

  it("rolls back the new subscription when the audit fails", async () => {
    db();
    mocks.audit.mockRejectedValue(new Error("audit down"));
    await expect(createAdminSubscription(actor, { organizationId: "org1", planCode: "PREMIUM" })).rejects.toThrow("audit down");
    expect(sqls().at(-1)).toBe("ROLLBACK");
  });
});
