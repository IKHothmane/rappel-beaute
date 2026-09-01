import { describe, expect, it, beforeAll } from "vitest";
import { authenticateUser } from "@/lib/db/users";
import { authenticatePlatformUser } from "@/lib/db/platform-users";
import {
  archiveOrganization,
  createOrganization,
  getOrganizationById,
  listOrganizationUsers,
  reactivateOrganization,
  setOrganizationUserStatus,
  startSupportSession,
  suspendOrganization,
  updateSubscription,
} from "@/lib/db/admin-organizations";
import { getPlanByCode } from "@/lib/subscriptions/plans";
import { countRows, getSeedOrgId, testId, testPool } from "../helpers/db";

// authenticateUser is in users.ts - platform in platform-users
import { hashPassword } from "@/lib/auth/crypto";
import type { PlatformSessionUser } from "@/lib/auth/types";

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

run("Super Admin — séparation Platform / Organization", () => {
  beforeAll(async () => {
    await testPool.query(
      `INSERT INTO "PlatformUser" (id, email, "firstName", "lastName", role, status, "passwordHash", "updatedAt")
       VALUES ('pu_super_admin', 'admin@rappelbeaute.ma', 'Osman', 'Benali', 'SUPER_ADMIN', 'ACTIVE', $1, NOW())
       ON CONFLICT (email) DO UPDATE SET "passwordHash" = EXCLUDED."passwordHash", status = 'ACTIVE'`,
      [hashPassword("demo1234")],
    );
  });

  it("PlatformUser authentifié séparément", async () => {
    const session = await authenticatePlatformUser("admin@rappelbeaute.ma", "demo1234");
    expect(session?.accountType).toBe("PLATFORM");
    expect(session?.scope).toBe("platform");
  });

  it("OWNER institut → login app OK, login platform refusé", async () => {
    const app = await authenticateUser("nadia@institutroyal.ma", "demo1234");
    expect(app?.accountType).toBe("ORGANIZATION");
    const platform = await authenticatePlatformUser("nadia@institutroyal.ma", "demo1234");
    expect(platform).toBeNull();
  });

  it("STAFF → login platform refusé", async () => {
    expect(await authenticatePlatformUser("sara@institutroyal.ma", "demo1234")).toBeNull();
  });
});

