import { beforeEach, describe, expect, it, vi } from "vitest";

/** CHECK en base : currentPeriodEnd >= currentPeriodStart. Refus métier (INVALID_DATE -> 400), pas 23514. */
const mocks = vi.hoisted(() => ({ query: vi.fn(), release: vi.fn(), audit: vi.fn() }));
vi.mock("@/lib/db/pool", () => ({ pool: { connect: async () => ({ query: mocks.query, release: mocks.release }), query: vi.fn() } }));
vi.mock("@/lib/db/platform-audit", () => ({ writePlatformAuditLog: mocks.audit }));
vi.mock("@/lib/subscriptions/plans", () => ({ getPlanByCode: vi.fn(), getPlanById: vi.fn(), listPlans: vi.fn() }));

import { setSubscriptionPeriodEnd } from "@/lib/db/admin-subscriptions";
import { assertPeriodEndNotBeforeStart, saveSubscriptionPeriodPayment } from "@/lib/db/subscription-period-payment";
import type { PlatformSessionUser } from "@/lib/auth/types";

const actor = { id: "admin", firstName: "T", lastName: "A" } as PlatformSessionUser;
const NOW = new Date("2026-11-14T10:00:00Z");
// Début de période dans le futur proche : une fin « raisonnable » (passé < 366 j) peut la précéder.
const sub = {
  organizationId: "org1", planId: "plan_a", priceSnapshot: "100", currencySnapshot: "MAD", status: "ACTIVE",
  currentPeriodStart: new Date("2026-11-10T00:00:00Z"), currentPeriodEnd: new Date("2026-12-10T00:00:00Z"),
  trialEndsAt: null, paid: false, paidAt: null,
};
const sqls = () => mocks.query.mock.calls.map(([sql]) => String(sql));

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  mocks.audit.mockResolvedValue(undefined);
  mocks.query.mockImplementation(async (sql: string) =>
    String(sql).includes("FOR UPDATE") ? { rows: [sub] } : { rows: [] });
});

describe("fin de période antérieure au début", () => {
  it("assertPeriodEndNotBeforeStart accepte l'égalité et refuse une fin antérieure", () => {
    const start = new Date("2026-11-10T00:00:00Z");
    expect(() => assertPeriodEndNotBeforeStart(start, new Date(start))).not.toThrow();
    expect(() => assertPeriodEndNotBeforeStart(start, new Date("2026-11-09T23:59:59Z"))).toThrow("INVALID_DATE");
  });

  it("setSubscriptionPeriodEnd refuse une fin avant le début, sans UPDATE ni audit, et annule", async () => {
    await expect(setSubscriptionPeriodEnd(actor, "sub1", new Date("2026-11-01T00:00:00Z"))).rejects.toThrow("INVALID_DATE");
    expect(sqls().some((s) => s.includes('UPDATE "Subscription"'))).toBe(false);
    expect(mocks.audit).not.toHaveBeenCalled();
    expect(sqls().at(-1)).toBe("ROLLBACK");
  });

  it("setSubscriptionPeriodEnd accepte une fin postérieure au début", async () => {
    await expect(setSubscriptionPeriodEnd(actor, "sub1", new Date("2026-12-31T00:00:00Z"))).resolves.toEqual({
      newEnd: "2026-12-31T00:00:00.000Z",
    });
    expect(sqls().at(-1)).toBe("COMMIT");
    expect(mocks.audit).toHaveBeenCalledOnce();
  });

  it("un enregistrement inchangé (même fin) ne déclenche pas la vérification", async () => {
    await expect(setSubscriptionPeriodEnd(actor, "sub1", sub.currentPeriodEnd)).resolves.toBeDefined();
  });

  it("saveSubscriptionPeriodPayment (saisie manuelle) refuse aussi une fin avant le début", async () => {
    mocks.query.mockImplementation(async (sql: string) =>
      String(sql).includes("FOR UPDATE") ? { rows: [sub] } : { rows: [] });
    await expect(
      saveSubscriptionPeriodPayment(actor, "sub1", { quick: "", paid: false, price: 100, periodEnd: "2026-11-05T00:00:00.000Z" }),
    ).rejects.toThrow("INVALID_DATE");
    expect(sqls().some((s) => s.includes('UPDATE "Subscription"'))).toBe(false);
    expect(mocks.audit).not.toHaveBeenCalled();
  });
});

describe("routes admin : INVALID_DATE répond 400", () => {
  it("set-period et save-period renvoient 400 (pas 500) quand le service refuse la date", async () => {
    vi.resetModules();
    vi.doUnmock("@/lib/db/pool");
    const failing = vi.fn(async () => {
      throw new Error("INVALID_DATE");
    });
    vi.doMock("@/lib/auth/api-guard", () => ({
      requirePlatformSession: async () => ({ ok: true, session: { id: "admin", firstName: "T", lastName: "A", role: "SUPER_ADMIN" } }),
    }));
    vi.doMock("@/lib/http/route-scope", () => ({ platformRoute: <T,>(h: T) => h }));
    vi.doMock("@/lib/db/subscription-period-payment", () => ({ saveSubscriptionPeriodPayment: failing }));
    vi.doMock("@/lib/db/admin-subscriptions", () => ({
      SUBSCRIPTION_STATUSES: ["ACTIVE"], setSubscriptionPeriodEnd: failing, changeSubscriptionPlan: vi.fn(),
      extendSubscriptionPeriod: vi.fn(), fetchAdminSubscription: vi.fn(), grantDemoTrial: vi.fn(),
      grantFreePeriod: vi.fn(), listSubscriptionHistory: vi.fn(), setSubscriptionPaid: vi.fn(),
      setSubscriptionPrice: vi.fn(), setSubscriptionStatus: vi.fn(),
    }));
    vi.doMock("@/lib/subscriptions/plans", () => ({ getPlanByCode: vi.fn(), getPlanById: vi.fn(), listPlans: vi.fn() }));
    const { NextRequest } = await import("next/server");
    const { POST } = await import("@/app/api/admin/subscriptions/[id]/route");
    const call = (body: unknown) =>
      POST(
        new NextRequest("http://localhost/api/admin/subscriptions/sub1", {
          method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
        }),
        { params: Promise.resolve({ id: "sub1" }) },
      );

    const setPeriod = await call({ action: "set-period", periodEnd: "2026-11-05T00:00:00.000Z" });
    expect(setPeriod.status).toBe(400);
    expect((await setPeriod.json()).error).toContain("antérieure au début");
    const save = await call({ action: "save-period", quick: "", paid: false, price: 100, periodEnd: "2026-11-05T00:00:00.000Z" });
    expect(save.status).toBe(400);
  });
});
