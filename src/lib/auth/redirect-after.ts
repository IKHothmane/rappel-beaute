const REDIRECT_MAX = 512;

/**
 * Liste blanche : un seul « / » initial, pas de « // », pas d'antislash, pas de schéma, pas de caractère de
 * contrôle, pas de séquence encodée de « / » ou « \ » en tête, pas d'API ni de ressource interne Next.
 * Renvoie null si le chemin n'est pas accepté.
 */
export function sanitizeRedirectAfter(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value || value.length > REDIRECT_MAX) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  if (value.includes("\\")) return null;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f\s]/.test(value)) return null;
  const decoded = (() => {
    try {
      return decodeURIComponent(value);
    } catch {
      return null;
    }
  })();
  if (decoded === null) return null;
  if (decoded.startsWith("//") || decoded.includes("\\") || /^\/+[a-z][a-z0-9+.-]*:/i.test(decoded)) return null;
  let parsed: URL;
  try {
    parsed = new URL(value, "http://rb.invalid");
  } catch {
    return null;
  }
  if (parsed.origin !== "http://rb.invalid") return null;
  if (!/^\/[a-z0-9][a-z0-9\-_/]*$/i.test(parsed.pathname) && parsed.pathname !== "/") return null;
  if (/^\/(api|_next|domains)(\/|$)/i.test(parsed.pathname)) return null;
  return value;
}

