const PUBLIC_SITE = "https://rappelbeauty.com";

function hostnameOf(value: string): string {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function isLoopback(host: string): boolean {
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".localhost");
}

/** Origine des liens scannés. /carte/ est servi sur rappelbeauty.com, jamais sur localhost. */
export function cardSiteOrigin(browserOrigin?: string | null): string {
  const raw = (browserOrigin || "").trim().replace(/\/$/, "");
  const host = raw ? hostnameOf(raw) : "";
  if (!host || isLoopback(host)) return PUBLIC_SITE;
  if (host === "rappelbeauty.com" || host.endsWith(".rappelbeauty.com")) return PUBLIC_SITE;
  return raw;
}

export function loyaltyJoinUrl(token: string, browserOrigin?: string | null): string {
  return `${cardSiteOrigin(browserOrigin)}/carte/rejoindre/${token}/`;
}

export function requestCardOrigin(request: { url: string; headers: Headers }): string {
  const forwarded =
    request.headers.get("x-rappel-public-host") ||
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "";
  const host = forwarded.split(",")[0]?.trim().split(":")[0]?.toLowerCase() ?? "";
  if (!host || isLoopback(host)) return cardSiteOrigin(new URL(request.url).origin);
  const proto = request.headers.get("x-forwarded-proto") === "http" ? "http" : "https";
  return cardSiteOrigin(`${proto}://${host}`);
}
