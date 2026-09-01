import { describe, expect, it } from "vitest";
import { signJwt, verifyJwt, getSessionSecret } from "@/lib/auth/crypto";
import { parseSessionToken } from "@/lib/auth/session";
import { verifyJwtEdge } from "@/lib/auth/session-edge";
import { SESSION_MAX_AGE_SEC } from "@/lib/auth/types";

describe("Auth — JWT & session", () => {
  const secret = getSessionSecret();

  it("signature invalide → null", () => {
    const token = signJwt({ id: "u1", scope: "app" }, secret, 3600);
    const tampered = token.slice(0, -4) + "XXXX";
    expect(verifyJwt(tampered, secret)).toBeNull();
  });

  it("cookie falsifié (mauvais secret) → null", () => {
    const token = signJwt(
      {
        id: "u1",
        email: "a@b.ma",
        firstName: "A",
        lastName: "B",
        role: "OWNER",
        organizationId: "org1",
        orgName: "Test",
        orgSlug: "test",
        scope: "app",
        accountType: "ORGANIZATION",
      },
      secret,
      3600,
    );
    expect(verifyJwt(token, "wrong-secret-minimum-32-characters!!")).toBeNull();
  });

  it("session expirée → null", () => {
    const token = signJwt({ id: "u1", scope: "app" }, secret, -10);
    expect(verifyJwt(token, secret)).toBeNull();
  });

  it("parseSessionToken valide pour payload app", () => {
    const token = signJwt(
      {
        id: "u1",
        email: "owner@test.local",
        firstName: "O",
        lastName: "W",
        role: "OWNER",
        organizationId: "org1",
        orgName: "Institut",
        orgSlug: "institut",
        scope: "app",
        accountType: "ORGANIZATION",
      },
      secret,
      SESSION_MAX_AGE_SEC,
    );
    const session = parseSessionToken(token);
    expect(session?.scope).toBe("app");
    expect(session && "organizationId" in session && session.organizationId).toBe("org1");
  });

  it("verifyJwtEdge compatible avec tokens signJwt (middleware Edge)", async () => {
    const token = signJwt(
      {
        id: "u1",
        email: "owner@test.local",
        firstName: "O",
        lastName: "W",
        role: "OWNER",
        organizationId: "org1",
        orgName: "Institut",
        orgSlug: "institut",
        scope: "app",
        accountType: "ORGANIZATION",
      },
      secret,
      SESSION_MAX_AGE_SEC,
    );
    const payload = await verifyJwtEdge(token, secret);
    expect(payload?.id).toBe("u1");
  });

  it("Platform scope ≠ App scope", () => {
    const platformToken = signJwt(
      {
        id: "pu1",
        email: "admin@test.local",
        firstName: "A",
        lastName: "D",
        role: "SUPER_ADMIN",
        scope: "platform",
        accountType: "PLATFORM",
      },
      secret,
      SESSION_MAX_AGE_SEC,
    );
    const session = parseSessionToken(platformToken);
    expect(session?.scope).toBe("platform");
    expect(session && "organizationId" in session).toBe(false);
  });
});

const run = process.env.DATABASE_URL ? describe : describe.skip;

run("Auth — login DB", () => {
  it("compte disabled → login refusé", async () => {
    const { authenticateUser } = await import("@/lib/db/users");
    const { getSeedOrgId, testPool } = await import("../helpers/db");
    const orgId = await getSeedOrgId();
    const { rows } = await testPool.query<{ id: string; email: string }>(
      `SELECT id, email FROM "User" WHERE "organizationId" = $1 AND role = 'OWNER' LIMIT 1`,
      [orgId],
    );
    const user = rows[0];
    expect(user).toBeTruthy();
    await testPool.query(`UPDATE "User" SET status = 'DISABLED' WHERE id = $1`, [user!.id]);
    expect(await authenticateUser(user!.email, "demo1234")).toBeNull();
    await testPool.query(`UPDATE "User" SET status = 'ACTIVE' WHERE id = $1`, [user!.id]);
  });

  it("organisation suspended → login refusé", async () => {
    const { authenticateUser } = await import("@/lib/db/users");
    const { getSeedOrgId, testPool } = await import("../helpers/db");
    const orgId = await getSeedOrgId();
    const { rows } = await testPool.query<{ email: string }>(
      `SELECT email FROM "User" WHERE "organizationId" = $1 AND role = 'OWNER' LIMIT 1`,
      [orgId],
    );
    await testPool.query(`UPDATE "Organization" SET status = 'SUSPENDED' WHERE id = $1`, [orgId]);
    expect(await authenticateUser(rows[0]!.email, "demo1234")).toBeNull();
    await testPool.query(`UPDATE "Organization" SET status = 'ACTIVE' WHERE id = $1`, [orgId]);
  });

  it("email platform user → authenticateUser app retourne null", async () => {
    const { authenticateUser } = await import("@/lib/db/users");
    expect(await authenticateUser("admin@rappelbeaute.ma", "demo1234")).toBeNull();
  });
});

run("Auth — rate limiting login", () => {
  it("bloque brute force après limite", async () => {
    const { checkRateLimit, resetRateLimitsForTests, AUTH_RATE_LIMITS, authRateLimitKey } =
      await import("@/lib/rate-limit");
    resetRateLimitsForTests();
    const key = authRateLimitKey("login", "192.168.1.1", "attacker@test.local");
    for (let i = 0; i < AUTH_RATE_LIMITS.login.limit; i++) {
      expect((await checkRateLimit({ key, ...AUTH_RATE_LIMITS.login })).allowed).toBe(true);
    }
    expect((await checkRateLimit({ key, ...AUTH_RATE_LIMITS.login })).allowed).toBe(false);
  });
});
