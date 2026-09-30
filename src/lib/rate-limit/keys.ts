import { createHmac } from "crypto";
import { getSessionSecret } from "@/lib/auth/env";

/** HMAC-SHA256 tronqué — la clé Redis ne contient pas l'e-mail ni le téléphone. */
export function identityHash(value: string): string {
  return createHmac("sha256", getSessionSecret()).update(value).digest("hex").slice(0, 32);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.slice(-9) || "unknown";
}

export function emailKey(email: string): string {
  return identityHash(normalizeEmail(email));
}

export function phoneKey(phone: string): string {
  return identityHash(normalizePhone(phone));
}
