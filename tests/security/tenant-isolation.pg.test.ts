import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Client, Pool } from "pg";
import { runAsJob, runInScope, bindOrganization, TenantContextError } from "@/lib/db/tenant-context";
import { withTenantIsolation } from "@/lib/db/tenant-pool";

/**
 * Isolation sur un vrai PostgreSQL. Ces tests écrivent en base :
 * ils ne s'exécutent que si RLS_TEST_DATABASE_URL pointe vers une base locale jetable (rôle propriétaire).
 */
const adminUrl = process.env.RLS_TEST_DATABASE_URL ?? "";
const localOnly = /@(127\.0\.0\.1|localhost)[:/]/.test(adminUrl);
const A = "rls_test_a";
const B = "rls_test_b";
const PASSWORD = "local-test-only-password-000";
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function appUrl(): string {
  const url = new URL(adminUrl);
  url.username = "rappel_app";
  url.password = PASSWORD;
  return url.toString();
}

describe.skipIf(!localOnly)("isolation sur PostgreSQL réel", () => {
  let admin: Client;
  const pools: Pool[] = [];
  const makePool = (max = 5, url = appUrl()) => {
    const pool = withTenantIsolation(new Pool({ connectionString: url, max }));
    pools.push(pool);
    return pool;
  };
  let pool: Pool;
  const original = process.env.RLS_ENFORCE;

  const tenant = <T,>(org: string | null, fn: () => Promise<T>) =>
    runInScope({ kind: "tenant", organizationId: null }, async () => {
      await wait(Math.random() * 2);
      bindOrganization(org);
      return fn();
    });
  const orgs = async (p: Pool = pool) =>
    (await p.query(`SELECT "organizationId" o FROM "Customer" WHERE id LIKE 'rls_test_%' ORDER BY 1`)).rows.map((r) => r.o).join();
  const killOthers = (appName: string) =>
    admin.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE usename='rappel_app' AND application_name=$1`, [appName]);

  beforeAll(async () => {
    admin = new Client({ connectionString: adminUrl });
    await admin.connect();
    await admin.query(`ALTER ROLE rappel_app LOGIN PASSWORD '${PASSWORD}'`);
    await admin.query(`DELETE FROM "Organization" WHERE id IN ('${A}','${B}')`);
    await admin.query(`INSERT INTO "Organization"(id,name,slug,"updatedAt") VALUES ('${A}','A','${A}',now()),('${B}','B','${B}',now())`);
    for (const org of [A, B]) {
      await admin.query(`INSERT INTO "Customer"(id,"organizationId","firstName","lastName",phone,"updatedAt") VALUES ('rls_test_c_${org}','${org}','x','y','${org}',now())`);
      await admin.query(`INSERT INTO "Service"(id,"organizationId",name,price,"durationMin","updatedAt") VALUES ('rls_test_s_${org}','${org}','s',1,1,now())`);
      await admin.query(`INSERT INTO "Staff"(id,"organizationId","firstName","lastName","updatedAt") VALUES ('rls_test_e_${org}','${org}','x','y',now())`);
      await admin.query(`INSERT INTO "ServiceStaff"("serviceId","staffId") VALUES ('rls_test_s_${org}','rls_test_e_${org}')`);
    }
    pool = makePool();
  });

  beforeEach(() => {
    process.env.RLS_ENFORCE = "all";
  });

  afterAll(async () => {
    if (original === undefined) delete process.env.RLS_ENFORCE;
    else process.env.RLS_ENFORCE = original;
    await Promise.all(pools.map((p) => p.end().catch(() => null)));
    await admin?.query(`DELETE FROM "Organization" WHERE id IN ('${A}','${B}')`);
    await admin?.end();
  });

  it("refuse tout à une connexion qui n'annonce rien (base en refus par défaut)", async () => {
    const raw = new Client({ connectionString: appUrl() });
    await raw.connect();
    expect((await raw.query(`SELECT count(*)::int n FROM "Customer"`)).rows[0].n).toBe(0);
    await expect(raw.query(`INSERT INTO "Customer"(id,"organizationId","firstName","lastName",phone,"updatedAt") VALUES ('rls_test_x','${A}','x','y','zz',now())`)).rejects.toMatchObject({ code: "42501" });
    await raw.end();
  });

  it("le rôle réel ne peut ni changer de rôle ni contourner les règles", async () => {
    const raw = new Client({ connectionString: appUrl() });
    await raw.connect();
    for (const sql of [`SET ROLE postgres`, `SET SESSION AUTHORIZATION postgres`, `ALTER TABLE "Customer" DISABLE ROW LEVEL SECURITY`, `DROP POLICY tenant_isolation ON "Customer"`, `TRUNCATE "Customer"`, `CREATE TABLE zz(a int)`, `SET session_replication_role = replica`]) {
      await expect(raw.query(sql), sql).rejects.toBeTruthy();
    }
    await raw.end();
  });

  it("limite un institut à ses lignes, tables enfants comprises", async () => {
    await tenant(A, async () => {
      expect(await orgs()).toBe(A);
      expect((await pool.query(`SELECT count(*)::int n FROM "Customer" WHERE "organizationId"='${B}'`)).rows[0].n).toBe(0);
      expect((await pool.query(`SELECT count(*)::int n FROM "ServiceStaff" WHERE "serviceId" LIKE 'rls_test_%'`)).rows[0].n).toBe(1);
      expect((await pool.query(`UPDATE "Customer" SET notes='x' WHERE "organizationId"='${B}'`)).rowCount).toBe(0);
      expect((await pool.query(`DELETE FROM "Customer" WHERE "organizationId"='${B}'`)).rowCount).toBe(0);
      await expect(pool.query(`INSERT INTO "Customer"(id,"organizationId","firstName","lastName",phone,"updatedAt") VALUES ('rls_test_y','${B}','x','y','yy',now())`)).rejects.toMatchObject({ code: "42501" });
    });
  });

  it("refuse une route métier sans institut, sans exécuter la requête", async () => {
    await expect(tenant(null, () => pool.query("SELECT 1"))).rejects.toBeInstanceOf(TenantContextError);
  });

  it("refuse un accès sans portée en mode all, l'autorise en mode liste", async () => {
    await expect(pool.query("SELECT 1")).rejects.toBeInstanceOf(TenantContextError);
    process.env.RLS_ENFORCE = A;
    expect(await orgs()).toBe(`${A},${B}`);
  });

  it("laisse les accès explicitement autorisés traverser", async () => {
    expect(await runInScope({ kind: "public", reason: "t" }, () => orgs())).toBe(`${A},${B}`);
    expect(await runInScope({ kind: "platform", reason: "t" }, () => orgs())).toBe(`${A},${B}`);
    expect(await runAsJob("t", () => orgs())).toBe(`${A},${B}`);
  });

  it("n'applique le filtre qu'aux instituts listés", async () => {
    process.env.RLS_ENFORCE = A;
    expect(await tenant(A, () => orgs())).toBe(A);
    expect(await tenant(B, () => orgs())).toBe(`${A},${B}`);
  });

  it("isolation vide avec le rôle limité : comportement identique", async () => {
    process.env.RLS_ENFORCE = "";
    expect(await tenant(A, () => orgs())).toBe(`${A},${B}`);
    expect(await orgs()).toBe(`${A},${B}`);
    expect((await pool.query(`UPDATE "Customer" SET notes='z' WHERE id='rls_test_c_${B}'`)).rowCount).toBe(1);
  });

  it("le superutilisateur reste en accès direct, sans transaction ajoutée", async () => {
    process.env.RLS_ENFORCE = "";
    const sup = makePool(2, adminUrl);
    expect(await orgs(sup)).toBe(`${A},${B}`);
  });

  it("ne mélange aucun institut sous forte concurrence", async () => {
    let leaks = 0;
    await Promise.all(
      Array.from({ length: 400 }, async (_, i) => {
        const org = i % 3 === 0 ? A : i % 3 === 1 ? B : null;
        const want = org ?? `${A},${B}`;
        const run = async () => {
          if (i % 2) return orgs();
          const c = await pool.connect();
          try {
            await c.query("BEGIN");
            const r = (await c.query(`SELECT "organizationId" o FROM "Customer" WHERE id LIKE 'rls_test_%' ORDER BY 1`)).rows.map((x) => x.o).join();
            await c.query("COMMIT");
            return r;
          } finally {
            c.release();
          }
        };
        const got = org ? await tenant(org, run) : await runInScope({ kind: "public", reason: "t" }, run);
        if (got !== want) leaks++;
      }),
    );
    expect(leaks).toBe(0);
  }, 60_000);

  it("ne laisse aucun institut sur une connexion réutilisée", async () => {
    // Une seule connexion : A, puis B, puis A sur le même processus serveur.
    const one = makePool(1);
    const backend = () => one.query(`SELECT pg_backend_pid() p`).then((r) => r.rows[0].p);
    const first = await tenant(A, backend);
    expect(await tenant(B, () => orgs(one))).toBe(B);
    expect(await tenant(A, () => orgs(one))).toBe(A);
    expect(await tenant(B, backend)).toBe(first);
    process.env.RLS_ENFORCE = "";
    expect(await runInScope({ kind: "public", reason: "t" }, () => orgs(one))).toBe(`${A},${B}`);
  });

  it("le contexte disparaît à la fin de la transaction sur la même connexion", async () => {
    const one = new Pool({ connectionString: appUrl(), max: 1 });
    pools.push(one);
    const wrapped = withTenantIsolation(one);
    await tenant(A, async () => {
      const c = await wrapped.connect();
      await c.query("BEGIN");
      expect((await c.query(`SELECT current_setting('app.current_org', true) v`)).rows[0].v).toBe(A);
      await c.query("COMMIT");
      c.release();
    });
    await wait(30);
    process.env.RLS_ENFORCE = "";
    const seen = await runInScope({ kind: "public", reason: "t" }, async () => {
      const c = await wrapped.connect();
      const value = (await c.query(`SELECT coalesce(current_setting('app.current_org', true), '') v`)).rows[0].v;
      c.release();
      return value;
    });
    expect(seen).toBe("");
  });

  it("annule une transaction restée ouverte avant de réutiliser la connexion", async () => {
    const one = makePool(1);
    await tenant(A, async () => {
      const c = await one.connect();
      await c.query("BEGIN");
      await c.query(`INSERT INTO "Customer"(id,"organizationId","firstName","lastName",phone,"updatedAt") VALUES ('rls_test_open','${A}','x','y','open',now())`);
      c.release();
    });
    await wait(50);
    expect((await admin.query(`SELECT count(*)::int n FROM "Customer" WHERE id='rls_test_open'`)).rows[0].n).toBe(0);
    expect(await tenant(A, () => orgs(one))).toBe(A);
  });

  it("récupère après une transaction en échec", async () => {
    const one = makePool(1);
    await tenant(A, async () => {
      const c = await one.connect();
      await c.query("BEGIN");
      await expect(c.query("SELECT 1/0")).rejects.toBeTruthy();
      c.release();
    });
    await wait(50);
    expect(await tenant(A, () => orgs(one))).toBe(A);
  });

  it("une erreur de requête isolée annule sa transaction implicite", async () => {
    const one = makePool(1);
    await tenant(A, async () => {
      await expect(one.query("SELECT 1/0")).rejects.toMatchObject({ code: "22012" });
      expect(await orgs(one)).toBe(A);
    });
  });

  it("survit à une coupure pendant un emprunt puis se reconnecte", async () => {
    const name = "rls_kill_checkout";
    const url = new URL(appUrl());
    url.searchParams.set("application_name", name);
    const p = makePool(1, url.toString());
    await tenant(A, async () => {
      const c = await p.connect();
      await c.query("BEGIN");
      await killOthers(name);
      await wait(150);
      await expect(c.query("SELECT 1")).rejects.toBeTruthy();
      c.release();
    });
    await wait(100);
    expect(await tenant(A, () => orgs(p))).toBe(A);
  });

  it("survit à la coupure d'une connexion inactive du pool", async () => {
    const name = "rls_kill_idle";
    const url = new URL(appUrl());
    url.searchParams.set("application_name", name);
    const p = makePool(2, url.toString());
    await tenant(A, () => orgs(p));
    await killOthers(name);
    await wait(200);
    expect(await tenant(B, () => orgs(p))).toBe(B);
  });

  it("une requête en cours coupée échoue proprement, le pool repart", async () => {
    const name = "rls_kill_running";
    const url = new URL(appUrl());
    url.searchParams.set("application_name", name);
    const p = makePool(1, url.toString());
    await tenant(A, async () => {
      const running = expect(p.query("SELECT pg_sleep(5)")).rejects.toBeTruthy();
      await wait(150);
      await killOthers(name);
      await running;
    });
    await wait(100);
    expect(await tenant(A, () => orgs(p))).toBe(A);
  }, 20_000);
});
