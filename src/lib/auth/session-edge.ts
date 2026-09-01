import { getSessionSecret } from "./env";
import type { SessionPayload, SessionUser } from "./types";
import { payloadToSession } from "./session-payload";

function base64UrlToBytes(input: string): Uint8Array {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** JWT verify via Web Crypto — compatible Edge middleware */
export async function verifyJwtEdge<T extends Record<string, unknown>>(
  token: string,
  secret: string,
): Promise<T | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, encodedSig] = parts;
  const data = `${encodedHeader}.${encodedPayload}`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    base64UrlToBytes(encodedSig),
    new TextEncoder().encode(data),
  );
  if (!valid) return null;

  try {
    const json = new TextDecoder().decode(base64UrlToBytes(encodedPayload));
    const payload = JSON.parse(json) as T & { exp?: number };
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function parseSessionTokenEdge(token: string): Promise<SessionUser | null> {
  const payload = await verifyJwtEdge<SessionPayload>(token, getSessionSecret());
  if (!payload) return null;
  return payloadToSession(payload);
}
