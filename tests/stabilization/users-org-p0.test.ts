import { describe, expect, it } from "vitest";
import { listUsersByOrganization } from "@/lib/db/users";
import { getSeedOrgId, testId, testPool } from "../helpers/db";

const run = process.env.DATABASE_URL ? describe : describe.skip;

run("P0 — Users institut (session org)", () => {
  it("listUsersByOrganization ne lit que l'org demandée", async () => {
    const orgA = await getSeedOrgId();
    const orgB = testId("org_users_b");
    const userB = testId("user_b");

    await testPool.query(
      `INSERT INTO "Organization" (id, name, slug, "updatedAt")
       VALUES ($1, 'Org Users B', $2, NOW())
       ON CONFLICT (id) DO NOTHING`,
      [orgB, `users-b-${orgB.slice(-8)}`],
    );
    await testPool.query(
      `INSERT INTO "User" (
        id, "organizationId", email, "firstName", "lastName", role, status, "updatedAt"
      ) VALUES ($1, $2, $3, 'Test', 'UserB', 'STAFF'::"UserRole", 'ACTIVE'::"OrgUserStatus", NOW())
      ON CONFLICT DO NOTHING`,
      [userB, orgB, `test-b-${userB.slice(-6)}@example.com`],
    );

    try {
      const usersA = await listUsersByOrganization(orgA);
      const usersB = await listUsersByOrganization(orgB);

      expect(usersB.some((u) => u.id === userB)).toBe(true);
      expect(usersA.some((u) => u.id === userB)).toBe(false);
      expect(usersA.every((u) => typeof u.email === "string")).toBe(true);
    } finally {
      await testPool.query(`DELETE FROM "User" WHERE id = $1`, [userB]);
      await testPool.query(`DELETE FROM "Organization" WHERE id = $1`, [orgB]);
    }
  });
});
