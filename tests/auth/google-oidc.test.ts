import { createHash, generateKeyPairSync, sign, type KeyObject } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GoogleOidcError,
  buildGoogleAuthorizationUrl,
  exchangeGoogleCode,
  generatePkceMaterial,
  googleAuthRedirectUri,
  isGoogleAuthAvailable,
  resetGoogleJwksCache,
  sha256Hex,
  verifyGoogleIdToken,
} from "@/lib/auth/google-oidc";
import { sanitizeRedirectAfter } from "@/lib/auth/redirect-after";

/** Aucun appel réseau réel : fetch est un double, les clés RSA sont générées pour le test. */
const CLIENT_ID = "client-123.apps.googleusercontent.com";
const NOW_MS = Date.UTC(2026, 10, 19, 12, 0, 0);
const NOW = Math.floor(NOW_MS / 1000);
const NONCE = "nonce-value-for-test";

function makeKey(kid: string) {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  return { kid, privateKey, jwk: { ...publicKey.export({ format: "jwk" }), kid, use: "sig", alg: "RS256" } };
}
const keyA = makeKey("kid-a");
const keyB = makeKey("kid-b");

const b64 = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");

function token(
  claims: Record<string, unknown> = {},
  opts: { key?: { kid: string; privateKey: KeyObject }; alg?: string } = {},
): string {
  const key = opts.key ?? keyA;
  const header = b64({ alg: opts.alg ?? "RS256", kid: key.kid, typ: "JWT" });
  const payload = b64({
    iss: "https://accounts.google.com",
    aud: CLIENT_ID,
    sub: "109876543210",
    email: "Owner@Example.test",
    email_verified: true,
    name: "Ada Owner",
    nonce: NONCE,
    iat: NOW - 10,
    exp: NOW + 3000,
    ...claims,
  });
  const signature = sign("sha256", Buffer.from(`${header}.${payload}`), key.privateKey).toString("base64url");
  return `${header}.${payload}.${signature}`;
}

function jwksFetch(...keys: { jwk: unknown }[]) {
  return vi.fn(async () =>
    new Response(JSON.stringify({ keys: keys.map((k) => k.jwk) }), {
      status: 200,
      headers: { "content-type": "application/json", "cache-control": "public, max-age=3600" },
    }),
  );
}

const verify = (idToken: string, fetchImpl: unknown, extra: Partial<Parameters<typeof verifyGoogleIdToken>[1]> = {}) =>
  verifyGoogleIdToken(idToken, {
    clientId: CLIENT_ID,
    expectedNonceHash: sha256Hex(NONCE),
    nowMs: NOW_MS,
    fetchImpl: fetchImpl as typeof fetch,
    ...extra,
  });

async function rejection(promise: Promise<unknown>) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(GoogleOidcError);
  return error as GoogleOidcError;
}

beforeEach(() => resetGoogleJwksCache());
afterEach(() => vi.unstubAllEnvs());

