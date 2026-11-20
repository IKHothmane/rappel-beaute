import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  burnPasswordCheck,
  checkPasswordUniform,
  hashPassword,
  hashPasswordAsync,
  passwordNeedsRehash,
  targetScryptParams,
  verifyPassword,
  verifyPasswordAsync,
} from "@/lib/auth/crypto";

/**
 * Mots de passe : scrypt asynchrone, paramètres portés par le haché, coût relevé, anciens hachés toujours lus,
 * re-hachage transparent, vérification factice (authenticateUser / authenticatePlatformUser), sans base.
 */
const db = vi.hoisted(() => ({
  calls: [] as Array<{ sql: string; params: unknown[] }>,
  responders: [] as Array<{ match: RegExp; reply: (params: unknown[]) => unknown }>,
}));
const scryptN = vi.hoisted(() => [] as number[]);

vi.mock("@/lib/db/pool", () => ({
  pool: {
    query: vi.fn(async (sql: string, params: unknown[] = []) => {
      db.calls.push({ sql, params });
      const hit = db.responders.find((r) => r.match.test(sql));
      return hit ? hit.reply(params) : { rows: [], rowCount: 0 };
    }),
    connect: vi.fn(),
  },
}));
vi.mock("@/lib/db/audit", () => ({ writeAuditLog: vi.fn() }));
vi.mock("@/lib/db/platform-audit", () => ({ writePlatformAuditLog: vi.fn() }));
// Le COÛT est mesuré (paramètre N de chaque scrypt asynchrone), pas le nombre d'appels.
vi.mock("crypto", async (original) => {
  const actual = await original<typeof import("crypto")>();
  const scrypt = ((password: string, salt: string, keylen: number, options: { N: number }, cb: never) => {
    scryptN.push(options.N);
    return (actual.scrypt as (...args: unknown[]) => void)(password, salt, keylen, options, cb);
  }) as typeof actual.scrypt;
  return { ...actual, scrypt, default: { ...actual, scrypt } };
});

import { authenticateUser } from "@/lib/db/users";
import { authenticatePlatformUser } from "@/lib/db/platform-users";

beforeEach(() => {
  db.calls = [];
  db.responders = [];
  // Coût réduit : ces tests vérifient la logique, pas le temps de calcul (un test dédié utilise le coût par défaut).
  vi.stubEnv("AUTH_SCRYPT_LOG_N", "14");
});
afterEach(() => vi.unstubAllEnvs());

