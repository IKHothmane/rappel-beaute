import { randomBytes } from "node:crypto";
import { hashPassword } from "@/lib/auth/crypto";
import { testId, testPool } from "./db";

export function testPassword(): string {
  return `Q7!${randomBytes(18).toString("base64url")}`;
}

type Account = { id: string; email: string; password: string };
type InstituteAccount = Account & { organizationId: string };

function account(prefix: string): Account {
  const id = testId(prefix);
  return { id, email: `${id}@example.test`, password: testPassword() };
}

export async function withInstituteAccount(
  run: (fixture: InstituteAccount) => Promise<void>,
  role: "OWNER" | "STAFF" = "OWNER",
): Promise<void> {
  const user = account("test_auth_user");
  const organizationId = testId("test_auth_org");
  await testPool.query(
    `INSERT INTO "Organization" (id, name, slug, "updatedAt") VALUES ($1, 'Institut de test auth', $1, now())`,
    [organizationId],
  );
  try {
    await testPool.query(
      `INSERT INTO "User" (id, "organizationId", email, "firstName", "lastName", role, "passwordHash", "updatedAt")
       VALUES ($1, $2, $3, 'Compte', 'Test', $4, $5, now())`,
      [user.id, organizationId, user.email, role, hashPassword(user.password)],
    );
    await run({ ...user, organizationId });
  } finally {
    await testPool.query(`DELETE FROM "Organization" WHERE id = $1`, [organizationId]);
  }
}

export async function withPlatformAccount(run: (fixture: Account) => Promise<void>): Promise<void> {
  const user = account("test_auth_platform");
  await testPool.query(
    `INSERT INTO "PlatformUser" (id, email, "firstName", "lastName", role, status, "passwordHash", "updatedAt")
     VALUES ($1, $2, 'Compte', 'Test', 'SUPER_ADMIN', 'ACTIVE', $3, now())`,
    [user.id, user.email, hashPassword(user.password)],
  );
  try {
    await run(user);
  } finally {
    await testPool.query(`DELETE FROM "PlatformUser" WHERE id = $1`, [user.id]);
  }
}
