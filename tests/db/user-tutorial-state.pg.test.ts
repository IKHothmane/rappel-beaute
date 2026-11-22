import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client, Pool } from "pg";
import { bindOrganization, runAsJob, runInScope } from "@/lib/db/tenant-context";
import { appPool, prepareRoles, rolesAdminUrl } from "./role-pools";

/**
 * Migration 20261122090000_user_tutorial_state : "UserTutorialState" (état du tutoriel par utilisateur).
 * Vérifié avec les rôles applicatifs sur une base locale jetable uniquement (rolesAdminUrl impose 127.0.0.1 /
 * localhost ; ignoré sans base de test). Données isolées : préfixe uts_, nettoyées avant et après.
 */
const adminUrl = rolesAdminUrl();
const A = "uts_org_a";
const B = "uts_org_b";
const DENIED = { code: "42501" };
const UNIQUE = { code: "23505" };
const CHECK = { code: "23514" };
const MIGRATION = path.join(process.cwd(), "prisma/migrations/20261122090000_user_tutorial_state/migration.sql");

describe.skipIf(!adminUrl)("état du tutoriel de première connexion (UserTutorialState)", () => {
  let admin: Client;
  let pool: Pool;
  let restoreEnv: () => void;

  const tenant = <T,>(org: string | null, fn: () => Promise<T>) =>
    runInScope({ kind: "tenant", organizationId: null }, async () => {
      bindOrganization(org);
      return fn();
    });
  const asPublic = <T,>(fn: () => Promise<T>) => runInScope({ kind: "public", reason: "test" }, fn);
  const asPlatform = <T,>(fn: () => Promise<T>) => runInScope({ kind: "platform", reason: "test" }, fn);
  const asJob = <T,>(fn: () => Promise<T>) => runAsJob("test", fn);

  async function cleanup() {
    await admin.query(`DELETE FROM "Organization" WHERE id LIKE 'uts_org_%'`); // cascade : User, UserTutorialState
  }
  const insertAsApp = (userId: string, org: string, status = "NOT_STARTED") =>
    pool.query(`INSERT INTO "UserTutorialState"("userId","organizationId",status) VALUES ($1,$2,$3)`, [userId, org, status]);

  beforeAll(async () => {
    admin = new Client({ connectionString: adminUrl });
    await admin.connect();
    restoreEnv = await prepareRoles(admin, adminUrl);
    await cleanup();
    await admin.query(`INSERT INTO "Organization"(id,name,slug,"updatedAt") VALUES ('${A}','A','${A}',now()),('${B}','B','${B}',now())`);
    for (const [u, org] of [["uts_user_a", A], ["uts_user_a2", A], ["uts_user_b", B]]) {
      await admin.query(
        `INSERT INTO "User"(id,"organizationId",email,"firstName","lastName","updatedAt") VALUES ($1,$2,$3,'F','L',now())`,
        [u, org, `${u}@example.test`],
      );
    }
    pool = appPool(adminUrl);
  });

  afterAll(async () => {
    await pool?.end().catch(() => null);
    await cleanup().catch(() => null);
    await admin?.end();
    restoreEnv?.();
  });

  it("structure : types, valeurs par défaut, clés, index, RLS et une seule politique tenant_isolation ALL", async () => {
    const cols = (
      await admin.query(
        `SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns
         WHERE table_name = 'UserTutorialState' ORDER BY ordinal_position`,
      )
    ).rows;
    expect(cols.map((c) => [c.column_name, c.data_type, c.is_nullable])).toEqual([
      ["userId", "text", "NO"],
      ["organizationId", "text", "NO"],
      ["status", "text", "NO"],
      ["lastStep", "text", "YES"],
      ["version", "integer", "NO"],
      ["startedAt", "timestamp with time zone", "YES"],
      ["completedAt", "timestamp with time zone", "YES"],
      ["skippedAt", "timestamp with time zone", "YES"],
      ["createdAt", "timestamp with time zone", "NO"],
      ["updatedAt", "timestamp with time zone", "NO"],
    ]);
    const def = Object.fromEntries(cols.map((c) => [c.column_name, c.column_default]));
    expect(def.status).toContain("NOT_STARTED");
    expect(def.version).toBe("1");

    const { rows: rls } = await admin.query(
      `SELECT c.relrowsecurity, (SELECT count(*)::int FROM pg_policies p WHERE p.tablename = c.relname) AS policies
       FROM pg_class c WHERE c.relnamespace = 'public'::regnamespace AND c.relname = 'UserTutorialState'`,
    );
    expect(rls).toEqual([{ relrowsecurity: true, policies: 1 }]);
    const pol = (await admin.query(`SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'UserTutorialState'`)).rows;
    expect(pol).toHaveLength(1);
    expect(pol[0].policyname).toBe("tenant_isolation");
    expect(pol[0].cmd).toBe("ALL");
    expect(pol[0].qual).toContain("app_rls_bypass()");
    expect(pol[0].with_check).toContain("app_current_org()");

    const idx = (await admin.query(`SELECT indexname FROM pg_indexes WHERE tablename = 'UserTutorialState' ORDER BY 1`)).rows.map((r) => r.indexname);
    expect(idx).toEqual(["UserTutorialState_organizationId_idx", "UserTutorialState_pkey"]);
  });

  it("droits : aucun pour rappel_public / rappel_job, ni DELETE ni TRUNCATE, rappel_platform en lecture seule", async () => {
    const priv = async (role: string, privilege: string) =>
      (await admin.query(`SELECT has_table_privilege($1, '"UserTutorialState"', $2) AS ok`, [role, privilege])).rows[0].ok as boolean;
    for (const role of ["rappel_public", "rappel_job"]) {
      for (const p of ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"]) expect(await priv(role, p)).toBe(false);
    }
    for (const role of ["rappel_app", "rappel_platform"]) {
      for (const p of ["DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"]) expect(await priv(role, p)).toBe(false);
    }
    expect(await priv("rappel_app", "SELECT")).toBe(true);
    expect(await priv("rappel_platform", "SELECT")).toBe(true);
    expect(await priv("rappel_platform", "INSERT")).toBe(false);
    expect(await priv("rappel_platform", "UPDATE")).toBe(false);

    const colPriv = async (privilege: string, column: string) =>
      (await admin.query(`SELECT has_column_privilege('rappel_app', '"UserTutorialState"', $1, $2) AS ok`, [column, privilege])).rows[0].ok as boolean;
    for (const c of ["userId", "organizationId", "createdAt"]) expect(await colPriv("UPDATE", c)).toBe(false);
    for (const c of ["status", "lastStep", "version", "startedAt", "completedAt", "skippedAt", "updatedAt"]) {
      expect(await colPriv("UPDATE", c)).toBe(true);
    }
    for (const c of ["userId", "organizationId", "status", "lastStep", "version", "startedAt", "completedAt", "skippedAt", "createdAt", "updatedAt"]) {
      expect(await colPriv("INSERT", c)).toBe(true);
    }
  });

  it("rappel_app : insertion, lecture et UPDATE dans son institut, valeurs par défaut", async () => {
    await tenant(A, async () => {
      const ins = await pool.query(
        `INSERT INTO "UserTutorialState"("userId","organizationId") VALUES ('uts_user_a','${A}')
         RETURNING status, "lastStep", version, "startedAt", "completedAt", "skippedAt", "createdAt" IS NOT NULL AS created, "updatedAt" IS NOT NULL AS updated`,
      );
      expect(ins.rows[0]).toEqual({
        status: "NOT_STARTED", lastStep: null, version: 1, startedAt: null, completedAt: null, skippedAt: null, created: true, updated: true,
      });
      const upd = await pool.query(
        `UPDATE "UserTutorialState" SET status = 'IN_PROGRESS', "lastStep" = 'welcome', "startedAt" = now(), "updatedAt" = now()
         WHERE "userId" = 'uts_user_a'`,
      );
      expect(upd.rowCount).toBe(1);
      const done = await pool.query(
        `UPDATE "UserTutorialState" SET status = 'COMPLETED', "completedAt" = now(), version = 2, "updatedAt" = now()
         WHERE "userId" = 'uts_user_a' RETURNING status, "lastStep", version, "startedAt" IS NOT NULL AS started, "completedAt" IS NOT NULL AS completed`,
      );
      expect(done.rows[0]).toEqual({ status: "COMPLETED", lastStep: "welcome", version: 2, started: true, completed: true });
      expect((await pool.query(`SELECT count(*)::int n FROM "UserTutorialState" WHERE "userId" LIKE 'uts_user_%'`)).rows[0].n).toBe(1);
      // Upsert idempotent (premier accès concurrent) : la clé primaire arbitre, aucune ligne en double.
      const upsert = await pool.query(
        `INSERT INTO "UserTutorialState"("userId","organizationId") VALUES ('uts_user_a','${A}') ON CONFLICT ("userId") DO NOTHING`,
      );
      expect(upsert.rowCount).toBe(0);
      await expect(insertAsApp("uts_user_a", A)).rejects.toMatchObject(UNIQUE);
    });
  });

  it("isolation RLS : un institut ne lit, n'écrit ni ne modifie les lignes d'un autre", async () => {
    await tenant(B, async () => {
      expect((await insertAsApp("uts_user_b", B)).rowCount).toBe(1);
    });
    await tenant(A, async () => {
      const seen = (await pool.query(`SELECT "userId" FROM "UserTutorialState" WHERE "userId" LIKE 'uts_user_%'`)).rows.map((r) => r.userId);
      expect(seen).toEqual(["uts_user_a"]);
      // La ligne de B est invisible : UPDATE sans effet.
      expect((await pool.query(`UPDATE "UserTutorialState" SET status = 'SKIPPED' WHERE "userId" = 'uts_user_b'`)).rowCount).toBe(0);
      // Écrire pour B depuis A : refusé par WITH CHECK.
      await expect(insertAsApp("uts_user_a2", B)).rejects.toMatchObject(DENIED);
    });
    // Rôle rappel_app sans aucun contexte d'institut (hors garde applicative) : rien de visible, rien d'insérable.
    await admin.query("BEGIN");
    try {
      await admin.query(`SET LOCAL ROLE rappel_app`);
      expect((await admin.query(`SELECT count(*)::int n FROM "UserTutorialState"`)).rows[0].n).toBe(0);
      await expect(
        admin.query(`INSERT INTO "UserTutorialState"("userId","organizationId") VALUES ('uts_user_a2','${A}')`),
      ).rejects.toMatchObject(DENIED);
    } finally {
      await admin.query("ROLLBACK");
    }
    expect((await admin.query(`SELECT status FROM "UserTutorialState" WHERE "userId" = 'uts_user_b'`)).rows[0].status).toBe("NOT_STARTED");
    expect((await admin.query(`SELECT count(*)::int n FROM "UserTutorialState" WHERE "userId" = 'uts_user_a2'`)).rows[0].n).toBe(0);
  });

  it("rappel_app ne peut changer ni userId ni organizationId, ni supprimer, ni écrire createdAt à la mise à jour", async () => {
    await tenant(A, async () => {
      await expect(pool.query(`UPDATE "UserTutorialState" SET "userId" = 'uts_user_a2' WHERE "userId" = 'uts_user_a'`)).rejects.toMatchObject(DENIED);
      await expect(pool.query(`UPDATE "UserTutorialState" SET "organizationId" = '${B}' WHERE "userId" = 'uts_user_a'`)).rejects.toMatchObject(DENIED);
      await expect(pool.query(`UPDATE "UserTutorialState" SET "createdAt" = now() WHERE "userId" = 'uts_user_a'`)).rejects.toMatchObject(DENIED);
      await expect(pool.query(`DELETE FROM "UserTutorialState" WHERE "userId" = 'uts_user_a'`)).rejects.toMatchObject(DENIED);
      await expect(pool.query(`TRUNCATE "UserTutorialState"`)).rejects.toMatchObject(DENIED);
    });
    expect((await admin.query(`SELECT "organizationId" FROM "UserTutorialState" WHERE "userId" = 'uts_user_a'`)).rows[0].organizationId).toBe(A);
  });

  it("CHECK : status limité aux quatre valeurs, lastStep de 40 caractères au plus", async () => {
    for (const status of ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "SKIPPED"]) {
      await tenant(A, async () => {
        expect((await pool.query(`UPDATE "UserTutorialState" SET status = $1 WHERE "userId" = 'uts_user_a'`, [status])).rowCount).toBe(1);
      });
    }
    await tenant(A, async () => {
      await expect(pool.query(`UPDATE "UserTutorialState" SET status = 'DONE' WHERE "userId" = 'uts_user_a'`)).rejects.toMatchObject(CHECK);
      await expect(pool.query(`UPDATE "UserTutorialState" SET status = 'completed' WHERE "userId" = 'uts_user_a'`)).rejects.toMatchObject(CHECK);
      await expect(insertAsApp("uts_user_a2", A, "INVALID")).rejects.toMatchObject(CHECK);
      expect((await pool.query(`UPDATE "UserTutorialState" SET "lastStep" = $1 WHERE "userId" = 'uts_user_a'`, ["x".repeat(40)])).rowCount).toBe(1);
      await expect(
        pool.query(`UPDATE "UserTutorialState" SET "lastStep" = $1 WHERE "userId" = 'uts_user_a'`, ["x".repeat(41)]),
      ).rejects.toMatchObject(CHECK);
      expect((await pool.query(`UPDATE "UserTutorialState" SET "lastStep" = NULL WHERE "userId" = 'uts_user_a'`)).rowCount).toBe(1);
    });
  });

  it("rappel_public et rappel_job : aucun accès ; rappel_platform : lecture seule de tous les instituts", async () => {
    await asPublic(async () => {
      await expect(pool.query(`SELECT count(*) FROM "UserTutorialState"`)).rejects.toMatchObject(DENIED);
      await expect(insertAsApp("uts_user_a2", A)).rejects.toMatchObject(DENIED);
      await expect(pool.query(`UPDATE "UserTutorialState" SET status = 'SKIPPED'`)).rejects.toMatchObject(DENIED);
      await expect(pool.query(`DELETE FROM "UserTutorialState"`)).rejects.toMatchObject(DENIED);
    });
    await asJob(async () => {
      await expect(pool.query(`SELECT count(*) FROM "UserTutorialState"`)).rejects.toMatchObject(DENIED);
      await expect(pool.query(`UPDATE "UserTutorialState" SET status = 'SKIPPED'`)).rejects.toMatchObject(DENIED);
    });
    await asPlatform(async () => {
      const ids = (await pool.query(`SELECT "userId" FROM "UserTutorialState" WHERE "userId" LIKE 'uts_user_%' ORDER BY 1`)).rows.map((r) => r.userId);
      expect(ids).toEqual(["uts_user_a", "uts_user_b"]);
      await expect(pool.query(`UPDATE "UserTutorialState" SET status = 'SKIPPED'`)).rejects.toMatchObject(DENIED);
      await expect(pool.query(`DELETE FROM "UserTutorialState"`)).rejects.toMatchObject(DENIED);
      await expect(insertAsApp("uts_user_a2", A)).rejects.toMatchObject(DENIED);
    });
  });

  it("clés étrangères : institut ou utilisateur inconnu refusé ; la suppression du User supprime son état", async () => {
    await admin.query(`INSERT INTO "UserTutorialState"("userId","organizationId") VALUES ('uts_user_a2','${A}')`);
    await expect(
      admin.query(`INSERT INTO "UserTutorialState"("userId","organizationId") VALUES ('uts_user_inconnu','${A}')`),
    ).rejects.toMatchObject({ code: "23503" });
    await expect(
      admin.query(`UPDATE "UserTutorialState" SET "organizationId" = 'uts_org_inconnue' WHERE "userId" = 'uts_user_a2'`),
    ).rejects.toMatchObject({ code: "23503" });

    await admin.query(`DELETE FROM "User" WHERE id = 'uts_user_a2'`);
    expect((await admin.query(`SELECT count(*)::int n FROM "UserTutorialState" WHERE "userId" = 'uts_user_a2'`)).rows[0].n).toBe(0);
    // Les autres états ne sont pas touchés.
    expect((await admin.query(`SELECT count(*)::int n FROM "UserTutorialState" WHERE "userId" IN ('uts_user_a','uts_user_b')`)).rows[0].n).toBe(2);
  });

  it("la suppression de l'institut supprime les états de ses utilisateurs (cascade)", async () => {
    await admin.query(`DELETE FROM "Organization" WHERE id = '${B}'`);
    expect((await admin.query(`SELECT count(*)::int n FROM "UserTutorialState" WHERE "userId" = 'uts_user_b'`)).rows[0].n).toBe(0);
    expect((await admin.query(`SELECT count(*)::int n FROM "UserTutorialState" WHERE "userId" = 'uts_user_a'`)).rows[0].n).toBe(1);
  });

  it("la migration se rejoue sans effet de bord (données, politique unique, droits identiques)", async () => {
    const sql = fs.readFileSync(MIGRATION, "utf8");
    const snapshot = async () => ({
      rows: (await admin.query(`SELECT count(*)::int n FROM "UserTutorialState"`)).rows[0].n,
      policies: (await admin.query(`SELECT policyname, cmd FROM pg_policies WHERE tablename = 'UserTutorialState'`)).rows,
      acl: (await admin.query(`SELECT relacl::text AS acl FROM pg_class WHERE relname = 'UserTutorialState' AND relnamespace = 'public'::regnamespace`)).rows[0].acl,
      colAcl: (
        await admin.query(
          `SELECT attname, attacl::text AS acl FROM pg_attribute WHERE attrelid = '"UserTutorialState"'::regclass AND attnum > 0 AND NOT attisdropped ORDER BY attnum`,
        )
      ).rows,
    });
    const before = await snapshot();
    await admin.query(sql);
    await admin.query(sql);
    expect(await snapshot()).toEqual(before);
    expect(before.policies).toEqual([{ policyname: "tenant_isolation", cmd: "ALL" }]);
  });
});
