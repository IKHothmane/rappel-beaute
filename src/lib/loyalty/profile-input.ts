export const LOYALTY_NAME_MAX_LENGTH = 80;
export const LOYALTY_PHONE_MAX_LENGTH = 32;
export const LOYALTY_COMMENT_MAX_LENGTH = 800;

/** Accept local and international formats without imposing a country's digit count. */
export function validLoyaltyPhone(value: string) {
  return value.length <= LOYALTY_PHONE_MAX_LENGTH && /^\+?[\d\s().-]+$/.test(value.trim()) && /\d/.test(value);
}

export function normalizeLoyaltyPhone(value: string) {
  const trimmed = value.trim();
  return `${trimmed.startsWith("+") ? "+" : ""}${trimmed.replace(/\D/g, "")}`;
}