describe("validation de l'id_token Google", () => {
  it("accepte un jeton valide et renvoie sub, e-mail normalisé et nom", async () => {
    await expect(verify(token(), jwksFetch(keyA))).resolves.toEqual({
      sub: "109876543210",
      email: "owner@example.test",
      name: "Ada Owner",
      emailVerified: true,
    });
  });

  it("accepte l'émetteur sans schéma et une audience multiple avec azp correct", async () => {
    const fetchImpl = jwksFetch(keyA);
    await expect(verify(token({ iss: "accounts.google.com" }), fetchImpl)).resolves.toMatchObject({ sub: "109876543210" });
    await expect(
      verify(token({ aud: [CLIENT_ID, "other"], azp: CLIENT_ID }), fetchImpl),
    ).resolves.toMatchObject({ sub: "109876543210" });
  });

  it.each([
    ["mauvaise audience", { aud: "autre-client" }],
    ["mauvais émetteur", { iss: "https://evil.example" }],
    ["audience multiple sans azp", { aud: [CLIENT_ID, "other"] }],
    ["azp étranger", { azp: "autre-client" }],
    ["jeton expiré", { exp: NOW - 3600 }],
    ["émis dans le futur", { iat: NOW + 3600, exp: NOW + 7200 }],
    ["nonce faux", { nonce: "nonce-rejoue" }],
    ["nonce absent", { nonce: undefined }],
    ["e-mail non vérifié", { email_verified: false }],
    ["email_verified en chaîne", { email_verified: "true" }],
    ["sub vide", { sub: "  " }],
    ["sub absent", { sub: undefined }],
    ["e-mail invalide", { email: "pas-un-email" }],
  ])("refuse : %s", async (_label, claims) => {
    const error = await rejection(verify(token(claims as Record<string, unknown>), jwksFetch(keyA)));
    expect(error.code).toBe("ID_TOKEN_INVALID");
  });

  it("tolère une petite dérive d'horloge (exp dépassé de 30 s)", async () => {
    await expect(verify(token({ exp: NOW - 30 }), jwksFetch(keyA))).resolves.toMatchObject({ sub: "109876543210" });
  });

  it("refuse une signature invalide (jeton signé par une autre clé sous le même kid)", async () => {
    const forged = token({}, { key: { kid: "kid-a", privateKey: keyB.privateKey } });
    expect((await rejection(verify(forged, jwksFetch(keyA)))).message).toContain("signature");
  });

  it("refuse un contenu modifié après signature et les algorithmes autres que RS256", async () => {
    const fetchImpl = jwksFetch(keyA);
    const [h, , s] = token().split(".");
    const tampered = `${h}.${b64({ iss: "https://accounts.google.com", aud: CLIENT_ID, sub: "admin", email: "a@b.test", email_verified: true, nonce: NONCE, iat: NOW, exp: NOW + 100 })}.${s}`;
    await rejection(verify(tampered, fetchImpl));
    await rejection(verify(token({}, { alg: "HS256" }), fetchImpl));
    await rejection(verify(token({}, { alg: "none" }), fetchImpl));
    await rejection(verify("a.b", fetchImpl));
  });

  it("met les clés en cache puis les recharge (une fois) quand le kid est inconnu (rotation)", async () => {
    const fetchImpl = jwksFetch(keyA);
    await verify(token(), fetchImpl);
    await verify(token(), fetchImpl);
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    // Nouveau kid : rechargement refusé dans la minute (pas d'amplification), accepté ensuite.
    const rotated = jwksFetch(keyA, keyB);
    const soon = await rejection(verify(token({}, { key: keyB }), rotated, { nowMs: NOW_MS + 5_000 }));
    expect(soon.message).toContain("kid unknown");
    expect(rotated).not.toHaveBeenCalled();
    await expect(
      verify(token({ iat: NOW + 100, exp: NOW + 6000 }, { key: keyB }), rotated, { nowMs: NOW_MS + 120_000 }),
    ).resolves.toMatchObject({ sub: "109876543210" });
    expect(rotated).toHaveBeenCalledTimes(1);
  });

  it("signale l'indisponibilité de JWKS sans accepter le jeton", async () => {
    const down = vi.fn(async () => new Response("nope", { status: 503 }));
    expect((await rejection(verify(token(), down))).code).toBe("JWKS_UNAVAILABLE");
  });
});

describe("PKCE, state, nonce et URL d'autorisation", () => {
  it("génère verifier ≥ 43 car., challenge S256, state et nonce d'au moins 128 bits, jamais répétés", () => {
    const a = generatePkceMaterial();
    const b = generatePkceMaterial();
    expect(a.codeVerifier.length).toBeGreaterThanOrEqual(43);
    expect(a.codeChallenge).toBe(createHash("sha256").update(a.codeVerifier).digest("base64url"));
    expect(Buffer.from(a.state, "base64url").length).toBeGreaterThanOrEqual(16);
    expect(Buffer.from(a.nonce, "base64url").length).toBeGreaterThanOrEqual(16);
    expect(new Set([a.state, b.state, a.nonce, b.nonce, a.codeVerifier, b.codeVerifier]).size).toBe(6);
  });

  it("construit l'URL : code + PKCE S256, scopes, select_account, sans accès hors ligne", () => {
    const m = generatePkceMaterial();
    const url = new URL(
      buildGoogleAuthorizationUrl({
        clientId: CLIENT_ID,
        redirectUri: "https://rappelbeauty.com/api/auth/google/callback/",
        state: m.state,
        nonce: m.nonce,
        codeChallenge: m.codeChallenge,
      }),
    );
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    const p = url.searchParams;
    expect(p.get("response_type")).toBe("code");
    expect(p.get("scope")).toBe("openid email profile");
    expect(p.get("prompt")).toBe("select_account");
    expect(p.get("include_granted_scopes")).toBe("false");
    expect(p.get("code_challenge_method")).toBe("S256");
    expect(p.get("state")).toBe(m.state);
    expect(p.get("nonce")).toBe(m.nonce);
    expect(p.has("access_type")).toBe(false);
  });
});

