/** Fond par défaut des cartes fidélité (public/). */
const DEFAULT_LOYALTY_CARD_BACKGROUND = "/loyalty/fond-bordeaux.webp";

function resolveLoyaltyCardBackground(url?: string | null): string {
  const trimmed = url?.trim();
  if (!trimmed || trimmed.endsWith("/fond-bordeaux.png")) return DEFAULT_LOYALTY_CARD_BACKGROUND;
  return trimmed;
}

export function loyaltyCardBackgroundStyle(url?: string | null): string {
  const resolved = resolveLoyaltyCardBackground(url);
  return `linear-gradient(180deg, rgba(18, 8, 12, 0.2), rgba(18, 8, 12, 0.35)), url("${resolved}") center / cover no-repeat`;
}
