import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Client, Pool } from "pg";
import { runAsJob, runInScope, bindOrganization, bindPublicInstitute, TenantContextError } from "@/lib/db/tenant-context";
import { withTenantIsolation } from "@/lib/db/tenant-pool";

/**
 * Isolation sur un vrai PostgreSQL. Ces tests écrivent en base :
 * ils ne s'exécutent que si RLS_TEST_DATABASE_URL pointe vers une base locale jetable (rôle propriétaire).
 */
const adminUrl = process.env.RLS_TEST_DATABASE_URL ?? "";
const localOnly = /@(127\.0\.0\.1|localhost)[:/]/.test(adminUrl);
if (localOnly && !process.env.RLS_CONTEXT_KEY) {
  process.env.RLS_CONTEXT_KEY = "local-rls-context-key-000000000000";
}
const A = "rls_test_a";
const B = "rls_test_b";
const PASSWORD = "local-test-only-password-000";
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function roleUrl(role: string): string {
  const url = new URL(adminUrl);
  url.username = role;
  url.password = PASSWORD;
  return url.toString();
}
function appUrl(): string {
  return roleUrl("rappel_app");
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
    for (const role of ["rappel_platform", "rappel_public", "rappel_job"]) {
      await admin.query(`ALTER ROLE ${role} LOGIN PASSWORD '${PASSWORD}'`);
    }
    process.env.RAPPEL_PLATFORM_DATABASE_URL = roleUrl("rappel_platform");
    process.env.RAPPEL_PUBLIC_DATABASE_URL = roleUrl("rappel_public");
    process.env.RAPPEL_JOB_DATABASE_URL = roleUrl("rappel_job");
    await admin.query(
      `INSERT INTO app_private.context_key(id, value) VALUES (1, $1)
       ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value`,
      [process.env.RLS_CONTEXT_KEY],
    );
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
    for (const sql of [`SET ROLE postgres`, `SET ROLE rappel_platform`, `SET ROLE rappel_public`, `SET ROLE rappel_job`, `SET SESSION AUTHORIZATION postgres`, `ALTER TABLE "Customer" DISABLE ROW LEVEL SECURITY`, `DROP POLICY tenant_isolation ON "Customer"`, `TRUNCATE "Customer"`, `CREATE TABLE zz(a int)`, `SET session_replication_role = replica`]) {
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
    expect(await orgs()).toBe("");
  });

  it("laisse les accès explicitement autorisés traverser", async () => {
    expect(await runInScope({ kind: "public", reason: "t" }, () => orgs())).toBe("");
    expect(await runInScope({ kind: "platform", reason: "t" }, () => orgs())).toBe(`${A},${B}`);
    expect(await runAsJob("t", () => orgs())).toBe(`${A},${B}`);
  });

  it("n'applique le filtre qu'aux instituts listés", async () => {
    process.env.RLS_ENFORCE = A;
    expect(await tenant(A, () => orgs())).toBe(A);
    expect(await tenant(B, () => orgs())).toBe(B);
  });

  it("le rôle institut ne voit pas les autres, même isolation applicative vide", async () => {
    process.env.RLS_ENFORCE = "";
    expect(await tenant(A, () => orgs())).toBe(A);
    expect(await orgs()).toBe("");
    expect((await pool.query(`UPDATE "Customer" SET notes='z' WHERE id='rls_test_c_${B}'`)).rowCount).toBe(0);
    await tenant(A, async () => {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(`SELECT set_config('app.rls_bypass', 'on', true)`);
        expect((await client.query(`SELECT "organizationId" o FROM "Customer" WHERE id LIKE 'rls_test_%' ORDER BY 1`)).rows.map((row) => row.o).join()).toBe("");
        await client.query(`SELECT set_config('app.current_org', $1, true)`, [B]);
        expect((await client.query(`SELECT count(*)::int n FROM "Customer" WHERE id LIKE 'rls_test_%'`)).rows[0].n).toBe(0);
        await client.query("ROLLBACK");
      } finally {
        client.release();
      }
    });
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
        const want = org ?? "";
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
    expect(await runInScope({ kind: "public", reason: "t" }, () => orgs(one))).toBe("");
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

  it("réserve le journal plateforme au contexte qui peut le prouver", async () => {
    await admin.query(`DELETE FROM "PlatformAuditLog" WHERE id LIKE 'rls_test_audit%'`);
    await admin.query(
      `INSERT INTO "PlatformAuditLog"(id, "organizationId", "entityType", "entityId", action)
       VALUES ('rls_test_audit', $1, 'Organization', $1, 'RLS_TEST')`,
      [A],
    );
    const countAudit = async (p: Pool = pool) =>
      (await p.query(`SELECT count(*)::int n FROM "PlatformAuditLog" WHERE id LIKE 'rls_test_audit%'`)).rows[0].n as number;

    const raw = new Client({ connectionString: appUrl() });
    await raw.connect();
    expect((await raw.query(`SELECT current_user u`)).rows[0].u).toBe("rappel_app");
    expect((await raw.query(`SELECT rolbypassrls AS bypass FROM pg_roles WHERE rolname = current_user`)).rows[0].bypass).toBe(false);
    await expect(raw.query(`SELECT count(*)::int n FROM "PlatformAuditLog"`)).rejects.toMatchObject({ code: "42501" });
    await expect(
      raw.query(
        `INSERT INTO "PlatformAuditLog"(id, "entityType", "entityId", action) VALUES ('rls_test_audit_raw', 'Organization', $1, 'RLS_TEST')`,
        [A],
      ),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(raw.query(`SELECT value FROM app_private.context_key`)).rejects.toBeTruthy();
    await expect(raw.query(`ALTER TABLE "PlatformAuditLog" DISABLE ROW LEVEL SECURITY`)).rejects.toBeTruthy();
    await expect(raw.query(`DROP POLICY platform_audit_read ON "PlatformAuditLog"`)).rejects.toBeTruthy();
    await raw.query("BEGIN");
    await raw.query(
      `SELECT set_config('app.scope', 'platform', true),
              set_config('app.rls_bypass', 'on', true),
              set_config('app.scope_proof', repeat('ab', 32), true)`,
    );
    await expect(raw.query(`SELECT count(*)::int n FROM "PlatformAuditLog"`)).rejects.toMatchObject({ code: "42501" });
    await raw.query("ROLLBACK");
    await raw.end();

    await tenant(A, async () => {
      expect((await pool.query(`SELECT current_user u`)).rows[0].u).toBe("rappel_app");
      await expect(countAudit()).rejects.toMatchObject({ code: "42501" });
      await expect(
        pool.query(
          `INSERT INTO "PlatformAuditLog"(id, "organizationId", "entityType", "entityId", action) VALUES ('rls_test_audit_tenant', $1, 'Organization', $1, 'RLS_TEST')`,
          [A],
        ),
      ).rejects.toMatchObject({ code: "42501" });
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          `SELECT set_config('app.scope', 'platform', true), set_config('app.rls_bypass', 'on', true)`,
        );
        await expect(client.query(`SELECT count(*)::int n FROM "PlatformAuditLog" WHERE id LIKE 'rls_test_audit%'`)).rejects.toMatchObject({ code: "42501" });
        await client.query("ROLLBACK");
      } finally {
        client.release();
      }
    });

    await runInScope({ kind: "public", reason: "connexion" }, async () => {
      expect((await pool.query(`SELECT current_user u`)).rows[0].u).toBe("rappel_public");
      await expect(countAudit()).rejects.toMatchObject({ code: "42501" });
      await pool.query(
        `INSERT INTO "PlatformAuditLog" (
          id, "platformUserId", "platformUserName", "organizationId",
          "entityType", "entityId", action, "before", "after"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb)`,
        ["rls_test_audit_public", null, "Ada Admin", null, "PlatformUser", "login", "LOGIN", null, null],
      );
    });
    await runAsJob("tâche", async () => {
      expect((await pool.query(`SELECT current_user u`)).rows[0].u).toBe("rappel_job");
      await expect(countAudit()).rejects.toMatchObject({ code: "42501" });
      await expect(
        pool.query(
          `INSERT INTO "PlatformAuditLog"(id, "entityType", "entityId", action) VALUES ('rls_test_audit_job', 'Organization', $1, 'RLS_TEST')`,
          [A],
        ),
      ).rejects.toMatchObject({ code: "42501" });
    });
    await runInScope({ kind: "platform", reason: "back-office" }, async () => {
      expect((await pool.query(`SELECT current_user u`)).rows[0].u).toBe("rappel_platform");
      expect(await countAudit()).toBe(2);
      expect((await pool.query(`SELECT action FROM "PlatformAuditLog" WHERE id = 'rls_test_audit_public'`)).rows[0].action).toBe("LOGIN");
      await expect(pool.query(`UPDATE "PlatformAuditLog" SET action = 'CHANGED' WHERE id = 'rls_test_audit'`)).rejects.toMatchObject({ code: "42501" });
      await expect(pool.query(`DELETE FROM "PlatformAuditLog" WHERE id = 'rls_test_audit'`)).rejects.toMatchObject({ code: "42501" });
    });
    expect((await admin.query(`SELECT current_user u`)).rows[0].u).toBe("postgres");
    expect(Number((await admin.query(`SELECT count(*)::int n FROM "PlatformAuditLog" WHERE id LIKE 'rls_test_audit%'`)).rows[0].n)).toBe(2);
    await admin.query(`DELETE FROM "PlatformAuditLog" WHERE id LIKE 'rls_test_audit%'`);
  });

  it("branche webhook, blog et tâche sur leur rôle, et ferme les tables nouvelles", async () => {
    const blog = makePool(1, appUrl());
    await runInScope({ kind: "public", reason: "webhook" }, async () => {
      expect((await pool.query(`SELECT current_user u`)).rows[0].u).toBe("rappel_public");
      expect((await blog.query(`SELECT current_user u`)).rows[0].u).toBe("rappel_public");
    });
    await runAsJob("relance", async () => {
      expect((await pool.query(`SELECT current_user u`)).rows[0].u).toBe("rappel_job");
    });

    const previous = await admin.query<{ data: unknown }>(`SELECT data FROM "PlatformConfig" WHERE id = 'default'`);
    await admin.query(
      `INSERT INTO "PlatformUser"(id, email, "firstName", "lastName", "createdAt", "updatedAt")
       VALUES ('rls_probe_user', 'rls-probe@example.test', 'Ada', 'Probe', NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
    );
    await admin.query(
      `INSERT INTO "PlatformConfig"(id, data, "updatedAt")
       VALUES ('default', '{"billing":{"publicPrice":490},"probe":"rls"}'::jsonb, NOW())
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, "updatedAt" = NOW()`,
    );
    await admin.query(
      `INSERT INTO "BlogArticle"(slug, content, status, "reviewedBy", "publishedAt")
       VALUES
         ('rls-probe-draft', '{}'::jsonb, 'draft', NULL, NULL),
         ('rls-probe-live', '{}'::jsonb, 'published', 'Ada', NOW() - INTERVAL '1 minute')
       ON CONFLICT (slug) DO UPDATE SET status = EXCLUDED.status, "reviewedBy" = EXCLUDED."reviewedBy", "publishedAt" = EXCLUDED."publishedAt"`,
    );
    await admin.query(`CREATE TABLE "RlsPrivilegeProbe" (id int)`);
    try {
      await runInScope({ kind: "public", reason: "prix public" }, async () => {
        expect(Number((await pool.query(`SELECT count(*)::int n FROM "PlatformUser" WHERE id = 'rls_probe_user'`)).rows[0].n)).toBe(1);
        expect(Number((await pool.query(`SELECT count(*)::int n FROM "PlatformConfig"`)).rows[0].n)).toBe(0);
        expect(Number((await pool.query(`SELECT app_public_price() n`)).rows[0].n)).toBe(490);
        expect(Number((await pool.query(`SELECT count(*)::int n FROM "BlogArticle" WHERE slug = 'rls-probe-draft'`)).rows[0].n)).toBe(0);
        expect(Number((await pool.query(`SELECT count(*)::int n FROM "BlogArticle" WHERE slug = 'rls-probe-live'`)).rows[0].n)).toBe(1);
        expect((await pool.query(`UPDATE "PlatformUser" SET "firstName" = 'Non' WHERE id = 'rls_probe_user'`)).rowCount).toBe(0);
      });
      expect((await admin.query(`SELECT "firstName" AS name FROM "PlatformUser" WHERE id = 'rls_probe_user'`)).rows[0].name).toBe("Ada");
      await tenant(A, async () => {
        expect(Number((await pool.query(`SELECT count(*)::int n FROM "PlatformUser"`)).rows[0].n)).toBe(0);
        expect(Number((await pool.query(`SELECT count(*)::int n FROM "BlogArticle" WHERE slug LIKE 'rls-probe-%'`)).rows[0].n)).toBe(0);
        await expect(pool.query(`INSERT INTO "PlatformUser"(id, email, "firstName", "lastName", "createdAt", "updatedAt") VALUES ('rls_probe_app', 'rls-app@example.test', 'A', 'B', NOW(), NOW())`)).rejects.toMatchObject({ code: "42501" });
        await expect(pool.query(`SELECT * FROM "RlsPrivilegeProbe"`)).rejects.toMatchObject({ code: "42501" });
      });
      await runAsJob("tâche", async () => {
        expect(Number((await pool.query(`SELECT count(*)::int n FROM "PlatformUser"`)).rows[0].n)).toBe(0);
        expect(Number((await pool.query(`SELECT count(*)::int n FROM "PlatformConfig"`)).rows[0].n)).toBe(0);
      });
      await runInScope({ kind: "platform", reason: "back-office" }, async () => {
        expect(Number((await pool.query(`SELECT count(*)::int n FROM "PlatformConfig"`)).rows[0].n)).toBe(1);
        expect(Number((await pool.query(`SELECT count(*)::int n FROM "BlogArticle" WHERE slug = 'rls-probe-draft'`)).rows[0].n)).toBe(1);
      });

      const definers = await admin.query<{ proname: string }>(
        `SELECT p.proname FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE p.prosecdef AND n.nspname IN ('public', 'app_private')
         ORDER BY 1`,
      );
      expect(definers.rows.map((row) => row.proname)).toEqual([
        "app_public_card_by_token",
        "app_public_customer_by_phone",
        // Authentification (Google, e-mail) : lectures ciblées et création liée à une inscription en cours.
        "app_public_identity_create_for_signup",
        "app_public_identity_login",
        "app_public_identity_touch",
        // Fidélité : résolution de l'institut d'un QR d'adhésion actif.
        "app_public_loyalty_join_institute",
        "app_public_price",
        // Purges planifiées (rôles job/plateforme uniquement).
        "app_purge_expired_auth_data",
        "app_purge_expired_auth_state",
        "app_scope_granted",
        "org_proof_ok",
      ]);
      const members = await admin.query(
        `SELECT r.rolname FROM pg_auth_members m
         JOIN pg_roles r ON r.oid = m.member
         WHERE r.rolname IN ('rappel_app', 'rappel_public', 'rappel_platform', 'rappel_job')`,
      );
      expect(members.rows).toEqual([]);
      const flags = await admin.query<{ rolname: string; rolsuper: boolean; rolbypassrls: boolean; rolinherit: boolean }>(
        `SELECT rolname, rolsuper, rolbypassrls, rolinherit FROM pg_roles
         WHERE rolname IN ('rappel_app', 'rappel_public', 'rappel_platform', 'rappel_job')
         ORDER BY 1`,
      );
      expect(flags.rows).toEqual([
        { rolname: "rappel_app", rolsuper: false, rolbypassrls: false, rolinherit: true },
        { rolname: "rappel_job", rolsuper: false, rolbypassrls: false, rolinherit: true },
        { rolname: "rappel_platform", rolsuper: false, rolbypassrls: false, rolinherit: true },
        { rolname: "rappel_public", rolsuper: false, rolbypassrls: false, rolinherit: true },
      ]);
    } finally {
      await admin.query(`DROP TABLE IF EXISTS "RlsPrivilegeProbe"`);
      await admin.query(`DELETE FROM "BlogArticle" WHERE slug LIKE 'rls-probe-%'`);
      await admin.query(`DELETE FROM "PlatformUser" WHERE id LIKE 'rls_probe_%'`);
      if (previous.rowCount) {
        await admin.query(`UPDATE "PlatformConfig" SET data = $1::jsonb WHERE id = 'default'`, [JSON.stringify(previous.rows[0].data)]);
      } else {
        await admin.query(`DELETE FROM "PlatformConfig" WHERE id = 'default'`);
      }
    }
  });

  it("refuse la caisse à une route publique ou à une tâche, et isole les instituts", async () => {
    const customers = async () => orgs();
    await runInScope({ kind: "public", reason: "route compromise" }, async () => {
      expect(await customers()).toBe("");
      await expect(pool.query(`SELECT count(*)::int n FROM "CashRegisterSession"`)).rejects.toMatchObject({ code: "42501" });
      await expect(pool.query(`SELECT count(*)::int n FROM "Payment"`)).rejects.toMatchObject({ code: "42501" });
      await expect(pool.query(`SELECT count(*)::int n FROM "CustomerNote"`)).rejects.toMatchObject({ code: "42501" });
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          `SELECT set_config('app.current_org', $1, true), set_config('app.rls_bypass', 'on', true)`,
          [B],
        );
        expect((await client.query(`SELECT "organizationId" o FROM "Customer" WHERE id LIKE 'rls_test_%'`)).rows).toEqual([]);
        await client.query("ROLLBACK");
      } finally {
        client.release();
      }
    });
    await runInScope({ kind: "public", reason: "réservation" }, async () => {
      bindPublicInstitute(A);
      expect(await customers()).toBe(A);
      await expect(pool.query(`SELECT count(*)::int n FROM "CashRegisterSession"`)).rejects.toMatchObject({ code: "42501" });
    });
    await runAsJob("relance", async () => {
      expect(await customers()).toBe(`${A},${B}`);
      await expect(pool.query(`SELECT count(*)::int n FROM "CashRegisterSession"`)).rejects.toMatchObject({ code: "42501" });
      await expect(pool.query(`SELECT count(*)::int n FROM "Invoice"`)).rejects.toMatchObject({ code: "42501" });
    });
    const raw = new Client({ connectionString: roleUrl("rappel_public") });
    await raw.connect();
    expect((await raw.query(`SELECT count(*)::int n FROM "Customer" WHERE id LIKE 'rls_test_%'`)).rows[0].n).toBe(0);
    await expect(raw.query(`SELECT count(*)::int n FROM "Payment"`)).rejects.toMatchObject({ code: "42501" });
    await raw.query("BEGIN");
    await raw.query(
      `SELECT set_config('app.current_org', $1, true),
              set_config('app.rls_bypass', 'on', true),
              set_config('app.scope', 'tenant', true),
              set_config('app.scope_proof', repeat('ab', 32), true)`,
      [B],
    );
    expect((await raw.query(`SELECT count(*)::int n FROM "Customer" WHERE id LIKE 'rls_test_%'`)).rows[0].n).toBe(0);
    await raw.query("ROLLBACK");
    await raw.end();
  });

  it("fait passer l'institut pilote par rappel_app et laisse l'autre sur postgres", async () => {
    const saved = {
      pilot: process.env.RLS_PILOT,
      org: process.env.RLS_PILOT_ORG,
      url: process.env.RLS_PILOT_DATABASE_URL,
    };
    process.env.RLS_PILOT = "on";
    process.env.RLS_PILOT_ORG = A;
    process.env.RLS_PILOT_DATABASE_URL = appUrl();
    const base = makePool(2, adminUrl);
    const roleOf = (org: string) =>
      runInScope({ kind: "tenant", organizationId: org }, async () =>
        (await base.query(`SELECT current_user AS u`)).rows[0].u as string,
      );
    try {
      expect(await roleOf(A)).toBe("rappel_app");
      expect(await runInScope({ kind: "tenant", organizationId: A }, () => orgs(base))).toBe(A);
      expect(await roleOf(B)).toBe("postgres");
      expect(await runInScope({ kind: "tenant", organizationId: B }, () => orgs(base))).toBe(`${A},${B}`);
      await runInScope({ kind: "public", reason: "page", organizationId: A }, async () => {
        expect((await base.query(`SELECT current_user AS u`)).rows[0].u).toBe("rappel_public");
      });
      await runAsJob("relance", async () => {
        expect((await base.query(`SELECT current_user AS u`)).rows[0].u).toBe("rappel_job");
      });
    } finally {
      if (saved.pilot === undefined) delete process.env.RLS_PILOT;
      else process.env.RLS_PILOT = saved.pilot;
      if (saved.org === undefined) delete process.env.RLS_PILOT_ORG;
      else process.env.RLS_PILOT_ORG = saved.org;
      if (saved.url === undefined) delete process.env.RLS_PILOT_DATABASE_URL;
      else process.env.RLS_PILOT_DATABASE_URL = saved.url;
    }
  });

  it("une requête en cours coupée échoue proprement, le pool repart", async () => {
    const name = "rls_kill_running";
    const url = new URL(appUrl());
    url.searchParams.set("application_name", name);
    const p = makePool(1, url.toString());
    await tenant(A, async () => {
      const running = expect(p.query("SELECT pg_sleep(5)")).rejects.toBeTruthy();
      // Wait for the query on PostgreSQL, not a guessed connection startup delay.
      // Otherwise termination can run before the pool even opens its first connection.
      const deadline = Date.now() + 4_000;
      let active = false;
      while (Date.now() < deadline) {
        const result = await admin.query(
          `SELECT 1 FROM pg_stat_activity WHERE usename = 'rappel_app'
           AND application_name = $1 AND state = 'active' AND query = 'SELECT pg_sleep(5)'`,
          [name],
        );
        if (result.rowCount) { active = true; break; }
        await wait(25);
      }
      if (!active) throw new Error("The query to terminate did not start on PostgreSQL");
      await killOthers(name);
      await running;
    });
    await wait(100);
    expect(await tenant(A, () => orgs(p))).toBe(A);
  }, 20_000);
});