describe("format et coût", () => {
  it("coût cible par défaut : N=2^17, r=8, p=1, paramètres portés par le haché", async () => {
    vi.stubEnv("AUTH_SCRYPT_LOG_N", "");
    expect(targetScryptParams()).toEqual({ logN: 17, r: 8, p: 1 });
    const stored = await hashPasswordAsync("mot-de-passe-1");
    expect(stored).toMatch(/^scrypt\$17\$8\$1\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    expect(await verifyPasswordAsync("mot-de-passe-1", stored)).toBe(true);
    expect(await verifyPasswordAsync("mot-de-passe-2", stored)).toBe(false);
    expect(passwordNeedsRehash(stored)).toBe(false);
  });

  it("AUTH_SCRYPT_LOG_N est borné (14 à 18), sinon valeur par défaut", () => {
    for (const bad of ["13", "19", "abc", "17.5"]) {
      vi.stubEnv("AUTH_SCRYPT_LOG_N", bad);
      expect(targetScryptParams().logN).toBe(17);
    }
    vi.stubEnv("AUTH_SCRYPT_LOG_N", "15");
    expect(targetScryptParams().logN).toBe(15);
  });

  it("les anciens hachés (sel:haché, N=2^14) sont vérifiés à l'identique, en synchrone et en asynchrone", async () => {
    const legacy = hashPassword("ancien-mdp-1");
    expect(legacy).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);
    expect(verifyPassword("ancien-mdp-1", legacy)).toBe(true);
    expect(verifyPassword("autre", legacy)).toBe(false);
    expect(await verifyPasswordAsync("ancien-mdp-1", legacy)).toBe(true);
    expect(await verifyPasswordAsync("autre", legacy)).toBe(false);
  });

  it("la vérification synchrone relit aussi le nouveau format (maxmem adapté)", async () => {
    vi.stubEnv("AUTH_SCRYPT_LOG_N", "16");
    const stored = await hashPasswordAsync("mot-de-passe-1");
    expect(verifyPassword("mot-de-passe-1", stored)).toBe(true);
    expect(verifyPassword("mot-de-passe-2", stored)).toBe(false);
  });

  it("re-hachage requis pour le format historique ou un coût inférieur à la cible, pas autrement", async () => {
    expect(passwordNeedsRehash(hashPassword("x"))).toBe(true);
    const weak = await hashPasswordAsync("x", { logN: 14, r: 8, p: 1 });
    vi.stubEnv("AUTH_SCRYPT_LOG_N", "15");
    expect(passwordNeedsRehash(weak)).toBe(true);
    vi.stubEnv("AUTH_SCRYPT_LOG_N", "14");
    expect(passwordNeedsRehash(weak)).toBe(false);
    expect(passwordNeedsRehash("n'importe quoi")).toBe(false);
  });

  it("un haché aux paramètres hors bornes ou mal formé est refusé sans calcul coûteux", async () => {
    const bad = [
      `scrypt$30$8$1$${"a".repeat(32)}$${"b".repeat(128)}`, // N démesuré
      `scrypt$14$8$1$zz$${"b".repeat(128)}`,
      `scrypt$14$8$1$${"a".repeat(32)}`,
      "",
      "pas-de-separateur",
    ];
    for (const stored of bad) {
      expect(verifyPassword("x", stored)).toBe(false);
      expect(await verifyPasswordAsync("x", stored)).toBe(false);
    }
  });

  it("plusieurs vérifications simultanées sont toutes menées à bien (créneau borné)", async () => {
    vi.stubEnv("AUTH_SCRYPT_CONCURRENCY", "1");
    const stored = await hashPasswordAsync("mot-de-passe-1");
    const results = await Promise.all([
      verifyPasswordAsync("mot-de-passe-1", stored),
      verifyPasswordAsync("faux", stored),
      verifyPasswordAsync("mot-de-passe-1", stored),
      verifyPasswordAsync("faux", stored),
    ]);
    expect(results).toEqual([true, false, true, false]);
  });

  it("burnPasswordCheck ne lève jamais, même avec une entrée inattendue", async () => {
    await expect(burnPasswordCheck("x")).resolves.toBeUndefined();
    await expect(burnPasswordCheck(undefined as unknown as string)).resolves.toBeUndefined();
  });
});

