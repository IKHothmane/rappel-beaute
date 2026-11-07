/** Fond par défaut des cartes fidélité (public/). */
export const DEFAULT_LOYALTY_CARD_BACKGROUND = "/loyalty/institut-royal.png";

export function resolveLoyaltyCardBackground(url?: string | null): string {
  const trimmed = url?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_LOYALTY_CARD_BACKGROUND;
}

export function loyaltyCardBackgroundStyle(url?: string | null): string {
  const resolved = resolveLoyaltyCardBackground(url);
  return `linear-gradient(180deg, rgba(18, 8, 12, 0.2), rgba(18, 8, 12, 0.35)), url("${resolved}") center / cover no-repeat`;
}
