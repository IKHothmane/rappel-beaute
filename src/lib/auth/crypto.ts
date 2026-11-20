import { createHmac, hkdfSync, randomBytes, scrypt, scryptSync, timingSafeEqual } from "crypto";
import {
  authKeySeparationEnabled,
  getSessionSecret,
  HKDF_SALT,
  hkdfInfoFor,
  jwtAudienceFor,
  JWT_ISSUER,
  JWT_KID_PREFIX,
  jwtKidFor,
} from "./env";

export { getSessionSecret } from "./env";

/**
 * Mots de passe : scrypt. Deux formats lus :
 *  - historique `<sel>:<haché>` (N=2^14, r=8, p=1, 64 octets) ;
 *  - `scrypt$<log2 N>$<r>$<p>$<sel>$<haché>` : les paramètres voyagent avec le haché, ce qui permet de
 *    relever le coût plus tard sans casser les hachés existants.
 * hashPassword / verifyPassword (synchrones) restent pour les appelants historiques ; ils bloquent la boucle
 * d'événements, le code d'authentification utilise les variantes Async.
 */
const LEGACY_SCRYPT = { N: 16384, r: 8, p: 1 } as const;
const KEY_LEN = 64;
const SALT_BYTES = 16;
const SCRYPT_PREFIX = "scrypt$";

type ScryptParams = { logN: number; r: number; p: number };

/** Coût cible (OWASP : N=2^17, r=8, p=1). AUTH_SCRYPT_LOG_N (14 à 18) l'ajuste si la mémoire de l'hôte l'impose. */
export function targetScryptParams(): ScryptParams {
  const raw = Number(process.env.AUTH_SCRYPT_LOG_N);
  const logN = Number.isInteger(raw) && raw >= 14 && raw <= 18 ? raw : 17;
  return { logN, r: 8, p: 1 };
}

function scryptOptions(params: ScryptParams) {
  const N = 2 ** params.logN;
  // Node refuse N*r*128 octets au-delà de maxmem (32 Mo par défaut) : marge pour p et les tampons.
  return { N, r: params.r, p: params.p, maxmem: 192 * N * params.r };
}

type ParsedHash = { kind: "legacy" | "v2"; params: ScryptParams; salt: string; hash: Buffer };

function parseStoredHash(stored: string): ParsedHash | null {
  if (typeof stored !== "string") return null;
  if (stored.startsWith(SCRYPT_PREFIX)) {
    const [, logN, r, p, salt, hex] = stored.split("$");
    const params = { logN: Number(logN), r: Number(r), p: Number(p) };
    // Bornes : un haché injecté en base ne doit pas pouvoir imposer un coût démesuré.
    if (
      !Number.isInteger(params.logN) || params.logN < 10 || params.logN > 18 ||
      !Number.isInteger(params.r) || params.r < 1 || params.r > 16 ||
      !Number.isInteger(params.p) || params.p < 1 || params.p > 4 ||
      !salt || !/^[0-9a-f]{16,128}$/.test(salt) || !hex || !/^[0-9a-f]{32,256}$/.test(hex)
    ) {
      return null;
    }
    return { kind: "v2", params, salt, hash: Buffer.from(hex, "hex") };
  }
  const [salt, expected] = stored.split(":");
  if (!salt || !expected) return null;
  return {
    kind: "legacy",
    params: { logN: Math.log2(LEGACY_SCRYPT.N), r: LEGACY_SCRYPT.r, p: LEGACY_SCRYPT.p },
    salt,
    hash: Buffer.from(expected, "hex"),
  };
}

function formatHash(params: ScryptParams, salt: string, hash: Buffer): string {
  return `${SCRYPT_PREFIX}${params.logN}$${params.r}$${params.p}$${salt}$${hash.toString("hex")}`;
}

