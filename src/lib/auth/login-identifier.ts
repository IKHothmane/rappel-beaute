import { localPhoneDigits, PHONE_MAX_DIGITS } from "@/lib/validation/customer";
import { phoneLoginEnabled } from "@/lib/auth/env";

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeLoginPhone(value: string): string | null {
  if (value.length > 40 || !/^\+?[\d\s().-]+$/.test(value.trim())) return null;
  const phone = localPhoneDigits(value);
  return phone.length >= 8 && phone.length <= PHONE_MAX_DIGITS ? phone : null;
}

/** Forme d'une adresse e-mail (contrôle de forme seulement) ; sert à refuser un identifiant non e-mail. */
export function looksLikeEmail(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length <= 254 && EMAIL_SHAPE.test(trimmed);
}

/**
 * Identifiant de connexion normalisé. Quand la connexion par téléphone est désactivée
 * (AUTH_PHONE_LOGIN_ENABLED faux), le téléphone n'est plus essayé : seule l'adresse e-mail est normalisée.
 */
export function normalizeLoginIdentifier(value: string): string {
  const phone = phoneLoginEnabled() ? normalizeLoginPhone(value) : null;
  return phone ?? value.trim().toLowerCase();
}
