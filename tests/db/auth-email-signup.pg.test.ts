import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Client, Pool } from "pg";
import { randomBytes } from "node:crypto";
import { bindOrganization, runInScope } from "@/lib/db/tenant-context";
import { appPool, prepareRoles, rolesAdminUrl } from "./role-pools";

const holder = vi.hoisted(() => ({ pool: null as unknown as Pool, put: vi.fn() }));
vi.mock("@/lib/storage", () => ({ getStorageService: () => ({ put: holder.put }) }));
vi.mock("@/lib/db/pool", () => ({
  get pool() {
    return holder.pool;
  },
}));

import { hashPasswordAsync, verifyPassword } from "@/lib/auth/crypto";
import { hashToken, loadAppSessionForUser } from "@/lib/db/auth-identities";
import {
  completeEmailSignup,
  getEmailPendingState,
  getOpenEmailPending,
  resendEmailSignup,
  startEmailSignup,
  verifyEmailSignup,
} from "@/lib/db/email-signup";
import { getAccountSecurity, requestEmailChange, setInitialPassword, verifyEmailChange } from "@/lib/db/account-security";
import { activateAccount, issuePasswordResetToken } from "@/lib/db/activation";
import { authenticateUser } from "@/lib/db/users";
import { createPublicSignup } from "@/lib/db/public-signup";
import { isUserEmailUniqueViolation } from "@/lib/db/email-uniqueness";
import { prepareLogo, storeSignupLogo } from "@/lib/auth/signup-form";
import { logger } from "@/lib/logger";

/**
 * Inscription par e-mail vérifiée et « Sécuriser mon compte » contre PostgreSQL avec les rôles séparés
 * (rappel_public / rappel_app) : ignoré sans base de test locale (DATABASE_TEST_URL). Migrations 20261118100000 et
 * 20261121100000 appliquées. Les grants et la RLS ne se voient qu'ici, pas avec des doubles.
 */
const adminUrl = rolesAdminUrl();
const tag = randomBytes(4).toString("hex");
const PASSWORD = "Un-bon-secret-9371!";
const NEW_PASSWORD = "Autre-secret-4412!";

