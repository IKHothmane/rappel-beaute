import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Couche base de la connexion Google, sans base réelle : un faux pool à états rejoue les requêtes
 * (verrou FOR UPDATE du pending, consommation atomique de l'état, unicité de l'identité).
 * Les mêmes scénarios sont rejoués contre PostgreSQL dans tests/db/auth-google-flow.pg.test.ts.
 */
type Row = Record<string, unknown>;
const fake = vi.hoisted(() => {
  const s = {
    states: new Map<string, Row>(),
    pending: null as Row | null,
    orgs: [] as Row[],
    users: [] as Row[],
    platformEmails: [] as string[],
    identities: [] as { id: string; userId: string; sub: string }[],
    audits: [] as Row[],
    subscriptions: 0,
    sessionRow: null as Row | null,
    queries: [] as string[],
    userRowStatus: { status: "ACTIVE", orgStatus: "ACTIVE", role: "OWNER" },
    identityOverride: null as Row | null,
    unlinkUser: { status: "ACTIVE", passwordHash: "h", emailVerifiedAt: null, email: "owner@example.test", firstName: "Ada", lastName: "Owner" } as Row,
    insertScopes: [] as (string | undefined)[],
    signupIdentityCalls: [] as unknown[][],
    directInsertSql: [] as string[],
    lockHeld: false,
    waiters: [] as (() => void)[],
  };
  const acquire = async () => {
    while (s.lockHeld) await new Promise<void>((resolve) => s.waiters.push(resolve));
    s.lockHeld = true;
  };
  const release = () => {
    s.lockHeld = false;
    s.waiters.shift()?.();
  };
  return { s, acquire, release };
});

