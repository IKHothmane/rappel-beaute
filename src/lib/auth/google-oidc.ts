import {
  createHash,
  createPublicKey,
  randomBytes,
  timingSafeEqual,
  verify as cryptoVerify,
  type JsonWebKey as NodeJsonWebKey,
  type KeyObject,
} from "node:crypto";
import { publicAppOrigin, SITE } from "@/lib/site";

/**
 * Connexion Google (OpenID Connect, flux code + PKCE S256), sans dépendance externe.
 * Ce module ne stocke ni ne renvoie jamais de jeton d'accès ou de rafraîchissement Google :
 * seul l'id_token est lu, validé puis réduit à {sub, email, name}.
 *
 * Variables : AUTH_GOOGLE_ENABLED (faux par défaut), GOOGLE_AUTH_CLIENT_ID, GOOGLE_AUTH_CLIENT_SECRET,
 * GOOGLE_AUTH_REDIRECT_URI (optionnelle).
 */

export const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
export const GOOGLE_JWKS_URI = "https://www.googleapis.com/oauth2/v3/certs";
export const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"] as const;
export const GOOGLE_CALLBACK_PATH = "/api/auth/google/callback/";

const CLOCK_SKEW_SEC = 60;
const FETCH_TIMEOUT_MS = 8_000;
const JWKS_MIN_TTL_MS = 5 * 60_000;
const JWKS_MAX_TTL_MS = 24 * 60 * 60_000;
const JWKS_DEFAULT_TTL_MS = 60 * 60_000;
/** Une clé inconnue (rotation) déclenche au plus un rechargement par minute : pas d'amplification. */
const JWKS_REFETCH_COOLDOWN_MS = 60_000;
const MAX_ID_TOKEN_LENGTH = 8_192;

