import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  savePeriod: vi.fn(), setPrice: vi.fn(), setStatus: vi.fn(), extend: vi.fn(),
  getOrg: vi.fn(), updateOrg: vi.fn(), insights: vi.fn(), history: vi.fn(), createSub: vi.fn(),
}));

vi.mock("@/lib/auth/api-guard", () => ({
  requirePlatformSession: async () => ({ ok: true, session: { id: "admin", firstName: "T", lastName: "A", role: "SUPER_ADMIN" } }),
}));
vi.mock("@/lib/http/route-scope", () => ({ platformRoute: <T,>(handler: T) => handler }));
vi.mock("@/lib/db/subscription-period-payment", () => ({ saveSubscriptionPeriodPayment: mocks.savePeriod }));
vi.mock("@/lib/db/admin-subscriptions", () => ({
  SUBSCRIPTION_STATUSES: ["TRIAL", "ACTIVE", "PAST_DUE", "PAUSED", "CANCELLED", "EXPIRED"],
  changeSubscriptionPlan: vi.fn(), extendSubscriptionPeriod: mocks.extend, fetchAdminSubscription: vi.fn(),
  grantDemoTrial: vi.fn(), grantFreePeriod: vi.fn(), listSubscriptionHistory: vi.fn(),
  setSubscriptionPaid: vi.fn(), setSubscriptionPeriodEnd: vi.fn(), setSubscriptionPrice: mocks.setPrice,
  setSubscriptionStatus: mocks.setStatus, createAdminSubscription: mocks.createSub,
  getAdminSubscriptionsKpis: vi.fn(), listAdminSubscriptions: vi.fn(), listPlans: vi.fn(),
}));
vi.mock("@/lib/db/admin-users", () => ({ listOrganizationsForFilter: vi.fn() }));
vi.mock("@/lib/subscriptions/plans", () => ({ getPlanByCode: vi.fn(), getPlanById: vi.fn(), listPlans: vi.fn(), getShowcaseMonthlyPrice: vi.fn() }));
vi.mock("@/lib/db/admin-organizations", () => ({ getOrganizationById: mocks.getOrg, updateOrganization: mocks.updateOrg }));
vi.mock("@/lib/db/admin-org-cards", () => ({ getOrganizationInsights: mocks.insights }));
vi.mock("@/lib/db/organization-payment-history", () => ({ listOrganizationPaymentHistory: mocks.history }));

import { POST as subscriptionPost, PATCH as subscriptionPatch } from "@/app/api/admin/subscriptions/[id]/route";
import { POST as createSubscriptionPost } from "@/app/api/admin/subscriptions/route";
import { GET as orgGet, PATCH as orgPatch } from "@/app/api/admin/organizations/[id]/route";