/** Hachage synchrone au format historique (appelants non migrés). Un re-hachage transparent le relève à la connexion. */
export function hashPassword(plain: string): string {
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const hash = scryptSync(plain, salt, KEY_LEN, LEGACY_SCRYPT).toString("hex");
  return `${salt}:${hash}`;
}

/** Vérification synchrone (formats historique et paramétré), comparaison à temps constant. */
export function verifyPassword(plain: string, stored: string): boolean {
  const parsed = parseStoredHash(stored);
  if (!parsed) return false;
  const hash = scryptSync(plain, parsed.salt, parsed.hash.length, scryptOptions(parsed.params));
  if (hash.length !== parsed.hash.length) return false;
  return timingSafeEqual(hash, parsed.hash);
}

/**
 * scrypt N=2^17 occupe ~134 Mo hors du tas : le nombre de calculs simultanés est borné (1 par défaut, le tampon
 * UV_THREADPOOL_SIZE de production est de 2) ; les suivants attendent leur tour.
 */
let activeScrypt = 0;
const scryptWaiters: Array<() => void> = [];
function scryptConcurrency(): number {
  const raw = Number(process.env.AUTH_SCRYPT_CONCURRENCY);
  return Number.isInteger(raw) && raw >= 1 && raw <= 8 ? raw : 1;
}
function scryptMaxQueue(): number {
  const raw = Number(process.env.AUTH_SCRYPT_MAX_QUEUE);
  return Number.isInteger(raw) && raw >= 0 && raw <= 1000 ? raw : 32;
}

/** File d'attente pleine : mieux vaut répondre « réessayez » que laisser une rafale affamer les vraies connexions. */
export class PasswordCheckBusyError extends Error {
  readonly code = "AUTH_BUSY";
  constructor() {
    super("PASSWORD_CHECK_BUSY");
    this.name = "PasswordCheckBusyError";
  }
}

async function acquireScryptSlot(): Promise<void> {
  if (activeScrypt < scryptConcurrency()) {
    activeScrypt += 1;
    return;
  }
  if (scryptWaiters.length >= scryptMaxQueue()) throw new PasswordCheckBusyError();
  await new Promise<void>((resolve) => scryptWaiters.push(resolve));
}
function releaseScryptSlot(): void {
  const next = scryptWaiters.shift();
  if (next) next(); // le créneau est transmis tel quel
  else activeScrypt -= 1;
}

async function scryptAsync(plain: string, salt: string, keyLen: number, params: ScryptParams): Promise<Buffer> {
  await acquireScryptSlot();
  try {
    return await new Promise<Buffer>((resolve, reject) => {
      scrypt(plain, salt, keyLen, scryptOptions(params), (error, key) => (error ? reject(error) : resolve(key)));
    });
  } finally {
    releaseScryptSlot();
  }
}

export async function hashPasswordAsync(plain: string, params: ScryptParams = targetScryptParams()): Promise<string> {
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const hash = await scryptAsync(plain, salt, KEY_LEN, params);
  return formatHash(params, salt, hash);
}

export async function verifyPasswordAsync(plain: string, stored: string): Promise<boolean> {
  const parsed = parseStoredHash(stored);
  if (!parsed) return false;
  const hash = await scryptAsync(plain, parsed.salt, parsed.hash.length, parsed.params);
  if (hash.length !== parsed.hash.length) return false;
  return timingSafeEqual(hash, parsed.hash);
}

/** true si le haché est au format historique ou porte un coût inférieur à la cible courante. */
export function passwordNeedsRehash(stored: string): boolean {
  const parsed = parseStoredHash(stored);
  if (!parsed) return false;
  if (parsed.kind === "legacy") return true;
  const target = targetScryptParams();
  return parsed.params.logN < target.logN || parsed.params.r < target.r || parsed.params.p < target.p;
}

/** Coût historique (N=2^14) : celui de tous les hachés existants tant qu'ils n'ont pas été re-hachés. */
const LEGACY_PARAMS: ScryptParams = { logN: Math.log2(LEGACY_SCRYPT.N), r: LEGACY_SCRYPT.r, p: LEGACY_SCRYPT.p };