vi.mock("@/lib/db/pool", () => {
  const s = fake.s;
  const replayable = (p: Row | null) =>
    Boolean(p?.consumedAt && p?.organizationId && Date.now() - (p.consumedAt as Date).getTime() < 10 * 60_000);
  const run = async (sql: string, params: unknown[] = [], holder?: { locked: boolean }) => {
    s.queries.push(sql);
    const rows = (value: Row[]) => ({ rows: value, rowCount: value.length });
    if (/^(COMMIT|ROLLBACK)$/.test(sql)) {
      if (holder?.locked) {
        holder.locked = false;
        fake.release();
      }
      return rows([]);
    }
    if (sql === "BEGIN" || sql.startsWith("SAVEPOINT") || sql.startsWith("RELEASE") || sql.startsWith("ROLLBACK TO")) return rows([]);
    if (sql.includes('INSERT INTO "AuthOAuthState"')) {
      s.states.set(params[1] as string, {
        id: params[0], nonceHash: params[2], intent: params[3], userId: params[4], codeVerifierEnc: params[5],
        redirectAfter: params[6], expiresAt: Date.now() + 600_000, consumedAt: null,
      });
      return rows([]);
    }
    if (sql.includes('SELECT intent, "redirectAfter" FROM "AuthOAuthState"')) {
      const state = s.states.get(params[0] as string);
      if (!state || state.consumedAt || (state.expiresAt as number) <= Date.now()) return rows([]);
      return rows([{ intent: state.intent, redirectAfter: state.redirectAfter }]);
    }
    if (sql.includes('UPDATE "AuthOAuthState"')) {
      const state = s.states.get(params[0] as string);
      if (!state || state.consumedAt || (state.expiresAt as number) <= Date.now()) return rows([]);
      state.consumedAt = Date.now();
      return rows([state]);
    }
    if (sql.includes('FROM "AuthPendingSignup"') && sql.includes("FOR UPDATE")) {
      await fake.acquire();
      if (holder) holder.locked = true;
      const p = s.pending;
      return rows(p ? [{ ...p, expired: false, replayable: replayable(p) }] : []);
    }
    if (sql.includes('UPDATE "AuthPendingSignup" SET "consumedAt" = NOW(), "organizationId"')) {
      Object.assign(s.pending as Row, { consumedAt: new Date(), organizationId: params[1] });
      return rows([]);
    }
    if (sql.includes('FROM "AuthPendingSignup" WHERE "tokenHash"')) {
      const p = s.pending;
      return rows(p ? [{ ...p, expired: false, replayable: replayable(p) }] : []);
    }
    if (sql.includes('FROM "PlatformUser"')) return rows(s.platformEmails.includes(params[0] as string) ? [{ "?column?": 1 }] : []);
    if (sql.includes("pg_advisory_xact_lock")) return rows([]);
    if (sql.includes('FROM "User" WHERE LOWER(BTRIM(email))')) return rows(s.users.some((u) => u.email === params[0]) ? [{ "?column?": 1 }] : []);
    if (sql.includes("app_public_identity_login")) {
      if (s.identityOverride) return rows([s.identityOverride]);
      const found = s.identities.find((i) => i.sub === params[1]);
      return rows(found ? [{ userId: found.userId, organizationId: s.orgs[0]?.id, userStatus: "ACTIVE", organizationStatus: "ACTIVE" }] : []);
    }
    if (sql.includes('"loginPhone" = $1')) return rows([]);
    if (sql.includes('SELECT 1 FROM "Organization" WHERE slug')) return rows([]);
    if (sql.includes('INSERT INTO "Organization"')) { s.orgs.push({ id: params[0], name: params[1] }); return rows([]); }
    if (sql.includes('INSERT INTO "User"')) { s.users.push({ id: params[0], email: params[2], passwordHash: params[7], mustChange: params[8], verifiedAt: params[9] ?? null, sql }); return rows([]); }
    if (sql.includes('INSERT INTO "Subscription"')) { s.subscriptions++; return rows([]); }
    if (sql.includes("app_public_identity_create_for_signup")) {
      // Sujet et e-mail viennent du pending, jamais de l'appelant ; l'appel doit porter (id, pendingId, userId, orgId).
      s.signupIdentityCalls.push(params);
      const sub = s.pending?.providerSubject as string;
      if (s.identities.some((i) => i.sub === sub)) throw Object.assign(new Error("dup"), { code: "23505", constraint: "UserIdentity_provider_providerSubject_key" });
      s.identities.push({ id: params[0] as string, userId: params[2] as string, sub });
      return rows([]);
    }
    if (sql.includes('INSERT INTO "UserIdentity"')) {
      s.insertScopes.push(currentScope()?.kind);
      s.directInsertSql.push(sql);
      // Modèle fidèle des deux index uniques : l'arbitre ON CONFLICT (provider, "providerSubject") n'absorbe que le
      // conflit sur le sujet ; un conflit sur (userId, provider) lève 23505.
      if (s.identities.some((i) => i.sub === params[3])) {
        if (sql.includes('ON CONFLICT (provider, "providerSubject") DO NOTHING')) return { rows: [], rowCount: 0 };
        throw Object.assign(new Error("dup"), { code: "23505", constraint: "UserIdentity_provider_providerSubject_key" });
      }
      if (s.identities.some((i) => i.userId === params[1])) {
        throw Object.assign(new Error("dup"), { code: "23505", constraint: "UserIdentity_userId_provider_key" });
      }
      s.identities.push({ id: params[0] as string, userId: params[1] as string, sub: params[3] as string });
      return { rows: [], rowCount: 1 };
    }
    if (sql.includes('SELECT 1 FROM "UserIdentity" WHERE "userId"')) {
      return rows(s.identities.some((i) => i.userId === params[0] && (params[2] === undefined || i.sub === params[2])) ? [{ "?column?": 1 }] : []);
    }
    if (sql.includes('INSERT INTO "AuditLog"')) { s.audits.push({ action: params[6], org: params[1] }); return rows([]); }
    if (sql.includes("FOR UPDATE OF u")) return rows([{ status: "ACTIVE", orgStatus: "ACTIVE", sessionVersion: 0, firstName: "Ada", lastName: "Owner" }]);
    if (sql.includes('"passwordHash", "emailVerifiedAt", email')) return rows([s.unlinkUser]);
    if (sql.includes('DELETE FROM "UserIdentity"')) {
      const before = s.identities.length;
      s.identities = s.identities.filter((i) => i.userId !== params[0]);
      return { rows: [], rowCount: before - s.identities.length };
    }
    if (sql.includes('JOIN "Organization" o ON o.id = u."organizationId"') && sql.includes("u.role::text")) {
      return rows(s.sessionRow ? [{ ...s.sessionRow, role: s.userRowStatus.role, userStatus: s.userRowStatus.status, orgStatus: s.userRowStatus.orgStatus }] : []);
    }
    return rows([]);
  };
  const client = () => {
    const holder = { locked: false };
    return { query: (sql: string, params?: unknown[]) => run(sql, params, holder), release: () => { if (holder.locked) fake.release(); } };
  };
  return { pool: { query: (sql: string, params?: unknown[]) => run(sql, params), connect: async () => client() } };
});
vi.mock("@/lib/subscriptions/plans", () => ({ getPlanByCode: async () => ({ id: "plan", active: true, price: 100, currency: "MAD" }), listPlans: vi.fn() }));
vi.mock("@/lib/subscriptions/subscription-service", () => ({ newInstituteTrialEnd: (d: Date) => new Date(d.getTime() + 7 * 86400000) }));

