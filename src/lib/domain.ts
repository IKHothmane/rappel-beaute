export type RappelDomain = "www" | "app" | "admin";

export const QUERY_HOST = "__host";
export const COOKIE_HOST = "__rappel_host";
export const HEADER_DOMAIN = "x-rappel-domain";

export function parseDomainParam(
  value: string | null | undefined,
): RappelDomain | null {
  if (value === "www" || value === "app" || value === "admin") {
    return value;
  }

  return null;
}

export function resolveDomainFromHostname(
  hostHeader: string | null,
  forwardedHostHeader?: string | null,
): RappelDomain {
  // Cloudflare Worker → X-Forwarded-Host prioritaire
  const forwardedHost = (forwardedHostHeader ?? "")
    .split(",")[0]
    .trim()
    .split(":")[0]
    .toLowerCase();

  // Host de secours
  const host = (hostHeader ?? "")
    .split(",")[0]
    .trim()
    .split(":")[0]
    .toLowerCase();

  // Priorité à X-Forwarded-Host
  const hostname = forwardedHost || host;

  if (hostname === "app.rappelbeauty.com" || hostname.startsWith("app.")) {
    return "app";
  }

  if (
    hostname === "admin.rappelbeauty.com" ||
    hostname.startsWith("admin.")
  ) {
    return "admin";
  }

  return "www";
}

/** Hostname public pour redirects (jamais *.up.railway.app si un forward existe). */
export function resolvePublicHostname(
  hostHeader: string | null,
  forwardedHostHeader?: string | null,
  rappelPublicHost?: string | null,
): string {
  const explicit = (rappelPublicHost ?? "")
    .split(",")[0]
    .trim()
    .split(":")[0]
    .toLowerCase();
  const forwarded = (forwardedHostHeader ?? "")
    .split(",")[0]
    .trim()
    .split(":")[0]
    .toLowerCase();
  const host = (hostHeader ?? "")
    .split(",")[0]
    .trim()
    .split(":")[0]
    .toLowerCase();

  return explicit || forwarded || host;
}
