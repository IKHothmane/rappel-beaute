/** Liens admin sur domaine apex (rappelbeauty.com / localhost) : conserver ?__host=admin. */
export function adminHref(href: string): string {
  const [pathAndQuery, hash] = href.split("#");
  const u = new URL(pathAndQuery || "/", "https://local.invalid");
  u.searchParams.set("__host", "admin");
  return `${u.pathname}${u.search}${hash ? `#${hash}` : ""}`;
}
