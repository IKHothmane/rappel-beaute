/**
 * Authentification récente : actions sensibles d'un compte sans mot de passe (utilisateur Google). Le jeton de
 * session porte `authAt` (instant, en secondes, de l'authentification d'origine ; conservé aux renouvellements). Un
 * ancien jeton sans `authAt` n'est jamais considéré comme récent.
 */
export const REAUTH_MAX_AGE_SEC = 10 * 60;

export function isRecentlyAuthenticated(authAt: number | undefined, nowSec = Math.floor(Date.now() / 1000)): boolean {
  return typeof authAt === "number" && Number.isFinite(authAt) && authAt <= nowSec + 60 && nowSec - authAt < REAUTH_MAX_AGE_SEC;
}
