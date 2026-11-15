import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/pool", () => ({ pool: { query: vi.fn() } }));

const loadSub = vi.fn();
const loadUsage = vi.fn();

vi.mock("@/lib/subscriptions/subscription-service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/subscriptions/subscription-service")>(
    "@/lib/subscriptions/subscription-service",
  );
  return {
    ...actual,
    getOrganizationSubscription: (...args: unknown[]) => loadSub(...args),
    getSubscriptionUsage: (...args: unknown[]) => loadUsage(...args),
  };
});

import { canCreateStaff, canUseFeature } from "@/lib/subscriptions/limits";
import { parsePlanFeatures } from "@/lib/subscriptions/features";

const PLAN_FEATURES_ALL = parsePlanFeatures({ staff: true, customers: true, agenda: true });

function sub(overrides: Record<string, unknown> = {}) {
  return {
    id: "s1",
    organizationId: "org1",
    planId: "p1",
    planCode: "PRO",
    planName: "Pro",
    status: "ACTIVE",
    priceSnapshot: 0,
    currencySnapshot: "MAD",
    startedAt: new Date().toISOString(),
    currentPeriodStart: new Date().toISOString(),
    currentPeriodEnd: new Date().toISOString(),
    cancelledAt: null,
    trialEndsAt: null,
    features: PLAN_FEATURES_ALL,
    limits: { maxStaff: 2, maxCustomers: null, maxAppointmentsPerMonth: null, maxResources: null },
    ...overrides,
  };
}

const usage = (staffUsed: number) => ({
  staff: { used: staffUsed, max: 2 },
  customers: { used: 0, max: null },
  appointments: { used: 0, max: null, periodStart: "", periodEnd: "" },
  resources: { used: 0, max: null },
});

describe("limits : un seul chargement de l'abonnement", () => {
  beforeEach(() => {
    loadSub.mockReset();
    loadUsage.mockReset();
  });

  it("canUseFeature charge l'abonnement une fois", async () => {
    loadSub.mockResolvedValue(sub());
    expect((await canUseFeature("org1", "staff")).ok).toBe(true);
    expect(loadSub).toHaveBeenCalledTimes(1);
  });

  it("canUseFeature réutilise l'abonnement fourni sans le recharger", async () => {
    const res = await canUseFeature("org1", "staff", sub() as never);
    expect(res.ok).toBe(true);
    expect(loadSub).not.toHaveBeenCalled();
  });

  it("canUseFeature signale l'absence d'abonnement (fourni = null ou chargé)", async () => {
    loadSub.mockResolvedValue(null);
    const loaded = await canUseFeature("org1", "staff");
    const provided = await canUseFeature("org1", "staff", null);
    for (const res of [loaded, provided]) {
      expect(res).toMatchObject({ ok: false, code: "SUBSCRIPTION_INACTIVE", message: "Aucun abonnement actif." });
    }
    expect(loadSub).toHaveBeenCalledTimes(1);
  });

  it("canUseFeature refuse un abonnement inactif avec le plan", async () => {
    const res = await canUseFeature("org1", "staff", sub({ status: "CANCELLED" }) as never);
    expect(res).toMatchObject({ ok: false, code: "SUBSCRIPTION_INACTIVE", planCode: "PRO" });
  });

  it("canCreateStaff : un chargement d'abonnement, l'objet est transmis à l'usage", async () => {
    const loaded = sub();
    loadSub.mockResolvedValue(loaded);
    loadUsage.mockResolvedValue(usage(1));
    expect((await canCreateStaff("org1")).ok).toBe(true);
    expect(loadSub).toHaveBeenCalledTimes(1);
    expect(loadUsage).toHaveBeenCalledWith("org1", loaded);
  });

  it("canCreateStaff : limite atteinte inchangée", async () => {
    loadSub.mockResolvedValue(sub());
    loadUsage.mockResolvedValue(usage(2));
    const res = await canCreateStaff("org1");
    expect(res).toMatchObject({ ok: false, code: "LIMIT_REACHED", limit: "staff", used: 2, max: 2 });
    expect(loadSub).toHaveBeenCalledTimes(1);
  });

  it("canCreateStaff : sans abonnement, pas d'appel à l'usage", async () => {
    loadSub.mockResolvedValue(null);
    expect(await canCreateStaff("org1")).toMatchObject({ ok: false, code: "SUBSCRIPTION_INACTIVE" });
    expect(loadUsage).not.toHaveBeenCalled();
  });
});