run("Super Admin — création institut atomique", () => {
  let orgId: string;

  it("crée Organization + OWNER + Subscription + settings", async () => {
    const slug = testId("org").replace(/_/g, "-");
    const email = `${testId("owner")}@test.local`;
    const result = await createOrganization(platformActor(), {
      name: "Institut Test Super Admin",
      slug,
      phone: "0612345678",
      email: "contact@test.local",
      city: "Rabat",
      owner: {
        firstName: "Test",
        lastName: "Owner",
        email,
        phone: "0612345678",
      },
      plan: "INSTITUT",
    });

    orgId = result.organizationId;
    expect(result.activationToken.length).toBeGreaterThan(20);

    const org = await getOrganizationById(orgId);
    expect(org?.status).toBe("ACTIVE");
    expect(org?.subscription?.plan).toBe("INSTITUT");
    expect(org?.subscription?.price).toBe(499);

    const users = await listOrganizationUsers(orgId);
    expect(users.some((u) => u.role === "OWNER" && u.email === email)).toBe(true);

    const settings = await testPool.query(
      `SELECT
        (SELECT COUNT(*) FROM "ReactivationSettings" WHERE "organizationId" = $1) AS r,
        (SELECT COUNT(*) FROM "ReviewSettings" WHERE "organizationId" = $1) AS v,
        (SELECT COUNT(*) FROM "LoyaltyProgram" WHERE "organizationId" = $1) AS l`,
      [orgId],
    );
    expect(parseInt(settings.rows[0].r, 10)).toBe(1);
    expect(parseInt(settings.rows[0].v, 10)).toBe(1);
    expect(parseInt(settings.rows[0].l, 10)).toBe(1);
  });

  it("audit ORGANIZATION_CREATED + OWNER_CREATED", async () => {
    const count = await countRows(
      "PlatformAuditLog",
      `"organizationId" = $1 AND action IN ('ORGANIZATION_CREATED', 'OWNER_CREATED')`,
      [orgId],
    );
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it("rollback si OWNER email dupliqué — pas d'org orpheline", async () => {
    const slug = testId("dup").replace(/_/g, "-");
    await expect(
      createOrganization(platformActor(), {
        name: "Dup Org",
        slug,
        phone: "0611111111",
        email: "dup@test.local",
        owner: {
          firstName: "Nadia",
          lastName: "Bennani",
          email: "nadia@institutroyal.ma",
        },
        plan: "STARTER",
      }),
    ).rejects.toThrow("OWNER_EMAIL_TAKEN");

    const orphan = await testPool.query(
      `SELECT id FROM "Organization" WHERE slug = $1`,
      [slug],
    );
    expect(orphan.rows.length).toBe(0);
  });
});

run("Super Admin — cycle de vie institut", () => {
  let orgId: string;

  beforeAll(async () => {
    const slug = testId("life").replace(/_/g, "-");
    const r = await createOrganization(platformActor(), {
      name: "Life Cycle Org",
      slug,
      phone: "0622222222",
      email: "life@test.local",
      owner: {
        firstName: "Life",
        lastName: "Cycle",
        email: `${testId("life_owner")}@test.local`,
      },
      plan: "STARTER",
    });
    orgId = r.organizationId;
  });

  it("suspension bloque login app du OWNER", async () => {
    await suspendOrganization(platformActor(), orgId);
    const org = await getOrganizationById(orgId);
    expect(org?.status).toBe("SUSPENDED");

    const users = await listOrganizationUsers(orgId);
    const owner = users.find((u) => u.role === "OWNER");
    expect(owner).toBeDefined();

    await testPool.query(`UPDATE "User" SET "passwordHash" = $1 WHERE id = $2`, [
      hashPassword("owner-pass-123"),
      owner!.id,
    ]);

    const login = await authenticateUser(owner!.email, "owner-pass-123");
    expect(login).toBeNull();
  });

  it("réactivation restaure l'accès", async () => {
    await reactivateOrganization(platformActor(), orgId);
    expect((await getOrganizationById(orgId))?.status).toBe("ACTIVE");
  });

  it("utilisateur désactivé → login refusé", async () => {
    const users = await listOrganizationUsers(orgId);
    const owner = users.find((u) => u.role === "OWNER")!;
    await setOrganizationUserStatus(platformActor(), orgId, owner.id, "DISABLED");
    const login = await authenticateUser(owner.email, "owner-pass-123");
    expect(login).toBeNull();
    await setOrganizationUserStatus(platformActor(), orgId, owner.id, "ACTIVE");
  });

  it("modification abonnement + audit", async () => {
    const premium = await getPlanByCode("PREMIUM");
    expect(premium).toBeTruthy();
    await updateSubscription(platformActor(), orgId, "PREMIUM");
    const org = await getOrganizationById(orgId);
    expect(org?.subscription?.plan).toBe("PREMIUM");
    expect(org?.subscription?.price).toBe(premium!.price);

    const audit = await countRows(
      "PlatformAuditLog",
      `"organizationId" = $1 AND action = 'SUBSCRIPTION_CHANGED'`,
      [orgId],
    );
    expect(audit).toBeGreaterThanOrEqual(1);
  });

  it("archivage (soft) sans suppression données", async () => {
    await archiveOrganization(platformActor(), orgId);
    expect((await getOrganizationById(orgId))?.status).toBe("ARCHIVED");
    const customers = await countRows("Customer", `"organizationId" = $1`, [orgId]);
    expect(customers).toBe(0);
  });

  it("session support auditée", async () => {
    const orgA = await getSeedOrgId();
    const { sessionId } = await startSupportSession(platformActor(), orgA, "Test support");
    expect(sessionId).toBeTruthy();
    const audit = await countRows(
      "PlatformAuditLog",
      `action = 'SUPPORT_SESSION_STARTED' AND "entityId" = $1`,
      [sessionId],
    );
    expect(audit).toBe(1);
  });
});

run("Super Admin — isolation multi-tenant", () => {
  it("deux instituts distincts avec même téléphone owner possible", async () => {
    const phone = "0699887766";
    const slug1 = testId("iso1").replace(/_/g, "-");
    const slug2 = testId("iso2").replace(/_/g, "-");
    const email1 = `${testId("iso_e1")}@test.local`;
    const email2 = `${testId("iso_e2")}@test.local`;

    await createOrganization(platformActor(), {
      name: "Iso A",
      slug: slug1,
      phone,
      email: "a@test.local",
      owner: { firstName: "A", lastName: "Test", email: email1, phone },
      plan: "STARTER",
    });
    await createOrganization(platformActor(), {
      name: "Iso B",
      slug: slug2,
      phone,
      email: "b@test.local",
      owner: { firstName: "B", lastName: "Test", email: email2, phone },
      plan: "STARTER",
    });

    const c1 = await testPool.query(`SELECT COUNT(*)::text AS c FROM "User" WHERE phone = $1`, [phone]);
    expect(parseInt(c1.rows[0].c, 10)).toBeGreaterThanOrEqual(2);
  });
});
