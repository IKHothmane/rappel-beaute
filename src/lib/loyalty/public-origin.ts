const PUBLIC_SITE = "https://rappelbeauty.com";

/**
 * Origine des liens scannés / QR fidélité.
 * Toujours rappelbeauty.com — jamais localhost ni app.* (les clientes scannent le site public).
 */
export function cardSiteOrigin(_browserOrigin?: string | null): string {
  return PUBLIC_SITE;
}

export function loyaltyJoinUrl(token: string, _browserOrigin?: string | null): string {
  const t = token.trim().toUpperCase();
  return `${PUBLIC_SITE}/carte/rejoindre/${t}/`;
}

/** Page publique d'une carte (jamais request.url / localhost). */
export function loyaltyCardUrl(token: string): string {
  const t = token.trim().toUpperCase();
  return `${PUBLIC_SITE}/carte/${t}/`;
}

/** QR « ajouter au Wallet » (Google / Apple via /google/). */
export function loyaltyCardWalletUrl(token: string): string {
  return `${loyaltyCardUrl(token)}google/`;
}

export function requestCardOrigin(_request?: { url: string; headers: Headers }): string {
  return PUBLIC_SITE;
}