const dummyHashes = new Map<string, Promise<string>>();
/** Haché factice d'une classe de coût (« legacy » ou « target »), calculé une fois. */
function getDummyHash(kind: "legacy" | "target"): Promise<string> {
  const params = kind === "legacy" ? LEGACY_PARAMS : targetScryptParams();
  const key = `${kind}.${params.logN}.${params.r}.${params.p}`;
  let cached = dummyHashes.get(key);
  if (!cached) {
    cached = hashPasswordAsync(randomBytes(24).toString("hex"), params);
    // Un échec (file pleine) ne doit pas rester en cache.
    cached.catch(() => dummyHashes.delete(key));
    dummyHashes.set(key, cached);
  }
  return cached;
}

async function burnClass(plain: string, kind: "legacy" | "target"): Promise<void> {
  await verifyPasswordAsync(typeof plain === "string" ? plain : "", await getDummyHash(kind));
}

/** Classe de coût d'un haché : « target » s'il atteint le coût courant, sinon « legacy » (historique ou plus faible). */
function costClassOf(parsed: ParsedHash | null): "legacy" | "target" | null {
  if (!parsed) return null;
  const target = targetScryptParams();
  return parsed.params.logN >= target.logN && parsed.params.r >= target.r ? "target" : "legacy";
}

/**
 * Vérification à coût uniforme. Un refus coûte TOUJOURS une opération de classe historique ET une de classe courante,
 * que le compte existe (haché historique ou relevé), soit absent, inactif ou sans mot de passe : pendant la
 * transition, un compte existant (haché à N=2^14) ne répond donc pas plus vite qu'un compte inconnu (haché factice
 * à N=2^17). Un succès rend la main dès la vérification réelle.
 * `stored` = null : aucun haché comparable, uniquement les opérations factices ; renvoie false.
 */
export async function checkPasswordUniform(plain: string, stored: string | null | undefined): Promise<boolean> {
  const parsed = stored ? parseStoredHash(stored) : null;
  const realClass = costClassOf(parsed);
  if (parsed && stored && (await verifyPasswordAsync(plain, stored))) return true;
  if (realClass !== "legacy") await burnClass(plain, "legacy");
  if (realClass !== "target") await burnClass(plain, "target");
  return false;
}

/** À appeler quand aucun haché réel n'est comparable (compte absent, désactivé, institut inactif, sans mot de passe). */
export async function burnPasswordCheck(plain: string): Promise<void> {
  await checkPasswordUniform(plain, null);
}

/**
 * Mot de passe temporaire lisible (jamais stocké en clair — uniquement renvoyé une fois à l'admin).
 * Ex. : Rb-84Kp!29Xm
 */
export function generateTemporaryPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%&*";
  const all = upper + lower + digits + symbols;

  const pick = (alphabet: string) => alphabet[randomBytes(1)[0]! % alphabet.length]!;

  const required = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  const rest: string[] = [];
  for (let i = 0; i < 8; i++) rest.push(pick(all));

  const chars = [...required, ...rest];
  // Fisher–Yates via crypto
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomBytes(1)[0]! % (i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }

  return `${chars.slice(0, 2).join("")}-${chars.slice(2, 6).join("")}${chars.slice(6, 8).join("")}${chars.slice(8).join("")}`;
}

/** PIN à 6 chiffres pour l'inscription publique (e-mail → connexion → changer MDP). */
export function generateSignupPin(): string {
  const digits: string[] = [];
  while (digits.length < 6) {
    const byte = randomBytes(1)[0]!;
    if (byte < 250) digits.push(String(byte % 10));
  }
  return digits.join("");
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64");
}

/** Clé de 32 octets propre à un usage, dérivée du secret racine par HKDF-SHA256 (RFC 5869). */
export function deriveKey(rootSecret: string, purpose: string): Buffer {
  return Buffer.from(hkdfSync("sha256", rootSecret, Buffer.from(HKDF_SALT), Buffer.from(hkdfInfoFor(purpose)), 32));
}

