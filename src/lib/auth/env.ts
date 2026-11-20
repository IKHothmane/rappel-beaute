/**
 * Secrets d'authentification. Module sans dépendance Node : il est importé par le middleware (Edge).
 */

/** Le secret de repli n'est toléré qu'en développement et en test explicites (jamais si NODE_ENV est absent). */
function devFallbackAllowed(): boolean {
  const env = process.env.NODE_ENV;
  return env === "development" || env === "test";
}

/** Secret racine historique : signe les anciens jetons et sert de matière première aux clés dérivées (HKDF). */
export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    if (!devFallbackAllowed()) {
      throw new Error("SESSION_SECRET must be set (min 32 chars) unless NODE_ENV is development or test.");
    }
    return "dev-only-insecure-secret-change-me-32chars";
  }
  return secret;
}

/** Clé AES pour jetons OAuth (Google Calendar). Min. 16 caractères. */
export function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 16) {
    if (!devFallbackAllowed()) {
      throw new Error("ENCRYPTION_KEY must be set (min 16 chars) unless NODE_ENV is development or test.");
    }
    return "dev-only-encryption-key-16";
  }
  return key;
}

/** Sel HKDF commun (l'info propre à chaque usage sépare les clés). */
export const HKDF_SALT = "rappel-beauty/hkdf/v1";
export const JWT_ISSUER = "rappel-beauty";
export const JWT_KID_PREFIX = "rb1:";

/** Identifiant de clé porté par l'en-tête JWT : `rb1:<usage>`. */
export function jwtKidFor(purpose: string): string {
  return `${JWT_KID_PREFIX}${purpose}`;
}

export function jwtAudienceFor(purpose: string): string {
  return `rappel:${purpose}`;
}

export function hkdfInfoFor(purpose: string): string {
  return `rappel-beauty:${purpose}:v1`;
}

/**
 * Séparation des clés par usage (jetons de session signés avec une clé dérivée, chiffrement v2 des jetons Google).
 * Lecture : TOUJOURS acceptée (anciennes et nouvelles valeurs). Émission : désactivée tant que AUTH_KEY_SEPARATION
 * n'est pas "on", afin qu'un déploiement progressif (ou un retour arrière) ne fasse jamais lire un jeton que
 * l'ancienne version ne sait pas vérifier. Procédure : déployer, vérifier, puis passer la variable à "on".
 */
export function authKeySeparationEnabled(): boolean {
  return process.env.AUTH_KEY_SEPARATION?.trim().toLowerCase() === "on";
}

/** Fin de la période de transition : "false" refuse les jetons de session signés avec la clé historique. */
export function legacySessionKeyAccepted(): boolean {
  return process.env.AUTH_ACCEPT_LEGACY_SESSION_KEY?.trim().toLowerCase() !== "false";
}

/**
 * Connexion et inscription par numéro de téléphone (WhatsApp) : VRAI par défaut pour ne rien casser.
 * "false", "0", "off" ou "no" (insensible à la casse) la désactive : le téléphone reste un contact métier
 * (Organization.phone, User.phone) mais n'est plus un identifiant ni un moyen de récupération.
 */
export function phoneLoginEnabled(): boolean {
  const raw = process.env.AUTH_PHONE_LOGIN_ENABLED?.trim().toLowerCase();
  return !(raw === "false" || raw === "0" || raw === "off" || raw === "no");
}
