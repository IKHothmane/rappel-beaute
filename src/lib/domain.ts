export type RappelDomain = "www" | "app" | "admin";

export const QUERY_HOST = "__host";
export const COOKIE_HOST = "__rappel_host";
export const HEADER_DOMAIN = "x-rappel-domain";

export function parseDomainParam(value: string | null | undefined): RappelDomain | null {
  if (value === "www" || value === "app" || value === "admin") return value;
  return null;
}

export function resolveDomainFromHostname(hostHeader: string | null): RappelDomain {
  const hostname = (hostHeader ?? "").split(":")[0].toLowerCase();

  if (
    hostname === "app.rappelbeaute.ma" ||
    hostname.startsWith("app.")
  ) {
    return "app";
  }

  if (
    hostname === "admin.rappelbeaute.ma" ||
    hostname.startsWith("admin.")
  ) {
    return "admin";
  }

  return "www";
}
