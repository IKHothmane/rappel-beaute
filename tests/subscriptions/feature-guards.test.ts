import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { NextResponse } from "next/server";
import { createOrganization } from "@/lib/db/admin-organizations";
import type { PlatformSessionUser } from "@/lib/auth/types";
import {
  requireFeatureRead,
  requireFeatureWrite,
} from "@/lib/auth/api-guard";
import { setSubscriptionStatus } from "@/lib/db/admin-subscriptions";
import { canUseFeature } from "@/lib/subscriptions/limits";
import { GET as productsGet } from "@/app/api/products/route";
import { GET as cashRegisterGet } from "@/app/api/cash-register/route";
import { GET as marketingGet } from "@/app/api/campaigns/route";
import { GET as analyticsOverviewGet } from "@/app/api/analytics/overview/route";
import { enforcePublicBookingLimits } from "@/lib/subscriptions/guards";
import { mockAppRequest, mockOwnerSession } from "../helpers/session";
import { testId } from "../helpers/db";

const run = process.env.DATABASE_URL ? describe : describe.skip;

function platformActor(): PlatformSessionUser {
  return {
    id: "pu_super_admin",
    email: "admin@rappelbeaute.ma",
    firstName: "Osman",
    lastName: "Benali",
    role: "SUPER_ADMIN",
    scope: "platform",
    accountType: "PLATFORM",
  };
}

async function createTestOrg(plan: "STARTER" | "INSTITUT" | "PREMIUM") {
  const slug = testId(`fg_${plan}`).replace(/_/g, "-");
  return createOrganization(platformActor(), {
    name: `Feature Guard ${plan}`,
    slug,
    phone: "0611000099",
    email: `${slug}@test.local`,
    owner: {
      firstName: "FG",
      lastName: plan,
      email: `${testId(`own_${plan}`)}@test.local`,
    },
    plan,
  });
}

function jsonBody(res: NextResponse) {
  return res.json() as Promise<{ code?: string; error?: string }>;
}