import { PublicSignupError } from "@/lib/db/institute-create";
import {
  completeGoogleSignup,
  createGooglePendingSignup,
  emailBelongsToAnyAccount,
  getGooglePendingState,
  hashToken,
  linkGoogleIdentity,
  PENDING_REPLAY_WINDOW_MS,
  loadAppSessionForUser,
  loginWithGoogleIdentity,
  unlinkGoogleIdentity,
} from "@/lib/db/auth-identities";
import { consumeOAuthState, createOAuthState, peekOAuthState } from "@/lib/db/auth-oauth-state";
import { currentScope } from "@/lib/db/tenant-context";
import { generatePkceMaterial, sha256Hex } from "@/lib/auth/google-oidc";

const TOKEN = "pending-token-for-tests";
const claims = { sub: "sub-1", email: "owner@example.test", name: "Ada Owner", emailVerified: true as const };
const form = { token: TOKEN, institut: "Institut Ada", city: "Casablanca", address: "", website: null, phone: "0612345678" };

function reset() {
  const s = fake.s;
  s.states.clear(); s.orgs.length = 0; s.users.length = 0; s.platformEmails.length = 0; s.identities.length = 0;
  s.insertScopes.length = 0; s.signupIdentityCalls.length = 0; s.directInsertSql.length = 0;
  s.audits.length = 0; s.subscriptions = 0; s.queries.length = 0; s.identityOverride = null; s.lockHeld = false; s.waiters.length = 0;
  s.userRowStatus = { status: "ACTIVE", orgStatus: "ACTIVE", role: "OWNER" };
  s.pending = { id: "aps_1", providerSubject: "sub-1", email: "owner@example.test", name: "Ada Owner", consumedAt: null, organizationId: null };
  s.sessionRow = {
    id: "u_1", email: "owner@example.test", loginPhone: "0612345678", firstName: "Ada", lastName: "Owner",
    organizationId: "org_1", mustChangePassword: false, sessionVersion: 0, orgName: "Institut Ada", orgSlug: "institut-ada",
  };
}
beforeEach(reset);

