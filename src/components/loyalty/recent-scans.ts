/**
 * Derniers customerId scannés / sélectionnés sur la page fidélité, conservés dans
 * `localStorage` (par navigateur et par institut) pour garder l'ordre « scannées en
 * haut » après un rechargement. Seuls des identifiants sont stockés : aucune donnée
 * personnelle. Tout accès est protégé (stockage indisponible, JSON corrompu, SSR).
 */

/** Nombre maximal d'ids conservés (aligné sur le plafond `pin` de l'API). */
export const RECENT_SCANS_MAX = 20;

const KEY_PREFIX = "rb:loyalty:recent-scans:";
const MAX_ID_LENGTH = 64;

function storageKey(orgId?: string | null) {
  const scope = typeof orgId === "string" ? orgId.trim() : "";
  return `${KEY_PREFIX}${scope || "default"}`;
}

function sanitize(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const id = entry.trim();
    if (!id || id.length > MAX_ID_LENGTH || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
    if (ids.length >= RECENT_SCANS_MAX) break;
  }
  return ids;
}

/** Ids scannés, du plus récent au plus ancien. Retourne `[]` si le stockage est indisponible. */
export function readRecentScans(orgId?: string | null): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(orgId));
    return raw ? sanitize(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

/** Place `customerId` en tête (dédoublonné, borné) et persiste. Retourne la liste résultante. */
export function rememberRecentScan(orgId: string | null | undefined, customerId: string): string[] {
  const id = typeof customerId === "string" ? customerId.trim() : "";
  const current = readRecentScans(orgId);
  if (!id) return current;
  const next = sanitize([id, ...current]);
  if (typeof window === "undefined") return next;
  try {
    window.localStorage.setItem(storageKey(orgId), JSON.stringify(next));
  } catch {
    // Quota dépassé, navigation privée, stockage bloqué : l'ordre reste valable pour la session.
  }
  return next;
}
