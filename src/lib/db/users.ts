import { Pool } from "pg";
import { verifyPassword } from "@/lib/auth/crypto";
import type { SessionUser } from "@/lib/auth/types";
import type { AppRole } from "@/lib/rbac";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

type UserRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AppRole;
  passwordHash: string | null;
  organizationId: string;
  orgName: string;
  orgSlug: string;
  userStatus: "ACTIVE" | "DISABLED";
  orgStatus: "ACTIVE" | "SUSPENDED" | "ARCHIVED";
};

export async function authenticateUser(
  email: string,
  password: string,
): Promise<SessionUser | null> {
  const normalized = email.trim().toLowerCase();

  const { rows: platformRows } = await pool.query(
    `SELECT id FROM "PlatformUser" WHERE LOWER(email) = $1 LIMIT 1`,
    [normalized],
  );
  if (platformRows.length > 0) return null;

  const { rows } = await pool.query<UserRow>(
    `SELECT
      u.id,
      u.email,
      u."firstName",
      u."lastName",
      u.role,
      u."passwordHash",
      u."organizationId",
      u.status AS "userStatus",
      o.name AS "orgName",
      o.slug AS "orgSlug",
      o.status AS "orgStatus"
    FROM "User" u
    JOIN "Organization" o ON o.id = u."organizationId"
    WHERE LOWER(u.email) = $1
    LIMIT 2`,
    [normalized],
  );

  if (rows.length !== 1) return null;
  const user = rows[0];
  if (user.userStatus !== "ACTIVE") return null;
  if (user.orgStatus !== "ACTIVE") return null;
  if (!user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    organizationId: user.organizationId,
    orgName: user.orgName,
    orgSlug: user.orgSlug,
    scope: "app",
    accountType: "ORGANIZATION",
  };
}

export async function setUserPasswordHash(userId: string, passwordHash: string) {
  await pool.query(`UPDATE "User" SET "passwordHash" = $1, "updatedAt" = NOW() WHERE id = $2`, [
    passwordHash,
    userId,
  ]);
}
