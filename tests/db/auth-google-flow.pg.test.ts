import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Client, Pool } from "pg";
import { randomBytes } from "node:crypto";
import { bindOrganization, runInScope } from "@/lib/db/tenant-context";
import { appPool, prepareRoles, rolesAdminUrl } from "./role-pools";

const holder = vi.hoisted(() => ({ pool: null as unknown as Pool }));
vi.mock("@/lib/db/pool", () => ({
  get pool() {
    return holder.pool;
  },
}));

import {
  completeGoogleSignup,
  createGooglePendingSignup,
  emailBelongsToAnyAccount,
  getGooglePendingState,
  hashToken,
  linkGoogleIdentity,
  loginWithGoogleIdentity,
  unlinkGoogleIdentity,
} from "@/lib/db/auth-identities";
import { consumeOAuthState, createOAuthState } from "@/lib/db/auth-oauth-state";
import { generatePkceMaterial } from "@/lib/auth/google-oidc";

/**
 * Parcours Google contre PostgreSQL avec les rôles séparés (rappel_public / rappel_app) : ignoré sans base de
 * test locale (DATABASE_TEST_URL, voir tests/helpers/test-database.ts). La migration
 * 20261118100000_auth_identity_oauth_state doit être appliquée.
 */
const adminUrl = rolesAdminUrl();
const tag = randomBytes(4).toString("hex");