describe("coût uniforme : l'existence d'un compte ne se lit pas dans la durée", () => {
  // T = coût courant (2^15 ici), L = coût historique (2^14). Chaque refus doit coûter 1 L + 1 T par fonction, donc
  // 2 L + 2 T pour le parcours complet de la route (authenticateUser puis authenticatePlatformUser).
  const L = 2 ** 14;
  const T = 2 ** 15;
  const EXPECTED = [L, L, T, T];

  const row = (over: Record<string, unknown> = {}) => ({
    id: "u_1", email: "u@t.test", loginPhone: null, firstName: "S", lastName: "A", role: "OWNER",
    passwordHash: hashPassword("bon-mdp-1234"), organizationId: "org_a", orgName: "A", orgSlug: "a",
    userStatus: "ACTIVE", orgStatus: "ACTIVE", mustChangePassword: false, sessionVersion: 7, ...over,
  });
  const admin = (over: Record<string, unknown> = {}) => ({
    id: "pu_1", email: "a@t.test", firstName: "A", lastName: "Root", role: "SUPER_ADMIN", status: "ACTIVE",
    passwordHash: hashPassword("bon-mdp-1234"), sessionVersion: 2, ...over,
  });
  const users = (rows: unknown[]) => db.responders.push({ match: /FROM "User" u/, reply: () => ({ rows }) });
  const platformEmail = () =>
    db.responders.push({ match: /SELECT id FROM "PlatformUser"/, reply: () => ({ rows: [{ id: "pu_1" }] }) });
  const platformRows = (rows: unknown[]) =>
    db.responders.push({ match: /FROM "PlatformUser"\s+WHERE/, reply: () => ({ rows }) });

  beforeEach(async () => {
    vi.stubEnv("AUTH_SCRYPT_LOG_N", "15");
    await burnPasswordCheck("préchauffage"); // les hachés factices sont calculés une fois, hors mesure
  });

  /** Parcours de /api/auth/login : application d'abord, puis plateforme. */
  async function routeCost(email: string, password: string) {
    scryptN.length = 0;
    const session = (await authenticateUser(email, password)) ?? (await authenticatePlatformUser(email, password));
    return { session, costs: [...scryptN].sort((a, b) => a - b) };
  }

  it("compte inconnu", async () => {
    users([]);
    platformRows([]);
    const { session, costs } = await routeCost("inconnu@t.test", "bon-mdp-1234");
    expect(session).toBeNull();
    expect(costs).toEqual(EXPECTED);
  });

  it.each([
    ["utilisateur désactivé", { userStatus: "DISABLED" }],
    ["institut suspendu", { orgStatus: "SUSPENDED" }],
    ["institut archivé", { orgStatus: "ARCHIVED" }],
    ["sans mot de passe", { passwordHash: null }],
  ])("%s : même coût qu'un compte inconnu", async (_label, over) => {
    users([row(over)]);
    platformRows([]);
    const { session, costs } = await routeCost("u@t.test", "bon-mdp-1234");
    expect(session).toBeNull();
    expect(costs).toEqual(EXPECTED);
    expect(db.calls.some((c) => /^UPDATE/.test(c.sql.trim()))).toBe(false);
  });

  it("identifiant ambigu (deux comptes)", async () => {
    users([row(), row({ id: "u_2" })]);
    platformRows([]);
    expect((await routeCost("u@t.test", "bon-mdp-1234")).costs).toEqual(EXPECTED);
  });

  it("utilisateur au haché historique, mot de passe faux (le cas le plus fréquent pendant la transition)", async () => {
    users([row()]);
    platformRows([]);
    expect((await routeCost("u@t.test", "mauvais-mdp-1")).costs).toEqual(EXPECTED);
  });

  it("utilisateur au haché relevé (coût courant), mot de passe faux", async () => {
    users([row({ passwordHash: await hashPasswordAsync("bon-mdp-1234") })]);
    platformRows([]);
    expect((await routeCost("u@t.test", "mauvais-mdp-1")).costs).toEqual(EXPECTED);
  });

  it("e-mail d'un compte plateforme : mot de passe faux, haché historique puis relevé", async () => {
    for (const hash of [hashPassword("bon-mdp-1234"), await hashPasswordAsync("bon-mdp-1234")]) {
      db.responders = [];
      platformEmail();
      platformRows([admin({ passwordHash: hash })]);
      expect((await routeCost("a@t.test", "mauvais-mdp-1")).costs).toEqual(EXPECTED);
    }
  });

  it("administrateur désactivé ou sans mot de passe", async () => {
    for (const over of [{ status: "DISABLED" }, { passwordHash: null }]) {
      db.responders = [];
      platformEmail();
      platformRows([admin(over)]);
      expect((await routeCost("a@t.test", "bon-mdp-1234")).costs).toEqual(EXPECTED);
    }
  });

  it("checkPasswordUniform : succès sans opération factice, refus = une opération de chaque classe", async () => {
    const legacy = hashPassword("bon-mdp-1234");
    scryptN.length = 0;
    expect(await checkPasswordUniform("bon-mdp-1234", legacy)).toBe(true);
    expect(scryptN).toEqual([L]);
    scryptN.length = 0;
    expect(await checkPasswordUniform("faux", legacy)).toBe(false);
    expect([...scryptN].sort((a, b) => a - b)).toEqual([L, T]);
    scryptN.length = 0;
    expect(await checkPasswordUniform("x", null)).toBe(false);
    expect([...scryptN].sort((a, b) => a - b)).toEqual([L, T]);
    scryptN.length = 0;
    expect(await checkPasswordUniform("x", "haché illisible")).toBe(false);
    expect([...scryptN].sort((a, b) => a - b)).toEqual([L, T]);
  });

  it("file d'attente bornée : au-delà, refus immédiat « occupé » plutôt qu'une file sans fin", async () => {
    vi.stubEnv("AUTH_SCRYPT_CONCURRENCY", "1");
    vi.stubEnv("AUTH_SCRYPT_MAX_QUEUE", "1");
    const stored = await hashPasswordAsync("bon-mdp-1234");
    const settled = await Promise.allSettled(
      Array.from({ length: 5 }, () => verifyPasswordAsync("bon-mdp-1234", stored)),
    );
    const busy = settled.filter((r) => r.status === "rejected");
    expect(busy.length).toBeGreaterThanOrEqual(2);
    for (const r of busy) expect((r as PromiseRejectedResult).reason).toMatchObject({ code: "AUTH_BUSY" });
    expect(settled.filter((r) => r.status === "fulfilled").length).toBeGreaterThanOrEqual(2);
    // une fois la file vidée, tout refonctionne
    expect(await verifyPasswordAsync("bon-mdp-1234", stored)).toBe(true);
  });
});

