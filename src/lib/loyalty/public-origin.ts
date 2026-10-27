const PUBLIC_SITE = "https://rappelbeauty.com";

/**
 * Origine des liens scannés / QR fidélité.
 * Toujours rappelbeauty.com — jamais localhost ni app.* (les clientes scannent le site public).
 */
export function cardSiteOrigin(_browserOrigin?: string | null): string {
  return PUBLIC_SITE;
}

export function loyaltyJoinUrl(token: string, _browserOrigin?: string | null): string {
  return `${PUBLIC_SITE}/carte/rejoindre/${token}/`;
}

export function requestCardOrigin(_request?: { url: string; headers: Headers }): string {
  return PUBLIC_SITE;
}