describe("état OAuth", () => {
  it("ne stocke que les hachés, chiffre le verifier et consomme une seule fois", async () => {
    const material = generatePkceMaterial();
    await createOAuthState({ material, intent: "signup", redirectAfter: "/agenda/" });
    const [hash, stored] = [...fake.s.states.entries()][0];
    expect(hash).toBe(sha256Hex(material.state));
    expect(hash).not.toBe(material.state);
    expect(stored.nonceHash).toBe(sha256Hex(material.nonce));
    expect(String(stored.codeVerifierEnc)).not.toContain(material.codeVerifier);
    expect(String(stored.codeVerifierEnc).startsWith("v1.")).toBe(true);

    const first = await consumeOAuthState(material.state);
    expect(first).toMatchObject({ intent: "signup", redirectAfter: "/agenda/", codeVerifier: material.codeVerifier, nonceHash: sha256Hex(material.nonce) });
    expect(await consumeOAuthState(material.state)).toBeNull(); // rejeu refusé
    const consumeSql = fake.s.queries.find((q) => q.includes('UPDATE "AuthOAuthState"')) ?? "";
    expect(consumeSql).toContain('"consumedAt" IS NULL AND "expiresAt" > NOW()');
    expect(consumeSql).toContain("RETURNING");
  });

  it("refuse un état expiré, inconnu ou malformé, et ignore un redirectAfter non autorisé", async () => {
    const material = generatePkceMaterial();
    await createOAuthState({ material, intent: "login", redirectAfter: "//evil.example" });
    const stored = [...fake.s.states.values()][0];
    expect(stored.redirectAfter).toBeNull();
    stored.expiresAt = Date.now() - 1;
    expect(await consumeOAuthState(material.state)).toBeNull();
    expect(await consumeOAuthState("inconnu-inconnu-inconnu")).toBeNull();
    expect(await consumeOAuthState("")).toBeNull();
  });

  it("peekOAuthState lit l'intention sans rien consommer ; rejeu, expiré et inconnu donnent le même null", async () => {
    const material = generatePkceMaterial();
    await createOAuthState({ material, intent: "link", userId: "u_1", redirectAfter: "/security/" });
    expect(await peekOAuthState(material.state)).toEqual({ intent: "link", redirectAfter: "/security/" });
    expect(await peekOAuthState(material.state)).not.toBeNull();
    expect(fake.s.queries.filter((q) => q.includes('UPDATE "AuthOAuthState"'))).toHaveLength(0);
    expect(await consumeOAuthState(material.state)).not.toBeNull();
    expect(await peekOAuthState(material.state)).toBeNull();
    expect(await peekOAuthState("inconnu-inconnu-inconnu")).toBeNull();
  });

  it("exige un utilisateur pour l'intention link", async () => {
    await expect(createOAuthState({ material: generatePkceMaterial(), intent: "link" })).rejects.toThrow("LINK_REQUIRES_USER");
    await createOAuthState({ material: generatePkceMaterial(), intent: "link", userId: "u_1" });
    expect([...fake.s.states.values()][0].userId).toBe("u_1");
  });
});

