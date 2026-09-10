import { NextRequest } from "next/server";
import { signJwt, getSessionSecret } from "@/lib/auth/crypto";
import { SESSION_COOKIE, SESSION_MAX_AGE_SEC, type AppSessionUser } from "@/lib/auth/types";
import { testId, testPool } from "./db";

export function mockAppRequest(
  user: AppSessionUser,
  url = "http://localhost/api/test",
): NextRequest {
  const token = signJwt(
    {
      ...user,
      scope: "app" as const,
      accountType: "ORGANIZATION" as const,
    },
    getSessionSecret(),
    SESSION_MAX_AGE_SEC,
  );
  return new NextRequest(url, {
    headers: { cookie: `${SESSION_COOKIE}=${token}` },
  });
}

/**
 * Session app de test alignée sur un User réel (sessionVersion / mustChangePassword).
 */
export async function mockOwnerSession(
  organizationId: string,
  role: AppSessionUser["role"] = "OWNER",
): Promise<AppSessionUser> {
  const { rows } = await testPool.query<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    sessionVersion: number;
    mustChangePassword: boolean;
  }>(
    `SELECT id, email, "firstName", "lastName", "sessionVersion", "mustChangePassword"
     FROM "User"
     WHERE "organizationId" = $1 AND role = $2::"UserRole" AND status = 'ACTIVE'
     LIMIT 1`,
    [organizationId, role],
  );

  let user = rows[0];

  if (!user && role !== "OWNER") {
    const id = testId(`u_${role.toLowerCase()}`);
    const email = `${id}@test.local`;
    await testPool.query(
      `INSERT INTO "User" (
        id, "organizationId", email, "firstName", "lastName", role, status,
        "passwordHash", "mustChangePassword", "sessionVersion", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6::"UserRole", 'ACTIVE',
        NULL, false, 0, NOW()
      )`,
      [id, organizationId, email, "Test", role, role],
    );
    user = {
      id,
      email,
      firstName: "Test",
      lastName: role,
      sessionVersion: 0,
      mustChangePassword: false,
    };
  }

  if (!user) {
    throw new Error(`Aucun utilisateur ${role} pour l'org ${organizationId}`);
  }

  const { rows: orgRows } = await testPool.query<{ name: string; slug: string }>(
    `SELECT name, slug FROM "Organization" WHERE id = $1`,
    [organizationId],
  );

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role,
    organizationId,
    orgName: orgRows[0]?.name ?? "Test Org",
    orgSlug: orgRows[0]?.slug ?? "test-org",
    scope: "app",
    accountType: "ORGANIZATION",
    mustChangePassword: Boolean(user.mustChangePassword),
    sessionVersion: Number(user.sessionVersion) || 0,
  };
}
