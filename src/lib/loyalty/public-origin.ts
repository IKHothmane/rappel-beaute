const PUBLIC_SITE = "https://rappelbeauty.com";

/** Local preview only; distributed QR and Wallet links keep their public origin. */
export function loyaltyPreviewUrl(publicUrl: string, browserOrigin?: string | null): string {
  if (process.env.NODE_ENV !== "development" || !browserOrigin) return publicUrl;
  try {
    const origin = new URL(browserOrigin);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname) && !origin.hostname.endsWith(".localhost")) return publicUrl;
    if (origin.protocol !== "http:" && origin.protocol !== "https:") return publicUrl;
    const target = new URL(publicUrl);
    return new URL(`${target.pathname}${target.search}${target.hash}`, origin.origin).toString();
  } catch {
    return publicUrl;
  }
}

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

export function requestCardOrigin(_request?: { url: string; headers: Headers }): string {
  return PUBLIC_SITE;
}
