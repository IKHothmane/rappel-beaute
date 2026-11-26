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
    const { testPassword, withInstituteAccount } = await import("../helpers/auth-fixtures");
    await withInstituteAccount(async ({ id, organizationId, email, password }) => {
      const newPassword = testPassword();
      expect((await authenticateUser(email, password))?.id).toBe(id);
      const before = await getUserSessionState(id);
      expect(before?.mustChangePassword).toBe(false);

      const reset = await adminResetTemporaryPassword({
        organizationId,
        targetUserId: id,
        actor: { id: "u_admin_test", name: "Admin Test" },
      });

      expect(reset.temporaryPassword.length).toBeGreaterThanOrEqual(10);
      expect(await authenticateUser(email, password)).toBeNull();

      const session = await authenticateUser(email, reset.temporaryPassword);
      expect(session?.scope).toBe("app");
      if (session?.scope === "app") {
        expect(session.mustChangePassword).toBe(true);
        expect(session.sessionVersion).toBeGreaterThan(0);
      }

      const afterChange = await changeOwnPassword({
        userId: id,
        organizationId,
        newPassword,
      });
      expect(afterChange.mustChangePassword).toBe(false);

      // L'ancien temporaire ne fonctionne plus
      expect(await authenticateUser(email, reset.temporaryPassword)).toBeNull();
      const normal = await authenticateUser(email, newPassword);
      expect(normal?.scope).toBe("app");
      if (normal?.scope === "app") {
        expect(normal.mustChangePassword).toBe(false);
      }
    }, "STAFF");
  });
});
