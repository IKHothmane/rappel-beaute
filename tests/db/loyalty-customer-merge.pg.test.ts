import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client, Pool } from "pg";
import { bindOrganization, runAsJob, runInScope } from "@/lib/db/tenant-context";
import { appPool, prepareRoles, roleUrl, rolesAdminUrl } from "./role-pools";

/**
 * Migration 20261115120000_loyalty_customer_merge : cartes alias (LoyaltyCard.mergedIntoCardId),
 * journal CustomerMerge sous RLS et app_public_card_by_token qui suit l'alias. Vérifié avec les
 * rôles applicatifs sur une base locale jetable uniquement (rolesAdminUrl impose 127.0.0.1 / localhost).
 */
const adminUrl = rolesAdminUrl();
const A = "lcm_org_a";
const B = "lcm_org_b";
const C = "lcm_org_c";
const DENIED = { code: "42501" };
const MIGRATION = path.join(
  process.cwd(),
  "prisma/migrations/20261115120000_loyalty_customer_merge/migration.sql",
);

describe.skipIf(!adminUrl)("fusion de fiches clientes : cartes alias, journal et résolution du jeton", () => {
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
  const resolve = async (token: string) =>
    (await pool.query(`SELECT id, "organizationId" FROM app_public_card_by_token($1)`, [token])).rows;
  const mergeIds = async () =>
    (await pool.query(`SELECT id FROM "CustomerMerge" WHERE id LIKE 'lcm_%' ORDER BY id`)).rows.map((r) => r.id as string);

  async function cleanup() {
    await admin.query(`DELETE FROM "Organization" WHERE id IN ('${A}','${B}','${C}')`);
  }

  async function customer(id: string, org: string) {
    await admin.query(
      `INSERT INTO "Customer"(id,"organizationId","firstName","lastName",phone,"updatedAt") VALUES ($1,$2,'x','y',$1,now())`,
      [id, org],
    );
  }
  async function card(id: string, org: string, customerId: string, status = "ACTIVE", into: string | null = null) {
    await admin.query(
      `INSERT INTO "LoyaltyCard"(id,"organizationId","customerId","publicToken",status,"mergedIntoCardId","updatedAt")
       VALUES ($1,$2,$3,'tok_'||$1,$4,$5,now())`,
      [id, org, customerId, status, into],
    );
  }
  async function merge(id: string, org: string, source: string, key: string, status = "COMPLETED") {
    await admin.query(
      `INSERT INTO "CustomerMerge"(id,"organizationId","sourceCustomerId","targetCustomerId","idempotencyKey",status,"snapshotBefore")
       VALUES ($1,$2,$3,'t_'||$3,$4,$5,'{"cards":[]}'::jsonb)`,
      [id, org, source, key, status],
    );
  }

  beforeAll(async () => {
    admin = new Client({ connectionString: adminUrl });
    await admin.connect();
    restoreEnv = await prepareRoles(admin, adminUrl);
    await cleanup();
    for (const org of [A, B, C]) {
      await admin.query(`INSERT INTO "Organization"(id,name,slug,"updatedAt") VALUES ($1,$1,$1,now())`, [org]);
    }
    // Institut A : T (survivante), S (alias), U (carte ACTIVE sans fusion), V (alias d'une survivante désactivée).
    for (const id of ["lcm_t", "lcm_s", "lcm_u", "lcm_v", "lcm_w"]) await customer(id, A);
    await card("lcm_card_t", A, "lcm_t");
    await card("lcm_card_s", A, "lcm_s", "MERGED", "lcm_card_t");
    await card("lcm_card_u", A, "lcm_u");
    await card("lcm_card_w", A, "lcm_w", "DISABLED");
    await card("lcm_card_v", A, "lcm_v", "MERGED", "lcm_card_w");
    // Institut B : une carte ACTIVE, et un alias dont la cible est dans A (donnée incohérente, jamais suivie).
    await customer("lcm_b1", B);
    await customer("lcm_b2", B);
    await card("lcm_card_b1", B, "lcm_b1");
    await card("lcm_card_b2", B, "lcm_b2", "MERGED", "lcm_card_t");
    await merge("lcm_merge_a1", A, "lcm_s", "key-a1");
    await merge("lcm_merge_b1", B, "lcm_b2", "key-b1");
    pool = appPool(adminUrl);
  });

  afterAll(async () => {
    await pool?.end().catch(() => null);
    await cleanup().catch(() => null);
    await admin?.end();
    restoreEnv?.();
  });

  it("app_public_card_by_token : une carte alias renvoie la carte survivante", async () => {
    await asPublic(async () => {
      expect(await resolve("tok_lcm_card_s")).toEqual([{ id: "lcm_card_t", organizationId: A }]);
    });
  });

  it("app_public_card_by_token : une carte ACTIVE est inchangée, un jeton inconnu ne renvoie rien", async () => {
    await asPublic(async () => {
      expect(await resolve("tok_lcm_card_t")).toEqual([{ id: "lcm_card_t", organizationId: A }]);
      expect(await resolve("tok_lcm_card_u")).toEqual([{ id: "lcm_card_u", organizationId: A }]);
      expect(await resolve("tok_lcm_card_b1")).toEqual([{ id: "lcm_card_b1", organizationId: B }]);
      expect(await resolve("tok_inconnu")).toEqual([]);
    });
  });

  it("app_public_card_by_token : ne renvoie ni une survivante inactive ni une cible d'un autre institut", async () => {
    await asPublic(async () => {
      expect(await resolve("tok_lcm_card_w")).toEqual([]); // carte non ACTIVE : comme avant
      expect(await resolve("tok_lcm_card_v")).toEqual([]); // alias vers une survivante non ACTIVE
      expect(await resolve("tok_lcm_card_b2")).toEqual([]); // alias de B pointant vers une carte de A
    });
  });

  it("app_public_card_by_token : SECURITY DEFINER, search_path figé, droit d'exécution limité à rappel_public", async () => {
    const { rows } = await admin.query(
      `SELECT prosecdef, proconfig, pg_get_function_result(oid) AS result,
              has_function_privilege('rappel_public', oid, 'EXECUTE') AS pub,
              has_function_privilege('public', oid, 'EXECUTE') AS everyone
       FROM pg_proc WHERE proname = 'app_public_card_by_token'`,
    );
    expect(rows).toEqual([
      {
        prosecdef: true,
        proconfig: ["search_path=pg_catalog"],
        result: 'TABLE(id text, "organizationId" text)',
        pub: true,
        everyone: false,
      },
    ]);
  });

  it("CustomerMerge : rappel_public et rappel_job n'y ont aucun accès", async () => {
    await asPublic(async () => {
      await expect(pool.query(`SELECT count(*)::int n FROM "CustomerMerge"`)).rejects.toMatchObject(DENIED);
      await expect(
        pool.query(
          `INSERT INTO "CustomerMerge"(id,"organizationId","sourceCustomerId","targetCustomerId","idempotencyKey","snapshotBefore")
           VALUES ('lcm_pub',$1,'s','t','k','{}'::jsonb)`,
          [A],
        ),
      ).rejects.toMatchObject(DENIED);
    });
    await asJob(async () => {
      await expect(pool.query(`SELECT count(*)::int n FROM "CustomerMerge"`)).rejects.toMatchObject(DENIED);
      await expect(pool.query(`DELETE FROM "CustomerMerge"`)).rejects.toMatchObject(DENIED);
    });
    const { rows } = await admin.query(
      `SELECT has_table_privilege('rappel_public','"CustomerMerge"','SELECT') AS pub,
              has_table_privilege('rappel_job','"CustomerMerge"','SELECT') AS job,
              has_table_privilege('public','"CustomerMerge"','SELECT') AS everyone,
              has_table_privilege('rappel_app','"CustomerMerge"','SELECT,INSERT,UPDATE,DELETE') AS app,
              has_table_privilege('rappel_platform','"CustomerMerge"','SELECT,INSERT,UPDATE,DELETE') AS platform`,
    );
    expect(rows[0]).toEqual({ pub: false, job: false, everyone: false, app: true, platform: true });
  });

  it("CustomerMerge : un institut ne voit, n'écrit et ne modifie que ses fusions", async () => {
    await tenant(A, async () => {
      expect(await mergeIds()).toEqual(["lcm_merge_a1"]);
      expect((await pool.query(`SELECT count(*)::int n FROM "CustomerMerge" WHERE "organizationId" = $1`, [B])).rows[0].n).toBe(0);
      expect((await pool.query(`UPDATE "CustomerMerge" SET status = 'REVERTED' WHERE id = 'lcm_merge_b1'`)).rowCount).toBe(0);
      expect((await pool.query(`DELETE FROM "CustomerMerge" WHERE id = 'lcm_merge_b1'`)).rowCount).toBe(0);
      await expect(
        pool.query(
          `INSERT INTO "CustomerMerge"(id,"organizationId","sourceCustomerId","targetCustomerId","idempotencyKey","snapshotBefore")
           VALUES ('lcm_cross',$1,'s','t','k','{}'::jsonb)`,
          [B],
        ),
      ).rejects.toMatchObject(DENIED);
      const own = await pool.query(
        `INSERT INTO "CustomerMerge"(id,"organizationId","sourceCustomerId","targetCustomerId","idempotencyKey","snapshotBefore")
         VALUES ('lcm_own',$1,'lcm_u','lcm_t','key-own','{}'::jsonb) RETURNING moved, stats, status`,
        [A],
      );
      expect(own.rows[0]).toEqual({ moved: {}, stats: {}, status: "COMPLETED" });
    });
    await tenant(B, async () => {
      expect(await mergeIds()).toEqual(["lcm_merge_b1"]);
    });
    await tenant(C, async () => {
      expect(await mergeIds()).toEqual([]);
    });
    // Sans institut annoncé, une connexion rappel_app ne lit rien.
    const raw = new Client({ connectionString: roleUrl(adminUrl, "rappel_app") });
    await raw.connect();
    try {
      expect((await raw.query(`SELECT count(*)::int n FROM "CustomerMerge"`)).rows[0].n).toBe(0);
    } finally {
      await raw.end();
    }
    await asPlatform(async () => {
      expect(await mergeIds()).toEqual(["lcm_merge_a1", "lcm_merge_b1", "lcm_own"]);
    });
    await admin.query(`DELETE FROM "CustomerMerge" WHERE id = 'lcm_own'`);
  });

  it("CustomerMerge : clé d'idempotence unique par institut, une seule fusion COMPLETED par fiche source, statuts contrôlés", async () => {
    await expect(merge("lcm_dup_key", A, "lcm_u", "key-a1")).rejects.toMatchObject({ code: "23505" });
    await merge("lcm_other_org_same_key", C, "lcm_s", "key-a1"); // même clé dans un autre institut : permis
    await expect(merge("lcm_dup_source", A, "lcm_s", "key-a2")).rejects.toMatchObject({ code: "23505" });
    await admin.query(`UPDATE "CustomerMerge" SET status = 'REVERTED', "revertedAt" = now() WHERE id = 'lcm_merge_a1'`);
    await merge("lcm_redo", A, "lcm_s", "key-a3"); // une fois défaite, la fiche peut être refusionnée
    await expect(merge("lcm_bad", A, "lcm_u", "key-bad", "PENDING")).rejects.toMatchObject({ code: "23514" });
    await admin.query(`DELETE FROM "CustomerMerge" WHERE id IN ('lcm_other_org_same_key','lcm_redo')`);
    await admin.query(`UPDATE "CustomerMerge" SET status = 'COMPLETED', "revertedAt" = NULL WHERE id = 'lcm_merge_a1'`);
  });

  it("LoyaltyCard : un alias exige une cible, la cible est une carte existante", async () => {
    await expect(card("lcm_card_bad", A, "lcm_u", "MERGED", null)).rejects.toMatchObject({ code: "23514" });
    await expect(admin.query(`UPDATE "LoyaltyCard" SET status = 'MERGED' WHERE id = 'lcm_card_u'`)).rejects.toMatchObject({ code: "23514" });
    await customer("lcm_x", A);
    await expect(card("lcm_card_bad2", A, "lcm_x", "MERGED", "lcm_nope")).rejects.toMatchObject({ code: "23503" });
  });

  it("LoyaltyCard : supprimer la survivante tant qu'un alias la référence échoue (limite connue), la cascade d'institut passe", async () => {
    await expect(admin.query(`DELETE FROM "LoyaltyCard" WHERE id = 'lcm_card_t'`)).rejects.toMatchObject({ code: "23514" });
    // Cascade : fiche, cartes, alias et journal d'un institut disparaissent avec lui.
    await customer("lcm_c1", C);
    await customer("lcm_c2", C);
    await card("lcm_card_c1", C, "lcm_c1");
    await card("lcm_card_c2", C, "lcm_c2", "MERGED", "lcm_card_c1");
    await merge("lcm_merge_c2", C, "lcm_c2", "key-c2");
    await admin.query(`DELETE FROM "Organization" WHERE id = $1`, [C]);
    const { rows } = await admin.query(
      `SELECT (SELECT count(*)::int FROM "LoyaltyCard" WHERE "organizationId" = $1) AS cards,
              (SELECT count(*)::int FROM "CustomerMerge" WHERE "organizationId" = $1) AS merges`,
      [C],
    );
    expect(rows[0]).toEqual({ cards: 0, merges: 0 });
  });

  it("la migration se rejoue sans effet de bord et sans toucher aux données", async () => {
    const before = (await admin.query(`SELECT count(*)::int n FROM "LoyaltyCard"`)).rows[0].n;
    const sql = fs.readFileSync(MIGRATION, "utf8");
    await admin.query(sql);
    await admin.query(sql);
    expect((await admin.query(`SELECT count(*)::int n FROM "LoyaltyCard"`)).rows[0].n).toBe(before);
    const { rows } = await admin.query(
      `SELECT (SELECT count(*)::int FROM pg_policies WHERE tablename = 'CustomerMerge' AND policyname = 'tenant_isolation') AS policies,
              (SELECT count(*)::int FROM pg_indexes WHERE tablename = 'CustomerMerge') AS merge_indexes,
              (SELECT count(*)::int FROM pg_indexes WHERE indexname IN ('LoyaltyCard_mergedIntoCardId_idx','Customer_mergedIntoCustomerId_idx')) AS other_indexes,
              (SELECT relrowsecurity FROM pg_class WHERE oid = '"CustomerMerge"'::regclass) AS rls`,
    );
    expect(rows[0]).toEqual({ policies: 1, merge_indexes: 4, other_indexes: 2, rls: true });
    await asPublic(async () => {
      expect(await resolve("tok_lcm_card_s")).toEqual([{ id: "lcm_card_t", organizationId: A }]);
    });
  });
});
