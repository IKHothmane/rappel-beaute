import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client, Pool } from "pg";
import { bindOrganization, bindPublicInstitute, runAsJob, runInScope } from "@/lib/db/tenant-context";
import { appPool, prepareRoles, roleUrl, rolesAdminUrl } from "../db/role-pools";

/**
 * Migration 20261115101000_platform_tables_rls, vérifiée avec les quatre rôles sur une base locale jetable
 * (RLS_TEST_DATABASE_URL ou DATABASE_TEST_URL, adresse locale seulement).
 */
const adminUrl = rolesAdminUrl();
const A = "pt_rls_a";
const B = "pt_rls_b";
const DENIED = { code: "42501" };

describe.skipIf(!adminUrl)("tables sans institut : Organization, Plan, catalogues, Apple Wallet, back-office", () => {
  let admin: Client;
  let pool: Pool;
  let restoreEnv: () => void;
  let resourceType = "";

  const tenant = <T,>(org: string | null, fn: () => Promise<T>) =>
    runInScope({ kind: "tenant", organizationId: null }, async () => {
      bindOrganization(org);
      return fn();
    });
  const asPublic = <T,>(fn: () => Promise<T>) => runInScope({ kind: "public", reason: "test" }, fn);
  const asPlatform = <T,>(fn: () => Promise<T>) => runInScope({ kind: "platform", reason: "test" }, fn);
  const asJob = <T,>(fn: () => Promise<T>) => runAsJob("test", fn);
  const ids = async () =>
    (await pool.query(`SELECT id FROM "Organization" WHERE id LIKE 'pt_rls_%' ORDER BY 1`)).rows.map((r) => r.id as string);
  const role = async () => (await pool.query(`SELECT current_user u`)).rows[0].u as string;

  beforeAll(async () => {
    admin = new Client({ connectionString: adminUrl });
    await admin.connect();
    restoreEnv = await prepareRoles(admin, adminUrl);
    await cleanup();
    await admin.query(`INSERT INTO "Organization"(id,name,slug,"updatedAt") VALUES ('${A}','A','${A}',now()),('${B}','B','${B}',now())`);
    resourceType = (await admin.query(`SELECT enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'ResourceType' ORDER BY enumsortorder LIMIT 1`)).rows[0].enumlabel;
    pool = appPool(adminUrl);
  });

  async function cleanup() {
    await admin.query(`DELETE FROM "Organization" WHERE id LIKE 'pt_rls_%'`);
    await admin.query(`DELETE FROM "Plan" WHERE id = 'pt_rls_plan'`);
    await admin.query(`DELETE FROM "ServiceCatalogDefault" WHERE id LIKE 'pt_rls_%'`);
    await admin.query(`DELETE FROM "ResourceCatalogDefault" WHERE id LIKE 'pt_rls_%'`);
    await admin.query(`DELETE FROM "AppleWalletDevice" WHERE id LIKE 'pt_rls_%'`);
    await admin.query(`DELETE FROM "BlogQuestion" WHERE id LIKE 'pt_rls_%'`);
  }

  afterAll(async () => {
    await pool?.end().catch(() => null);
    await cleanup().catch(() => null);
    await admin?.end();
    restoreEnv?.();
  });

  it("Organization : l'institut ne voit et ne modifie que sa ligne, jamais le statut ni la suppression", async () => {
    await tenant(A, async () => {
      expect(await role()).toBe("rappel_app");
      expect(await ids()).toEqual([A]);
      expect((await pool.query(`UPDATE "Organization" SET "logoUrl"='x', website='w', address='a', "whatsappFrom"='+212600000000', "updatedAt"=NOW() WHERE id=$1`, [A])).rowCount).toBe(1);
      expect((await pool.query(`UPDATE "Organization" SET "logoUrl"='hack' WHERE id=$1`, [B])).rowCount).toBe(0);
      await expect(pool.query(`UPDATE "Organization" SET status='SUSPENDED' WHERE id=$1`, [A])).rejects.toMatchObject(DENIED);
      await expect(pool.query(`UPDATE "Organization" SET name='x' WHERE id=$1`, [A])).rejects.toMatchObject(DENIED);
      await expect(pool.query(`UPDATE "Organization" SET slug='x' WHERE id=$1`, [A])).rejects.toMatchObject(DENIED);
      await expect(pool.query(`DELETE FROM "Organization" WHERE id=$1`, [A])).rejects.toMatchObject(DENIED);
      await expect(
        pool.query(`INSERT INTO "Organization"(id,name,slug,"updatedAt") VALUES ('pt_rls_c','C','pt_rls_c',now())`),
      ).rejects.toMatchObject(DENIED);
    });
    expect((await admin.query(`SELECT "logoUrl" l, status::text s FROM "Organization" WHERE id=$1`, [B])).rows[0]).toEqual({ l: null, s: "ACTIVE" });
    // Sans contexte, une connexion rappel_app ne lit rien.
    const raw = new Client({ connectionString: roleUrl(adminUrl, "rappel_app") });
    await raw.connect();
    expect((await raw.query(`SELECT count(*)::int n FROM "Organization" WHERE id LIKE 'pt_rls_%'`)).rows[0].n).toBe(0);
    await raw.end();
  });

  it("Organization : la route publique lit tout, crée seulement l'institut qu'elle a annoncé, ne modifie rien", async () => {
    await asPublic(async () => {
      expect(await role()).toBe("rappel_public");
      expect(await ids()).toEqual([A, B]);
      await expect(pool.query(`UPDATE "Organization" SET "logoUrl"='x' WHERE id=$1`, [A])).rejects.toMatchObject(DENIED);
      await expect(pool.query(`DELETE FROM "Organization" WHERE id=$1`, [A])).rejects.toMatchObject(DENIED);
      // Sans institut annoncé : refusé (c'est ce que corrige bindPublicInstitute dans public-signup).
      await expect(
        pool.query(`INSERT INTO "Organization"(id,name,slug,"updatedAt") VALUES ('pt_rls_new','N','pt_rls_new',now())`),
      ).rejects.toMatchObject(DENIED);
    });
    await asPublic(async () => {
      bindPublicInstitute("pt_rls_new");
      // Un autre identifiant que celui annoncé reste refusé.
      await expect(
        pool.query(`INSERT INTO "Organization"(id,name,slug,"updatedAt") VALUES ('pt_rls_other','N','pt_rls_other',now())`),
      ).rejects.toMatchObject(DENIED);
      await pool.query(`INSERT INTO "Organization"(id,name,slug,"updatedAt") VALUES ('pt_rls_new','N','pt_rls_new',now())`);
    });
    expect((await admin.query(`SELECT count(*)::int n FROM "Organization" WHERE id IN ('pt_rls_new','pt_rls_other')`)).rows[0].n).toBe(1);
  });

  it("Organization : la tâche lit et met à jour sans créer ni supprimer, le back-office fait tout", async () => {
    await asJob(async () => {
      expect(await role()).toBe("rappel_job");
      expect(await ids()).toEqual([A, B, "pt_rls_new"]);
      expect((await pool.query(`UPDATE "Organization" SET "updatedAt"=NOW() WHERE id=$1`, [B])).rowCount).toBe(1);
      await expect(
        pool.query(`INSERT INTO "Organization"(id,name,slug,"updatedAt") VALUES ('pt_rls_job','J','pt_rls_job',now())`),
      ).rejects.toMatchObject(DENIED);
      await expect(pool.query(`DELETE FROM "Organization" WHERE id=$1`, [B])).rejects.toMatchObject(DENIED);
    });
    await asPlatform(async () => {
      expect(await role()).toBe("rappel_platform");
      expect(await ids()).toEqual([A, B, "pt_rls_new"]);
      expect((await pool.query(`UPDATE "Organization" SET status='SUSPENDED', "updatedAt"=NOW() WHERE id=$1`, [B])).rowCount).toBe(1);
      await pool.query(`INSERT INTO "Organization"(id,name,slug,"updatedAt") VALUES ('pt_rls_plat','P','pt_rls_plat',now())`);
      expect((await pool.query(`DELETE FROM "Organization" WHERE id IN ('pt_rls_plat','pt_rls_new')`)).rowCount).toBe(2);
    });
  });

  it("Plan et catalogues : lisibles par tous les rôles, modifiables par le back-office seul", async () => {
    const readers = [
      (fn: () => Promise<unknown>) => tenant(A, fn),
      asPublic,
      asJob,
      asPlatform,
    ];
    for (const run of readers) {
      await run(async () => {
        expect((await pool.query(`SELECT count(*)::int n FROM "Plan"`)).rows[0].n).toBeGreaterThan(0);
        await pool.query(`SELECT count(*) FROM "ServiceCatalogDefault"`);
        await pool.query(`SELECT count(*) FROM "ResourceCatalogDefault"`);
      });
    }
    for (const run of [(fn: () => Promise<unknown>) => tenant(A, fn), asPublic, asJob]) {
      await run(async () => {
        await expect(pool.query(`UPDATE "Plan" SET name = name`)).rejects.toMatchObject(DENIED);
        await expect(
          pool.query(`INSERT INTO "Plan"(id,code,name,price,"updatedAt") VALUES ('pt_rls_plan','PT','x',1,now())`),
        ).rejects.toMatchObject(DENIED);
        await expect(pool.query(`DELETE FROM "Plan"`)).rejects.toMatchObject(DENIED);
        await expect(
          pool.query(`INSERT INTO "ServiceCatalogDefault"(id,name,"imageUrl","updatedAt") VALUES ('pt_rls_s','x','u',now())`),
        ).rejects.toMatchObject(DENIED);
        await expect(pool.query(`DELETE FROM "ServiceCatalogDefault"`)).rejects.toMatchObject(DENIED);
        await expect(
          pool.query(`INSERT INTO "ResourceCatalogDefault"(id,type,"imageUrl","updatedAt") VALUES ('pt_rls_r',$1::"ResourceType",'u',now())`, [resourceType]),
        ).rejects.toMatchObject(DENIED);
      });
    }
    await asPlatform(async () => {
      await pool.query(`INSERT INTO "Plan"(id,code,name,price,"updatedAt") VALUES ('pt_rls_plan','PT','x',1,now())`);
      expect((await pool.query(`UPDATE "Plan" SET name='y' WHERE id='pt_rls_plan'`)).rowCount).toBe(1);
      expect((await pool.query(`DELETE FROM "Plan" WHERE id='pt_rls_plan'`)).rowCount).toBe(1);
      await pool.query(`INSERT INTO "ServiceCatalogDefault"(id,name,"imageUrl","updatedAt") VALUES ('pt_rls_s','pt_rls_soin','u',now())`);
      await pool.query(`INSERT INTO "ResourceCatalogDefault"(id,type,"imageUrl","updatedAt") VALUES ('pt_rls_r',$1::"ResourceType",'u',now())`, [resourceType]);
    });
    // Un institut lit bien ce que le back-office a publié.
    await tenant(A, async () => {
      expect((await pool.query(`SELECT count(*)::int n FROM "ServiceCatalogDefault" WHERE id='pt_rls_s'`)).rows[0].n).toBe(1);
    });
  });

  it("publicités et questions du blog : back-office seulement", async () => {
    await asPlatform(async () => {
      await pool.query(`INSERT INTO "BlogQuestion"(id,fingerprint,question,category) VALUES ('pt_rls_q','pt_rls_fp','q','c')`);
      expect((await pool.query(`SELECT count(*)::int n FROM "BlogQuestion" WHERE id='pt_rls_q'`)).rows[0].n).toBe(1);
      for (const table of ["AdsAgentConfig", "AdsAgentDecision", "AdsCampaignSnapshot"]) {
        await pool.query(`SELECT count(*) FROM "${table}"`);
      }
    });
    for (const run of [(fn: () => Promise<unknown>) => tenant(A, fn), asPublic, asJob]) {
      await run(async () => {
        for (const table of ["BlogQuestion", "AdsAgentConfig", "AdsAgentDecision", "AdsCampaignSnapshot"]) {
          await expect(pool.query(`SELECT count(*) FROM "${table}"`), table).rejects.toMatchObject(DENIED);
          await expect(pool.query(`DELETE FROM "${table}"`), table).rejects.toMatchObject(DENIED);
        }
        await expect(
          pool.query(`INSERT INTO "BlogQuestion"(id,fingerprint,question,category) VALUES ('pt_rls_q2','pt_rls_fp2','q','c')`),
        ).rejects.toMatchObject(DENIED);
      });
    }
  });

  it("AppleWalletDevice : fermée à l'institut, ouverte aux routes publiques, à la tâche et au back-office", async () => {
    await tenant(A, async () => {
      await expect(pool.query(`SELECT count(*) FROM "AppleWalletDevice"`)).rejects.toMatchObject(DENIED);
      await expect(
        pool.query(`INSERT INTO "AppleWalletDevice"(id,"deviceLibraryIdentifier","pushToken") VALUES ('pt_rls_d0','dev0','tok')`),
      ).rejects.toMatchObject(DENIED);
    });
    await asPublic(async () => {
      await pool.query(
        `INSERT INTO "AppleWalletDevice"(id,"deviceLibraryIdentifier","pushToken") VALUES ('pt_rls_d1','pt_rls_dev1','tok')
         ON CONFLICT ("deviceLibraryIdentifier") DO UPDATE SET "pushToken" = EXCLUDED."pushToken"`,
      );
      expect((await pool.query(`SELECT count(*)::int n FROM "AppleWalletDevice" WHERE id='pt_rls_d1'`)).rows[0].n).toBe(1);
    });
    await asJob(async () => {
      expect((await pool.query(`DELETE FROM "AppleWalletDevice" WHERE id='pt_rls_d1'`)).rowCount).toBe(1);
    });
    await asPlatform(async () => {
      await pool.query(`SELECT count(*) FROM "AppleWalletDevice"`);
    });
  });

  it("les quatre rôles restent sans privilège excessif", async () => {
    const flags = await admin.query(
      `SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname IN ('rappel_app','rappel_platform','rappel_public','rappel_job') ORDER BY 1`,
    );
    expect(flags.rows.every((r) => !r.rolsuper && !r.rolbypassrls)).toBe(true);
    const rls = await admin.query(
      `SELECT relname FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind = 'r' AND NOT relrowsecurity ORDER BY 1`,
    );
    expect(rls.rows.map((r) => r.relname)).toEqual(["_prisma_migrations"]);
  });
});
