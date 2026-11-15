import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Client, Pool } from "pg";
import { randomBytes, randomInt } from "crypto";
import { bindPublicInstitute, runInScope } from "@/lib/db/tenant-context";
import { appPool, prepareRoles, rolesAdminUrl } from "../db/role-pools";

const holder = vi.hoisted(() => ({ pool: null as unknown as Pool }));
vi.mock("@/lib/db/pool", () => ({
  get pool() {
    return holder.pool;
  },
}));

import { createPublicSignup } from "@/lib/db/public-signup";

/**
 * Inscription publique avec les rôles séparés : la route tourne sous rappel_public, qui n'a plus de
 * traversée des instituts. L'institut à créer doit être annoncé avant l'emprunt de la connexion.
 * Base locale jetable uniquement (RLS_TEST_DATABASE_URL ou DATABASE_TEST_URL).
 */
const adminUrl = rolesAdminUrl();

describe.skipIf(!adminUrl)("inscription publique sous rôles séparés", () => {
  let admin: Client;
  let restoreEnv: () => void;
  const createdNames: string[] = [];
  const asPublic = <T,>(fn: () => Promise<T>) => runInScope({ kind: "public", reason: "route publique" }, fn);
  const tag = () => `ps_roles_${randomBytes(4).toString("hex")}`;
  const phone = () => `09${randomInt(10000000, 99999999)}`;

  beforeAll(async () => {
    admin = new Client({ connectionString: adminUrl });
    await admin.connect();
    restoreEnv = await prepareRoles(admin, adminUrl);
    holder.pool = appPool(adminUrl);
  });

  afterAll(async () => {
    if (createdNames.length) {
      await admin?.query(`DELETE FROM "Organization" WHERE name = ANY($1::text[])`, [createdNames]);
    }
    await holder.pool?.end().catch(() => null);
    await admin?.end();
    restoreEnv?.();
  });

  it("crée l'institut, son propriétaire, l'essai et les réglages sous rappel_public", async () => {
    const name = tag();
    createdNames.push(name);
    const number = phone();
    const created = await asPublic(() =>
      createPublicSignup({ personName: "Ada Roles", institut: name, phone: number, city: "Casablanca", address: "", website: null }),
    );
    expect(created.temporaryPassword).toBeTruthy();

    const org = (await admin.query(`SELECT id, status::text s FROM "Organization" WHERE name = $1`, [name])).rows;
    expect(org).toEqual([{ id: created.organizationId, s: "ACTIVE" }]);
    const owner = (await admin.query(`SELECT role::text r, "mustChangePassword" m FROM "User" WHERE "organizationId" = $1`, [created.organizationId])).rows;
    expect(owner).toEqual([{ r: "OWNER", m: true }]);
    expect((await admin.query(`SELECT status::text s FROM "Subscription" WHERE "organizationId" = $1`, [created.organizationId])).rows).toEqual([{ s: "TRIAL" }]);
    for (const table of ["ReactivationSettings", "ReviewSettings", "LoyaltyProgram"]) {
      expect((await admin.query(`SELECT count(*)::int n FROM "${table}" WHERE "organizationId" = $1`, [created.organizationId])).rows[0].n, table).toBe(1);
    }
  });

  it("refuse un numéro déjà inscrit sans laisser d'institut à moitié créé", async () => {
    const number = phone();
    const first = tag();
    const second = tag();
    createdNames.push(first, second);
    await asPublic(() => createPublicSignup({ personName: "A B", institut: first, phone: number, city: "x", address: "", website: null }));
    await expect(
      asPublic(() => createPublicSignup({ personName: "C D", institut: second, phone: number, city: "x", address: "", website: null })),
    ).rejects.toMatchObject({ code: "PHONE_TAKEN" });
    expect((await admin.query(`SELECT count(*)::int n FROM "Organization" WHERE name = $1`, [second])).rows[0].n).toBe(0);
  });

  it("sans institut annoncé, rappel_public est refusé par les règles (le défaut que bindPublicInstitute corrige)", async () => {
    const attempt = async (bind: string | null) =>
      asPublic(async () => {
        if (bind) bindPublicInstitute(bind);
        const client = await holder.pool.connect();
        try {
          await client.query("BEGIN");
          expect((await client.query(`SELECT current_user u`)).rows[0].u).toBe("rappel_public");
          await client.query(
            `INSERT INTO "ReactivationSettings"(id,"organizationId","updatedAt") VALUES ('ps_roles_rs','ps_roles_absent',now())`,
          );
          await client.query("ROLLBACK");
        } catch (error) {
          await client.query("ROLLBACK").catch(() => null);
          throw error;
        } finally {
          client.release();
        }
      });
    // Règle d'isolation (WITH CHECK) avant même la clé étrangère.
    await expect(attempt(null)).rejects.toMatchObject({ code: "42501" });
    // Avec l'institut annoncé, la règle passe : seule la clé étrangère (institut inexistant) refuse.
    await expect(attempt("ps_roles_absent")).rejects.toMatchObject({ code: "23503" });
  });
});