describe.skipIf(!adminUrl)("connexion Google : état, inscription idempotente, liaison (PostgreSQL)", () => {
  let admin: Client;
  let restoreEnv: () => void;
  const startedAt = new Date();
  const orgIds = new Set<string>();
  const asPublic = <T,>(fn: () => Promise<T>) => runInScope({ kind: "public", reason: "test" }, fn);
  const asTenant = <T,>(org: string, fn: () => Promise<T>) =>
    runInScope({ kind: "tenant", organizationId: null }, async () => {
      bindOrganization(org);
      return fn();
    });
  const form = (token: string, over: Record<string, unknown> = {}) => ({
    token,
    institut: `pgflow_${tag}`,
    city: "Casablanca",
    address: "",
    website: null,
    phone: `09${Math.floor(10000000 + Math.random() * 89999999)}`,
    ...over,
  });
  const claims = (n: string) => ({ sub: `pgflow-${tag}-${n}`, email: `pgflow-${tag}-${n}@example.test`, name: "Ada Flow", emailVerified: true as const });

  async function signupFor(n: string) {
    const c = claims(n);
    const token = await asPublic(() => createGooglePendingSignup(c));
    const result = await asPublic(() => completeGoogleSignup(form(token)));
    if (result.kind !== "created") throw new Error("created attendu");
    orgIds.add(result.organizationId);
    return { c, token, result };
  }

  beforeAll(async () => {
    admin = new Client({ connectionString: adminUrl });
    await admin.connect();
    restoreEnv = await prepareRoles(admin, adminUrl);
    holder.pool = appPool(adminUrl);
  });

  afterAll(async () => {
    await admin?.query(`DELETE FROM "AuthPendingSignup" WHERE "providerSubject" LIKE $1`, [`pgflow-${tag}-%`]).catch(() => null);
    await admin?.query(`DELETE FROM "AuthOAuthState" WHERE "createdAt" >= $1`, [startedAt]).catch(() => null);
    if (orgIds.size) await admin?.query(`DELETE FROM "Organization" WHERE id = ANY($1::text[])`, [[...orgIds]]).catch(() => null);
    await admin?.query(`DELETE FROM "PlatformUser" WHERE email LIKE $1`, [`pgflow-${tag}-%`]).catch(() => null);
    await holder.pool?.end().catch(() => null);
    await admin?.end();
    restoreEnv?.();
  });

  it("état OAuth : consommation atomique à usage unique, expiration refusée, verifier restitué", async () => {
    const material = generatePkceMaterial();
    await createOAuthState({ material, intent: "login", redirectAfter: "/agenda/" });
    const stored = (await admin.query(`SELECT "stateHash", "codeVerifierEnc" FROM "AuthOAuthState" ORDER BY "createdAt" DESC LIMIT 1`)).rows[0];
    expect(stored.stateHash).not.toBe(material.state);
    expect(stored.codeVerifierEnc).not.toContain(material.codeVerifier);
    const [a, b] = await Promise.all([asPublic(() => consumeOAuthState(material.state)), asPublic(() => consumeOAuthState(material.state))]);
    expect([a, b].filter(Boolean)).toHaveLength(1);
    expect((a ?? b)?.codeVerifier).toBe(material.codeVerifier);

    const expired = generatePkceMaterial();
    await createOAuthState({ material: expired, intent: "signup" });
    await admin.query(`UPDATE "AuthOAuthState" SET "expiresAt" = now() - interval '1 minute' WHERE "createdAt" >= $1 AND "consumedAt" IS NULL`, [startedAt]);
    expect(await asPublic(() => consumeOAuthState(expired.state))).toBeNull();
  });

  it("finalisation concurrente : une organisation, un OWNER sans mot de passe, une identité, un essai", async () => {
    const c = claims("dup");
    const token = await asPublic(() => createGooglePendingSignup(c));
    const input = form(token);
    const [a, b] = await Promise.all([
      asPublic(() => completeGoogleSignup(input)),
      asPublic(() => completeGoogleSignup({ ...input })),
    ]);
    expect([a.kind, b.kind].sort()).toEqual(["created", "replay"]);
    const created = [a, b].find((r) => r.kind === "created");
    if (created?.kind !== "created") throw new Error("created attendu");
    orgIds.add(created.organizationId);

    expect((await admin.query(`SELECT count(*)::int n FROM "Organization" WHERE name = $1`, [input.institut])).rows[0].n).toBeGreaterThanOrEqual(1);
    const users = (await admin.query(`SELECT role::text r, "passwordHash" IS NULL AS nopw, "emailVerifiedAt" IS NOT NULL AS verified, "mustChangePassword" m FROM "User" WHERE "organizationId" = $1`, [created.organizationId])).rows;
    expect(users).toEqual([{ r: "OWNER", nopw: true, verified: true, m: false }]);
    expect((await admin.query(`SELECT count(*)::int n FROM "UserIdentity" WHERE "providerSubject" = $1`, [c.sub])).rows[0].n).toBe(1);
    expect((await admin.query(`SELECT status::text s FROM "Subscription" WHERE "organizationId" = $1`, [created.organizationId])).rows).toEqual([{ s: "TRIAL" }]);
    expect((await admin.query(`SELECT count(*)::int n FROM "AuditLog" WHERE "organizationId" = $1 AND action = 'SIGNUP_GOOGLE'`, [created.organizationId])).rows[0].n).toBe(1);
    const state = await asPublic(() => getGooglePendingState(token));
    expect(state).toMatchObject({ consumed: true, organizationId: created.organizationId });
    expect(await asPublic(() => completeGoogleSignup(input))).toMatchObject({ kind: "replay", organizationId: created.organizationId });
  });

  it("rejeu de la finalisation : accepté peu après la création, refusé au-delà de la fenêtre", async () => {
    const { token } = await signupFor("window");
    expect(await asPublic(() => getGooglePendingState(token))).toMatchObject({ consumed: true, replayable: true });
    expect(await asPublic(() => completeGoogleSignup(form(token)))).toMatchObject({ kind: "replay" });
    await admin.query(`UPDATE "AuthPendingSignup" SET "consumedAt" = now() - interval '11 minutes' WHERE "tokenHash" = $1`, [hashToken(token)]);
    expect(await asPublic(() => getGooglePendingState(token))).toMatchObject({ consumed: true, replayable: false });
    expect(await asPublic(() => completeGoogleSignup(form(token)))).toEqual({ kind: "invalid" });
  });

  it("liaison réussie : l'identité est écrite en portée tenant (rappel_app), avec audit, sans fusion", async () => {
    const { c, result } = await signupFor("lk");
    await admin.query(`DELETE FROM "UserIdentity" WHERE "userId" = $1`, [result.userId]);
    const link = () => linkGoogleIdentity({ userId: result.userId, organizationId: result.organizationId, sessionVersion: 0, claims: c });
    expect(await link()).toBe("linked");
    expect(await link()).toBe("already_linked");
    expect((await admin.query(`SELECT count(*)::int n FROM "UserIdentity" WHERE "userId" = $1`, [result.userId])).rows[0].n).toBe(1);
    expect((await admin.query(`SELECT count(*)::int n FROM "AuditLog" WHERE "organizationId" = $1 AND action = 'GOOGLE_LINKED'`, [result.organizationId])).rows[0].n).toBe(1);
    // Mauvaise version de session : aucune écriture.
    await admin.query(`DELETE FROM "UserIdentity" WHERE "userId" = $1`, [result.userId]);
    expect(await linkGoogleIdentity({ userId: result.userId, organizationId: result.organizationId, sessionVersion: 99, claims: c })).toBe("inactive");
    expect((await admin.query(`SELECT count(*)::int n FROM "UserIdentity" WHERE "userId" = $1`, [result.userId])).rows[0].n).toBe(0);
  });

  it("e-mail déjà utilisé (User ou PlatformUser) : refus à la finalisation, rien n'est créé", async () => {
    const first = await signupFor("mail");
    expect(await asPublic(() => emailBelongsToAnyAccount(first.c.email))).toBe(true);
    await admin.query(`INSERT INTO "PlatformUser"(id,email,"firstName","lastName","updatedAt") VALUES ($1,$2,'P','U',now())`, [
      `pgflow_pu_${tag}`,
      `pgflow-${tag}-platform@example.test`,
    ]);
    expect(await asPublic(() => emailBelongsToAnyAccount(`PGFLOW-${tag}-platform@example.test`))).toBe(true);
    const c = { ...claims("other"), email: `pgflow-${tag}-platform@example.test` };
    const token = await asPublic(() => createGooglePendingSignup(c));
    await expect(asPublic(() => completeGoogleSignup(form(token)))).rejects.toMatchObject({ code: "EMAIL_TAKEN" });
    expect((await admin.query(`SELECT count(*)::int n FROM "UserIdentity" WHERE "providerSubject" = $1`, [c.sub])).rows[0].n).toBe(0);
  });

  it("connexion : utilisateur ACTIVE et institut ACTIVE seulement, jamais d'identité inconnue", async () => {
    const { c, result } = await signupFor("login");
    const session = await asPublic(() => loginWithGoogleIdentity(c.sub));
    expect(session).toMatchObject({ id: result.userId, role: "OWNER", scope: "app", organizationId: result.organizationId });
    expect((await admin.query(`SELECT count(*)::int n FROM "AuditLog" WHERE "organizationId" = $1 AND action = 'LOGIN'`, [result.organizationId])).rows[0].n).toBe(1);
    expect(await asPublic(() => loginWithGoogleIdentity("sub-inconnu"))).toBeNull();

    await admin.query(`UPDATE "User" SET status = 'DISABLED' WHERE id = $1`, [result.userId]);
    expect(await asPublic(() => loginWithGoogleIdentity(c.sub))).toBeNull();
    await admin.query(`UPDATE "User" SET status = 'ACTIVE' WHERE id = $1`, [result.userId]);
    await admin.query(`UPDATE "Organization" SET status = 'SUSPENDED' WHERE id = $1`, [result.organizationId]);
    expect(await asPublic(() => loginWithGoogleIdentity(c.sub))).toBeNull();
  });

  it("liaison : refusée si le sub appartient à un autre compte ; déliaison refusée sans autre moyen de connexion", async () => {
    const owner = await signupFor("owner");
    const other = await signupFor("other");
    const ownerSession = await asPublic(() => loginWithGoogleIdentity(owner.c.sub));
    if (!ownerSession) throw new Error("session attendue");
    const link = (claimsOf: ReturnType<typeof claims>) =>
      linkGoogleIdentity({ userId: other.result.userId, organizationId: other.result.organizationId, sessionVersion: 0, claims: claimsOf });
    expect(await link(owner.c)).toBe("in_use");
    expect((await admin.query(`SELECT count(*)::int n FROM "UserIdentity" WHERE "userId" = $1`, [other.result.userId])).rows[0].n).toBe(1);

    // owner : e-mail vérifié, aucun mot de passe : la déliaison reste possible (e-mail vérifié) ; sans cela elle est refusée.
    await admin.query(`UPDATE "User" SET "emailVerifiedAt" = NULL WHERE id = $1`, [owner.result.userId]);
    const result = await asTenant(owner.result.organizationId, () =>
      unlinkGoogleIdentity({ userId: owner.result.userId, organizationId: owner.result.organizationId }),
    );
    expect(result).toBe("last_login_method");
    await admin.query(`UPDATE "User" SET "emailVerifiedAt" = now() WHERE id = $1`, [owner.result.userId]);
    expect(
      await asTenant(owner.result.organizationId, () =>
        unlinkGoogleIdentity({ userId: owner.result.userId, organizationId: owner.result.organizationId }),
      ),
    ).toBe("unlinked");
  });
});