run("40A.1 — Feature guards STARTER", () => {
  let orgId: string;

  beforeAll(async () => {
    const r = await createTestOrg("STARTER");
    orgId = r.organizationId;
  });

  it("STARTER → stock (inventory) interdit", async () => {
    expect((await canUseFeature(orgId, "inventory")).ok).toBe(false);
    const auth = await requireFeatureRead(
      mockAppRequest(mockOwnerSession(orgId), "http://localhost/api/products"),
      "stock",
    );
    expect(auth.ok).toBe(false);
    if (!auth.ok) {
      const body = await jsonBody(auth.response);
      expect(body.code).toBe("FEATURE_NOT_INCLUDED");
    }
  });

  it("STARTER → caisse interdite", async () => {
    expect((await canUseFeature(orgId, "cashRegister")).ok).toBe(false);
    const auth = await requireFeatureRead(
      mockAppRequest(mockOwnerSession(orgId), "http://localhost/api/cash-register"),
      "cash-register",
    );
    expect(auth.ok).toBe(false);
    if (!auth.ok) {
      const body = await jsonBody(auth.response);
      expect(body.code).toBe("FEATURE_NOT_INCLUDED");
    }
  });

  it("STARTER → marketing interdit", async () => {
    expect((await canUseFeature(orgId, "marketing")).ok).toBe(false);
    const auth = await requireFeatureRead(
      mockAppRequest(mockOwnerSession(orgId), "http://localhost/api/campaigns"),
      "marketing",
    );
    expect(auth.ok).toBe(false);
    if (!auth.ok) {
      const body = await jsonBody(auth.response);
      expect(body.code).toBe("FEATURE_NOT_INCLUDED");
    }
  });

  it("STARTER → analytics interdit", async () => {
    expect((await canUseFeature(orgId, "analytics")).ok).toBe(false);
    const auth = await requireFeatureRead(
      mockAppRequest(mockOwnerSession(orgId), "http://localhost/api/analytics/overview"),
      "analytics",
    );
    expect(auth.ok).toBe(false);
    if (!auth.ok) {
      const body = await jsonBody(auth.response);
      expect(body.code).toBe("FEATURE_NOT_INCLUDED");
    }
  });

  it("STARTER → agenda autorisé (OWNER)", async () => {
    const auth = await requireFeatureRead(
      mockAppRequest(mockOwnerSession(orgId), "http://localhost/api/appointments"),
      "agenda",
    );
    expect(auth.ok).toBe(true);
  });

  it("API GET /api/products bloquée pour STARTER", async () => {
    const req = mockAppRequest(mockOwnerSession(orgId), "http://localhost/api/products");
    const res = await productsGet(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("FEATURE_NOT_INCLUDED");
  });
});

run("40A.1 — Feature guards INSTITUT", () => {
  let orgId: string;

  beforeAll(async () => {
    const r = await createTestOrg("INSTITUT");
    orgId = r.organizationId;
  });

  it("INSTITUT → stock autorisé (OWNER)", async () => {
    expect((await canUseFeature(orgId, "inventory")).ok).toBe(true);
    const auth = await requireFeatureRead(
      mockAppRequest(mockOwnerSession(orgId), "http://localhost/api/products"),
      "stock",
    );
    expect(auth.ok).toBe(true);
  });

  it("INSTITUT → caisse autorisée (OWNER)", async () => {
    expect((await canUseFeature(orgId, "cashRegister")).ok).toBe(true);
    const auth = await requireFeatureRead(
      mockAppRequest(mockOwnerSession(orgId), "http://localhost/api/cash-register"),
      "cash-register",
    );
    expect(auth.ok).toBe(true);
  });

  it("INSTITUT → marketing autorisé (OWNER)", async () => {
    const auth = await requireFeatureRead(
      mockAppRequest(mockOwnerSession(orgId), "http://localhost/api/campaigns"),
      "marketing",
    );
    expect(auth.ok).toBe(true);
  });

  it("OWNER + INSTITUT → API products OK", async () => {
    const req = mockAppRequest(mockOwnerSession(orgId), "http://localhost/api/products");
    const res = await productsGet(req);
    expect(res.status).not.toBe(403);
  });

  it("STAFF + INSTITUT → stock refusé (RBAC, pas plan)", async () => {
    const auth = await requireFeatureRead(
      mockAppRequest(mockOwnerSession(orgId, "STAFF"), "http://localhost/api/products"),
      "stock",
    );
    expect(auth.ok).toBe(false);
    if (!auth.ok) {
      const body = await jsonBody(auth.response);
      expect(body.error).toBe("Accès refusé.");
      expect(body.code).toBeUndefined();
    }
  });

  it("CASHIER + INSTITUT → caisse autorisée", async () => {
    const auth = await requireFeatureWrite(
      mockAppRequest(mockOwnerSession(orgId, "CASHIER"), "http://localhost/api/cash-register/open"),
      "cash-register",
    );
    expect(auth.ok).toBe(true);
  });

  it("CASHIER + INSTITUT → marketing refusé (RBAC)", async () => {
    const auth = await requireFeatureRead(
      mockAppRequest(mockOwnerSession(orgId, "CASHIER"), "http://localhost/api/campaigns"),
      "marketing",
    );
    expect(auth.ok).toBe(false);
    if (!auth.ok) {
      const body = await jsonBody(auth.response);
      expect(body.error).toBe("Accès refusé.");
    }
  });
});

run("40A.1 — Feature guards PREMIUM", () => {
  let orgId: string;

  beforeAll(async () => {
    const r = await createTestOrg("PREMIUM");
    orgId = r.organizationId;
  });

  it("PREMIUM → inventory + analytics autorisés", async () => {
    expect((await canUseFeature(orgId, "inventory")).ok).toBe(true);
    expect((await canUseFeature(orgId, "analytics")).ok).toBe(true);
  });

  it("PREMIUM → API analytics overview accessible", async () => {
    const req = mockAppRequest(
      mockOwnerSession(orgId),
      "http://localhost/api/analytics/overview?period=30d",
    );
    const res = await analyticsOverviewGet(req);
    expect(res.status).not.toBe(403);
  });
});

run("40A.1 — Abonnement suspendu / expiré", () => {
  let orgId: string;
  let subId: string;

  beforeAll(async () => {
    const r = await createTestOrg("INSTITUT");
    orgId = r.organizationId;
    subId = r.subscriptionId;
  });

  afterAll(async () => {
    await setSubscriptionStatus(platformActor(), subId, "ACTIVE", "SUBSCRIPTION_REACTIVATED");
  });

  it("subscription PAUSED → FEATURE guard bloque même INSTITUT", async () => {
    await setSubscriptionStatus(platformActor(), subId, "PAUSED", "SUBSCRIPTION_SUSPENDED");
    const auth = await requireFeatureRead(
      mockAppRequest(mockOwnerSession(orgId), "http://localhost/api/products"),
      "stock",
    );
    expect(auth.ok).toBe(false);
    if (!auth.ok) {
      const body = await jsonBody(auth.response);
      expect(body.code).toBe("SUBSCRIPTION_INACTIVE");
    }
  });

  it("réactivation restaure accès INSTITUT", async () => {
    await setSubscriptionStatus(platformActor(), subId, "ACTIVE", "SUBSCRIPTION_REACTIVATED");
    const auth = await requireFeatureRead(
      mockAppRequest(mockOwnerSession(orgId), "http://localhost/api/products"),
      "stock",
    );
    expect(auth.ok).toBe(true);
  });
});

run("40A.1 — Isolation multi-tenant", () => {
  let starterOrg: string;
  let institutOrg: string;

  beforeAll(async () => {
    starterOrg = (await createTestOrg("STARTER")).organizationId;
    institutOrg = (await createTestOrg("INSTITUT")).organizationId;
  });

  it("STARTER org ne voit pas les features INSTITUT d'une autre org", async () => {
    expect((await canUseFeature(starterOrg, "inventory")).ok).toBe(false);
    expect((await canUseFeature(institutOrg, "inventory")).ok).toBe(true);
  });

  it("session STARTER ne peut pas accéder stock même si autre org INSTITUT existe", async () => {
    const req = mockAppRequest(mockOwnerSession(starterOrg), "http://localhost/api/stock");
    const res = await productsGet(req);
    expect(res.status).toBe(403);
  });
});

run("40A.1 — Public booking + limites", () => {
  let starterOrg: string;

  beforeAll(async () => {
    starterOrg = (await createTestOrg("STARTER")).organizationId;
  });

  it("public booking → feature booking autorisée sur STARTER", async () => {
    const check = await enforcePublicBookingLimits(starterOrg);
    expect(check.ok).toBe(true);
  });

  it("public booking → suspendu bloque réservation", async () => {
    const r = await createTestOrg("STARTER");
    await setSubscriptionStatus(platformActor(), r.subscriptionId, "PAUSED", "SUBSCRIPTION_SUSPENDED");
    const check = await enforcePublicBookingLimits(r.organizationId);
    expect(check.ok).toBe(false);
    expect(check.code).toBe("SUBSCRIPTION_INACTIVE");
    await setSubscriptionStatus(platformActor(), r.subscriptionId, "ACTIVE", "SUBSCRIPTION_REACTIVATED");
  });
});

run("40A.1 — Routes API directes", () => {
  let starterOrg: string;
  let institutOrg: string;

  beforeAll(async () => {
    starterOrg = (await createTestOrg("STARTER")).organizationId;
    institutOrg = (await createTestOrg("INSTITUT")).organizationId;
  });

  it("GET /api/cash-register → 403 STARTER", async () => {
    const res = await cashRegisterGet(
      mockAppRequest(mockOwnerSession(starterOrg), "http://localhost/api/cash-register"),
    );
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("FEATURE_NOT_INCLUDED");
  });

  it("GET /api/campaigns → 403 STARTER", async () => {
    const res = await marketingGet(
      mockAppRequest(mockOwnerSession(starterOrg), "http://localhost/api/campaigns"),
    );
    expect(res.status).toBe(403);
  });

  it("GET /api/campaigns → OK INSTITUT OWNER", async () => {
    const res = await marketingGet(
      mockAppRequest(mockOwnerSession(institutOrg), "http://localhost/api/campaigns"),
    );
    expect(res.status).not.toBe(403);
  });
});
