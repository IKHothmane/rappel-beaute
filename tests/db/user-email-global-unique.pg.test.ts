import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";
import { rolesAdminUrl } from "./role-pools";

/**
 * Migration en attente prisma/pending-migrations/20261120090000_user_email_global_unique :
 * échec propre s'il reste des doublons, succès sinon, insensibilité à la casse et aux espaces.
 * Tout se passe dans une transaction annulée (ROLLBACK) : aucune donnée ni index ne subsiste.
 * Base locale jetable uniquement (rolesAdminUrl impose 127.0.0.1 / localhost ; ignoré sans base de test).
 */
const adminUrl = rolesAdminUrl();
const MIGRATION = path.join(
  process.cwd(),
  "prisma/pending-migrations/20261120090000_user_email_global_unique/migration.sql",
);
const INDEX = "User_email_lower_unique";

describe.skipIf(!adminUrl)("unicité globale de l'e-mail (migration en attente)", () => {
  let db: Client;
  let sql: string;
  let blocked = "";

  const indexExists = async () =>
    (await db.query(`SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = $1`, [INDEX])).rowCount === 1;

  async function seed(users: Array<[string, string, string | null]>) {
    await db.query(
      `INSERT INTO "Organization"(id,name,slug,"updatedAt") VALUES ('uem_org_a','A','uem_org_a',now()),('uem_org_b','B','uem_org_b',now())`,
    );
    for (const [id, org, email] of users) {
      await db.query(
        `INSERT INTO "User"(id,"organizationId",email,"firstName","lastName","updatedAt") VALUES ($1,$2,$3,'F','L',now())`,
        [id, org, email],
      );
    }
  }

  async function inTransaction<T>(fn: () => Promise<T>): Promise<T> {
    await db.query("BEGIN");
    try {
      return await fn();
    } finally {
      await db.query("ROLLBACK");
    }
  }

  beforeAll(async () => {
    sql = fs.readFileSync(MIGRATION, "utf8");
    db = new Client({ connectionString: adminUrl });
    await db.connect();
    if (await indexExists()) blocked = "l'index existe déjà dans la base de test";
    const { rows } = await db.query(
      `SELECT COUNT(*)::int AS n FROM (SELECT 1 FROM "User" WHERE email IS NOT NULL AND BTRIM(email) <> '' GROUP BY LOWER(BTRIM(email)) HAVING COUNT(*) > 1) d`,
    );
    if (rows[0].n > 0) blocked = "la base de test contient déjà des doublons d'e-mail";
  });

  afterAll(async () => {
    await db?.end();
  });

  it("le fichier reste hors de prisma/migrations (non pris par migrate deploy)", () => {
    expect(fs.existsSync(MIGRATION)).toBe(true);
    const deployed = fs.readdirSync(path.join(process.cwd(), "prisma/migrations"));
    expect(deployed.some((name) => name.includes("user_email_global_unique"))).toBe(false);
  });

  it("le script d'audit s'exécute en lecture seule, détecte les doublons et masque les e-mails", async () => {
    const audit = fs.readFileSync(path.join(process.cwd(), "scripts/ops/auth-accounts-audit.sql"), "utf8");
    expect(audit.trimStart().split("\n").find((l) => !l.startsWith("--") && l.trim())).toBe("BEGIN READ ONLY;");
    expect(audit.trimEnd().endsWith("ROLLBACK;")).toBe(true);
    await db.query("BEGIN");
    try {
      await seed([
        ["uem_u1", "uem_org_a", "Dup@Example.test"],
        ["uem_u2", "uem_org_b", " dup@example.test"],
      ]);
      await db.query("COMMIT"); // le script ouvre sa propre transaction ; nettoyage explicite ensuite
      const results = (await db.query(audit)) as unknown as Array<{ rows: Array<Record<string, unknown>> }>;
      const rows = (name: string) => results.flatMap((r) => r.rows).filter((r) => r.requete === name);
      expect(Number(rows("03a_synthese_doublons")[0].groupes_en_double)).toBeGreaterThanOrEqual(1);
      const dup = rows("03c_doublons_entre_instituts").find((r) => r.email_masque === "d***@example.test");
      expect(dup).toBeTruthy();
      expect(JSON.stringify(results.flatMap((r) => r.rows))).not.toContain("dup@example.test");
    } finally {
      await db.query("ROLLBACK").catch(() => null);
      await db.query(`DELETE FROM "Organization" WHERE id IN ('uem_org_a','uem_org_b')`);
    }
  });

  it("échoue proprement avec des doublons (casse, espaces, entre instituts) sans rien créer ni modifier", async (ctx) => {
    if (blocked) return ctx.skip();
    await db.query("BEGIN");
    try {
      await seed([
        ["uem_u1", "uem_org_a", "Dup@Example.test"],
        ["uem_u2", "uem_org_b", "  dup@example.TEST "],
        ["uem_u3", "uem_org_b", "unique@example.test"],
      ]);
      const before = (await db.query(`SELECT COUNT(*)::int n FROM "User" WHERE id LIKE 'uem_%'`)).rows[0].n;
      await db.query("SAVEPOINT m");
      const error = await db.query(sql).then(
        () => null,
        (e: { code?: string; message?: string }) => e,
      );
      await db.query("ROLLBACK TO SAVEPOINT m");
      expect(error).not.toBeNull();
      expect(error?.code).toBe("23505");
      expect(error?.message).toContain("auth-accounts-audit.sql");
      expect(error?.message).toMatch(/1 e-mail\(s\) en double \(2 comptes/);
      expect(await indexExists()).toBe(false);
      const after = (await db.query(`SELECT COUNT(*)::int n FROM "User" WHERE id LIKE 'uem_%'`)).rows[0].n;
      expect(after).toBe(before);
    } finally {
      await db.query("ROLLBACK");
    }
    expect(await indexExists()).toBe(false);
  });

  it("réussit sans doublon, tolère les e-mails NULL/vides, rejette ensuite les variantes de casse et d'espaces", async (ctx) => {
    if (blocked) return ctx.skip();
    await inTransaction(async () => {
      await seed([
        ["uem_u1", "uem_org_a", "owner@example.test"],
        ["uem_u2", "uem_org_a", null],
        ["uem_u3", "uem_org_b", null],
        ["uem_u4", "uem_org_b", ""],
        ["uem_u5", "uem_org_a", "   "],
      ]);
      await db.query(sql);
      expect(await indexExists()).toBe(true);

      // Rejouable (IF NOT EXISTS).
      await db.query(sql);

      for (const [i, variant] of ["OWNER@example.test", " owner@example.test ", "Owner@Example.TEST"].entries()) {
        await db.query("SAVEPOINT s");
        const error = await db
          .query(
            `INSERT INTO "User"(id,"organizationId",email,"firstName","lastName","updatedAt") VALUES ($1,'uem_org_b',$2,'F','L',now())`,
            [`uem_v${i}`, variant],
          )
          .then(
            () => null,
            (e: { code?: string; constraint?: string }) => e,
          );
        await db.query("ROLLBACK TO SAVEPOINT s");
        expect(error?.code).toBe("23505");
        expect(error?.constraint).toBe(INDEX);
      }

      // Un e-mail différent et d'autres comptes sans e-mail restent acceptés.
      await db.query(
        `INSERT INTO "User"(id,"organizationId",email,"firstName","lastName","updatedAt") VALUES ('uem_ok1','uem_org_b','other@example.test','F','L',now()),('uem_ok2','uem_org_b',NULL,'F','L',now()),('uem_ok3','uem_org_a','','F','L',now())`,
      );
    });
    expect(await indexExists()).toBe(false);
  });
});
