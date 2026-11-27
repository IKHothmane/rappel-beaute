import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client, Pool } from "pg";
import { bindOrganization, runAsJob, runInScope } from "@/lib/db/tenant-context";
import { appPool, prepareRoles, roleUrl, rolesAdminUrl } from "./role-pools";

/**
 * Migration 20261126090000_platform_prospects : "Prospect" (prospection du back-office, table plateforme).
 * Vérifiée avec les quatre rôles applicatifs sur une base locale jetable uniquement (rolesAdminUrl impose
 * 127.0.0.1 / localhost ; ignoré sans base de test). Données fictives : identifiants pros_test_, numéros
 * +2126000000xx, domaine example.test ; nettoyées avant et après.
 */
const adminUrl = rolesAdminUrl();
const DENIED = { code: "42501" };
const UNIQUE = { code: "23505" };
const CHECK = { code: "23514" };
const NOT_NULL = { code: "23502" };
const MIGRATION = path.join(process.cwd(), "prisma/migrations/20261126090000_platform_prospects/migration.sql");
const ROLES = ["rappel_app", "rappel_platform", "rappel_public", "rappel_job"] as const;
const OTHER_ROLES = ["rappel_app", "rappel_public", "rappel_job"] as const;

describe.skipIf(!adminUrl)("prospects du back-office (Prospect, table plateforme)", () => {
  let admin: Client;
  let pool: Pool;
  let restoreEnv: () => void;

  const tenant = <T,>(org: string, fn: () => Promise<T>) =>
    runInScope({ kind: "tenant", organizationId: null }, async () => {
      bindOrganization(org);
      return fn();
    });
  const asPublic = <T,>(fn: () => Promise<T>) => runInScope({ kind: "public", reason: "test" }, fn);
  const asPlatform = <T,>(fn: () => Promise<T>) => runInScope({ kind: "platform", reason: "test" }, fn);
  const asJob = <T,>(fn: () => Promise<T>) => runAsJob("test", fn);
  const role = async () => (await pool.query(`SELECT current_user u`)).rows[0].u as string;

  async function cleanup() {
    await admin.query(`DELETE FROM "Prospect" WHERE id LIKE 'pros_test_%' OR "sourceRef" LIKE 'pros_test_%'`);
  }

  /** Insertion paramétrée ; les colonnes absentes prennent leur valeur par défaut ou NULL. */
  function insertSql(values: Record<string, unknown>) {
    const columns = Object.keys(values);
    return {
      text: `INSERT INTO "Prospect" (${columns.map((c) => `"${c}"`).join(", ")})
             VALUES (${columns.map((_, i) => `$${i + 1}`).join(", ")})`,
      values: Object.values(values),
    };
  }
  const base = (id: string, extra: Record<string, unknown> = {}) => ({
    id,
    source: "MANUAL",
    name: "Salon fictif",
    category: "beauty",
    ...extra,
  });
  const adminInsert = (values: Record<string, unknown>) => {
    const q = insertSql(values);
    return admin.query(q.text, q.values);
  };

  /** Upsert d'import tel que le code doit l'écrire : cible ("source", "sourceRef"). */
  const UPSERT = `
    INSERT INTO "Prospect" (id, source, "sourceRef", name, category, city, phone, "lastSyncedAt")
    VALUES ($1, $2, $3, $4, $5, $6, $7, now())
    ON CONFLICT ("source", "sourceRef") DO UPDATE SET
      name = EXCLUDED.name,
      category = EXCLUDED.category,
      city = EXCLUDED.city,
      phone = EXCLUDED.phone,
      "lastSyncedAt" = EXCLUDED."lastSyncedAt",
      "updatedAt" = now()
    RETURNING id, (xmax = 0) AS inserted, status`;

  beforeAll(async () => {
    admin = new Client({ connectionString: adminUrl });
    await admin.connect();
    restoreEnv = await prepareRoles(admin, adminUrl);
    await cleanup();
    pool = appPool(adminUrl);
  });

  afterAll(async () => {
    await pool?.end().catch(() => null);
    await cleanup().catch(() => null);
    await admin?.end();
    restoreEnv?.();
  });

  it("structure : colonnes, types, valeurs par défaut, index, RLS et une seule politique platform_only ALL", async () => {
    const cols = (
      await admin.query(
        `SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'Prospect' ORDER BY ordinal_position`,
      )
    ).rows;
    expect(cols.map((c) => [c.column_name, c.data_type, c.is_nullable])).toEqual([
      ["id", "text", "NO"],
      ["source", "text", "NO"],
      ["sourceRef", "text", "YES"],
      ["name", "text", "NO"],
      ["category", "text", "NO"],
      ["city", "text", "YES"],
      ["address", "text", "YES"],
      ["latitude", "double precision", "YES"],
      ["longitude", "double precision", "YES"],
      ["phone", "text", "YES"],
      ["email", "text", "YES"],
      ["website", "text", "YES"],
      ["status", "text", "NO"],
      ["notes", "text", "YES"],
      ["lastSyncedAt", "timestamp with time zone", "YES"],
      ["createdAt", "timestamp with time zone", "NO"],
      ["updatedAt", "timestamp with time zone", "NO"],
    ]);
    const def = Object.fromEntries(cols.map((c) => [c.column_name, c.column_default]));
    expect(def.id).toBeNull();
    expect(def.status).toContain("TO_CONTACT");
    expect(def.createdAt).toBe("now()");
    expect(def.updatedAt).toBe("now()");

    // Table plateforme : aucune colonne organizationId (hors de la liste tenant_isolation de rls-restore-grants).
    expect(cols.some((c) => c.column_name === "organizationId")).toBe(false);

    const idx = (
      await admin.query(`SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'Prospect' ORDER BY 1`)
    ).rows;
    expect(idx.map((r) => r.indexname as string).sort()).toEqual([
      "Prospect_category_idx",
      "Prospect_city_lower_idx",
      "Prospect_pkey",
      "Prospect_source_sourceRef_key",
      "Prospect_status_idx",
    ].sort());
    const unique = idx.find((r) => r.indexname === "Prospect_source_sourceRef_key")!.indexdef as string;
    // Index unique simple (pas partiel, NULLS DISTINCT) : cible ON CONFLICT ("source", "sourceRef") sans prédicat.
    expect(unique).toMatch(/^CREATE UNIQUE INDEX "Prospect_source_sourceRef_key" ON public\."Prospect" USING btree \(source, "sourceRef"\)$/);
    expect(idx.find((r) => r.indexname === "Prospect_city_lower_idx")!.indexdef).toContain("lower(city)");

    const { rows: rls } = await admin.query(
      `SELECT c.relrowsecurity, c.relforcerowsecurity, pg_get_userbyid(c.relowner) AS owner
       FROM pg_class c WHERE c.relnamespace = 'public'::regnamespace AND c.relname = 'Prospect'`,
    );
    expect(rls).toHaveLength(1);
    expect(rls[0].relrowsecurity).toBe(true);
    expect(rls[0].relforcerowsecurity).toBe(false);
    expect(ROLES).not.toContain(rls[0].owner);
    const pol = (await admin.query(`SELECT policyname, cmd, roles::text, qual, with_check FROM pg_policies WHERE tablename = 'Prospect'`)).rows;
    expect(pol).toHaveLength(1);
    expect(pol[0]).toMatchObject({ policyname: "platform_only", cmd: "ALL", roles: "{public}" });
    expect(pol[0].qual).toContain("rappel_platform");
    expect(pol[0].with_check).toContain("rappel_platform");
  });

  it("droits : rappel_platform SELECT/INSERT/UPDATE/DELETE, aucun droit pour les autres rôles ni PUBLIC", async () => {
    const priv = async (r: string, privilege: string) =>
      (await admin.query(`SELECT has_table_privilege($1, '"Prospect"', $2) AS ok`, [r, privilege])).rows[0].ok as boolean;
    for (const p of ["SELECT", "INSERT", "UPDATE", "DELETE"]) expect(await priv("rappel_platform", p), p).toBe(true);
    for (const p of ["TRUNCATE", "REFERENCES", "TRIGGER"]) expect(await priv("rappel_platform", p), p).toBe(false);
    for (const r of OTHER_ROLES) {
      for (const p of ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"]) {
        expect(await priv(r, p), `${r} ${p}`).toBe(false);
      }
    }
    // Aucun droit par colonne résiduel pour les rôles fermés, et PUBLIC absent de l'ACL.
    const colGrants = await admin.query(
      `SELECT grantee, privilege_type FROM information_schema.column_privileges
       WHERE table_schema = 'public' AND table_name = 'Prospect' AND grantee <> 'rappel_platform'
         AND grantee IN ('PUBLIC', 'rappel_app', 'rappel_public', 'rappel_job')`,
    );
    expect(colGrants.rows).toEqual([]);
    const acl = (await admin.query(`SELECT relacl::text AS acl FROM pg_class WHERE relname = 'Prospect' AND relnamespace = 'public'::regnamespace`)).rows[0].acl as string;
    expect(acl).toContain("rappel_platform=arwd/");
    expect(acl).not.toMatch(/(^|[{,])=/); // pas d'entrée PUBLIC
    for (const r of OTHER_ROLES) expect(acl).not.toContain(`${r}=`);
  });

  it("rappel_platform : insertion, lecture, mise à jour, import idempotent par ON CONFLICT et suppression", async () => {
    await asPlatform(async () => {
      expect(await role()).toBe("rappel_platform");
      const ins = await pool.query(
        `INSERT INTO "Prospect" (id, source, name, category, city, phone, email, website, latitude, longitude)
         VALUES ($1, 'MANUAL', $2, 'hairdresser', $3, $4, $5, $6, $7, $8)
         RETURNING status, "sourceRef", "lastSyncedAt", "createdAt" IS NOT NULL AS created, "updatedAt" IS NOT NULL AS updated`,
        ["pros_test_m1", "Salon fictif Manuel", "Ville fictive", "+212600000001", "contact@example.test", "https://example.test", 33.5, -7.6],
      );
      expect(ins.rows[0]).toEqual({ status: "TO_CONTACT", sourceRef: null, lastSyncedAt: null, created: true, updated: true });

      const upd = await pool.query(
        `UPDATE "Prospect" SET status = 'CONTACTED', notes = $2, "updatedAt" = now() WHERE id = $1`,
        ["pros_test_m1", "Note fictive"],
      );
      expect(upd.rowCount).toBe(1);
      const found = await pool.query(
        `SELECT id FROM "Prospect" WHERE id LIKE 'pros_test_%' AND (name ILIKE $1 OR lower(city) = lower($2) OR phone LIKE $3)`,
        ["%manuel%", "VILLE FICTIVE", "+2126%"],
      );
      expect(found.rows.map((r) => r.id)).toEqual(["pros_test_m1"]);

      // Import OSM : première passe insère, la seconde met à jour la même ligne (statut commercial conservé).
      const first = await pool.query(UPSERT, ["pros_test_o1", "OSM", "pros_test_node/1", "Salon fictif OSM", "beauty", "Ville A", "+212600000002"]);
      expect(first.rows[0]).toEqual({ id: "pros_test_o1", inserted: true, status: "TO_CONTACT" });
      await pool.query(`UPDATE "Prospect" SET status = 'CUSTOMER', "updatedAt" = now() WHERE id = 'pros_test_o1'`);
      const second = await pool.query(UPSERT, ["pros_test_o1bis", "OSM", "pros_test_node/1", "Salon fictif OSM renommé", "spa", "Ville B", null]);
      expect(second.rows[0]).toEqual({ id: "pros_test_o1", inserted: false, status: "CUSTOMER" });
      const row = (await pool.query(`SELECT name, category, city, phone FROM "Prospect" WHERE id = 'pros_test_o1'`)).rows[0];
      expect(row).toEqual({ name: "Salon fictif OSM renommé", category: "spa", city: "Ville B", phone: null });
      expect((await pool.query(`SELECT count(*)::int n FROM "Prospect" WHERE "sourceRef" = 'pros_test_node/1'`)).rows[0].n).toBe(1);

      // sourceRef NULL : jamais en conflit, chaque passe insère une nouvelle ligne.
      const csvA = await pool.query(UPSERT, ["pros_test_c1", "CSV", null, "Salon fictif CSV", "nails", null, null]);
      const csvB = await pool.query(UPSERT, ["pros_test_c2", "CSV", null, "Salon fictif CSV", "nails", null, null]);
      expect([csvA.rows[0].inserted, csvB.rows[0].inserted]).toEqual([true, true]);

      expect((await pool.query(`DELETE FROM "Prospect" WHERE id = 'pros_test_c2'`)).rowCount).toBe(1);
      await expect(pool.query(`TRUNCATE "Prospect"`)).rejects.toMatchObject(DENIED);
    });
  });

  it("unicité (source, sourceRef) : doublon refusé, même référence sous une autre source acceptée, NULL multiples acceptés", async () => {
    await adminInsert(base("pros_test_u1", { source: "OSM", sourceRef: "pros_test_way/7" }));
    await expect(adminInsert(base("pros_test_u2", { source: "OSM", sourceRef: "pros_test_way/7" }))).rejects.toMatchObject(UNIQUE);
    await adminInsert(base("pros_test_u3", { source: "CSV", sourceRef: "pros_test_way/7" }));
    await adminInsert(base("pros_test_u4", { source: "MANUAL" }));
    await adminInsert(base("pros_test_u5", { source: "MANUAL" }));
    await expect(adminInsert(base("pros_test_u1"))).rejects.toMatchObject(UNIQUE); // clé primaire
    expect(
      (await admin.query(`SELECT count(*)::int n FROM "Prospect" WHERE id IN ('pros_test_u1','pros_test_u3','pros_test_u4','pros_test_u5')`)).rows[0].n,
    ).toBe(4);
  });

  it("CHECK : listes fermées, longueurs, téléphone E.164, coordonnées, référence OSM obligatoire", async () => {
    let n = 0;
    const reject = async (extra: Record<string, unknown>, error = CHECK) => {
      n += 1;
      await expect(adminInsert(base(`pros_test_k${n}`, extra)), JSON.stringify(extra).slice(0, 80)).rejects.toMatchObject(error);
    };
    const accept = async (extra: Record<string, unknown>) => {
      n += 1;
      expect((await adminInsert(base(`pros_test_k${n}`, extra))).rowCount).toBe(1);
    };

    for (const source of ["OSM", "CSV", "MANUAL"]) await accept({ source, sourceRef: `pros_test_ref/${source}` });
    for (const source of ["osm", "GOOGLE", ""]) await reject({ source });
    for (const category of ["hairdresser", "barber", "beauty", "cosmetics", "massage", "spa", "nails", "other"]) await accept({ category });
    for (const category of ["Beauty", "salon", ""]) await reject({ category });
    for (const status of ["TO_CONTACT", "CONTACTED", "CUSTOMER", "DECLINED"]) await accept({ status });
    for (const status of ["to_contact", "LOST", ""]) await reject({ status });

    await reject({ source: "OSM", sourceRef: null });
    await reject({ sourceRef: "" });
    await accept({ sourceRef: `pros_test_${"x".repeat(64 - "pros_test_".length)}` });
    await reject({ sourceRef: `pros_test_${"x".repeat(65 - "pros_test_".length)}` });

    await reject({ name: null }, NOT_NULL);
    await reject({ name: "" });
    await reject({ name: "   " });
    await accept({ name: "n".repeat(200) });
    await reject({ name: "n".repeat(201) });

    const bounded: Array<[string, number]> = [["city", 120], ["address", 300], ["email", 254], ["website", 500], ["notes", 2000]];
    for (const [column, max] of bounded) {
      await accept({ [column]: "a".repeat(max) });
      await reject({ [column]: "a".repeat(max + 1) });
    }

    for (const phone of ["+212600000003", "+33100000000", "+1234567"]) await accept({ phone });
    for (const phone of ["0600000004", "212600000004", "+212 600 000 004", "+0212600000004", "+2126000000041234", "+212600000004;+212600000005", ""]) {
      await reject({ phone });
    }

    await accept({ latitude: 31.6, longitude: -8 });
    await accept({ latitude: -90, longitude: 180 });
    const invalid = [
      { latitude: 31.6 },
      { longitude: -8 },
      { latitude: 91, longitude: 0 },
      { latitude: 0, longitude: -180.5 },
      { latitude: "NaN", longitude: 0 },
      { latitude: 0, longitude: "Infinity" },
    ];
    for (const coords of invalid) {
      await reject(coords);
    }
  });

  it("rappel_app, rappel_public et rappel_job : aucun accès (lecture, écriture, suppression)", async () => {
    await adminInsert(base("pros_test_closed"));
    const attempts = async () => {
      await expect(pool.query(`SELECT count(*) FROM "Prospect"`)).rejects.toMatchObject(DENIED);
      const q = insertSql(base("pros_test_intrus"));
      await expect(pool.query(q.text, q.values)).rejects.toMatchObject(DENIED);
      await expect(pool.query(`UPDATE "Prospect" SET status = 'DECLINED' WHERE id = $1`, ["pros_test_closed"])).rejects.toMatchObject(DENIED);
      await expect(pool.query(`DELETE FROM "Prospect" WHERE id = $1`, ["pros_test_closed"])).rejects.toMatchObject(DENIED);
      await expect(pool.query(`TRUNCATE "Prospect"`)).rejects.toMatchObject(DENIED);
    };
    await tenant("pros_test_org", async () => {
      expect(await role()).toBe("rappel_app");
      await attempts();
    });
    await asPublic(async () => {
      expect(await role()).toBe("rappel_public");
      await attempts();
    });
    await asJob(async () => {
      expect(await role()).toBe("rappel_job");
      await attempts();
    });
    // Connexion rappel_app directe, sans aucun contexte applicatif.
    const raw = new Client({ connectionString: roleUrl(adminUrl, "rappel_app") });
    await raw.connect();
    try {
      await expect(raw.query(`SELECT count(*) FROM "Prospect"`)).rejects.toMatchObject(DENIED);
    } finally {
      await raw.end();
    }
    expect((await admin.query(`SELECT status FROM "Prospect" WHERE id = 'pros_test_closed'`)).rows[0].status).toBe("TO_CONTACT");
    expect((await admin.query(`SELECT count(*)::int n FROM "Prospect" WHERE id = 'pros_test_intrus'`)).rows[0].n).toBe(0);
  });

  it("après rls-restore-grants (droits rendus à tous les rôles), la politique platform_only reste la barrière", async () => {
    await adminInsert(base("pros_test_restore"));
    const visible = Number((await admin.query(`SELECT count(*) n FROM "Prospect"`)).rows[0].n);
    expect(visible).toBeGreaterThan(0);
    await admin.query("BEGIN");
    try {
      // Ce que fait restore() de scripts/ops/rls-restore-grants.ts pour une table sans traitement particulier.
      await admin.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO rappel_app, rappel_platform, rappel_public, rappel_job`);
      // Contrôle de verify() pour une table ordinaire : un droit DML pour rappel_app, jamais TRUNCATE.
      const check = (
        await admin.query(
          `SELECT has_table_privilege('rappel_app', '"Prospect"', 'SELECT,INSERT,UPDATE,DELETE') AS ok,
                  has_table_privilege('rappel_app', '"Prospect"', 'TRUNCATE') AS tr`,
        )
      ).rows[0];
      expect(check).toEqual({ ok: true, tr: false });

      for (const r of OTHER_ROLES) {
        await admin.query(`SET LOCAL ROLE ${r}`);
        expect((await admin.query(`SELECT count(*)::int n FROM "Prospect"`)).rows[0].n, r).toBe(0);
        expect((await admin.query(`UPDATE "Prospect" SET status = 'DECLINED' WHERE id = 'pros_test_restore'`)).rowCount, r).toBe(0);
        expect((await admin.query(`DELETE FROM "Prospect" WHERE id = 'pros_test_restore'`)).rowCount, r).toBe(0);
        await admin.query("SAVEPOINT intrusion");
        const q = insertSql(base(`pros_test_after_restore_${r}`));
        await expect(admin.query(q.text, q.values), r).rejects.toMatchObject(DENIED); // WITH CHECK
        await admin.query("ROLLBACK TO SAVEPOINT intrusion");
        await admin.query("RESET ROLE");
      }
      await admin.query(`SET LOCAL ROLE rappel_platform`);
      expect(Number((await admin.query(`SELECT count(*) n FROM "Prospect"`)).rows[0].n)).toBe(visible);
      await admin.query("RESET ROLE");
    } finally {
      await admin.query("ROLLBACK");
    }
    // Rien n'a persisté : ni droits rouverts, ni modification de la ligne.
    expect((await admin.query(`SELECT has_table_privilege('rappel_app', '"Prospect"', 'SELECT') AS ok`)).rows[0].ok).toBe(false);
    expect((await admin.query(`SELECT status FROM "Prospect" WHERE id = 'pros_test_restore'`)).rows[0].status).toBe("TO_CONTACT");
  });

  it("la migration se rejoue sans effet de bord (lignes, politique unique, droits, index, contraintes)", async () => {
    const sql = fs.readFileSync(MIGRATION, "utf8");
    const snapshot = async () => ({
      rows: (await admin.query(`SELECT count(*)::int n FROM "Prospect"`)).rows[0].n,
      policies: (await admin.query(`SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'Prospect'`)).rows,
      acl: (await admin.query(`SELECT relacl::text AS acl FROM pg_class WHERE relname = 'Prospect' AND relnamespace = 'public'::regnamespace`)).rows[0].acl,
      indexes: (await admin.query(`SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'Prospect' ORDER BY 1`)).rows,
      constraints: (
        // contype 'n' : NOT NULL enregistrés comme contraintes depuis PostgreSQL 18, ignorés ici.
        await admin.query(
          `SELECT conname, pg_get_constraintdef(oid) AS def FROM pg_constraint
           WHERE conrelid = '"Prospect"'::regclass AND contype <> 'n' ORDER BY 1`,
        )
      ).rows,
    });
    const before = await snapshot();
    await admin.query(sql);
    await admin.query(sql);
    expect(await snapshot()).toEqual(before);
    expect(before.policies.map((p) => [p.policyname, p.cmd])).toEqual([["platform_only", "ALL"]]);
    expect(before.constraints.map((c) => c.conname as string).sort()).toEqual([
      "Prospect_address_check",
      "Prospect_category_check",
      "Prospect_city_check",
      "Prospect_coordinates_check",
      "Prospect_email_check",
      "Prospect_name_check",
      "Prospect_notes_check",
      "Prospect_osm_sourceRef_check",
      "Prospect_phone_check",
      "Prospect_pkey",
      "Prospect_source_check",
      "Prospect_sourceRef_check",
      "Prospect_status_check",
      "Prospect_website_check",
    ].sort());
  });
});
