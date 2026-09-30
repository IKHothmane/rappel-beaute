export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET must be set (min 32 chars) in production.");
    }
    return "dev-only-insecure-secret-change-me-32chars";
  }
  return secret;
}

/** Clé AES pour jetons OAuth (Google Calendar). Min. 16 caractères. */
export function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ENCRYPTION_KEY must be set (min 16 chars) in production.");
    }
    return "dev-only-encryption-key-16";
  }
  return key;
}