describe("authenticateUser : re-hachage transparent et entrées hostiles", () => {
  const row = (over: Record<string, unknown> = {}) => ({
    id: "u_1", email: "u@t.test", loginPhone: null, firstName: "S", lastName: "A", role: "OWNER",
    passwordHash: hashPassword("bon-mdp-1234"), organizationId: "org_a", orgName: "A", orgSlug: "a",
    userStatus: "ACTIVE", orgStatus: "ACTIVE", mustChangePassword: false, sessionVersion: 7, ...over,
  });
  const users = (rows: unknown[]) => db.responders.push({ match: /FROM "User" u/, reply: () => ({ rows }) });

  it("mot de passe démesuré : refusé avant tout calcul", async () => {
    scryptN.length = 0;
    expect(await authenticateUser("u@t.test", "x".repeat(5000))).toBeNull();
    expect(scryptN).toHaveLength(0);
    expect(db.calls).toHaveLength(0);
  });

  it("succès avec un ancien haché : connexion inchangée + re-hachage en comparaison-échange, sans toucher sessionVersion", async () => {
    const legacy = hashPassword("bon-mdp-1234");
    users([row({ passwordHash: legacy })]);
    const session = await authenticateUser("u@t.test", "bon-mdp-1234");
    expect(session).toMatchObject({ id: "u_1", sessionVersion: 7, organizationId: "org_a" });
    const update = db.calls.find((c) => /^UPDATE "User"/.test(c.sql.trim()))!;
    expect(update.sql).toContain(`"passwordHash" = $3`); // comparaison-échange sur l'ancien haché
    expect(update.sql).not.toContain("sessionVersion");
    expect(update.params[1]).toBe("u_1");
    expect(update.params[2]).toBe(legacy);
    expect(String(update.params[0])).toMatch(/^scrypt\$14\$8\$1\$/);
    expect(verifyPassword("bon-mdp-1234", String(update.params[0]))).toBe(true);
  });

  it("succès avec un haché déjà au coût courant : aucune écriture", async () => {
    const current = await hashPasswordAsync("bon-mdp-1234");
    users([row({ passwordHash: current })]);
    expect(await authenticateUser("u@t.test", "bon-mdp-1234")).toMatchObject({ id: "u_1" });
    expect(db.calls.some((c) => /^UPDATE/.test(c.sql.trim()))).toBe(false);
  });

  it("mot de passe faux : aucune écriture", async () => {
    users([row()]);
    expect(await authenticateUser("u@t.test", "mauvais-mdp-1")).toBeNull();
    expect(db.calls.some((c) => /^UPDATE/.test(c.sql.trim()))).toBe(false);
  });

  it("un échec du re-hachage (droit refusé, base indisponible) ne fait jamais échouer la connexion", async () => {
    users([row({ passwordHash: hashPassword("bon-mdp-1234") })]);
    db.responders.unshift({
      match: /^\s*UPDATE "User"/,
      reply: () => {
        throw Object.assign(new Error("permission denied"), { code: "42501" });
      },
    });
    expect(await authenticateUser("u@t.test", "bon-mdp-1234")).toMatchObject({ id: "u_1" });
  });

  it("plateforme : succès avec un ancien haché, re-haché sans toucher sessionVersion", async () => {
    const legacy = hashPassword("bon-mdp-1234");
    db.responders.push({
      match: /FROM "PlatformUser"/,
      reply: () => ({
        rows: [{ id: "pu_1", email: "a@t.test", firstName: "A", lastName: "Root", role: "SUPER_ADMIN", status: "ACTIVE", passwordHash: legacy, sessionVersion: 2 }],
      }),
    });
    const session = await authenticatePlatformUser("a@t.test", "bon-mdp-1234");
    expect(session).toMatchObject({ id: "pu_1", sessionVersion: 2, scope: "platform" });
    const update = db.calls.find((c) => /^UPDATE "PlatformUser"/.test(c.sql.trim()))!;
    expect(update.sql).not.toContain("sessionVersion");
    expect(update.params[2]).toBe(legacy);
  });
});
