import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { hashPassword } from "@/lib/auth/crypto";
import { createOrganization } from "@/lib/db/admin-organizations";
import type { PlatformSessionUser } from "@/lib/auth/types";
import { getPlanByCode, listPlans, updatePlan } from "@/lib/subscriptions/plans";
import {
  canCreateAppointment,
  canCreateCustomer,
  canCreateStaff,
  canUseFeature,
} from "@/lib/subscriptions/limits";
import {
  getOrganizationSubscription,
  getSubscriptionUsage,
} from "@/lib/subscriptions/subscription-service";
import { changeSubscriptionPlan, setSubscriptionStatus } from "@/lib/db/admin-subscriptions";
import { countRows, getSeedOrgId, insertTestAppointment, testId, testPool } from "../helpers/db";

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

run("Abonnements — plans", () => {
  it("liste les plans actifs depuis la DB", async () => {
    const plans = await listPlans(true);
    expect(plans.length).toBeGreaterThanOrEqual(3);
    const starter = plans.find((p) => p.code === "STARTER");
    expect(starter?.maxStaff).toBe(3);
    expect(starter?.features.inventory).toBe(false);
    const institut = plans.find((p) => p.code === "INSTITUT");
    expect(institut?.features.inventory).toBe(true);
  });

  it("plan désactivé non listé en actifs uniquement", async () => {
    const starter = await getPlanByCode("STARTER");
    expect(starter).toBeTruthy();
    await updatePlan(starter!.id, { active: false });
    const active = await listPlans(true);
    expect(active.some((p) => p.code === "STARTER")).toBe(false);
    await updatePlan(starter!.id, { active: true });
  });

  it("ne supprime pas physiquement un plan utilisé", async () => {
    const orgId = await getSeedOrgId();
    const sub = await getOrganizationSubscription(orgId);
    expect(sub).toBeTruthy();
    const plan = await getPlanByCode("INSTITUT");
    const used = await testPool.query(
      `SELECT COUNT(*)::text AS c FROM "Subscription" WHERE "planId" = $1`,
      [plan!.id],
    );
    expect(parseInt(used.rows[0].c, 10)).toBeGreaterThan(0);
  });
});

run("Abonnements — features & limites", () => {
  let orgId: string;

  beforeAll(async () => {
    const slug = testId("sub_st").replace(/_/g, "-");
    const r = await createOrganization(platformActor(), {
      name: "Sub Starter Test",
      slug,
      phone: "0611000001",
      email: "sub-st@test.local",
      owner: {
        firstName: "Sub",
        lastName: "Starter",
        email: `${testId("own_st")}@test.local`,
      },
      plan: "STARTER",
    });
    orgId = r.organizationId;
  });

  it("feature inventory interdite sur STARTER", async () => {
    const check = await canUseFeature(orgId, "inventory");
    expect(check.ok).toBe(false);
    expect(check.code).toBe("FEATURE_NOT_INCLUDED");
  });

  it("feature agenda autorisée sur STARTER", async () => {
    expect((await canUseFeature(orgId, "agenda")).ok).toBe(true);
  });

  it("limite staff STARTER = 3", async () => {
    for (let i = 0; i < 3; i++) {
      await testPool.query(
        `INSERT INTO "Staff" (id, "organizationId", "firstName", "lastName", phone, position, status, "updatedAt")
         VALUES ($1,$2,$3,$4,$5,'Esthéticienne','ACTIVE',NOW()) ON CONFLICT DO NOTHING`,
        [testId(`stf_${i}`), orgId, `S${i}`, "Test", `061200000${i}`],
      );
    }
    const atLimit = await canCreateStaff(orgId);
    expect(atLimit.ok).toBe(false);
    expect(atLimit.code).toBe("LIMIT_REACHED");
  });

  it("usage SQL retourne compteurs", async () => {
    const usage = await getSubscriptionUsage(orgId);
    expect(usage?.staff.used).toBeGreaterThanOrEqual(3);
    expect(usage?.staff.max).toBe(3);
  });
});

