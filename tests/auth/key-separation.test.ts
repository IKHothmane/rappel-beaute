import { createCipheriv, createHash, createHmac, randomBytes } from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  deriveKey,
  getSessionSecret,
  signJwt,
  signJwtDerived,
  signSessionJwt,
  verifyJwt,
} from "@/lib/auth/crypto";
import { getEncryptionKey } from "@/lib/auth/env";
import { verifyJwtEdge, parseSessionTokenEdge } from "@/lib/auth/session-edge";
import { decryptSecret, encryptSecret } from "@/lib/crypto/secrets";

/**
 * Séparation des secrets par usage : clés HKDF distinctes, claims typ/aud/iss vérifiés, double clé pendant la
 * transition (anciens jetons toujours lus), secret de repli refusé hors development/test, chiffrement versionné.
 */
const ROOT = "k".repeat(48);
const b64u = (v: string | Buffer) => Buffer.from(v).toString("base64url");

const appClaims = {
  id: "u_1", email: "u@t.test", firstName: "S", lastName: "A", role: "OWNER", organizationId: "org_a",
  orgName: "A", orgSlug: "a", scope: "app", accountType: "ORGANIZATION", mustChangePassword: false, sessionVersion: 0,
};

beforeEach(() => {
  vi.stubEnv("SESSION_SECRET", ROOT);
  vi.stubEnv("ENCRYPTION_KEY", "encryption-key-for-tests-0123456789");
  vi.stubEnv("AUTH_KEY_SEPARATION", "");
  vi.stubEnv("AUTH_ACCEPT_LEGACY_SESSION_KEY", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("HKDF : une clé par usage", () => {
  it("les clés dérivées sont déterministes, distinctes entre usages et distinctes du secret", () => {
    const session = deriveKey(ROOT, "session");
    expect(session).toHaveLength(32);
    expect(deriveKey(ROOT, "session").equals(session)).toBe(true);
    expect(deriveKey(ROOT, "oauth-state").equals(session)).toBe(false);
    expect(session.equals(Buffer.from(ROOT))).toBe(false);
    expect(deriveKey("autre-secret-assez-long-pour-hkdf-00000", "session").equals(session)).toBe(false);
  });

  it("Node et Edge dérivent la même clé : un jeton à clé dérivée est lu par les deux", async () => {
    const token = signJwtDerived({ id: "u_1" }, ROOT, "session", 60);
    const node = verifyJwt<Record<string, unknown>>(token, ROOT);
    const edge = await verifyJwtEdge<Record<string, unknown>>(token, ROOT);
    for (const payload of [node, edge]) {
      expect(payload).toMatchObject({ id: "u_1", typ: "session", aud: "rappel:session", iss: "rappel-beauty" });
    }
  });

  it("un jeton émis pour un usage est refusé pour un autre (Node et Edge)", async () => {
    const state = signJwtDerived({ purpose: "gcal" }, ROOT, "oauth-state", 60);
    expect(verifyJwt(state, ROOT)).toBeNull(); // « session » par défaut
    expect(await verifyJwtEdge(state, ROOT)).toBeNull();
    expect(verifyJwt(state, ROOT, { purpose: "oauth-state" })).not.toBeNull();
    // et inversement
    const session = signJwtDerived({ id: "u_1" }, ROOT, "session", 60);
    expect(verifyJwt(session, ROOT, { purpose: "oauth-state" })).toBeNull();
  });

  it("claims typ / aud / iss vérifiés : un jeton signé par la bonne clé mais aux claims faux est refusé", async () => {
    const forge = (claims: Record<string, unknown>) => {
      const header = b64u(JSON.stringify({ alg: "HS256", typ: "JWT", kid: "rb1:session" }));
      const now = Math.floor(Date.now() / 1000);
      const body = b64u(JSON.stringify({ id: "u_1", iat: now, exp: now + 60, ...claims }));
      const sig = createHmac("sha256", deriveKey(ROOT, "session")).update(`${header}.${body}`).digest();
      return `${header}.${body}.${b64u(sig)}`;
    };
    const good = { iss: "rappel-beauty", aud: "rappel:session", typ: "session" };
    expect(verifyJwt(forge(good), ROOT)).not.toBeNull();
    for (const bad of [{ iss: "x" }, { aud: "rappel:oauth-state" }, { typ: "other" }, { iss: undefined }]) {
      const token = forge({ ...good, ...bad });
      expect(verifyJwt(token, ROOT)).toBeNull();
      expect(await verifyJwtEdge(token, ROOT)).toBeNull();
    }
  });

  it("un kid d'un autre usage ou inconnu est refusé, un jeton modifié aussi", () => {
    const token = signJwtDerived({ id: "u_1" }, ROOT, "session", 60);
    const [h, p, s] = token.split(".");
    const otherKid = b64u(JSON.stringify({ alg: "HS256", typ: "JWT", kid: "rb1:oauth-state" }));
    expect(verifyJwt(`${otherKid}.${p}.${s}`, ROOT)).toBeNull();
    const tampered = b64u(JSON.stringify({ ...JSON.parse(Buffer.from(p, "base64url").toString()), role: "SUPER_ADMIN" }));
    expect(verifyJwt(`${h}.${tampered}.${s}`, ROOT)).toBeNull();
  });
});

describe("double clé pendant la transition", () => {
  it("un ancien jeton (clé historique, sans claims) reste lu tant qu'il n'a pas expiré", async () => {
    const legacy = signJwt(appClaims, ROOT, 60);
    expect(verifyJwt(legacy, ROOT)).toMatchObject({ id: "u_1" });
    expect(await parseSessionTokenEdge(legacy)).toMatchObject({ id: "u_1" });
    expect(verifyJwt(signJwt(appClaims, ROOT, -5), ROOT)).toBeNull(); // expiré
  });

  it("par défaut l'émission reste sur la clé historique (déploiement progressif sûr), avec les claims", () => {
    const token = signSessionJwt(appClaims, 60);
    expect(JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString()).kid).toBeUndefined();
    expect(verifyJwt(token, ROOT, { allowLegacy: true })).toMatchObject({ typ: "session", aud: "rappel:session" });
  });

  it("AUTH_KEY_SEPARATION=on : n'émet que des jetons à clé dérivée, les deux familles sont lues", async () => {
    vi.stubEnv("AUTH_KEY_SEPARATION", "on");
    const fresh = signSessionJwt(appClaims, 60);
    expect(JSON.parse(Buffer.from(fresh.split(".")[0], "base64url").toString()).kid).toBe("rb1:session");
    // La clé historique seule ne vérifie plus ce jeton
    const [h, p, s] = fresh.split(".");
    expect(createHmac("sha256", ROOT).update(`${h}.${p}`).digest("base64url")).not.toBe(s);
    expect(await parseSessionTokenEdge(fresh)).toMatchObject({ id: "u_1" });
    expect(await parseSessionTokenEdge(signJwt(appClaims, ROOT, 60))).toMatchObject({ id: "u_1" });
  });

  it("fin de transition : AUTH_ACCEPT_LEGACY_SESSION_KEY=false refuse la clé historique, pas la clé dérivée", async () => {
    vi.stubEnv("AUTH_ACCEPT_LEGACY_SESSION_KEY", "false");
    const { parseSessionToken } = await import("@/lib/auth/session");
    expect(parseSessionToken(signJwt(appClaims, ROOT, 60))).toBeNull();
    expect(await parseSessionTokenEdge(signJwt(appClaims, ROOT, 60))).toBeNull();
    vi.stubEnv("AUTH_KEY_SEPARATION", "on");
    const fresh = signSessionJwt(appClaims, 60);
    expect(parseSessionToken(fresh)).toMatchObject({ id: "u_1" });
  });
});

describe("secret de repli de développement", () => {
  it("accepté seulement en development et test", () => {
    vi.stubEnv("SESSION_SECRET", "");
    vi.stubEnv("ENCRYPTION_KEY", "");
    for (const env of ["development", "test"]) {
      vi.stubEnv("NODE_ENV", env);
      expect(getSessionSecret().length).toBeGreaterThanOrEqual(32);
      expect(getEncryptionKey().length).toBeGreaterThanOrEqual(16);
    }
  });

  it("refusé en production, en staging et quand NODE_ENV est absent", () => {
    vi.stubEnv("SESSION_SECRET", "court");
    vi.stubEnv("ENCRYPTION_KEY", "court");
    for (const env of ["production", "staging", ""]) {
      vi.stubEnv("NODE_ENV", env);
      expect(() => getSessionSecret()).toThrow(/SESSION_SECRET/);
      expect(() => getEncryptionKey()).toThrow(/ENCRYPTION_KEY/);
    }
  });
});

describe("chiffrement des jetons : version de clé + AAD", () => {
  const legacyValue = (plain: string) => {
    // Format historique v1, reconstruit à la main : SHA-256 de ENCRYPTION_KEY, AES-256-GCM, sans AAD.
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", createHash("sha256").update(getEncryptionKey()).digest(), iv);
    const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
    return `v1.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${enc.toString("base64url")}`;
  };

  it("les anciennes valeurs v1 se déchiffrent toujours, avec ou sans AAD fourni", () => {
    const stored = legacyValue("refresh-token");
    expect(decryptSecret(stored)).toBe("refresh-token");
    expect(decryptSecret(stored, "org_a")).toBe("refresh-token");
  });

  it("par défaut, l'émission reste v1 (lisible par l'ancienne version)", () => {
    const stored = encryptSecret("abc", "org_a");
    expect(stored.startsWith("v1.")).toBe(true);
    expect(decryptSecret(stored)).toBe("abc");
  });

  it("v2 : version de clé et AAD liés à l'institut", () => {
    vi.stubEnv("AUTH_KEY_SEPARATION", "on");
    const stored = encryptSecret("refresh-token", "org_a");
    expect(stored.startsWith("v2.k1.")).toBe(true);
    expect(stored).not.toContain("refresh-token");
    expect(decryptSecret(stored, "org_a")).toBe("refresh-token");
    // recopiée vers un autre institut, ou sans AAD : refusée
    expect(() => decryptSecret(stored, "org_b")).toThrow();
    expect(() => decryptSecret(stored)).toThrow("CIPHER_AAD_REQUIRED");
    // altération du texte chiffré ou du kid
    expect(() => decryptSecret(stored.replace(".k1.", ".k9."), "org_a")).toThrow();
    const parts = stored.split(".");
    parts[4] = Buffer.from("x".repeat(8)).toString("base64url");
    expect(() => decryptSecret(parts.join("."), "org_a")).toThrow();
  });

  it("v2u : appelants sans contexte (état OAuth), lisible sans AAD", () => {
    vi.stubEnv("AUTH_KEY_SEPARATION", "on");
    const stored = encryptSecret("code-verifier");
    expect(stored.startsWith("v2u.k1.")).toBe(true);
    expect(decryptSecret(stored)).toBe("code-verifier");
  });

  it("la clé v2 dérive de ENCRYPTION_KEY : une autre clé ne déchiffre pas", () => {
    vi.stubEnv("AUTH_KEY_SEPARATION", "on");
    const stored = encryptSecret("x", "org_a");
    vi.stubEnv("ENCRYPTION_KEY", "another-encryption-key-0123456789");
    expect(() => decryptSecret(stored, "org_a")).toThrow();
  });

  it("valeur mal formée : CIPHER_INVALID", () => {
    expect(() => decryptSecret("v3.a.b.c")).toThrow("CIPHER_INVALID");
    expect(() => decryptSecret("v1.a.b")).toThrow("CIPHER_INVALID");
  });
});