describe("inscription Google en attente puis finalisation", () => {
  it("n'insère que le haché du jeton et aucun User", async () => {
    const token = await createGooglePendingSignup(claims);
    const insert = fake.s.queries.find((q) => q.includes('INSERT INTO "AuthPendingSignup"'));
    expect(insert).toBeDefined();
    expect(token.length).toBeGreaterThanOrEqual(43);
    expect(hashToken(token)).not.toBe(token);
    expect(fake.s.users).toHaveLength(0);
  });

  it("double appel simultané : une seule organisation, un seul propriétaire, une seule identité", async () => {
    const [a, b] = await Promise.all([completeGoogleSignup(form), completeGoogleSignup(form)]);
    const kinds = [a.kind, b.kind].sort();
    expect(kinds).toEqual(["created", "replay"]);
    expect(fake.s.orgs).toHaveLength(1);
    expect(fake.s.users).toHaveLength(1);
    expect(fake.s.identities).toHaveLength(1);
    expect(fake.s.subscriptions).toBe(1);
    expect(fake.s.audits.filter((x) => x.action === "SIGNUP_GOOGLE")).toHaveLength(1);
    const created = [a, b].find((r) => r.kind === "created");
    const replay = [a, b].find((r) => r.kind === "replay");
    expect(replay).toMatchObject({ organizationId: fake.s.orgs[0].id, sub: "sub-1" });
    expect(created).toMatchObject({ organizationId: fake.s.orgs[0].id });
    // Propriétaire sans mot de passe, e-mail vérifié par Google, pas de changement de mot de passe forcé.
    expect(fake.s.users[0]).toMatchObject({ email: "owner@example.test", passwordHash: null, mustChange: false });
    expect(fake.s.users[0].verifiedAt).toBeInstanceOf(Date);
    expect(await completeGoogleSignup(form)).toMatchObject({ kind: "replay" });
    expect(fake.s.orgs).toHaveLength(1);
  });

  it("refuse (sans rien créer) un e-mail déjà présent chez un User ou un PlatformUser", async () => {
    fake.s.users.push({ id: "u_existing", email: "owner@example.test" });
    await expect(completeGoogleSignup(form)).rejects.toBeInstanceOf(PublicSignupError);
    expect(fake.s.orgs).toHaveLength(0);
    expect(fake.s.identities).toHaveLength(0);
    expect(fake.s.pending?.consumedAt).toBeNull();
    expect(fake.s.lockHeld).toBe(false); // verrou libéré par le ROLLBACK

    fake.s.users.length = 0;
    fake.s.platformEmails.push("owner@example.test");
    await expect(completeGoogleSignup(form)).rejects.toMatchObject({ code: "EMAIL_TAKEN" });
    expect(fake.s.orgs).toHaveLength(0);
  });

  it("pending absent ou clos sans institut : invalide, rien n'est créé", async () => {
    fake.s.pending = null;
    expect(await completeGoogleSignup(form)).toEqual({ kind: "invalid" });
    reset();
    Object.assign(fake.s.pending as Row, { consumedAt: new Date(), organizationId: null });
    expect(await completeGoogleSignup(form)).toEqual({ kind: "invalid" });
    expect(fake.s.orgs).toHaveLength(0);
  });

  it("rejeu : accepté dans la fenêtre courte après la création, refusé ensuite (pending consommé depuis trop longtemps)", async () => {
    const created = await completeGoogleSignup(form);
    expect(created.kind).toBe("created");
    expect((await getGooglePendingState(TOKEN))?.replayable).toBe(true);
    expect(await completeGoogleSignup(form)).toMatchObject({ kind: "replay" });

    (fake.s.pending as Row).consumedAt = new Date(Date.now() - PENDING_REPLAY_WINDOW_MS - 1000);
    expect(await getGooglePendingState(TOKEN)).toMatchObject({ consumed: true, replayable: false });
    expect(await completeGoogleSignup(form)).toEqual({ kind: "invalid" });
    expect(fake.s.orgs).toHaveLength(1);
    expect(fake.s.identities).toHaveLength(1);
  });

  it("l'identité d'inscription passe par la fonction dédiée (jamais d'INSERT direct), avec pending et propriétaire de la même transaction", async () => {
    const created = await completeGoogleSignup(form);
    if (created.kind !== "created") throw new Error("created attendu");
    expect(fake.s.directInsertSql).toHaveLength(0);
    expect(fake.s.signupIdentityCalls).toEqual([[expect.stringMatching(/^uid_/), "aps_1", created.userId, created.organizationId]]);
    const sql = fake.s.queries;
    const identityAt = sql.findIndex((q) => q.includes("app_public_identity_create_for_signup"));
    const consumedAt = sql.findIndex((q) => q.includes('SET "consumedAt" = NOW(), "organizationId"'));
    const commitAt = sql.lastIndexOf("COMMIT");
    expect(identityAt).toBeGreaterThan(-1);
    expect(identityAt).toBeLessThan(consumedAt);
    expect(consumedAt).toBeLessThan(commitAt);
  });

  it("la recherche d'e-mail couvre User et PlatformUser", async () => {
    expect(await emailBelongsToAnyAccount("Nouveau@Example.test")).toBe(false);
    fake.s.platformEmails.push("admin@example.test");
    expect(await emailBelongsToAnyAccount("ADMIN@example.test")).toBe(true);
  });
});

describe("connexion par identité", () => {
  it("connecte un utilisateur et un institut ACTIVE avec le rôle lu en base", async () => {
    fake.s.identities.push({ id: "i1", userId: "u_1", sub: "sub-1" });
    fake.s.orgs.push({ id: "org_1" });
    const session = await loginWithGoogleIdentity("sub-1");
    expect(session).toMatchObject({ id: "u_1", scope: "app", role: "OWNER", organizationId: "org_1", mustChangePassword: false });
    expect(fake.s.audits.map((a) => a.action)).toContain("LOGIN");
  });

  it.each([
    ["utilisateur désactivé (fonction d'identité)", { userId: "u_1", organizationId: "org_1", userStatus: "DISABLED", organizationStatus: "ACTIVE" }],
    ["institut suspendu (fonction d'identité)", { userId: "u_1", organizationId: "org_1", userStatus: "ACTIVE", organizationStatus: "SUSPENDED" }],
  ])("refuse : %s", async (_label, identity) => {
    fake.s.identityOverride = identity;
    expect(await loginWithGoogleIdentity("sub-1")).toBeNull();
    expect(fake.s.audits).toHaveLength(0);
  });

  it("refuse si la relecture trouve un utilisateur ou un institut désactivé, ou un rôle hors institut", async () => {
    fake.s.identities.push({ id: "i1", userId: "u_1", sub: "sub-1" });
    fake.s.orgs.push({ id: "org_1" });
    fake.s.userRowStatus = { status: "DISABLED", orgStatus: "ACTIVE", role: "OWNER" };
    expect(await loginWithGoogleIdentity("sub-1")).toBeNull();
    fake.s.userRowStatus = { status: "ACTIVE", orgStatus: "SUSPENDED", role: "OWNER" };
    expect(await loginWithGoogleIdentity("sub-1")).toBeNull();
    fake.s.userRowStatus = { status: "ACTIVE", orgStatus: "ACTIVE", role: "SUPER_ADMIN" };
    expect(await loadAppSessionForUser("u_1", "org_1")).toBeNull();
    expect(await loginWithGoogleIdentity("sub-1")).toBeNull();
    expect(fake.s.audits).toHaveLength(0);
  });

  it("une identité inconnue ne connecte personne, même si l'e-mail existe chez un User (aucune fusion)", async () => {
    fake.s.users.push({ id: "u_1", email: "owner@example.test" });
    expect(await loginWithGoogleIdentity("sub-inconnu")).toBeNull();
    expect(await emailBelongsToAnyAccount("owner@example.test")).toBe(true);
    expect(fake.s.identities).toHaveLength(0);
  });
});

