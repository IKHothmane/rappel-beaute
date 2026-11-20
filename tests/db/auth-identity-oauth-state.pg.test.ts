import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client, Pool } from "pg";
import { bindOrganization, runAsJob, runInScope } from "@/lib/db/tenant-context";
import { appPool, prepareRoles, rolesAdminUrl } from "./role-pools";

/**
 * Migration 20261118100000_auth_identity_oauth_state : UserIdentity, AuthOAuthState, AuthPendingSignup,
 * EmailVerificationToken, User.emailVerifiedAt. Vérifié avec les rôles applicatifs sur une base locale
 * jetable uniquement (rolesAdminUrl impose 127.0.0.1 / localhost ; ignoré sans base de test).
 */
const adminUrl = rolesAdminUrl();
const A = "aid_org_a";
const B = "aid_org_b";
const DENIED = { code: "42501" };
const UNIQUE = { code: "23505" };
const CHECK = { code: "23514" };
const MIGRATION = path.join(process.cwd(), "prisma/migrations/20261118100000_auth_identity_oauth_state/migration.sql");

describe.skipIf(!adminUrl)("authentification : identités, états OAuth, inscriptions en attente", () => {
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
    await admin.query(`DELETE FROM "AuthPendingSignup" WHERE id LIKE 'aid_%'`);
    await admin.query(`DELETE FROM "AuthOAuthState" WHERE id LIKE 'aid_%'`);
    await admin.query(`DELETE FROM "Organization" WHERE id LIKE 'aid_org_%'`);
  }
  const identity = (id: string, userId: string, subject: string, provider = "google") =>
    admin.query(
      `INSERT INTO "UserIdentity"(id,"userId",provider,"providerSubject",email,"emailVerified") VALUES ($1,$2,$3,$4,'u@example.test',true)`,
      [id, userId, provider, subject],
    );
  const oauthState = (id: string, hash: string, intent: string, expires: string, extra: { userId?: string; redirect?: string | null } = {}) =>
    admin.query(
      `INSERT INTO "AuthOAuthState"(id,"stateHash","nonceHash",intent,"userId","codeVerifierEnc","redirectAfter","expiresAt")
       VALUES ($1,$2,'n',$3,$4,'enc',$5, now() + $6::interval)`,
      [id, hash, intent, extra.userId ?? null, extra.redirect ?? null, expires],
    );
  const pending = (id: string, hash: string, provider: string, subject: string | null, password: string | null = null) =>
    admin.query(
      `INSERT INTO "AuthPendingSignup"(id,"tokenHash",provider,"providerSubject",email,name,"passwordHash","expiresAt")
       VALUES ($1,$2,$3,$4,'New@Example.test','N',$5, now() + interval '1 hour')`,
      [id, hash, provider, subject, password],
    );

  beforeAll(async () => {
    admin = new Client({ connectionString: adminUrl });
    await admin.connect();
    restoreEnv = await prepareRoles(admin, adminUrl);
    await cleanup();
    await admin.query(`INSERT INTO "Organization"(id,name,slug,"updatedAt") VALUES ('${A}','A','${A}',now()),('${B}','B','${B}',now())`);
    for (const [u, org] of [["aid_user_a", A], ["aid_user_a2", A], ["aid_user_b", B]]) {
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

  it("User.emailVerifiedAt existe, nullable, sans valeur rétroactive", async () => {
    const col = (
      await admin.query(
        `SELECT is_nullable, data_type FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'emailVerifiedAt'`,
      )
    ).rows[0];
    expect(col).toEqual({ is_nullable: "YES", data_type: "timestamp with time zone" });
    expect((await admin.query(`SELECT count(*)::int n FROM "User" WHERE id LIKE 'aid_user_%' AND "emailVerifiedAt" IS NOT NULL`)).rows[0].n).toBe(0);
  });

  it("UserIdentity : une identité Google = un seul compte, un seul lien par compte et fournisseur", async () => {
    await identity("aid_i1", "aid_user_a", "sub-1");
    await expect(identity("aid_i2", "aid_user_b", "sub-1")).rejects.toMatchObject(UNIQUE);
    await expect(identity("aid_i3", "aid_user_a", "sub-2")).rejects.toMatchObject(UNIQUE);
    await expect(identity("aid_i4", "aid_user_a2", "sub-3", "facebook")).rejects.toMatchObject(CHECK);
    // Suppression du compte : l'identité part avec lui
    await identity("aid_i5", "aid_user_a2", "sub-5");
    await admin.query(`DELETE FROM "User" WHERE id = 'aid_user_a2'`);
    expect((await admin.query(`SELECT count(*)::int n FROM "UserIdentity" WHERE id = 'aid_i5'`)).rows[0].n).toBe(0);
    await admin.query(
      `INSERT INTO "User"(id,"organizationId",email,"firstName","lastName","updatedAt") VALUES ('aid_user_a2','${A}','aid_user_a2@example.test','F','L',now())`,
    );
  });

  it("UserIdentity : isolation par institut, callback public par fonction exacte, aucun accès direct", async () => {
    await identity("aid_i6", "aid_user_b", "sub-b");
    await tenant(A, async () => {
      const ids = (await pool.query(`SELECT id FROM "UserIdentity" WHERE id LIKE 'aid_i%' ORDER BY id`)).rows.map((r) => r.id);
      expect(ids).toEqual(["aid_i1"]);
      expect((await pool.query(`UPDATE "UserIdentity" SET "lastLoginAt" = now() WHERE id = 'aid_i6'`)).rowCount).toBe(0);
      await expect(pool.query(`UPDATE "UserIdentity" SET "providerSubject" = 'x' WHERE id = 'aid_i1'`)).rejects.toMatchObject(DENIED);
      await expect(
        pool.query(`INSERT INTO "UserIdentity"(id,"userId",provider,"providerSubject",email) VALUES ('aid_i7','aid_user_b','google','sub-7','x@example.test')`),
      ).rejects.toMatchObject({ code: "42501" });
    });
    await asPublic(async () => {
      await expect(pool.query(`SELECT count(*) FROM "UserIdentity"`)).rejects.toMatchObject(DENIED);
      await expect(pool.query(`UPDATE "UserIdentity" SET "lastLoginAt" = now()`)).rejects.toMatchObject(DENIED);
      await expect(pool.query(`DELETE FROM "UserIdentity"`)).rejects.toMatchObject(DENIED);
      const found = (await pool.query(`SELECT * FROM app_public_identity_login('google', 'sub-b')`)).rows;
      expect(found).toEqual([{ userId: "aid_user_b", organizationId: B, userStatus: "ACTIVE", organizationStatus: "ACTIVE" }]);
      expect((await pool.query(`SELECT * FROM app_public_identity_login('google', 'inconnu')`)).rows).toEqual([]);
      expect((await pool.query(`SELECT app_public_identity_touch('google', 'sub-b') AS ok`)).rows[0].ok).toBe(true);
      expect((await pool.query(`SELECT app_public_identity_touch('google', 'inconnu') AS ok`)).rows[0].ok).toBe(false);
    });
    expect((await admin.query(`SELECT "lastLoginAt" IS NOT NULL AS touched FROM "UserIdentity" WHERE id = 'aid_i6'`)).rows[0].touched).toBe(true);
    expect((await admin.query(`SELECT "lastLoginAt" IS NOT NULL AS touched FROM "UserIdentity" WHERE id = 'aid_i1'`)).rows[0].touched).toBe(false);
    await asJob(async () => {
      await expect(pool.query(`SELECT count(*) FROM "UserIdentity"`)).rejects.toMatchObject(DENIED);
    });
    await asPlatform(async () => {
      expect((await pool.query(`SELECT count(*)::int n FROM "UserIdentity" WHERE id LIKE 'aid_i%'`)).rows[0].n).toBeGreaterThanOrEqual(2);
    });
  });

  it("UserIdentity : rappel_public n'insère jamais directement ; rappel_app n'insère que des colonnes précises, dans son institut", async () => {
    await asPublic(async () => {
      await expect(
        pool.query(`INSERT INTO "UserIdentity"(id,"userId",provider,"providerSubject",email) VALUES ('aid_t0','aid_user_b','google','sub-t0','x@example.test')`),
      ).rejects.toMatchObject(DENIED);
    });
    await tenant(A, async () => {
      await expect(
        pool.query(`INSERT INTO "UserIdentity"(id,"userId",provider,"providerSubject",email,"createdAt") VALUES ('aid_t1','aid_user_a2','google','sub-t1','x@example.test', now())`),
      ).rejects.toMatchObject(DENIED); // colonne hors liste blanche
      await expect(
        pool.query(`INSERT INTO "UserIdentity"(id,"userId",provider,"providerSubject",email) VALUES ('aid_t2','aid_user_b','google','sub-t2','x@example.test')`),
      ).rejects.toMatchObject(DENIED); // utilisateur d'un autre institut : refusé par la RLS
      const ok = await pool.query(
        `INSERT INTO "UserIdentity"(id,"userId",provider,"providerSubject",email,"emailVerified","lastLoginAt")
         VALUES ('aid_t3','aid_user_a2','google','sub-t3','x@example.test',true,now()) ON CONFLICT DO NOTHING`,
      );
      expect(ok.rowCount).toBe(1);
      // Conflit sur un sub d'un autre institut (invisible sous la RLS) : DO NOTHING, rien d'inséré, aucune fuite.
      const conflict = await pool.query(
        `INSERT INTO "UserIdentity"(id,"userId",provider,"providerSubject",email) VALUES ('aid_t4','aid_user_a','google','sub-b','x@example.test') ON CONFLICT DO NOTHING`,
      );
      expect(conflict.rowCount).toBe(0);
    });
    await admin.query(`DELETE FROM "UserIdentity" WHERE id LIKE 'aid_t%'`);
  });

  it("app_public_identity_create_for_signup : seulement pour le propriétaire tout juste créé du pending Google ouvert", async () => {
    const C = "aid_org_c";
    const D = "aid_org_d";
    await admin.query(`INSERT INTO "Organization"(id,name,slug,"updatedAt") VALUES ('${C}','C','${C}',now()),('${D}','D','${D}',now())`);
    const owner = (id: string, org: string, email: string, extra = "") =>
      admin.query(
        `INSERT INTO "User"(id,"organizationId",email,"firstName","lastName",role,"emailVerifiedAt","updatedAt"${extra ? ',"passwordHash"' : ""})
         VALUES ($1,$2,$3,'F','L','OWNER',now(),now()${extra ? ",'hash'" : ""})`,
        [id, org, email],
      );
    await owner("aid_owner_c", C, "new@example.test");
    await owner("aid_owner_pw", D, "new@example.test", "pw");
    await pending("aid_pend_ok", "hok", "google", "sub-signup-ok");
    await pending("aid_pend_used", "hused", "google", "sub-signup-used");
    await admin.query(`UPDATE "AuthPendingSignup" SET "consumedAt" = now() WHERE id = 'aid_pend_used'`);
    const call = (id: string, pendingId: string, userId: string, org: string) =>
      asPublic(() => pool.query(`SELECT app_public_identity_create_for_signup($1,$2,$3,$4)`, [id, pendingId, userId, org]));

    // Un User d'un autre institut, un pending consommé ou inconnu, un propriétaire avec mot de passe : refusés.
    await expect(call("aid_sg1", "aid_pend_ok", "aid_user_b", B)).rejects.toMatchObject(DENIED);
    await expect(call("aid_sg2", "aid_pend_used", "aid_owner_c", C)).rejects.toMatchObject(DENIED);
    await expect(call("aid_sg3", "aid_pend_inconnu", "aid_owner_c", C)).rejects.toMatchObject(DENIED);
    await expect(call("aid_sg4", "aid_pend_ok", "aid_owner_pw", D)).rejects.toMatchObject(DENIED);
    await expect(call("aid_sg5", "aid_pend_ok", "aid_owner_c", A)).rejects.toMatchObject(DENIED); // mauvais institut
    // Plus d'un utilisateur dans l'institut : refusé.
    await admin.query(`INSERT INTO "User"(id,"organizationId",email,"firstName","lastName","updatedAt") VALUES ('aid_second_c','${C}','second@example.test','F','L',now())`);
    await expect(call("aid_sg6", "aid_pend_ok", "aid_owner_c", C)).rejects.toMatchObject(DENIED);
    await admin.query(`DELETE FROM "User" WHERE id = 'aid_second_c'`);
    // Propriétaire ancien (plus de 10 minutes) : refusé.
    await admin.query(`UPDATE "User" SET "createdAt" = now() - interval '1 hour' WHERE id = 'aid_owner_c'`);
    await expect(call("aid_sg7", "aid_pend_ok", "aid_owner_c", C)).rejects.toMatchObject(DENIED);
    await admin.query(`UPDATE "User" SET "createdAt" = now() WHERE id = 'aid_owner_c'`);
    expect((await admin.query(`SELECT count(*)::int n FROM "UserIdentity" WHERE id LIKE 'aid_sg%'`)).rows[0].n).toBe(0);

    // Cas valide : le sujet et l'e-mail viennent du pending, pas de l'appelant.
    await call("aid_sg8", "aid_pend_ok", "aid_owner_c", C);
    expect((await admin.query(`SELECT "userId", provider, "providerSubject", lower(email) AS email, "emailVerified" FROM "UserIdentity" WHERE id = 'aid_sg8'`)).rows).toEqual([
      { userId: "aid_owner_c", provider: "google", providerSubject: "sub-signup-ok", email: "new@example.test", emailVerified: true },
    ]);
    // Rejeu avec le même pending : l'index unique reste le dernier rempart.
    await expect(call("aid_sg9", "aid_pend_ok", "aid_owner_c", C)).rejects.toMatchObject(UNIQUE);
  });

  it("AuthOAuthState : contraintes, hors institut, consommation atomique à usage unique", async () => {
    await expect(oauthState("aid_s0", "h0", "bogus", "5 minutes")).rejects.toMatchObject(CHECK);
    await expect(oauthState("aid_s0", "h0", "link", "5 minutes")).rejects.toMatchObject(CHECK); // link sans userId
    await expect(oauthState("aid_s0", "h0", "login", "5 minutes", { redirect: "//evil.test" })).rejects.toMatchObject(CHECK);
    await expect(oauthState("aid_s0", "h0", "login", "5 minutes", { redirect: "https://evil.test" })).rejects.toMatchObject(CHECK);
    await expect(oauthState("aid_s0", "h0", "login", "5 minutes", { redirect: "/\\evil.test" })).rejects.toMatchObject(CHECK);
    await expect(oauthState("aid_s0", "h0", "login", "5 minutes", { redirect: `/${"a".repeat(600)}` })).rejects.toMatchObject(CHECK);
    await oauthState("aid_s1", "h1", "login", "5 minutes", { redirect: "/domains/app?x=1" });
    await oauthState("aid_s2", "h2", "link", "5 minutes", { userId: "aid_user_a" });
    await oauthState("aid_s3", "h3", "signup", "-1 minute");
    await expect(oauthState("aid_s4", "h1", "login", "5 minutes")).rejects.toMatchObject(UNIQUE);

    const consume = (hash: string) =>
      pool.query(
        `UPDATE "AuthOAuthState" SET "consumedAt" = NOW()
         WHERE "stateHash" = $1 AND "consumedAt" IS NULL AND "expiresAt" > NOW()
         RETURNING id, intent, "redirectAfter"`,
        [hash],
      );
    await asPublic(async () => {
      const [first, second] = await Promise.all([consume("h1"), consume("h1")]);
      expect(first.rowCount + second.rowCount).toBe(1);
      expect((await consume("h1")).rowCount).toBe(0);
      expect((await consume("h3")).rowCount).toBe(0); // expiré
      expect((await consume("absent")).rowCount).toBe(0);
      await expect(pool.query(`UPDATE "AuthOAuthState" SET "expiresAt" = now() + interval '1 day' WHERE "stateHash" = 'h2'`)).rejects.toMatchObject(DENIED);
      await expect(pool.query(`DELETE FROM "AuthOAuthState"`)).rejects.toMatchObject(DENIED);
    });
    await tenant(A, async () => {
      await expect(pool.query(`SELECT count(*) FROM "AuthOAuthState"`)).rejects.toMatchObject(DENIED);
    });
    await asJob(async () => {
      await expect(pool.query(`SELECT count(*) FROM "AuthOAuthState"`)).rejects.toMatchObject(DENIED);
    });
    // Supprimer le compte lié supprime l'état 'link'
    await admin.query(`DELETE FROM "User" WHERE id = 'aid_user_a2'`);
    expect((await admin.query(`SELECT count(*)::int n FROM "AuthOAuthState" WHERE id = 'aid_s2'`)).rows[0].n).toBe(1);
  });

  it("AuthPendingSignup : unicité partielle par identité ouverte, aucun User créé, résultat idempotent", async () => {
    const usersBefore = (await admin.query(`SELECT count(*)::int n FROM "User"`)).rows[0].n;
    await pending("aid_p1", "ph1", "google", "g-sub-1");
    await expect(pending("aid_p2", "ph2", "google", "g-sub-1")).rejects.toMatchObject(UNIQUE);
    await expect(pending("aid_p3", "ph1", "google", "g-sub-3")).rejects.toMatchObject(UNIQUE); // tokenHash
    await expect(pending("aid_p4", "ph4", "google", null)).rejects.toMatchObject(CHECK);
    await expect(pending("aid_p4", "ph4", "google", "g-sub-4", "hash")).rejects.toMatchObject(CHECK);
    await expect(pending("aid_p4", "ph4", "email", "g-sub-4")).rejects.toMatchObject(CHECK);
    await expect(pending("aid_p4", "ph4", "github", null)).rejects.toMatchObject(CHECK);
    // Une seule inscription e-mail OUVERTE par adresse (index partiel de 20261121100000_auth_email_signup_hardening,
    // insensible à la casse) ; une fois la première close, une nouvelle est acceptée.
    await pending("aid_p5", "ph5", "email", null, "$argon2id$x");
    await expect(pending("aid_p6", "ph6", "email", null, "$argon2id$y")).rejects.toMatchObject(UNIQUE);
    await admin.query(`UPDATE "AuthPendingSignup" SET "consumedAt" = now() WHERE id = 'aid_p5'`);
    await pending("aid_p6", "ph6", "email", null, "$argon2id$y");
    // Une fois consommée, l'identité peut s'inscrire à nouveau
    await admin.query(`UPDATE "AuthPendingSignup" SET "consumedAt" = now(), "organizationId" = '${A}' WHERE id = 'aid_p1'`);
    await pending("aid_p7", "ph7", "google", "g-sub-1");
    expect((await admin.query(`SELECT count(*)::int n FROM "User"`)).rows[0].n).toBe(usersBefore);

    await asPublic(async () => {
      expect((await pool.query(`UPDATE "AuthPendingSignup" SET "emailVerified" = true, "consumedAt" = now() WHERE id = 'aid_p5'`)).rowCount).toBe(1);
      await expect(pool.query(`UPDATE "AuthPendingSignup" SET email = 'x@example.test' WHERE id = 'aid_p6'`)).rejects.toMatchObject(DENIED);
      await expect(pool.query(`UPDATE "AuthPendingSignup" SET "passwordHash" = 'x' WHERE id = 'aid_p6'`)).rejects.toMatchObject(DENIED);
      await expect(pool.query(`DELETE FROM "AuthPendingSignup" WHERE id = 'aid_p6'`)).rejects.toMatchObject(DENIED);
    });
    await tenant(A, async () => {
      await expect(pool.query(`SELECT count(*) FROM "AuthPendingSignup"`)).rejects.toMatchObject(DENIED);
    });
    // Suppression de l'institut : le résultat est remis à NULL, la ligne reste
    await admin.query(`INSERT INTO "Organization"(id,name,slug,"updatedAt") VALUES ('aid_org_e','C','aid_org_e',now())`);
    await admin.query(`UPDATE "AuthPendingSignup" SET "organizationId" = 'aid_org_e' WHERE id = 'aid_p6'`);
    await admin.query(`DELETE FROM "Organization" WHERE id = 'aid_org_e'`);
    expect((await admin.query(`SELECT "organizationId" o FROM "AuthPendingSignup" WHERE id = 'aid_p6'`)).rows[0].o).toBeNull();
  });

  it("EmailVerificationToken : exactement une cible, unicité, isolation par institut", async () => {
    const token = (id: string, hash: string, userId: string | null, pendingId: string | null) =>
      admin.query(
        `INSERT INTO "EmailVerificationToken"(id,"userId","pendingSignupId","newEmail","tokenHash","expiresAt") VALUES ($1,$2,$3,'n@example.test',$4, now() + interval '1 hour')`,
        [id, userId, pendingId, hash],
      );
    await expect(token("aid_t0", "th0", null, null)).rejects.toMatchObject(CHECK);
    await expect(token("aid_t0", "th0", "aid_user_a", "aid_p5")).rejects.toMatchObject(CHECK);
    await token("aid_t1", "th1", "aid_user_a", null);
    await token("aid_t2", "th2", null, "aid_p5");
    await token("aid_t3", "th3", "aid_user_b", null);
    await expect(token("aid_t4", "th1", "aid_user_a", null)).rejects.toMatchObject(UNIQUE);
    await tenant(A, async () => {
      const ids = (await pool.query(`SELECT id FROM "EmailVerificationToken" WHERE id LIKE 'aid_t%' ORDER BY id`)).rows.map((r) => r.id);
      expect(ids).toEqual(["aid_t1"]);
      expect((await pool.query(`UPDATE "EmailVerificationToken" SET "usedAt" = now() WHERE id = 'aid_t3'`)).rowCount).toBe(0);
    });
    await asPublic(async () => {
      expect((await pool.query(`UPDATE "EmailVerificationToken" SET "usedAt" = now() WHERE "tokenHash" = 'th2' AND "usedAt" IS NULL`)).rowCount).toBe(1);
      await expect(pool.query(`UPDATE "EmailVerificationToken" SET "newEmail" = 'x@example.test' WHERE id = 'aid_t2'`)).rejects.toMatchObject(DENIED);
    });
    // Supprimer l'inscription en attente supprime ses jetons
    await admin.query(`DELETE FROM "AuthPendingSignup" WHERE id = 'aid_p5'`);
    expect((await admin.query(`SELECT count(*)::int n FROM "EmailVerificationToken" WHERE id = 'aid_t2'`)).rows[0].n).toBe(0);
  });

  it("purge : retire les états expirés, garde les actifs, réservée aux rôles tâche et plateforme", async () => {
    await oauthState("aid_s9", "h9", "login", "-3 days");
    await oauthState("aid_s10", "h10", "login", "10 minutes");
    await asPublic(async () => {
      await expect(pool.query(`SELECT * FROM app_purge_expired_auth_state()`)).rejects.toMatchObject(DENIED);
    });
    await tenant(A, async () => {
      await expect(pool.query(`SELECT * FROM app_purge_expired_auth_state()`)).rejects.toMatchObject(DENIED);
    });
    await asJob(async () => {
      await expect(pool.query(`SELECT * FROM app_purge_expired_auth_state('-1 day')`)).rejects.toMatchObject({ code: "22023" });
      const out = (await pool.query(`SELECT * FROM app_purge_expired_auth_state()`)).rows[0];
      expect(Number(out.oauthStates)).toBeGreaterThanOrEqual(1);
    });
    const left = (await admin.query(`SELECT id FROM "AuthOAuthState" WHERE id IN ('aid_s9','aid_s10')`)).rows.map((r) => r.id);
    expect(left).toEqual(["aid_s10"]);
  });

  it("la migration se rejoue sans effet de bord et les nouvelles tables restent sous RLS", async () => {
    const sql = fs.readFileSync(MIGRATION, "utf8");
    const before = (await admin.query(`SELECT count(*)::int n FROM "UserIdentity"`)).rows[0].n;
    await admin.query(sql);
    await admin.query(sql);
    expect((await admin.query(`SELECT count(*)::int n FROM "UserIdentity"`)).rows[0].n).toBe(before);
    const { rows } = await admin.query(
      `SELECT c.relname, c.relrowsecurity,
              (SELECT count(*)::int FROM pg_policies p WHERE p.tablename = c.relname) AS policies
       FROM pg_class c
       WHERE c.relnamespace = 'public'::regnamespace
         AND c.relname IN ('UserIdentity','AuthOAuthState','AuthPendingSignup','EmailVerificationToken') ORDER BY 1`,
    );
    expect(rows).toEqual([
      { relname: "AuthOAuthState", relrowsecurity: true, policies: 1 },
      { relname: "AuthPendingSignup", relrowsecurity: true, policies: 1 },
      { relname: "EmailVerificationToken", relrowsecurity: true, policies: 1 },
      { relname: "UserIdentity", relrowsecurity: true, policies: 1 },
    ]);
    // Aucun index unique global sur LOWER(User.email) ni changement de User.loginPhone
    const idx = await admin.query(`SELECT indexdef FROM pg_indexes WHERE tablename = 'User' AND indexdef ILIKE '%lower%'`);
    expect(idx.rows).toEqual([]);
  });
});