const ctx = { params: Promise.resolve({ id: "sub1" }) };
function req(body: unknown, method = "POST") {
  return new NextRequest("http://localhost/api/admin/x", {
    method, headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
const savePeriod = (over: Record<string, unknown> = {}) =>
  subscriptionPost(req({ action: "save-period", paid: true, price: 100, quick: "", periodEnd: "2026-12-31T00:00:00.000Z", ...over }), ctx);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.savePeriod.mockResolvedValue({ newEnd: "2026-12-31T00:00:00.000Z", paid: true });
});

describe("POST /api/admin/subscriptions/[id]", () => {
  it("rejects invalid JSON with 400", async () => {
    expect((await subscriptionPost(req("{not json"), ctx)).status).toBe(400);
  });

  it("save-period validates paid, price, quick and the typed date", async () => {
    expect((await savePeriod({ paid: "yes" })).status).toBe(400);
    expect((await savePeriod({ price: -1 })).status).toBe(400);
    expect((await savePeriod({ quick: "x" })).status).toBe(400);
    expect((await savePeriod({ periodEnd: "12" })).status).toBe(400);
    expect((await savePeriod({ periodEnd: 5 })).status).toBe(400);
    expect(mocks.savePeriod).not.toHaveBeenCalled();
  });

  it("save-period does not need a date for a quick option", async () => {
    const res = await savePeriod({ quick: "m1", periodEnd: undefined });
    expect(res.status).toBe(200);
    expect(mocks.savePeriod).toHaveBeenCalledWith(expect.anything(), "sub1", expect.objectContaining({ quick: "m1", periodEnd: "" }));
  });

  it("save-period maps NOT_FOUND to 404 and out-of-range dates to 400", async () => {
    mocks.savePeriod.mockRejectedValueOnce(new Error("NOT_FOUND"));
    expect((await savePeriod()).status).toBe(404);
    mocks.savePeriod.mockRejectedValueOnce(new Error("INVALID_DATE"));
    expect((await savePeriod()).status).toBe(400);
  });

  it("set-price maps NOT_FOUND to 404 and unexpected errors to a generic 500", async () => {
    mocks.setPrice.mockRejectedValueOnce(new Error("NOT_FOUND"));
    expect((await subscriptionPost(req({ action: "set-price", price: 10 }), ctx)).status).toBe(404);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.setPrice.mockRejectedValueOnce(new Error("connection refused 10.0.0.1"));
    const res = await subscriptionPost(req({ action: "set-price", price: 10 }), ctx);
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("10.0.0.1");
  });

  it("extend maps INVALID_INPUT to 400", async () => {
    mocks.extend.mockRejectedValueOnce(new Error("INVALID_INPUT"));
    expect((await subscriptionPost(req({ action: "extend", months: "abc" }), ctx)).status).toBe(400);
  });
});

describe("PATCH /api/admin/subscriptions/[id]", () => {
  it("validates status and body", async () => {
    expect((await subscriptionPatch(req("nope", "PATCH"), ctx)).status).toBe(400);
    expect((await subscriptionPatch(req({ status: "DELETED" }, "PATCH"), ctx)).status).toBe(400);
    expect((await subscriptionPatch(req({ status: "ACTIVE", reason: 5 }, "PATCH"), ctx)).status).toBe(400);
    expect(mocks.setStatus).not.toHaveBeenCalled();
    mocks.setStatus.mockRejectedValueOnce(new Error("NOT_FOUND"));
    expect((await subscriptionPatch(req({ status: "ACTIVE" }, "PATCH"), ctx)).status).toBe(404);
  });
});

describe("POST /api/admin/subscriptions", () => {
  it("validates the body and maps a missing institute to 404", async () => {
    expect((await createSubscriptionPost(req("x"), undefined as never)).status).toBe(400);
    expect((await createSubscriptionPost(req({ organizationId: 5, planCode: "PREMIUM" }), undefined as never)).status).toBe(400);
    mocks.createSub.mockRejectedValueOnce(new Error("ORGANIZATION_NOT_FOUND"));
    expect((await createSubscriptionPost(req({ organizationId: "o", planCode: "PREMIUM" }), undefined as never)).status).toBe(404);
  });
});

describe("/api/admin/organizations/[id]", () => {
  const orgCtx = { params: Promise.resolve({ id: "org1" }) };
  const patch = (body: unknown) => orgPatch(req(body, "PATCH"), orgCtx);

  it("PATCH rejects invalid JSON, blank name, bad email and non-string values", async () => {
    expect((await patch("{oops")).status).toBe(400);
    expect((await patch({ name: "   " })).status).toBe(400);
    expect((await patch({ email: "not-an-email" })).status).toBe(400);
    expect((await patch({ name: { a: 1 } })).status).toBe(400);
    expect((await patch({ city: 12 })).status).toBe(400);
    expect((await patch({ name: "x".repeat(500) })).status).toBe(400);
    expect((await patch({})).status).toBe(400);
    expect(mocks.updateOrg).not.toHaveBeenCalled();
  });

  it("PATCH drops blank optional fields instead of overwriting with an empty string", async () => {
    mocks.getOrg.mockResolvedValue({ id: "org1" });
    const res = await patch({ name: " Institut ", email: " A@B.CO ", phone: "", address: "  " });
    expect(res.status).toBe(200);
    expect(mocks.updateOrg).toHaveBeenCalledWith(expect.anything(), "org1", { name: "Institut", email: "A@B.CO" });
  });

  it("PATCH maps NOT_FOUND to 404", async () => {
    mocks.updateOrg.mockRejectedValueOnce(new Error("NOT_FOUND"));
    expect((await patch({ name: "N" })).status).toBe(404);
  });

  it("GET does not query insights for an unknown institute", async () => {
    mocks.getOrg.mockResolvedValue(null);
    const res = await orgGet(new NextRequest("http://localhost/api/admin/x"), orgCtx);
    expect(res.status).toBe(404);
    expect(mocks.insights).not.toHaveBeenCalled();
    expect(mocks.history).not.toHaveBeenCalled();
  });

  it("GET still returns the detail when the payment history fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.getOrg.mockResolvedValue({ id: "org1", name: "I" });
    mocks.insights.mockResolvedValue({ k: 1 });
    mocks.history.mockRejectedValue(new Error("audit table unavailable"));
    const res = await orgGet(new NextRequest("http://localhost/api/admin/x"), orgCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.organization.id).toBe("org1");
    expect(body.insights).toEqual({ k: 1 });
    expect(body.paymentHistory).toEqual([]);
    expect(body.paymentHistoryAvailable).toBe(false);
  });
});
