/** Lien public de réservation. Le mini-site (vitrine, catalogue, panier) n’existe plus. */

export function bookHref(slug: string, path = "") {
  const base = `/book/${encodeURIComponent(slug)}`;
  if (!path || path === "/") return `${base}/`;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p.endsWith("/") || p.includes("?") ? p : `${p}/`}`;
}
