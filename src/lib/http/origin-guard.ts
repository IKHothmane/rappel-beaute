/**
 * Secret d'origine Cloudflare → Railway.
 *
 * Actif seulement si ORIGIN_SECRET est défini au build (middleware Next
 * inline les variables d'environnement). Sans cette variable, le site
 * se comporte comme avant.
 *
 * Staging actuel : l'URL publique EST *.up.railway.app (pas de Cloudflare
 * devant). Si le Host de la requête est cette URL, l'accès direct est
 * autorisé. Un autre host sans le header reste refusé.
 */
export function originAccessAllowed(
  header: string | null,
  expected: string | undefined,
  host?: string | null,
): boolean {
  if (!expected) return true;
  if (stagingHostAllowed(host)) return true;
  if (!header) return false;
  return secretsMatch(header, expected);
}

function configuredPublicHost(): string {
  const raw = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "").trim();
  if (!raw) return "";
  try {
    return new URL(raw).host.toLowerCase();
  } catch {
    return "";
  }
}

function stagingHostAllowed(host: string | null | undefined): boolean {
  const requestHost = (host ?? "").split(",")[0]?.trim().split(":")[0]?.toLowerCase() ?? "";
  const publicHost = configuredPublicHost();
  if (!requestHost || !publicHost || requestHost !== publicHost) return false;
  const appEnv = process.env.APP_ENV?.trim();
  if (appEnv === "staging") return true;
  if (!appEnv && publicHost.endsWith(".up.railway.app")) return true;
  return false;
}

function secretsMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
