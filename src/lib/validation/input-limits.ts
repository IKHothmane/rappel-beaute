/** Limites de saisie partagées (formulaires institut). */

export const NAME_MAX = 40;
export const TITLE_MAX = 80;
export const EMAIL_MAX = 120;
export const POSITION_MAX = 60;
export const SEARCH_MAX = 40;
export const PROMO_CODE_MAX = 16;
export const PRICE_MAX_DIGITS = 8;
export const NOTES_MAX = 200;
export const DESCRIPTION_MAX = 500;
export const ADDRESS_MAX = 200;
export const DURATION_MAX_DIGITS = 4;
export const QTY_MAX_DIGITS = 6;

/** Lettres, espaces, tirets, apostrophes. */
export function limitName(raw: string, max = NAME_MAX): string {
  return raw
    .replace(/[^\p{L}\p{M}\s'-]/gu, "")
    .replace(/\s{2,}/g, " ")
    .slice(0, max);
}

/** Caractères autorisés pour un e-mail. */
export function limitEmail(raw: string, max = EMAIL_MAX): string {
  return raw.replace(/[^\w.@+-]/g, "").slice(0, max);
}

/** Poste / rôle (lettres + espaces + ponctuation légère). */
export function limitPosition(raw: string, max = POSITION_MAX): string {
  return raw
    .replace(/[^\p{L}\p{M}\s'.\-/]/gu, "")
    .replace(/\s{2,}/g, " ")
    .slice(0, max);
}

/** Recherche libre courte. */
export function limitSearch(raw: string, max = SEARCH_MAX): string {
  return raw.replace(/\s{2,}/g, " ").slice(0, max);
}

/** Prix MAD — chiffres uniquement. */
export function limitPriceDigits(raw: string, max = PRICE_MAX_DIGITS): string {
  return raw.replace(/\D/g, "").slice(0, max);
}

/** Code promo — majuscules alphanumériques. */
export function limitPromoCode(raw: string, max = PROMO_CODE_MAX): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, max);
}

/** Notes libres. */
export function limitNotes(raw: string, max = NOTES_MAX): string {
  return raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").slice(0, max);
}

/** Titre produit / service / ressource (lettres, chiffres, ponctuation légère). */
export function limitTitle(raw: string, max = TITLE_MAX): string {
  return raw
    .replace(/[^\p{L}\p{M}\p{N}\s'.\-/&%°]/gu, "")
    .replace(/\s{2,}/g, " ")
    .slice(0, max);
}

/** Description libre. */
export function limitDescription(raw: string, max = DESCRIPTION_MAX): string {
  return raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").slice(0, max);
}

/** Adresse. */
export function limitAddress(raw: string, max = ADDRESS_MAX): string {
  return raw.replace(/\s{2,}/g, " ").slice(0, max);
}

/** Durée en minutes — chiffres. */
export function limitDurationDigits(raw: string, max = DURATION_MAX_DIGITS): string {
  return raw.replace(/\D/g, "").slice(0, max);
}

/** Quantité — chiffres. */
export function limitQtyDigits(raw: string, max = QTY_MAX_DIGITS): string {
  return raw.replace(/\D/g, "").slice(0, max);
}

/** Décimal MAD (virgule) — digits + une virgule, longueur bornée. */
export function limitDecimalInput(raw: string, maxDigits = PRICE_MAX_DIGITS): string {
  const cleaned = raw.replace(/\s/g, "").replace(/\./g, ",").replace(/[^\d,]/g, "");
  const comma = cleaned.indexOf(",");
  if (comma === -1) return cleaned.slice(0, maxDigits);
  const intPart = cleaned.slice(0, comma).slice(0, maxDigits);
  const decPart = cleaned.slice(comma + 1).replace(/,/g, "").slice(0, 3);
  return `${intPart},${decPart}`;
}