describe("échange du code", () => {
  it("n'envoie que le nécessaire et ne renvoie que l'id_token (jetons Google ignorés)", async () => {
    vi.stubEnv("GOOGLE_AUTH_CLIENT_ID", CLIENT_ID);
    vi.stubEnv("GOOGLE_AUTH_CLIENT_SECRET", "secret-de-test");
    const fetchImpl = vi.fn(async (_url: unknown, init?: RequestInit) => {
      expect(String(init?.body)).toContain("code_verifier=verif");
      return new Response(JSON.stringify({ id_token: "a.b.c", access_token: "ya29.x", refresh_token: "1//x" }), { status: 200 });
    });
    const result = await exchangeGoogleCode({
      code: "code-1",
      codeVerifier: "verif",
      redirectUri: "https://rappelbeauty.com/api/auth/google/callback/",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result).toBe("a.b.c");
  });

  it("échoue proprement sur une réponse d'erreur ou sans id_token", async () => {
    vi.stubEnv("GOOGLE_AUTH_CLIENT_ID", CLIENT_ID);
    vi.stubEnv("GOOGLE_AUTH_CLIENT_SECRET", "secret-de-test");
    const run = (response: Response) =>
      exchangeGoogleCode({
        code: "c",
        codeVerifier: "v",
        redirectUri: "https://x.test/api/auth/google/callback/",
        fetchImpl: (async () => response) as unknown as typeof fetch,
      });
    expect((await rejection(run(new Response("{}", { status: 400 })))).code).toBe("TOKEN_EXCHANGE_FAILED");
    expect((await rejection(run(new Response(JSON.stringify({ access_token: "x" }), { status: 200 })))).code).toBe("TOKEN_EXCHANGE_FAILED");
  });
});

describe("configuration", () => {
  it("est désactivée par défaut, puis exige le drapeau ET les identifiants", () => {
    vi.stubEnv("AUTH_GOOGLE_ENABLED", "");
    vi.stubEnv("GOOGLE_AUTH_CLIENT_ID", CLIENT_ID);
    vi.stubEnv("GOOGLE_AUTH_CLIENT_SECRET", "s");
    expect(isGoogleAuthAvailable()).toBe(false);
    vi.stubEnv("AUTH_GOOGLE_ENABLED", "true");
    expect(isGoogleAuthAvailable()).toBe(true);
    vi.stubEnv("GOOGLE_AUTH_CLIENT_SECRET", "");
    expect(isGoogleAuthAvailable()).toBe(false);
  });

  it("ignore en production une URI de retour explicite pointant vers localhost", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://rappelbeauty.com");
    vi.stubEnv("GOOGLE_AUTH_REDIRECT_URI", "http://localhost:3000/api/auth/google/callback/");
    expect(googleAuthRedirectUri("http://localhost:3000")).toBe("https://rappelbeauty.com/api/auth/google/callback/");
    vi.stubEnv("GOOGLE_AUTH_REDIRECT_URI", "https://rappelbeauty.com/api/auth/google/callback");
    expect(googleAuthRedirectUri("http://localhost:3000")).toBe("https://rappelbeauty.com/api/auth/google/callback/");
  });

  it("hôte de retour unique : sans URI explicite, la production vise le domaine public (jamais app.* ni www.*)", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("GOOGLE_AUTH_REDIRECT_URI", "");
    for (const configured of ["", "https://app.rappelbeauty.com", "https://www.rappelbeauty.com/", "https://rappelbeauty.com"]) {
      vi.stubEnv("NEXT_PUBLIC_APP_URL", configured);
      vi.stubEnv("APP_URL", "");
      vi.stubEnv("APP_BASE_URL", "");
      expect(googleAuthRedirectUri("https://app.rappelbeauty.com")).toBe("https://rappelbeauty.com/api/auth/google/callback/");
    }
  });

  it("une URI explicite vers app.* ou www.* est ramenée au domaine public ; un hôte de test est conservé", () => {
    vi.stubEnv("GOOGLE_AUTH_REDIRECT_URI", "https://app.rappelbeauty.com/api/auth/google/callback/");
    expect(googleAuthRedirectUri("http://localhost:3000")).toBe("https://rappelbeauty.com/api/auth/google/callback/");
    vi.stubEnv("GOOGLE_AUTH_REDIRECT_URI", "https://www.rappelbeauty.com");
    expect(googleAuthRedirectUri("http://localhost:3000")).toBe("https://rappelbeauty.com/api/auth/google/callback/");
    vi.stubEnv("GOOGLE_AUTH_REDIRECT_URI", "https://staging.example.test/api/auth/google/callback");
    expect(googleAuthRedirectUri("http://localhost:3000")).toBe("https://staging.example.test/api/auth/google/callback/");
  });
});

describe("redirectAfter (liste blanche de chemins relatifs)", () => {
  it.each(["/dashboard/", "/security/?x=1", "/agenda/2026-11", "/"])("accepte %s", (value) => {
    expect(sanitizeRedirectAfter(value)).toBe(value);
  });
  it.each([
    "//evil.example",
    "/\\evil.example",
    "https://evil.example",
    "javascript:alert(1)",
    "evil",
    "",
    "/%2f%2fevil.example",
    "/%5cevil.example",
    "/api/auth/logout/",
    "/_next/data",
    "/a b",
    "/x\n/y",
    `/${"a".repeat(600)}`,
    null,
    42,
  ])("refuse %j", (value) => {
    expect(sanitizeRedirectAfter(value)).toBeNull();
  });
});