describe.skipIf(!adminUrl)("inscription e-mail vérifiée et sécurisation du compte (PostgreSQL)", () => {
  let admin: Client;
  let restoreEnv: () => void;
  let pwHash: string;
  const orgIds = new Set<string>();
  const asPublic = <T,>(fn: () => Promise<T>) => runInScope({ kind: "public", reason: "test" }, fn);
  const asTenant = <T,>(org: string, fn: () => Promise<T>) =>
    runInScope({ kind: "tenant", organizationId: null }, async () => {
      bindOrganization(org);
      return fn();
    });
  const email = (n: string) => `emf-${tag}-${n}@example.test`;
  const count = async (sql: string, params: unknown[] = []) => (await admin.query(sql, params)).rows[0].n as number;
  const form = (token: string, over: Record<string, unknown> = {}) => ({
    token,
    password: PASSWORD,
    institut: `emf_${tag}`,
    city: "Casablanca",
    address: "",
    website: null,
    phone: `08${Math.floor(10000000 + Math.random() * 89999999)}`,
    ...over,
  });

  /** start puis verify : renvoie le jeton du cookie d'inscription. */
  async function verified(n: string) {
    const started = await asPublic(() => startEmailSignup({ email: email(n), name: "Ada Mail", passwordHash: pwHash }));
    if (started.kind !== "created") throw new Error("created attendu");
    const result = await asPublic(() => verifyEmailSignup(started.token));
    if (result.kind !== "verified") throw new Error("verified attendu");
    return { linkToken: started.token, cookie: result.cookieToken };
  }

  async function seedUser(id: string, opts: { email: string | null; verified?: boolean; password?: string | null; org?: string }) {
    const org = opts.org ?? `emf_org_${tag}_${id}`;
    if (!opts.org) {
      await admin.query(`INSERT INTO "Organization"(id,name,slug,"updatedAt") VALUES ($1,$2,$1,now())`, [org, `Org ${id}`]);
      orgIds.add(org);
    }
    await admin.query(
      `INSERT INTO "User"(id,"organizationId",email,"firstName","lastName","passwordHash","emailVerifiedAt","updatedAt")
       VALUES ($1,$2,$3,'Ada','Seed',$4,$5,now())`,
      [`emf_u_${tag}_${id}`, org, opts.email, opts.password ?? null, opts.verified ? new Date() : null],
    );
    return { userId: `emf_u_${tag}_${id}`, org };
  }

  beforeAll(async () => {
    admin = new Client({ connectionString: adminUrl });
    await admin.connect();
    restoreEnv = await prepareRoles(admin, adminUrl);
    holder.pool = appPool(adminUrl);
    pwHash = await hashPasswordAsync(PASSWORD);
    // Administrateur de la plateforme dont l'adresse ne doit jamais ouvrir d'inscription ni de changement d'adresse.
    await admin.query(
      `INSERT INTO "PlatformUser"(id,email,"firstName","lastName",role,status,"passwordHash","updatedAt") VALUES ($1,$2,'Root','Admin','SUPER_ADMIN','ACTIVE',$3,now())`,
      [`emf_pu_${tag}`, email("platform"), pwHash],
    );
  });

  afterAll(async () => {
    await admin?.query(`DELETE FROM "AuthPendingSignup" WHERE email LIKE $1`, [`emf-${tag}-%`]).catch(() => null);
    await admin?.query(`DELETE FROM "PlatformUser" WHERE email LIKE $1`, [`emf-${tag}-%`]).catch(() => null);
    if (orgIds.size) await admin?.query(`DELETE FROM "Organization" WHERE id = ANY($1::text[])`, [[...orgIds]]).catch(() => null);
    await admin?.query(`DROP INDEX IF EXISTS "emf_unique_probe"`).catch(() => null);
    await holder.pool?.end().catch(() => null);
    await admin?.end();
    restoreEnv?.();
  });

  it("inscription complète : rien n'existe avant la finalisation, jetons hachés, puis institut + OWNER + essai + audit + session", async () => {
    const started = await asPublic(() => startEmailSignup({ email: email("full"), name: "Ada Mail", passwordHash: pwHash }));
    if (started.kind !== "created") throw new Error("created attendu");

    // Avant la vérification : ni User, ni organisation, ni abonnement ; mot de passe haché, jetons hachés.
    expect(await count(`SELECT count(*)::int n FROM "User" WHERE LOWER(email) = $1`, [email("full")])).toBe(0);
    const pending = (await admin.query(`SELECT * FROM "AuthPendingSignup" WHERE email = $1`, [email("full")])).rows[0];
    expect(pending).toMatchObject({ provider: "email", providerSubject: null, emailVerified: false, consumedAt: null, organizationId: null });
    expect(pending.passwordHash).not.toContain(PASSWORD);
    expect(verifyPassword(PASSWORD, pending.passwordHash)).toBe(true);
    expect(pending.tokenHash).not.toBe(hashToken(started.token));
    const tokenRow = (await admin.query(`SELECT * FROM "EmailVerificationToken" WHERE "pendingSignupId" = $1`, [pending.id])).rows[0];
    expect(tokenRow.tokenHash).toBe(hashToken(started.token));
    expect(JSON.stringify(tokenRow)).not.toContain(started.token);
    const ttlHours = (new Date(tokenRow.expiresAt).getTime() - Date.now()) / 3_600_000;
    expect(ttlHours).toBeGreaterThan(23.5);
    expect(ttlHours).toBeLessThanOrEqual(24.01);
    // Pas de cookie valable avant la vérification.
    expect(await asPublic(() => getOpenEmailPending(started.token))).toBeNull();

    const checked = await asPublic(() => verifyEmailSignup(started.token));
    if (checked.kind !== "verified") throw new Error("verified attendu");
    expect(await count(`SELECT count(*)::int n FROM "User" WHERE LOWER(email) = $1`, [email("full")])).toBe(0);
    expect(await count(`SELECT count(*)::int n FROM "Organization" WHERE name = $1`, [`emf_${tag}`])).toBe(0);
    const rotated = (await admin.query(`SELECT "tokenHash", "emailVerified" FROM "AuthPendingSignup" WHERE id = $1`, [pending.id])).rows[0];
    expect(rotated).toMatchObject({ emailVerified: true, tokenHash: hashToken(checked.cookieToken) });
    expect(await asPublic(() => getOpenEmailPending(checked.cookieToken))).toMatchObject({ email: email("full") });

    const input = form(checked.cookieToken);
    const result = await asPublic(() => completeEmailSignup(input));
    if (result.kind !== "created") throw new Error("created attendu");
    orgIds.add(result.organizationId);

    const owner = (await admin.query(`SELECT role::text r, email, "emailVerifiedAt" IS NOT NULL v, "mustChangePassword" m, "passwordHash" h, "loginPhone" p FROM "User" WHERE "organizationId" = $1`, [result.organizationId])).rows;
    expect(owner).toHaveLength(1);
    expect(owner[0]).toMatchObject({ r: "OWNER", email: email("full"), v: true, m: false, p: input.phone });
    expect(verifyPassword(PASSWORD, owner[0].h)).toBe(true);
    expect((await admin.query(`SELECT status::text s FROM "Subscription" WHERE "organizationId" = $1`, [result.organizationId])).rows).toEqual([{ s: "TRIAL" }]);
    expect(await count(`SELECT count(*)::int n FROM "AuditLog" WHERE "organizationId" = $1 AND action = 'SIGNUP_EMAIL'`, [result.organizationId])).toBe(1);
    expect(await count(`SELECT count(*)::int n FROM "ReviewSettings" WHERE "organizationId" = $1`, [result.organizationId])).toBe(1);
    expect(await count(`SELECT count(*)::int n FROM "User" WHERE role::text = 'SUPER_ADMIN' AND "organizationId" = $1`, [result.organizationId])).toBe(0);

    // Session : l'institut ACTIVE du OWNER ; la connexion par e-mail et mot de passe fonctionne.
    const session = await loadAppSessionForUser(result.userId, result.organizationId);
    expect(session).toMatchObject({ role: "OWNER", organizationId: result.organizationId, email: email("full"), scope: "app" });
    expect(await asPublic(() => authenticateUser(email("full"), PASSWORD))).toMatchObject({ id: result.userId, organizationId: result.organizationId });
    expect(await asPublic(() => getEmailPendingState(checked.cookieToken))).toMatchObject({ consumed: true, organizationId: result.organizationId, replayable: true });
  });

  it("logo : enregistré pour de vrai sous les rôles séparés (Organization.logoUrl), après la création, sans avertissement", async () => {
    const { cookie } = await verified("logo");
    const created = await asPublic(() => completeEmailSignup(form(cookie, { institut: `emf_logo_${tag}` })));
    if (created.kind !== "created") throw new Error("created attendu");
    orgIds.add(created.organizationId);
    expect((await admin.query(`SELECT "logoUrl" u FROM "Organization" WHERE id = $1`, [created.organizationId])).rows[0].u).toBeNull();

    const png = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])], "logo.png", { type: "image/png" });
    const prepared = await prepareLogo(png);
    if (!prepared.ok) throw new Error("logo valide attendu");
    holder.put.mockResolvedValue({ url: `/uploads/logos/${created.organizationId}/logo.png` });
    const warn = vi.spyOn(logger, "warn").mockImplementation(() => undefined);
    try {
      // Même contexte que la route : portée publique, institut annoncé par la création.
      await asPublic(() => storeSignupLogo(created.organizationId, prepared.logo, "test"));
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
    expect(holder.put).toHaveBeenCalledWith(expect.objectContaining({ category: "logos", organizationId: created.organizationId }));
    expect((await admin.query(`SELECT "logoUrl" u FROM "Organization" WHERE id = $1`, [created.organizationId])).rows[0].u).toBe(`/uploads/logos/${created.organizationId}/logo.png`);
  });

  it("double clic et concurrence : une seule organisation, l'autre appel est un rejeu", async () => {
    const { cookie } = await verified("dup");
    const input = form(cookie, { institut: `emf_dup_${tag}` });
    const [a, b, c] = await Promise.all([
      asPublic(() => completeEmailSignup(input)),
      asPublic(() => completeEmailSignup({ ...input })),
      asPublic(() => completeEmailSignup({ ...input })),
    ]);
    const kinds = [a.kind, b.kind, c.kind].sort();
    expect(kinds).toEqual(["created", "replay", "replay"]);
    const createdResult = [a, b, c].find((r) => r.kind === "created");
    if (createdResult?.kind !== "created") throw new Error("created attendu");
    orgIds.add(createdResult.organizationId);
    for (const r of [a, b, c]) if (r.kind === "replay") expect(r).toMatchObject({ organizationId: createdResult.organizationId, userId: createdResult.userId });
    expect(await count(`SELECT count(*)::int n FROM "Organization" WHERE name = $1`, [`emf_dup_${tag}`])).toBe(1);
    expect(await count(`SELECT count(*)::int n FROM "User" WHERE LOWER(email) = $1`, [email("dup")])).toBe(1);
    expect(await count(`SELECT count(*)::int n FROM "Subscription" WHERE "organizationId" = $1`, [createdResult.organizationId])).toBe(1);
    expect(await count(`SELECT count(*)::int n FROM "AuditLog" WHERE "organizationId" = $1 AND action = 'SIGNUP_EMAIL'`, [createdResult.organizationId])).toBe(1);
  });

  it("rejeu après la fenêtre de 10 minutes : refusé comme expiré", async () => {
    const { cookie } = await verified("late");
    const first = await asPublic(() => completeEmailSignup(form(cookie, { institut: `emf_late_${tag}` })));
    if (first.kind !== "created") throw new Error("created attendu");
    orgIds.add(first.organizationId);
    await admin.query(`UPDATE "AuthPendingSignup" SET "consumedAt" = now() - interval '11 minutes' WHERE email = $1`, [email("late")]);
    expect(await asPublic(() => completeEmailSignup(form(cookie, { institut: `emf_late_${tag}` })))).toEqual({ kind: "invalid" });
    expect(await count(`SELECT count(*)::int n FROM "Organization" WHERE name = $1`, [`emf_late_${tag}`])).toBe(1);
  });

  it("mot de passe d'inscription incorrect : refusé, aucune organisation (prise de contrôle par un tiers impossible)", async () => {
    const { cookie } = await verified("takeover");
    const result = await asPublic(() => completeEmailSignup(form(cookie, { password: "Un-autre-mot-de-passe-1", institut: `emf_take_${tag}` })));
    expect(result).toEqual({ kind: "bad_password" });
    expect(await count(`SELECT count(*)::int n FROM "Organization" WHERE name = $1`, [`emf_take_${tag}`])).toBe(0);
    expect(await asPublic(() => getEmailPendingState(cookie))).toMatchObject({ consumed: false });
    // Cookie inconnu : même coût, refus.
    expect(await asPublic(() => completeEmailSignup(form("cookie-inconnu")))).toEqual({ kind: "invalid" });
  });

  it("jeton inconnu, expiré, déjà utilisé : tous refusés ; le lien ne sert qu'une fois, y compris en concurrence", async () => {
    expect(await asPublic(() => verifyEmailSignup("jeton-inconnu"))).toEqual({ kind: "invalid" });
    expect(await asPublic(() => verifyEmailSignup(""))).toEqual({ kind: "invalid" });

    const expired = await asPublic(() => startEmailSignup({ email: email("expired"), name: "Ada", passwordHash: pwHash }));
    if (expired.kind !== "created") throw new Error("created attendu");
    await admin.query(`UPDATE "EmailVerificationToken" SET "expiresAt" = now() - interval '1 minute' WHERE "tokenHash" = $1`, [hashToken(expired.token)]);
    expect(await asPublic(() => verifyEmailSignup(expired.token))).toEqual({ kind: "invalid" });

    const used = await asPublic(() => startEmailSignup({ email: email("used"), name: "Ada", passwordHash: pwHash }));
    if (used.kind !== "created") throw new Error("created attendu");
    const [x, y] = await Promise.all([asPublic(() => verifyEmailSignup(used.token)), asPublic(() => verifyEmailSignup(used.token))]);
    expect([x.kind, y.kind].sort()).toEqual(["invalid", "verified"]);
    expect(await asPublic(() => verifyEmailSignup(used.token))).toEqual({ kind: "invalid" });
    // Le jeton du lien n'a jamais valeur de cookie d'inscription.
    expect(await asPublic(() => getOpenEmailPending(used.token))).toBeNull();
    expect(await asPublic(() => completeEmailSignup(form(used.token)))).toEqual({ kind: "invalid" });
  });

  it("e-mail déjà inscrit (casse et espaces compris) ou administrateur plateforme : rien n'est créé, résultats distincts pour l'appelant seulement", async () => {
    await seedUser("exist", { email: email("exist"), verified: true, password: pwHash });
    for (const variant of [email("exist"), email("exist").toUpperCase(), `  ${email("exist")}  `]) {
      const r = await asPublic(() => startEmailSignup({ email: variant, name: "Ada", passwordHash: pwHash }));
      expect(r).toEqual({ kind: "existing" });
    }
    expect(await count(`SELECT count(*)::int n FROM "AuthPendingSignup" WHERE LOWER(email) = $1`, [email("exist")])).toBe(0);
    expect(await asPublic(() => resendEmailSignup(email("exist")))).toEqual({ kind: "existing" });

    expect(await asPublic(() => startEmailSignup({ email: email("platform").toUpperCase(), name: "Ada", passwordHash: pwHash }))).toEqual({ kind: "ignored" });
    expect(await count(`SELECT count(*)::int n FROM "AuthPendingSignup" WHERE LOWER(email) = $1`, [email("platform")])).toBe(0);
    expect(await count(`SELECT count(*)::int n FROM "User" WHERE LOWER(email) = $1`, [email("platform")])).toBe(0);
  });

  it("nouvelle demande pour la même adresse : une seule inscription ouverte, l'ancien lien est inutilisable ; renvoi : l'ancien jeton est invalidé", async () => {
    const first = await asPublic(() => startEmailSignup({ email: email("twice"), name: "Ada", passwordHash: pwHash }));
    const second = await asPublic(() => startEmailSignup({ email: email("twice"), name: "Ada", passwordHash: pwHash }));
    if (first.kind !== "created" || second.kind !== "created") throw new Error("created attendu");
    expect(await count(`SELECT count(*)::int n FROM "AuthPendingSignup" WHERE LOWER(email) = $1 AND "consumedAt" IS NULL`, [email("twice")])).toBe(1);
    expect(await asPublic(() => verifyEmailSignup(first.token))).toEqual({ kind: "invalid" });

    // Renvoi : délai de 60 s (sans effet), puis, le délai écoulé, nouveau jeton et ancien invalidé.
    expect(await asPublic(() => resendEmailSignup(email("twice")))).toEqual({ kind: "none" });
    await admin.query(`UPDATE "EmailVerificationToken" SET "createdAt" = now() - interval '5 minutes' WHERE "newEmail" = $1`, [email("twice")]);
    const again = await asPublic(() => resendEmailSignup(email("twice")));
    if (again.kind !== "created") throw new Error("created attendu");
    expect(await asPublic(() => verifyEmailSignup(second.token))).toEqual({ kind: "invalid" });
    expect(await asPublic(() => verifyEmailSignup(again.token))).toMatchObject({ kind: "verified" });
    // Une fois vérifiée, plus rien à renvoyer.
    expect(await asPublic(() => resendEmailSignup(email("twice")))).toEqual({ kind: "none" });
    // Aucune inscription pour une adresse inconnue.
    expect(await asPublic(() => resendEmailSignup(email("nobody")))).toEqual({ kind: "none" });
  });

  it("adresse devenue indisponible entre l'envoi et le clic : vérification refusée, inscription close, rien de créé", async () => {
    const started = await asPublic(() => startEmailSignup({ email: email("race"), name: "Ada", passwordHash: pwHash }));
    if (started.kind !== "created") throw new Error("created attendu");
    await seedUser("race", { email: email("race").toUpperCase(), verified: true });
    expect(await asPublic(() => verifyEmailSignup(started.token))).toEqual({ kind: "invalid" });
    expect((await admin.query(`SELECT "consumedAt" IS NOT NULL c, "emailVerified" v FROM "AuthPendingSignup" WHERE email = $1`, [email("race")])).rows[0]).toEqual({ c: true, v: false });
  });

  it("deux instituts : sessions et données isolées, jamais SUPER_ADMIN", async () => {
    const a = await verified("isoa");
    const b = await verified("isob");
    const ra = await asPublic(() => completeEmailSignup(form(a.cookie, { institut: `emf_isoa_${tag}` })));
    const rb = await asPublic(() => completeEmailSignup(form(b.cookie, { institut: `emf_isob_${tag}` })));
    if (ra.kind !== "created" || rb.kind !== "created") throw new Error("created attendu");
    orgIds.add(ra.organizationId);
    orgIds.add(rb.organizationId);
    expect(ra.organizationId).not.toBe(rb.organizationId);
    expect((await loadAppSessionForUser(ra.userId, ra.organizationId))?.organizationId).toBe(ra.organizationId);
    // Un utilisateur d'un institut ne se charge pas avec l'institut d'un autre.
    expect(await loadAppSessionForUser(ra.userId, rb.organizationId)).toBeNull();
    // Sous la RLS de l'institut B, le propriétaire de A est invisible.
    const seen = await asTenant(rb.organizationId, async () => (await holder.pool.query(`SELECT id FROM "User" WHERE LOWER(email) = $1`, [email("isoa")])).rows);
    expect(seen).toEqual([]);
    const own = await asTenant(rb.organizationId, async () => (await holder.pool.query(`SELECT id FROM "User" WHERE LOWER(email) = $1`, [email("isob")])).rows);
    expect(own).toHaveLength(1);
    const roles = (await admin.query(`SELECT DISTINCT role::text r FROM "User" WHERE "organizationId" = ANY($1::text[])`, [[ra.organizationId, rb.organizationId]])).rows;
    expect(roles).toEqual([{ r: "OWNER" }]);
  });

  it("téléphone désactivé comme identifiant : loginPhone NULL, un même numéro peut servir à deux instituts, l'e-mail connecte", async () => {
    vi.stubEnv("AUTH_PHONE_LOGIN_ENABLED", "false");
    try {
      const shared = "0877665544";
      const a = await verified("noph1");
      const b = await verified("noph2");
      const ra = await asPublic(() => completeEmailSignup(form(a.cookie, { phone: shared, institut: `emf_noph1_${tag}` })));
      const rb = await asPublic(() => completeEmailSignup(form(b.cookie, { phone: shared, institut: `emf_noph2_${tag}` })));
      if (ra.kind !== "created" || rb.kind !== "created") throw new Error("created attendu");
      orgIds.add(ra.organizationId);
      orgIds.add(rb.organizationId);
      const rows = (await admin.query(`SELECT phone, "loginPhone" FROM "User" WHERE "organizationId" = ANY($1::text[])`, [[ra.organizationId, rb.organizationId]])).rows;
      expect(rows).toEqual([{ phone: shared, loginPhone: null }, { phone: shared, loginPhone: null }]);
      expect(await asPublic(() => authenticateUser(email("noph1"), PASSWORD))).toMatchObject({ organizationId: ra.organizationId });
      expect(await asPublic(() => authenticateUser(shared, PASSWORD))).toBeNull();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("téléphone déjà utilisé (drapeau vrai) : PHONE_TAKEN, rien n'est créé", async () => {
    const { cookie } = await verified("phtaken");
    const taken = (await admin.query(`SELECT "loginPhone" FROM "User" WHERE "loginPhone" IS NOT NULL AND email LIKE $1 LIMIT 1`, [`emf-${tag}-full%`])).rows[0]?.loginPhone;
    expect(taken).toBeTruthy();
    await expect(asPublic(() => completeEmailSignup(form(cookie, { phone: taken, institut: `emf_phtaken_${tag}` })))).rejects.toMatchObject({ code: "PHONE_TAKEN" });
    expect(await count(`SELECT count(*)::int n FROM "Organization" WHERE name = $1`, [`emf_phtaken_${tag}`])).toBe(0);
  });

  describe("sécuriser mon compte", () => {
    it("ajout d'adresse : jeton haché, lien valable une fois, adresse et vérification posées, sessions NON révoquées, audit", async () => {
      const { userId, org } = await seedUser("chg", { email: null, password: pwHash });
      expect(await asTenant(org, () => getAccountSecurity(userId, org))).toEqual({ email: null, emailVerified: false, hasPassword: true, googleLinked: false, emailSetupRequired: true });

      const req = await asTenant(org, () => requestEmailChange({ userId, organizationId: org, email: `  ${email("chg-new").toUpperCase()} ` }));
      if (req.kind !== "created") throw new Error("created attendu");
      const stored = (await admin.query(`SELECT "tokenHash", "newEmail", "userId" FROM "EmailVerificationToken" WHERE "userId" = $1`, [userId])).rows[0];
      expect(stored).toMatchObject({ tokenHash: hashToken(req.token), newEmail: email("chg-new") });
      expect(JSON.stringify(stored)).not.toContain(req.token);
      const before = (await admin.query(`SELECT "sessionVersion" v FROM "User" WHERE id = $1`, [userId])).rows[0].v;

      // Le lien marche sans session ni portée institut (autre appareil).
      const done = await asPublic(() => verifyEmailChange(req.token));
      expect(done).toEqual({ kind: "verified", email: email("chg-new"), changed: true });
      const user = (await admin.query(`SELECT email, "emailVerifiedAt" IS NOT NULL v, "sessionVersion" sv FROM "User" WHERE id = $1`, [userId])).rows[0];
      expect(user).toEqual({ email: email("chg-new"), v: true, sv: before });
      expect(await count(`SELECT count(*)::int n FROM "AuditLog" WHERE "organizationId" = $1 AND action = 'EMAIL_CHANGED' AND "entityId" = $2`, [org, userId])).toBe(1);
      expect(await asTenant(org, () => getAccountSecurity(userId, org))).toMatchObject({ email: email("chg-new"), emailVerified: true, emailSetupRequired: false });
      // Usage unique.
      expect(await asPublic(() => verifyEmailChange(req.token))).toEqual({ kind: "invalid" });
      // La connexion par e-mail fonctionne ensuite (mot de passe inchangé).
      await admin.query(`UPDATE "User" SET "passwordHash" = $2 WHERE id = $1`, [userId, pwHash]);
      expect(await asPublic(() => authenticateUser(email("chg-new"), PASSWORD))).toMatchObject({ id: userId });
    });

    it("doublon refusé sans indice : autre institut (casse comprise) et administrateur plateforme", async () => {
      const mine = await seedUser("dupme", { email: null, password: pwHash });
      await seedUser("dupother", { email: email("dupother"), verified: true });
      const results = [
        await asTenant(mine.org, () => requestEmailChange({ userId: mine.userId, organizationId: mine.org, email: email("dupother").toUpperCase() })),
        await asTenant(mine.org, () => requestEmailChange({ userId: mine.userId, organizationId: mine.org, email: email("platform") })),
      ];
      expect(results).toEqual([{ kind: "unavailable" }, { kind: "unavailable" }]);
      expect(await count(`SELECT count(*)::int n FROM "EmailVerificationToken" WHERE "userId" = $1`, [mine.userId])).toBe(0);
    });

    it("adresse reprise entre la demande et le clic : lien refusé, compte inchangé", async () => {
      const mine = await seedUser("late2", { email: null, password: pwHash });
      const req = await asTenant(mine.org, () => requestEmailChange({ userId: mine.userId, organizationId: mine.org, email: email("late2-new") }));
      if (req.kind !== "created") throw new Error("created attendu");
      await seedUser("late2taker", { email: email("late2-new"), verified: true });
      expect(await asPublic(() => verifyEmailChange(req.token))).toEqual({ kind: "invalid" });
      expect((await admin.query(`SELECT email FROM "User" WHERE id = $1`, [mine.userId])).rows[0].email).toBeNull();
    });

    it("deux comptes demandent la même adresse : un seul la reçoit, même sans index global (verrou de l'adresse)", async () => {
      const a = await seedUser("conc1", { email: null, password: pwHash });
      const b = await seedUser("conc2", { email: null, password: pwHash });
      const ta = await asTenant(a.org, () => requestEmailChange({ userId: a.userId, organizationId: a.org, email: email("conc") }));
      const tb = await asTenant(b.org, () => requestEmailChange({ userId: b.userId, organizationId: b.org, email: email("conc") }));
      if (ta.kind !== "created" || tb.kind !== "created") throw new Error("created attendu");
      const [ra, rb] = await Promise.all([asPublic(() => verifyEmailChange(ta.token)), asPublic(() => verifyEmailChange(tb.token))]);
      expect([ra.kind, rb.kind].sort()).toEqual(["invalid", "verified"]);
      expect(await count(`SELECT count(*)::int n FROM "User" WHERE LOWER(email) = $1`, [email("conc")])).toBe(1);
    });

    it("jeton expiré, inconnu ou compte désactivé : refusé", async () => {
      const mine = await seedUser("exp2", { email: null, password: pwHash });
      const req = await asTenant(mine.org, () => requestEmailChange({ userId: mine.userId, organizationId: mine.org, email: email("exp2-new") }));
      if (req.kind !== "created") throw new Error("created attendu");
      expect(await asPublic(() => verifyEmailChange("inconnu"))).toEqual({ kind: "invalid" });
      await admin.query(`UPDATE "EmailVerificationToken" SET "expiresAt" = now() - interval '1 second' WHERE "tokenHash" = $1`, [hashToken(req.token)]);
      expect(await asPublic(() => verifyEmailChange(req.token))).toEqual({ kind: "invalid" });

      const again = await asTenant(mine.org, () => requestEmailChange({ userId: mine.userId, organizationId: mine.org, email: email("exp2-new") }));
      if (again.kind !== "created") throw new Error("created attendu");
      await admin.query(`UPDATE "User" SET status = 'DISABLED' WHERE id = $1`, [mine.userId]);
      expect(await asPublic(() => verifyEmailChange(again.token))).toEqual({ kind: "invalid" });
    });

    it("adresse présente mais non vérifiée : vérifiable sans changer l'adresse ; déjà vérifiée : sans effet ; nouvelle demande invalide l'ancien lien", async () => {
      const mine = await seedUser("unv", { email: email("unv"), verified: false, password: pwHash });
      expect(await asTenant(mine.org, () => getAccountSecurity(mine.userId, mine.org))).toMatchObject({ emailVerified: false, emailSetupRequired: true });
      const one = await asTenant(mine.org, () => requestEmailChange({ userId: mine.userId, organizationId: mine.org, email: email("unv").toUpperCase() }));
      const two = await asTenant(mine.org, () => requestEmailChange({ userId: mine.userId, organizationId: mine.org, email: email("unv") }));
      if (one.kind !== "created" || two.kind !== "created") throw new Error("created attendu");
      expect(one.sameAddress).toBe(true);
      expect(await asPublic(() => verifyEmailChange(one.token))).toEqual({ kind: "invalid" });
      expect(await asPublic(() => verifyEmailChange(two.token))).toEqual({ kind: "verified", email: email("unv"), changed: false });
      expect(await asTenant(mine.org, () => requestEmailChange({ userId: mine.userId, organizationId: mine.org, email: email("unv") }))).toEqual({ kind: "noop" });
      expect(await count(`SELECT count(*)::int n FROM "AuditLog" WHERE "organizationId" = $1 AND action = 'EMAIL_VERIFIED'`, [mine.org])).toBe(1);
    });

    it("compte sans mot de passe (Google) : premier mot de passe seulement avec e-mail vérifié ; sessions des autres appareils révoquées ; une seule définition gagne", async () => {
      const unverified = await seedUser("nopw1", { email: email("nopw1"), verified: false, password: null });
      await expect(asTenant(unverified.org, () => setInitialPassword({ userId: unverified.userId, organizationId: unverified.org, newPassword: NEW_PASSWORD }))).rejects.toThrow("EMAIL_NOT_VERIFIED");
      expect(await count(`SELECT count(*)::int n FROM "User" WHERE id = $1 AND "passwordHash" IS NOT NULL`, [unverified.userId])).toBe(0);

      const ok = await seedUser("nopw2", { email: email("nopw2"), verified: true, password: null });
      const before = (await admin.query(`SELECT "sessionVersion" v FROM "User" WHERE id = $1`, [ok.userId])).rows[0].v;
      const [r1, r2] = await Promise.allSettled([
        asTenant(ok.org, () => setInitialPassword({ userId: ok.userId, organizationId: ok.org, newPassword: NEW_PASSWORD })),
        asTenant(ok.org, () => setInitialPassword({ userId: ok.userId, organizationId: ok.org, newPassword: `${NEW_PASSWORD}-bis` })),
      ]);
      expect([r1.status, r2.status].sort()).toEqual(["fulfilled", "rejected"]);
      const rejected = [r1, r2].find((r) => r.status === "rejected") as PromiseRejectedResult;
      expect((rejected.reason as Error).message).toBe("PASSWORD_ALREADY_SET");
      const winner = ([r1, r2].find((r) => r.status === "fulfilled") as PromiseFulfilledResult<{ sessionVersion: number }>).value;
      expect(winner.sessionVersion).toBe(before + 1);
      const after = (await admin.query(`SELECT "sessionVersion" v, "passwordHash" h FROM "User" WHERE id = $1`, [ok.userId])).rows[0];
      expect(after.v).toBe(before + 1);
      expect(after.h).toBeTruthy();
      expect(after.h).not.toContain(NEW_PASSWORD);
      expect(await count(`SELECT count(*)::int n FROM "AuditLog" WHERE "organizationId" = $1 AND action = 'PASSWORD_SET'`, [ok.org])).toBe(1);
      // Seul le mot de passe du gagnant ouvre le compte.
      const [winnerPassword, loserPassword] = r1.status === "fulfilled" ? [NEW_PASSWORD, `${NEW_PASSWORD}-bis`] : [`${NEW_PASSWORD}-bis`, NEW_PASSWORD];
      expect(await asPublic(() => authenticateUser(email("nopw2"), winnerPassword))).toMatchObject({ id: ok.userId });
      expect(await asPublic(() => authenticateUser(email("nopw2"), loserPassword))).toBeNull();
    });

    it("« mot de passe oublié » fonctionne pour un compte Google sans mot de passe dont l'e-mail est vérifié", async () => {
      const g = await seedUser("forgot", { email: email("forgot"), verified: true, password: null });
      const token = await asPublic(() => issuePasswordResetToken(email("forgot").toUpperCase()));
      expect(token).toBeTruthy();
      await asPublic(() => activateAccount(token as string, NEW_PASSWORD));
      expect(await asPublic(() => authenticateUser(email("forgot"), NEW_PASSWORD))).toMatchObject({ id: g.userId });
    });
  });

  it("index d'unicité global (appliqué ici pour la durée du test) : la course est traduite en erreur métier générique", async () => {
    const existing = (await admin.query(`SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'User_email_lower_unique'`)).rowCount === 1;
    const dups = (await admin.query(`SELECT 1 FROM "User" WHERE email IS NOT NULL AND BTRIM(email) <> '' GROUP BY LOWER(BTRIM(email)) HAVING COUNT(*) > 1 LIMIT 1`)).rowCount;
    if (!existing && dups) return; // base de test déjà polluée par des doublons : le test ne peut pas poser l'index
    if (!existing) {
      await admin.query(`CREATE UNIQUE INDEX "User_email_lower_unique" ON "User" (LOWER(BTRIM(email))) WHERE email IS NOT NULL AND BTRIM(email) <> ''`);
    }
    try {
      const raced = email("raced");
      const run = (phone: string) =>
        asPublic(() => createPublicSignup({ personName: "Ada Race", institut: `emf_raced_${tag}`, email: raced, phone, city: "Casablanca", address: "", website: null }));
      const settled = await Promise.allSettled([run("0811111111"), run("0822222222")]);
      const ok = settled.filter((s) => s.status === "fulfilled") as PromiseFulfilledResult<{ organizationId: string }>[];
      const ko = settled.filter((s) => s.status === "rejected") as PromiseRejectedResult[];
      expect(ok).toHaveLength(1);
      orgIds.add(ok[0].value.organizationId);
      // Verrou applicatif ou index : dans les deux cas, erreur métier générique, jamais une violation SQL brute.
      expect(ko).toHaveLength(1);
      expect(ko[0].reason).toMatchObject({ name: "PublicSignupError", code: "EMAIL_TAKEN" });
      expect(isUserEmailUniqueViolation(ko[0].reason)).toBe(false);
      expect(await count(`SELECT count(*)::int n FROM "User" WHERE LOWER(email) = $1`, [raced])).toBe(1);
    } finally {
      if (!existing) await admin.query(`DROP INDEX IF EXISTS "User_email_lower_unique"`);
    }
  });
});
