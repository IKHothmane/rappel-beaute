import { NextRequest } from "next/server";
import { signJwt, getSessionSecret } from "@/lib/auth/crypto";
import { SESSION_COOKIE, SESSION_MAX_AGE_SEC, type AppSessionUser } from "@/lib/auth/types";

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

export function mockOwnerSession(organizationId: string, role: AppSessionUser["role"] = "OWNER"): AppSessionUser {
  return {
    id: `u_test_${role.toLowerCase()}`,
    email: `${role.toLowerCase()}@test.local`,
    firstName: "Test",
    lastName: role,
    role,
    organizationId,
    orgName: "Test Org",
    orgSlug: "test-org",
    scope: "app",
    accountType: "ORGANIZATION",
  };
}