export class GoogleOidcError extends Error {
  constructor(
    public readonly code:
      | "NOT_CONFIGURED"
      | "TOKEN_EXCHANGE_FAILED"
      | "ID_TOKEN_INVALID"
      | "JWKS_UNAVAILABLE",
    detail?: string,
  ) {
    super(detail ? `${code}: ${detail}` : code);
    this.name = "GoogleOidcError";
  }
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export function isGoogleAuthEnabled(): boolean {
  const flag = process.env.AUTH_GOOGLE_ENABLED?.trim().toLowerCase();
  return flag === "true" || flag === "1";
}

export function googleAuthCredentials(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.GOOGLE_AUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_AUTH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

/** Actif ET configuré : sinon toutes les routes répondent par un 404 générique. */
export function isGoogleAuthAvailable(): boolean {
  return isGoogleAuthEnabled() && googleAuthCredentials() !== null;
}

/**
 * Hôtes de production dont l'URI de retour est ramenée au domaine racine (SITE.url), comme Google Agenda.
 */
export const FOLDED_AUTH_HOSTS = new Set(["app.rappelbeauty.com", "www.rappelbeauty.com"]);

/**
 * URI de retour Google, identique (slash final inclus) à celle enregistrée dans la console Google.
 *
 * HÔTE DE RETOUR UNIQUE : le domaine public (SITE.url, rappelbeauty.com), jamais app.* ni www.*. C'est l'hôte
 * qui sert /connexion/ et /professionnel/ sans session (middleware : « resolveDomain » y renvoie « www » ; sur
 * app.* ces pages exigent une session et le message ?google_error= serait perdu) et celui où le formulaire de
 * connexion e-mail pose déjà le cookie de session (hôte seul) puis ouvre l'espace par /dashboard/?__host=app.
 * Une URI explicite (GOOGLE_AUTH_REDIRECT_URI) vers app.* ou www.* est donc ramenée au domaine racine ; en
 * production, une URI pointant vers localhost est ignorée. Le cookie lié au state est propre à un hôte : le
 * départ (start/, link/start/) doit avoir lieu sur cet hôte.
 */
export function googleAuthRedirectUri(origin: string): string {
  const explicit = process.env.GOOGLE_AUTH_REDIRECT_URI?.trim();
  const isLoopback = (url: string) => /localhost|127\.0\.0\.1/i.test(url);
  const prodLike = process.env.NODE_ENV === "production" || process.env.APP_ENV === "production";

  let base: string;
  if (explicit && !(prodLike && isLoopback(explicit))) {
    base = explicit.replace(/\/$/, "");
  } else {
    base = (publicAppOrigin() || origin).replace(/\/$/, "");
    if (prodLike && isLoopback(base)) base = "";
  }
  if (!base) return "";

  try {
    const parsed = new URL(base.startsWith("http") ? base : `https://${base}`);
    if (FOLDED_AUTH_HOSTS.has(parsed.hostname.toLowerCase())) {
      base = `${SITE.url.replace(/\/$/, "")}${parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/$/, "")}`;
    }
  } catch {
    /* base conservée telle quelle */
  }

  const withPath = base.includes("/api/auth/google/callback")
    ? base.replace(/\/$/, "")
    : `${base}/api/auth/google/callback`;
  return `${withPath}/`;
}

// ---------------------------------------------------------------------------
// PKCE, state, nonce
// ---------------------------------------------------------------------------

const b64url = (buf: Buffer) => buf.toString("base64url");

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function constantTimeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export type PkceMaterial = {
  /** 43 caractères minimum (RFC 7636) : ici 64. */
  codeVerifier: string;
  codeChallenge: string;
  /** 256 bits. */
  state: string;
  /** 256 bits. */
  nonce: string;
};

export function generatePkceMaterial(): PkceMaterial {
  const codeVerifier = b64url(randomBytes(48));
  return {
    codeVerifier,
    codeChallenge: b64url(createHash("sha256").update(codeVerifier, "ascii").digest()),
    state: b64url(randomBytes(32)),
    nonce: b64url(randomBytes(32)),
  };
}

export function buildGoogleAuthorizationUrl(opts: {
  clientId: string;
  redirectUri: string;
  state: string;
  nonce: string;
  codeChallenge: string;
}): string {
  const url = new URL(GOOGLE_AUTH_ENDPOINT);
  url.searchParams.set("client_id", opts.clientId);
  url.searchParams.set("redirect_uri", opts.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", opts.state);
  url.searchParams.set("nonce", opts.nonce);
  url.searchParams.set("code_challenge", opts.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("prompt", "select_account");
  url.searchParams.set("include_granted_scopes", "false");
  return url.toString();
}

// ---------------------------------------------------------------------------
// Échange du code
// ---------------------------------------------------------------------------

type FetchLike = typeof fetch;

/**
 * Échange le code contre un id_token. Les jetons d'accès / de rafraîchissement éventuellement présents
 * dans la réponse sont ignorés : seul l'id_token est renvoyé.
 */
export async function exchangeGoogleCode(opts: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
  fetchImpl?: FetchLike;
}): Promise<string> {
  const credentials = googleAuthCredentials();
  if (!credentials) throw new GoogleOidcError("NOT_CONFIGURED");
  const doFetch = opts.fetchImpl ?? fetch;
  let response: Response;
  try {
    response = await doFetch(GOOGLE_TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        code: opts.code,
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        redirect_uri: opts.redirectUri,
        grant_type: "authorization_code",
        code_verifier: opts.codeVerifier,
      }).toString(),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    throw new GoogleOidcError("TOKEN_EXCHANGE_FAILED", "network");
  }
  if (!response.ok) throw new GoogleOidcError("TOKEN_EXCHANGE_FAILED", `status ${response.status}`);
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new GoogleOidcError("TOKEN_EXCHANGE_FAILED", "body");
  }
  const idToken = (body as { id_token?: unknown } | null)?.id_token;
  if (typeof idToken !== "string" || !idToken) throw new GoogleOidcError("TOKEN_EXCHANGE_FAILED", "no id_token");
  return idToken;
}

// ---------------------------------------------------------------------------
// JWKS (cache + rotation)
// ---------------------------------------------------------------------------

type CachedKey = { kid: string; key: KeyObject };
type JwksCache = { keys: Map<string, KeyObject>; expiresAt: number; fetchedAt: number };

let jwksCache: JwksCache | null = null;
let jwksInFlight: Promise<JwksCache> | null = null;

export function resetGoogleJwksCache(): void {
  jwksCache = null;
  jwksInFlight = null;
}

function ttlFromCacheControl(header: string | null): number {
  const match = header?.match(/max-age=(\d+)/i);
  if (!match) return JWKS_DEFAULT_TTL_MS;
  return Math.min(JWKS_MAX_TTL_MS, Math.max(JWKS_MIN_TTL_MS, Number(match[1]) * 1000));
}

function importJwk(jwk: unknown): CachedKey | null {
  if (!jwk || typeof jwk !== "object") return null;
  const candidate = jwk as { kty?: unknown; kid?: unknown; use?: unknown; alg?: unknown; n?: unknown; e?: unknown };
  if (candidate.kty !== "RSA" || typeof candidate.kid !== "string" || !candidate.kid) return null;
  if (candidate.use !== undefined && candidate.use !== "sig") return null;
  if (candidate.alg !== undefined && candidate.alg !== "RS256") return null;
  try {
    const key = createPublicKey({ key: candidate as NodeJsonWebKey, format: "jwk" });
    if ((key.asymmetricKeyDetails?.modulusLength ?? 0) < 2048) return null;
    return { kid: candidate.kid, key };
  } catch {
    return null;
  }
}

async function fetchJwks(doFetch: FetchLike, now: number): Promise<JwksCache> {
  let response: Response;
  try {
    response = await doFetch(GOOGLE_JWKS_URI, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    throw new GoogleOidcError("JWKS_UNAVAILABLE", "network");
  }
  if (!response.ok) throw new GoogleOidcError("JWKS_UNAVAILABLE", `status ${response.status}`);
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new GoogleOidcError("JWKS_UNAVAILABLE", "body");
  }
  const list = (body as { keys?: unknown } | null)?.keys;
  if (!Array.isArray(list)) throw new GoogleOidcError("JWKS_UNAVAILABLE", "shape");
  const keys = new Map<string, KeyObject>();
  for (const jwk of list) {
    const imported = importJwk(jwk);
    if (imported) keys.set(imported.kid, imported.key);
  }
  if (keys.size === 0) throw new GoogleOidcError("JWKS_UNAVAILABLE", "empty");
  return { keys, expiresAt: now + ttlFromCacheControl(response.headers.get("cache-control")), fetchedAt: now };
}

async function loadJwks(doFetch: FetchLike, now: number): Promise<JwksCache> {
  // Les appels simultanés partagent une seule requête réseau.
  jwksInFlight ??= fetchJwks(doFetch, now)
    .then((fresh) => {
      jwksCache = fresh;
      return fresh;
    })
    .finally(() => {
      jwksInFlight = null;
    });
  return jwksInFlight;
}

async function signingKey(kid: string, doFetch: FetchLike, now: number): Promise<KeyObject | null> {
  if (!jwksCache || jwksCache.expiresAt <= now) await loadJwks(doFetch, now);
  const cached = jwksCache?.keys.get(kid);
  if (cached) return cached;
  // Rotation : kid inconnu, un rechargement borné.
  if (jwksCache && now - jwksCache.fetchedAt >= JWKS_REFETCH_COOLDOWN_MS) {
    await loadJwks(doFetch, now);
    return jwksCache?.keys.get(kid) ?? null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Validation de l'id_token
// ---------------------------------------------------------------------------

export type GoogleIdentityClaims = {
  sub: string;
  email: string;
  name: string;
  emailVerified: true;
};

function parseSegment(segment: string): Record<string, unknown> | null {
  try {
    const value = JSON.parse(Buffer.from(segment, "base64url").toString("utf8")) as unknown;
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const invalid = (reason: string) => new GoogleOidcError("ID_TOKEN_INVALID", reason);

export async function verifyGoogleIdToken(
  idToken: string,
  opts: {
    clientId: string;
    /** SHA-256 hex du nonce émis ; seul le haché est conservé en base. */
    expectedNonceHash: string;
    nowMs?: number;
    fetchImpl?: FetchLike;
  },
): Promise<GoogleIdentityClaims> {
  if (typeof idToken !== "string" || idToken.length > MAX_ID_TOKEN_LENGTH) throw invalid("shape");
  const parts = idToken.split(".");
  if (parts.length !== 3 || parts.some((p) => !p)) throw invalid("shape");
  const [headerSeg, payloadSeg, signatureSeg] = parts;

  const header = parseSegment(headerSeg);
  const payload = parseSegment(payloadSeg);
  if (!header || !payload) throw invalid("json");
  if (header.alg !== "RS256") throw invalid("alg");
  if (typeof header.kid !== "string" || !header.kid) throw invalid("kid");

  const now = opts.nowMs ?? Date.now();
  const doFetch = opts.fetchImpl ?? fetch;
  const key = await signingKey(header.kid, doFetch, now);
  if (!key) throw invalid("kid unknown");

  let signatureOk = false;
  try {
    signatureOk = cryptoVerify(
      "sha256",
      Buffer.from(`${headerSeg}.${payloadSeg}`, "ascii"),
      key,
      Buffer.from(signatureSeg, "base64url"),
    );
  } catch {
    signatureOk = false;
  }
  if (!signatureOk) throw invalid("signature");

  if (typeof payload.iss !== "string" || !(GOOGLE_ISSUERS as readonly string[]).includes(payload.iss)) {
    throw invalid("iss");
  }

  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (audiences.length === 0 || !audiences.every((a) => typeof a === "string")) throw invalid("aud");
  if (!audiences.includes(opts.clientId)) throw invalid("aud");
  if (audiences.length > 1 && payload.azp !== opts.clientId) throw invalid("azp");
  if (payload.azp !== undefined && payload.azp !== opts.clientId) throw invalid("azp");

  const nowSec = Math.floor(now / 1000);
  const { exp, iat } = payload;
  if (typeof exp !== "number" || !Number.isFinite(exp) || exp + CLOCK_SKEW_SEC < nowSec) throw invalid("exp");
  if (typeof iat !== "number" || !Number.isFinite(iat) || iat - CLOCK_SKEW_SEC > nowSec) throw invalid("iat");

  if (typeof payload.nonce !== "string" || !payload.nonce) throw invalid("nonce");
  if (!constantTimeEqual(sha256Hex(payload.nonce), opts.expectedNonceHash)) throw invalid("nonce");

  if (payload.email_verified !== true) throw invalid("email_verified");
  const { sub, email } = payload;
  if (typeof sub !== "string" || !sub.trim() || sub.length > 255) throw invalid("sub");
  if (typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw invalid("email");
  }
  const rawName = typeof payload.name === "string" ? payload.name.trim() : "";
  const name = (rawName || email.split("@")[0]).slice(0, 80);

  return { sub, email: email.trim().toLowerCase(), name, emailVerified: true };
}
