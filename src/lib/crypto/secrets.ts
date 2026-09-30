import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { getEncryptionKey } from "@/lib/auth/env";

const ALGO = "aes-256-gcm";

function keyBytes(): Buffer {
  return createHash("sha256").update(getEncryptionKey()).digest();
}

/** AES-256-GCM : `v1.<iv>.<tag>.<ciphertext>` (base64url). */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, keyBytes(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${enc.toString("base64url")}`;
}

export function decryptSecret(stored: string): string {
  const [version, ivB64, tagB64, dataB64] = stored.split(".");
  if (version !== "v1" || !ivB64 || !tagB64 || !dataB64) {
    throw new Error("CIPHER_INVALID");
  }
  const decipher = createDecipheriv(ALGO, keyBytes(), Buffer.from(ivB64, "base64url"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
