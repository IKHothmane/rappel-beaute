import { describe, expect, it } from "vitest";
import { generateTemporaryPassword, hashPassword, verifyPassword } from "@/lib/auth/crypto";

describe("Mot de passe temporaire admin", () => {
  it("génère un mot de passe aléatoire suffisamment long", () => {
    const a = generateTemporaryPassword();
    const b = generateTemporaryPassword();
    expect(a.length).toBeGreaterThanOrEqual(10);
    expect(a).not.toBe(b);
    expect(a).toMatch(/[A-Za-z]/);
    expect(a).toMatch(/[0-9]/);
  });

  it("hash + verify fonctionne (jamais de clair en DB)", () => {
    const plain = generateTemporaryPassword();
    const hashed = hashPassword(plain);
    expect(hashed).not.toContain(plain);
    expect(verifyPassword(plain, hashed)).toBe(true);
    expect(verifyPassword("wrong-password", hashed)).toBe(false);
  });
});

const run = process.env.DATABASE_URL ? describe : describe.skip;

run("Reset admin → mustChangePassword + sessionVersion", () => {
  it("invalide l'ancien hash et force le changement", async () => {
    const { adminResetTemporaryPassword, authenticateUser, changeOwnPassword, getUserSessionState } =
      await import("@/lib/db/users");
    const { getSeedOrgId, testPool } = await import("../helpers/db");

    const orgId = await getSeedOrgId();
    const { rows } = await testPool.query<{ id: string; email: string }>(
      `SELECT id, email FROM "User"
       WHERE "organizationId" = $1 AND role = 'STAFF' AND status = 'ACTIVE'
       LIMIT 1`,
      [orgId],
    );

    let user = rows[0];
    if (!user) {
      const id = `u_tmp_reset_${Date.now()}`;
      await testPool.query(
        `INSERT INTO "User" (
          id, "organizationId", email, "firstName", "lastName", role, status,
          "passwordHash", "mustChangePassword", "sessionVersion", "updatedAt"
        ) VALUES ($1,$2,$3,'Tmp','Reset','STAFF','ACTIVE',$4,false,0,NOW())`,
        [id, orgId, `${id}@test.local`, hashPassword("old-password-99")],
      );
      user = { id, email: `${id}@test.local` };
    } else {
      await testPool.query(
        `UPDATE "User" SET "passwordHash" = $1, "mustChangePassword" = false, "sessionVersion" = 0
         WHERE id = $2`,
        [hashPassword("old-password-99"), user.id],
      );
    }

    const before = await getUserSessionState(user.id);
    expect(before?.mustChangePassword).toBe(false);

    const reset = await adminResetTemporaryPassword({
      organizationId: orgId,
      targetUserId: user.id,
      actor: { id: "u_admin_test", name: "Admin Test" },
    });

    expect(reset.temporaryPassword.length).toBeGreaterThanOrEqual(10);
    expect(await authenticateUser(user.email, "old-password-99")).toBeNull();

    const session = await authenticateUser(user.email, reset.temporaryPassword);
    expect(session?.scope).toBe("app");
    if (session?.scope === "app") {
      expect(session.mustChangePassword).toBe(true);
      expect(session.sessionVersion).toBeGreaterThan(0);
    }

    const afterChange = await changeOwnPassword({
      userId: user.id,
      organizationId: orgId,
      newPassword: "NouveauMdp2026!",
    });
    expect(afterChange.mustChangePassword).toBe(false);

    // L'ancien temporaire ne fonctionne plus
    expect(await authenticateUser(user.email, reset.temporaryPassword)).toBeNull();
    const normal = await authenticateUser(user.email, "NouveauMdp2026!");
    expect(normal?.scope).toBe("app");
    if (normal?.scope === "app") {
      expect(normal.mustChangePassword).toBe(false);
    }

    // Cleanup password for other tests if seed staff
    await testPool.query(
      `UPDATE "User" SET "passwordHash" = $1, "mustChangePassword" = false WHERE id = $2`,
      [hashPassword("demo1234"), user.id],
    );
  });
});