describe("liaison et déliaison", () => {
  const link = { userId: "u_1", organizationId: "org_1", sessionVersion: 0, claims };

  it("refuse un sub déjà lié à un autre compte et n'insère rien (jamais de fusion)", async () => {
    fake.s.identities.push({ id: "i_other", userId: "u_autre", sub: "sub-1" });
    fake.s.orgs.push({ id: "org_1" });
    expect(await linkGoogleIdentity(link)).toBe("in_use");
    expect(fake.s.identities).toHaveLength(1);
    expect(fake.s.audits).toHaveLength(0);
  });

  it("lie une identité libre avec audit, et reste idempotent pour le même compte", async () => {
    expect(await linkGoogleIdentity(link)).toBe("linked");
    expect(fake.s.identities).toEqual([expect.objectContaining({ userId: "u_1", sub: "sub-1" })]);
    expect(fake.s.audits.map((a) => a.action)).toEqual(["GOOGLE_LINKED"]);
    expect(await linkGoogleIdentity(link)).toBe("already_linked");
    expect(fake.s.identities).toHaveLength(1);
  });

  it("la liaison s'écrit en portée tenant (rappel_app), sans passer par la fonction publique d'identité", async () => {
    expect(await linkGoogleIdentity(link)).toBe("linked");
    expect(fake.s.insertScopes).toEqual(["tenant"]);
    expect(fake.s.queries.some((q) => q.includes("app_public_identity_login"))).toBe(false);
    expect(fake.s.queries.some((q) => q.includes("app_public_identity_create_for_signup"))).toBe(false);
  });

  it("compte déjà lié à un autre sub : already_linked, rien d'ajouté ni d'audité", async () => {
    fake.s.identities.push({ id: "i_mine", userId: "u_1", sub: "sub-ancien" });
    expect(await linkGoogleIdentity(link)).toBe("already_linked");
    expect(fake.s.identities).toHaveLength(1);
    expect(fake.s.audits).toHaveLength(0);
  });

  it("délie seulement si le compte garde un mot de passe ou un e-mail vérifié", async () => {
    fake.s.identities.push({ id: "i1", userId: "u_1", sub: "sub-1" });
    fake.s.unlinkUser = { ...fake.s.unlinkUser, passwordHash: null, emailVerifiedAt: null };
    expect(await unlinkGoogleIdentity({ userId: "u_1", organizationId: "org_1" })).toBe("last_login_method");
    expect(fake.s.identities).toHaveLength(1);

    fake.s.unlinkUser = { ...fake.s.unlinkUser, passwordHash: null, emailVerifiedAt: new Date() };
    expect(await unlinkGoogleIdentity({ userId: "u_1", organizationId: "org_1" })).toBe("unlinked");
    expect(fake.s.identities).toHaveLength(0);
    expect(fake.s.audits.map((a) => a.action)).toContain("GOOGLE_UNLINKED");
    expect(await unlinkGoogleIdentity({ userId: "u_1", organizationId: "org_1" })).toBe("not_linked");
  });
});