/** JWT HS256 signé directement avec le secret fourni (jetons historiques ; aucun claim de séparation). */
export function signJwt(payload: Record<string, unknown>, secret: string, expiresInSec: number): string {
  return signWith(payload, secret, expiresInSec, { alg: "HS256", typ: "JWT" });
}

function signWith(
  payload: Record<string, unknown>,
  key: string | Buffer,
  expiresInSec: number,
  header: Record<string, unknown>,
): string {
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + expiresInSec };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(body));
  const data = `${encodedHeader}.${encodedPayload}`;
  const sig = createHmac("sha256", key).update(data).digest();
  return `${data}.${base64UrlEncode(sig)}`;
}

/**
 * JWT signé avec la clé dérivée de l'usage `purpose` (en-tête `kid: rb1:<usage>`) et portant `iss`, `aud`, `typ`.
 * Un jeton émis pour un usage n'est jamais accepté pour un autre.
 */
export function signJwtDerived(
  payload: Record<string, unknown>,
  rootSecret: string,
  purpose: string,
  expiresInSec: number,
): string {
  return signWith(
    { ...payload, iss: JWT_ISSUER, aud: jwtAudienceFor(purpose), typ: purpose },
    deriveKey(rootSecret, purpose),
    expiresInSec,
    { alg: "HS256", typ: "JWT", kid: jwtKidFor(purpose) },
  );
}

/**
 * Jeton de session. Les claims `typ`/`aud`/`iss` sont toujours présents. Tant que AUTH_KEY_SEPARATION n'est pas
 * "on", la signature reste celle de la clé historique (les instances plus anciennes, le middleware compris,
 * lisent encore ces jetons) ; ensuite la clé dérivée « session » est utilisée.
 */
export function signSessionJwt(payload: Record<string, unknown>, expiresInSec: number): string {
  const secret = getSessionSecret();
  if (authKeySeparationEnabled()) return signJwtDerived(payload, secret, "session", expiresInSec);
  return signJwt({ ...payload, iss: JWT_ISSUER, aud: jwtAudienceFor("session"), typ: "session" }, secret, expiresInSec);
}

export type VerifyJwtOptions = {
  /** Usage attendu pour un jeton à clé dérivée (« session » par défaut). */
  purpose?: string;
  /** false : refuse les jetons signés avec le secret brut (anciens jetons). */
  allowLegacy?: boolean;
};

export function verifyJwt<T extends Record<string, unknown>>(
  token: string,
  secret: string,
  options: VerifyJwtOptions = {},
): T | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [encodedHeader, encodedPayload, encodedSig] = parts;

  let kid: string | undefined;
  try {
    const header = JSON.parse(base64UrlDecode(encodedHeader).toString("utf8")) as { kid?: unknown };
    if (typeof header.kid === "string") kid = header.kid;
  } catch {
    return null;
  }

  const expectedPurpose = options.purpose ?? "session";
  let key: string | Buffer;
  if (kid !== undefined) {
    if (!kid.startsWith(JWT_KID_PREFIX) || kid.slice(JWT_KID_PREFIX.length) !== expectedPurpose) return null;
    key = deriveKey(secret, expectedPurpose);
  } else {
    if (options.allowLegacy === false) return null;
    key = secret;
  }

  const data = `${encodedHeader}.${encodedPayload}`;
  const expected = createHmac("sha256", key).update(data).digest();
  const actual = base64UrlDecode(encodedSig);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null;
  }
  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload).toString("utf8")) as T & {
      exp?: number;
      iss?: unknown;
      aud?: unknown;
      typ?: unknown;
    };
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (
      kid !== undefined &&
      (payload.iss !== JWT_ISSUER || payload.aud !== jwtAudienceFor(expectedPurpose) || payload.typ !== expectedPurpose)
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