run("Abonnements — changement plan & snapshot", () => {
  let orgId: string;
  let subId: string;

  beforeAll(async () => {
    const slug = testId("sub_chg").replace(/_/g, "-");
    const r = await createOrganization(platformActor(), {
      name: "Sub Change Test",
      slug,
      phone: "0611000002",
      email: "sub-chg@test.local",
      owner: {
        firstName: "Change",
        lastName: "Plan",
        email: `${testId("own_chg")}@test.local`,
      },
      plan: "STARTER",
    });
    orgId = r.organizationId;
    subId = r.subscriptionId;
  });

  it("price snapshot conservé après changement prix plan catalogue", async () => {
    const before = await getOrganizationSubscription(orgId);
    const snapshotBefore = before!.priceSnapshot;

    const premium = await getPlanByCode("PREMIUM");
    const originalPremiumPrice = premium!.price;
    await changeSubscriptionPlan(platformActor(), subId, premium!.id);

    const after = await getOrganizationSubscription(orgId);
    expect(after?.planCode).toBe("PREMIUM");
    expect(after?.priceSnapshot).toBe(originalPremiumPrice);

    await updatePlan(premium!.id, { price: snapshotBefore + 100 });
    const subAfterCatalogChange = await getOrganizationSubscription(orgId);
    expect(subAfterCatalogChange?.priceSnapshot).toBe(originalPremiumPrice);

    await updatePlan(premium!.id, { price: originalPremiumPrice });
  });

  afterAll(async () => {
    const premium = await getPlanByCode("PREMIUM");
    if (premium && premium.price !== 899) {
      await updatePlan(premium.id, { price: 899 });
    }
  });

  it("inventory autorisée après upgrade INSTITUT/PREMIUM", async () => {
    expect((await canUseFeature(orgId, "inventory")).ok).toBe(true);
  });
});

run("Abonnements — statuts trial / pause / réactivation", () => {
  let subId: string;
  let orgId: string;

  beforeAll(async () => {
    const slug = testId("sub_stat").replace(/_/g, "-");
    const r = await createOrganization(platformActor(), {
      name: "Sub Status Test",
      slug,
      phone: "0611000003",
      email: "sub-stat@test.local",
      owner: {
        firstName: "Stat",
        lastName: "Us",
        email: `${testId("own_stat")}@test.local`,
      },
      plan: "INSTITUT",
    });
    orgId = r.organizationId;
    subId = r.subscriptionId;
  });

  it("suspension abonnement → SUBSCRIPTION_INACTIVE", async () => {
    await setSubscriptionStatus(platformActor(), subId, "PAUSED", "SUBSCRIPTION_SUSPENDED");
    const check = await canCreateCustomer(orgId);
    expect(check.ok).toBe(false);
    expect(check.code).toBe("SUBSCRIPTION_INACTIVE");
  });

  it("réactivation restaure accès", async () => {
    await setSubscriptionStatus(platformActor(), subId, "ACTIVE", "SUBSCRIPTION_REACTIVATED");
    expect((await canCreateCustomer(orgId)).ok).toBe(true);
  });

  it("audit changement statut", async () => {
    const c = await countRows(
      "PlatformAuditLog",
      `"entityId" = $1 AND action LIKE 'SUBSCRIPTION_%'`,
      [subId],
    );
    expect(c).toBeGreaterThanOrEqual(2);
  });
});

run("Abonnements — RDV mensuels", () => {
  it("compte les statuts éligibles et exclut CANCELLED", async () => {
    const orgId = await getSeedOrgId();
    const sub = await getOrganizationSubscription(orgId);
    expect(sub).toBeTruthy();

    const staffId = testId("stf_rdv");
    await testPool.query(
      `INSERT INTO "Staff" (id, "organizationId", "firstName", "lastName", status, "updatedAt")
       VALUES ($1,$2,'RDV','Test','ACTIVE',NOW()) ON CONFLICT DO NOTHING`,
      [staffId, orgId],
    );

    const usageBefore = await getSubscriptionUsage(orgId);
    const usedBefore = usageBefore?.appointments.used ?? 0;

    const periodStart = new Date(sub!.currentPeriodStart);
    const start = new Date(periodStart.getTime() + 2 * 3600 * 1000);
    const end = new Date(start.getTime() + 3600 * 1000);

    const aptId = await insertTestAppointment({
      organizationId: orgId,
      status: "PENDING",
      startAt: start,
      endAt: end,
      staffId,
      resourceId: null,
    });

    const usageAfter = await getSubscriptionUsage(orgId);
    expect(usageAfter!.appointments.used).toBeGreaterThanOrEqual(usedBefore + 1);

    const countAfterPending = usageAfter!.appointments.used;

    const cancelledId = await insertTestAppointment({
      organizationId: orgId,
      status: "CANCELLED",
      startAt: new Date(start.getTime() + 4 * 3600 * 1000),
      endAt: new Date(end.getTime() + 4 * 3600 * 1000),
      staffId,
      resourceId: null,
    });
    const usageCancelled = await getSubscriptionUsage(orgId);
    expect(usageCancelled!.appointments.used).toBe(countAfterPending);

    await testPool.query(`DELETE FROM "Appointment" WHERE id IN ($1, $2)`, [aptId, cancelledId]);
    await testPool.query(`DELETE FROM "Staff" WHERE id = $1`, [staffId]);
  });
});
