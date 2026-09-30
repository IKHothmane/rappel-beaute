/**
 * Secret d'origine Cloudflare → Railway.
 *
 * Actif seulement si ORIGIN_SECRET est défini au build (middleware Next
 * inline les variables d'environnement). Sans cette variable, le site
 * se comporte comme avant.
 *
 * Cloudflare doit écraser X-Rappel-Origin (règle « Set »), sinon un client
 * peut envoyer le header lui-même en passant par le proxy.
 * Un appel direct à *.up.railway.app sans le secret reçoit 403.
 */
export function originAccessAllowed(
  header: string | null,
  expected: string | undefined,
): boolean {
  if (!expected) return true;
  if (!header) return false;
  return secretsMatch(header, expected);
}

function secretsMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
