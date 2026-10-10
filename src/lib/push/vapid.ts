import { createECDH, timingSafeEqual } from "node:crypto";
import { logger } from "@/lib/logger";

type VapidEnv = Record<string, string | undefined>;

function decodeBase64Url(value: string): Buffer | null {
  try {
    return Buffer.from(value, "base64url");
  } catch {
    return null;
  }
}

export function vapidKeyPairMatches(publicKey: string, privateKey: string): boolean {
  const pub = decodeBase64Url(publicKey.trim());
  const priv = decodeBase64Url(privateKey.trim());
  if (!pub || !priv || priv.length !== 32 || pub.length !== 65 || pub[0] !== 0x04) return false;
  try {
    const ecdh = createECDH("prime256v1");
    ecdh.setPrivateKey(priv);
    const derived = ecdh.getPublicKey();
    return derived.length === pub.length && timingSafeEqual(derived, pub);
  } catch {
    return false;
  }
}

let mismatchLogged = false;

export function vapidPublicConfig(env: VapidEnv = process.env): { configured: boolean; publicKey: string | null } {
  const publicKey = env.VAPID_PUBLIC_KEY?.trim() ?? "";
  const privateKey = env.VAPID_PRIVATE_KEY?.trim() ?? "";
  const subject = env.VAPID_SUBJECT?.trim() ?? "";
  const subjectOk = subject.startsWith("mailto:") || subject.startsWith("https://");
  const pairOk = Boolean(publicKey && privateKey && vapidKeyPairMatches(publicKey, privateKey));
  if (publicKey && privateKey && !pairOk && !mismatchLogged) {
    mismatchLogged = true;
    logger.warn("VAPID key pair does not match");
  }
  const configured = Boolean(pairOk && subjectOk);
  return { configured, publicKey: configured ? publicKey : null };
}

export function vapidCredentials(env: VapidEnv = process.env): { publicKey: string; privateKey: string; subject: string } | null {
  const config = vapidPublicConfig(env);
  if (!config.configured || !config.publicKey) return null;
  return {
    publicKey: config.publicKey,
    privateKey: env.VAPID_PRIVATE_KEY!.trim(),
    subject: env.VAPID_SUBJECT!.trim(),
  };
}
