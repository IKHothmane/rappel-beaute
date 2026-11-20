import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { deriveKey } from "@/lib/auth/crypto";
import { authKeySeparationEnabled, getEncryptionKey } from "@/lib/auth/env";

const ALGO = "aes-256-gcm";

/** Version de clé courante des formats v2 (`k1` : HKDF de ENCRYPTION_KEY, usage « token-encryption »). */
const CURRENT_KID = "k1";

/** Clé historique (v1) : SHA-256 direct de ENCRYPTION_KEY. */
function legacyKeyBytes(): Buffer {
  return createHash("sha256").update(getEncryptionKey()).digest();
}

function keyForKid(kid: string): Buffer {
  if (kid === "k1") return deriveKey(getEncryptionKey(), "token-encryption:k1");
  throw new Error("CIPHER_INVALID");
}

function aadBuffer(aad: string): Buffer {
  return Buffer.from(`rappel-beauty:secret:${aad}`, "utf8");
}

/**
 * Formats (base64url) :
 *  - `v1.<iv>.<tag>.<données>` : clé historique, sans AAD (toujours lisible) ;
 *  - `v2.<kid>.<iv>.<tag>.<données>` : clé dérivée, AAD obligatoire (ex. l'institut propriétaire) : une valeur
 *    recopiée d'un institut à l'autre ne se déchiffre plus ;
 *  - `v2u.<kid>.<iv>.<tag>.<données>` : clé dérivée, sans AAD (appelants sans contexte).
 * L'émission v2 n'a lieu que si AUTH_KEY_SEPARATION=on (voir env.ts) ; la lecture accepte toujours les trois.
 */
export function encryptSecret(plain: string, aad?: string): string {
  const iv = randomBytes(12);
  if (!authKeySeparationEnabled()) {
    const cipher = createCipheriv(ALGO, legacyKeyBytes(), iv);
    const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
    return `v1.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${enc.toString("base64url")}`;
  }
  const cipher = createCipheriv(ALGO, keyForKid(CURRENT_KID), iv);
  if (aad) cipher.setAAD(aadBuffer(aad));
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const version = aad ? "v2" : "v2u";
  return `${version}.${CURRENT_KID}.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${enc.toString("base64url")}`;
}

export function decryptSecret(stored: string, aad?: string): string {
  const parts = stored.split(".");
  const version = parts[0];
  let key: Buffer;
  let ivB64: string | undefined;
  let tagB64: string | undefined;
  let dataB64: string | undefined;
  let aadBytes: Buffer | null = null;

  if (version === "v1" && parts.length === 4) {
    key = legacyKeyBytes();
    [, ivB64, tagB64, dataB64] = parts;
  } else if ((version === "v2" || version === "v2u") && parts.length === 5) {
    key = keyForKid(parts[1]!);
    [, , ivB64, tagB64, dataB64] = parts;
    if (version === "v2") {
      // L'AAD fait partie du format : sans elle, la valeur est refusée (pas d'essai « avec puis sans »).
      if (!aad) throw new Error("CIPHER_AAD_REQUIRED");
      aadBytes = aadBuffer(aad);
    }
  } else {
    throw new Error("CIPHER_INVALID");
  }
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("CIPHER_INVALID");

  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivB64, "base64url"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  if (aadBytes) decipher.setAAD(aadBytes);
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
