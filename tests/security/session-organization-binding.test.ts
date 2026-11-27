import { afterAll, describe, expect, it } from "vitest";
import { hashPassword } from "@/lib/auth/crypto";
import { getUserSessionState } from "@/lib/db/users";
import { ensureSecondOrg, getSeedOrgId, testId, testPool } from "../helpers/db";

/**
 * Base de test locale : l'état de session n'est relu que pour l'institut porté par le jeton.
 * Un compte existant présenté avec un autre institut ne renvoie aucune ligne (session invalide).
 */
const run = process.env.DATABASE_URL ? describe : describe.skip;

run("getUserSessionState : institut du jeton comparé à la base", () => {
  const userId = testId("u_orgbind");

  afterAll(async () => {
    await testPool.query(`DELETE FROM "User" WHERE id = $1`, [userId]);
  });

  it("renvoie l'état pour le bon institut, null pour un autre institut ou un institut vide", async () => {
    const orgA = await getSeedOrgId();
    const orgB = await ensureSecondOrg();
    await testPool.query(
      `INSERT INTO "User" (
        id, "organizationId", email, "firstName", "lastName", role, status,
        "passwordHash", "mustChangePassword", "sessionVersion", "updatedAt"
      ) VALUES ($1,$2,$3,'Org','Bind','STAFF','ACTIVE',$4,false,3,NOW())`,
      [userId, orgA, `${userId}@test.local`, hashPassword("org-bind-pass-1")],
    );

    const own = await getUserSessionState(userId, orgA);
    expect(own).toMatchObject({ status: "ACTIVE", sessionVersion: 3, role: "STAFF" });

    expect(await getUserSessionState(userId, orgB)).toBeNull();
    expect(await getUserSessionState(userId, "")).toBeNull();
  });
});
