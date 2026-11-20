import {
  getSessionSecret,
  HKDF_SALT,
  hkdfInfoFor,
  jwtAudienceFor,
  JWT_ISSUER,
  JWT_KID_PREFIX,
  legacySessionKeyAccepted,
} from "./env";
import type { SessionPayload, SessionUser } from "./types";
import { payloadToSession } from "./session-payload";

function base64UrlToBytes(input: string): Uint8Array<ArrayBuffer> {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const binary = atob(b64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Même dérivation HKDF-SHA256 que `deriveKey` (Node) : clé de 32 octets propre à l'usage. */
async function deriveHmacKey(secret: string, purpose: string): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new TextEncoder().encode(HKDF_SALT),
      info: new TextEncoder().encode(hkdfInfoFor(purpose)),
    },
    base,
    256,
  );
  return crypto.subtle.importKey("raw", bits, { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
}

export type VerifyJwtEdgeOptions = { purpose?: string; allowLegacy?: boolean };

/** JWT verify via Web Crypto — compatible Edge middleware. Lit les jetons à clé historique et à clé dérivée. */
export async function verifyJwtEdge<T extends Record<string, unknown>>(
  token: string,
  secret: string,
  options: VerifyJwtEdgeOptions = {},
): Promise<T | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, encodedSig] = parts;
  const data = `${encodedHeader}.${encodedPayload}`;

  let kid: string | undefined;
  try {
    const header = JSON.parse(new TextDecoder().decode(base64UrlToBytes(encodedHeader))) as { kid?: unknown };
    if (typeof header.kid === "string") kid = header.kid;
  } catch {
    return null;
  }

  const expectedPurpose = options.purpose ?? "session";
  let key: CryptoKey;
  if (kid !== undefined) {
    if (!kid.startsWith(JWT_KID_PREFIX) || kid.slice(JWT_KID_PREFIX.length) !== expectedPurpose) return null;
    key = await deriveHmacKey(secret, expectedPurpose);
  } else {
    if (options.allowLegacy === false) return null;
    key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
  }

  const valid = await crypto.subtle.verify("HMAC", key, base64UrlToBytes(encodedSig), new TextEncoder().encode(data));
  if (!valid) return null;

  try {
    const json = new TextDecoder().decode(base64UrlToBytes(encodedPayload));
    const payload = JSON.parse(json) as T & { exp?: number; iss?: unknown; aud?: unknown; typ?: unknown };
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

export async function parseSessionTokenEdge(token: string): Promise<SessionUser | null> {
  const payload = await verifyJwtEdge<SessionPayload>(token, getSessionSecret(), {
    allowLegacy: legacySessionKeyAccepted(),
  });
  if (!payload) return null;
  return payloadToSession(payload);
}
