import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client, Pool } from "pg";
import { bindOrganization, runAsJob, runInScope } from "@/lib/db/tenant-context";
import { hashActivationToken } from "@/lib/db/activation";
import { appPool, prepareRoles, rolesAdminUrl } from "./role-pools";

/**
 * Migration 20261120100000_auth_session_revocation : "SessionRevocation" (RLS, droits par rôle, usage unique) et
 * app_purge_expired_auth_data (purge, hachage sur place des jetons d'activation en clair). Vérifié avec les rôles
 * applicatifs sur une base locale jetable uniquement (rolesAdminUrl impose 127.0.0.1 / localhost ; ignoré sinon).
 */
const adminUrl = rolesAdminUrl();
const A = "asr_org_a";
const B = "asr_org_b";
const DENIED = { code: "42501" };
const CHECK = { code: "23514" };
const UNIQUE = { code: "23505" };
const MIGRATION = path.join(process.cwd(), "prisma/migrations/20261120100000_auth_session_revocation/migration.sql");
const jti = (n: string) => `asrjti${n}`.padEnd(24, "0");

describe.skipIf(!adminUrl)("authentification : révocation de session, usage unique, purge", () => {
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

  const insertSql = `INSERT INTO "SessionRevocation" (jti, kind, scope, "userId", "organizationId", "expiresAt")
                     VALUES ($1, $2, $3, $4, $5, now() + interval '1 hour') ON CONFLICT (jti) DO NOTHING`;

  async function cleanup() {
    await admin.query(`DELETE FROM "SessionRevocation" WHERE jti LIKE 'asrjti%'`);
    await admin.query(`DELETE FROM "Organization" WHERE id LIKE 'asr_org_%'`);
  }

  beforeAll(async () => {
    admin = new Client({ connectionString: adminUrl });
    await admin.connect();
    restoreEnv = await prepareRoles(admin, adminUrl);
    await cleanup();
    await admin.query(`INSERT INTO "Organization"(id,name,slug,"updatedAt") VALUES ('${A}','A','${A}',now()),('${B}','B','${B}',now())`);
    for (const [u, org] of [["asr_user_a", A], ["asr_user_b", B]]) {
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

  it("la migration est idempotente (rejouable sans erreur)", async () => {
    await admin.query(fs.readFileSync(MIGRATION, "utf8"));
    await admin.query(fs.readFileSync(MIGRATION, "utf8"));
  });

  it("contraintes : jti borné, kind et scope fermés, institut obligatoire hors plateforme, jti unique", async () => {
    const ins = (id: string, kind: string, scope: string, org: string | null) =>
      admin.query(`INSERT INTO "SessionRevocation" (jti, kind, scope, "userId", "organizationId", "expiresAt") VALUES ($1,$2,$3,'u',$4, now())`, [id, kind, scope, org]);
    await expect(ins("court", "session", "app", A)).rejects.toMatchObject(CHECK);
    await expect(ins(jti("k1"), "autre", "app", A)).rejects.toMatchObject(CHECK);
    await expect(ins(jti("k2"), "session", "ailleurs", A)).rejects.toMatchObject(CHECK);
    await expect(ins(jti("k3"), "session", "app", null)).rejects.toMatchObject(CHECK);
    await ins(jti("k4"), "session", "platform", null);
    await expect(ins(jti("k4"), "session", "platform", null)).rejects.toMatchObject(UNIQUE);
    await ins(jti("k5"), "oauth_state", "app", A);
  });

  it("rappel_app : lit et insère uniquement les lignes de son institut, ne modifie ni ne supprime rien", async () => {
    await admin.query(`DELETE FROM "SessionRevocation" WHERE jti LIKE 'asrjti%'`);
    await tenant(A, async () => {
      expect((await pool.query(insertSql, [jti("a1"), "session", "app", "asr_user_a", A])).rowCount).toBe(1);
      // autre institut / ligne plateforme : refusé par la politique
      await expect(pool.query(insertSql, [jti("a2"), "session", "app", "asr_user_b", B])).rejects.toMatchObject(DENIED);
      await expect(pool.query(insertSql, [jti("a3"), "session", "platform", "pu", null])).rejects.toMatchObject(DENIED);
      await expect(pool.query(`UPDATE "SessionRevocation" SET "expiresAt" = now() WHERE jti = $1`, [jti("a1")])).rejects.toMatchObject(DENIED);
      await expect(pool.query(`DELETE FROM "SessionRevocation" WHERE jti = $1`, [jti("a1")])).rejects.toMatchObject(DENIED);
    });
    await tenant(B, async () => {
      expect((await pool.query(`SELECT jti FROM "SessionRevocation" WHERE jti LIKE 'asrjti%'`)).rows).toEqual([]);
      // un jti connu d'un autre institut n'est pas lisible
      expect((await pool.query(`SELECT 1 FROM "SessionRevocation" WHERE jti = $1`, [jti("a1")])).rowCount).toBe(0);
    });
    await tenant(A, async () => {
      expect((await pool.query(`SELECT jti FROM "SessionRevocation" WHERE jti LIKE 'asrjti%'`)).rows).toEqual([{ jti: jti("a1") }]);
    });
  });

  it("usage unique : le second insert avec le même jti n'insère rien (DO NOTHING), y compris depuis un autre contexte", async () => {
    await tenant(A, async () => {
      expect((await pool.query(insertSql, [jti("u1"), "oauth_state", "app", "asr_user_a", A])).rowCount).toBe(1);
      expect((await pool.query(insertSql, [jti("u1"), "oauth_state", "app", "asr_user_a", A])).rowCount).toBe(0);
    });
    await asPublic(async () => {
      expect((await pool.query(insertSql, [jti("u1"), "oauth_state", "app", "asr_user_a", A])).rowCount).toBe(0);
    });
  });

  it("déconnexion (route publique) : rappel_public inscrit la session d'un institut ou de la plateforme ; la lecture suit", async () => {
    await asPublic(async () => {
      expect((await pool.query(insertSql, [jti("p1"), "session", "app", "asr_user_b", B])).rowCount).toBe(1);
      expect((await pool.query(insertSql, [jti("p2"), "session", "platform", "pu_1", null])).rowCount).toBe(1);
      expect((await pool.query(`SELECT 1 FROM "SessionRevocation" WHERE jti = $1 AND kind = 'session'`, [jti("p1")])).rowCount).toBe(1);
      await expect(pool.query(`UPDATE "SessionRevocation" SET "expiresAt" = now()`)).rejects.toMatchObject(DENIED);
      await expect(pool.query(`DELETE FROM "SessionRevocation"`)).rejects.toMatchObject(DENIED);
    });
    await asPlatform(async () => {
      expect((await pool.query(`SELECT 1 FROM "SessionRevocation" WHERE jti = $1`, [jti("p2")])).rowCount).toBe(1);
      expect((await pool.query(insertSql, [jti("p3"), "session", "platform", "pu_1", null])).rowCount).toBe(1);
    });
    await asJob(async () => {
      expect((await pool.query(`SELECT 1 FROM "SessionRevocation" WHERE jti = $1`, [jti("p1")])).rowCount).toBe(1);
      await expect(pool.query(insertSql, [jti("p4"), "session", "app", "asr_user_a", A])).rejects.toMatchObject(DENIED);
    });
    // l'institut B voit sa propre révocation, pas celle de la plateforme
    await tenant(B, async () => {
      expect((await pool.query(`SELECT 1 FROM "SessionRevocation" WHERE jti = $1`, [jti("p1")])).rowCount).toBe(1);
      expect((await pool.query(`SELECT 1 FROM "SessionRevocation" WHERE jti = $1`, [jti("p2")])).rowCount).toBe(0);
    });
  });

  it("app_purge_expired_auth_data : supprime l'expiré, garde le valide, hache les jetons en clair, ne touche aucun compte", async () => {
    await admin.query(`DELETE FROM "SessionRevocation" WHERE jti LIKE 'asrjti%'`);
    const rev = (id: string, interval: string) =>
      admin.query(
        `INSERT INTO "SessionRevocation" (jti, kind, scope, "userId", "organizationId", "expiresAt") VALUES ($1,'session','app','u',$2, now() + $3::interval)`,
        [id, A, interval],
      );
    await rev(jti("old"), "-30 days");
    await rev(jti("grace"), "-1 day"); // expiré mais dans le délai de grâce (7 jours)
    await rev(jti("live"), "1 day");

    const plain = "c".repeat(64);
    const act = (id: string, token: string, expires: string, used = "NULL") =>
      admin.query(
        `INSERT INTO "ActivationToken" (id, "userId", token, "expiresAt", "usedAt") VALUES ($1,'asr_user_a',$2, now() + $3::interval, ${used})`,
        [id, token, expires],
      );
    await act("asr_act_old", "d".repeat(64), "-30 days");
    await act("asr_act_used", "e".repeat(64), "1 day", "now() - interval '30 days'");
    await act("asr_act_plain", plain, "1 day");
    await act("asr_act_hashed", hashActivationToken("f".repeat(64)), "1 day");

    const before = (await admin.query(`SELECT (SELECT count(*) FROM "User")::int u, (SELECT count(*) FROM "Organization")::int o`)).rows[0];
    const result = await asJob(() => pool.query(`SELECT * FROM app_purge_expired_auth_data(interval '7 days')`));
    const row = result.rows[0];
    expect(Number(row.sessionRevocations)).toBeGreaterThanOrEqual(1);
    expect(Number(row.activationTokensDeleted)).toBeGreaterThanOrEqual(2);
    expect(Number(row.activationTokensHashed)).toBeGreaterThanOrEqual(1);

    const left = (await admin.query(`SELECT jti FROM "SessionRevocation" WHERE jti LIKE 'asrjti%' ORDER BY jti`)).rows.map((r) => r.jti);
    expect(left).toEqual([jti("grace"), jti("live")].sort());
    const tokens = (await admin.query(`SELECT id, token FROM "ActivationToken" WHERE id LIKE 'asr_act_%' ORDER BY id`)).rows;
    expect(tokens.map((t) => t.id)).toEqual(["asr_act_hashed", "asr_act_plain"]);
    // Le clair est remplacé par EXACTEMENT le haché de l'application : le lien déjà envoyé reste valable.
    expect(tokens.find((t) => t.id === "asr_act_plain")!.token).toBe(hashActivationToken(plain));
    expect(tokens.find((t) => t.id === "asr_act_hashed")!.token).toBe(hashActivationToken("f".repeat(64)));
    expect((await admin.query(`SELECT (SELECT count(*) FROM "User")::int u, (SELECT count(*) FROM "Organization")::int o`)).rows[0]).toEqual(before);

    // Rejouer la purge ne change plus rien
    const again = (await asJob(() => pool.query(`SELECT * FROM app_purge_expired_auth_data(interval '7 days')`))).rows[0];
    expect(Number(again.activationTokensHashed)).toBe(0);
  });

  it("la fonction de purge n'est exécutable ni par rappel_app ni par rappel_public ; retention négative refusée", async () => {
    await tenant(A, async () => {
      await expect(pool.query(`SELECT * FROM app_purge_expired_auth_data()`)).rejects.toMatchObject(DENIED);
    });
    await asPublic(async () => {
      await expect(pool.query(`SELECT * FROM app_purge_expired_auth_data()`)).rejects.toMatchObject(DENIED);
    });
    await asJob(async () => {
      await expect(pool.query(`SELECT * FROM app_purge_expired_auth_data(interval '-1 day')`)).rejects.toMatchObject({ code: "22023" });
    });
    await asPlatform(async () => {
      expect((await pool.query(`SELECT * FROM app_purge_expired_auth_data()`)).rowCount).toBe(1);
    });
  });
});
