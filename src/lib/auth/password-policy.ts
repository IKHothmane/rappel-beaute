/**
 * Politique de mot de passe des NOUVEAUX parcours (inscription e-mail, sécurisation du compte). Les routes de
 * changement de mot de passe historiques gardent leur minimum de 8 caractères.
 * Module pur (sans dépendance) : réutilisable côté interface pour l'aide à la saisie.
 */
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 200;

export type PasswordPolicyCode = "PASSWORD_TOO_SHORT" | "PASSWORD_TOO_LONG" | "PASSWORD_TOO_COMMON" | "PASSWORD_SAME_AS_EMAIL";

export const PASSWORD_POLICY_MESSAGES: Record<PasswordPolicyCode, string> = {
  PASSWORD_TOO_SHORT: `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`,
  PASSWORD_TOO_LONG: "Mot de passe trop long.",
  PASSWORD_TOO_COMMON: "Ce mot de passe est trop courant. Choisissez-en un moins prévisible.",
  PASSWORD_SAME_AS_EMAIL: "Le mot de passe ne doit pas être votre adresse e-mail.",
};

/** Mots de passe très courants (français et anglais), comparés en minuscules sans accents ni séparateurs. */
const COMMON = new Set([
  "password", "password1", "password12", "password123", "passw0rd", "motdepasse", "motdepasse1", "motdepasse123",
  "azertyuiop", "azerty123", "azerty1234", "azertyuiop1", "qwertyuiop", "qwerty123", "qwerty1234", "1234567890",
  "12345678910", "0123456789", "123456789a", "abcdefghij", "abcd123456", "iloveyou12", "iloveyou123", "welcome123",
  "bienvenue1", "bienvenue123", "admin12345", "administrator", "letmein123", "changeme123", "changeme12", "000000000000",
  "rappelbeauty", "rappelbeauty1", "rappelbeauty123", "institut123", "institut1234", "beaute12345", "marrakech123",
  "casablanca123", "maroc12345", "maroc123456", "bonjour1234", "bonjour123", "soleil1234", "doudou1234", "chouchou123",
  "football123", "princesse123", "motdepasse2024", "motdepasse2025", "motdepasse2026", "password2024", "password2025",
  "password2026", "welcome2025", "welcome2026", "monmotdepasse", "monmotdepasse1", "123qweasdzxc", "1q2w3e4r5t", "1qaz2wsx3e",
]);

const fold = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

function isTrivialPattern(folded: string): boolean {
  if (folded.length === 0) return true;
  // Un seul caractère répété, ou un motif court répété (« abababababab »).
  if (/^(.)\1+$/.test(folded)) return true;
  if (/^(.{1,3})\1{3,}$/.test(folded)) return true;
  // Suite de chiffres ou de lettres consécutifs sur toute la longueur.
  const codes = [...folded].map((c) => c.charCodeAt(0));
  const step = codes[1] - codes[0];
  if ((step === 1 || step === -1) && codes.every((c, i) => i === 0 || c - codes[i - 1] === step)) return true;
  return false;
}

/** Renvoie le code du premier défaut, ou null si le mot de passe est acceptable. */
export function checkPasswordPolicy(password: unknown, context: { email?: string | null } = {}): PasswordPolicyCode | null {
  if (typeof password !== "string") return "PASSWORD_TOO_SHORT";
  if (password.length > PASSWORD_MAX_LENGTH) return "PASSWORD_TOO_LONG";
  if (password.length < PASSWORD_MIN_LENGTH) return "PASSWORD_TOO_SHORT";
  const email = context.email?.trim().toLowerCase();
  if (email) {
    const local = email.split("@")[0] ?? "";
    if (password.trim().toLowerCase() === email || (local.length >= 6 && fold(password) === fold(local))) {
      return "PASSWORD_SAME_AS_EMAIL";
    }
  }
  const folded = fold(password);
  if (COMMON.has(folded) || isTrivialPattern(folded)) return "PASSWORD_TOO_COMMON";
  return null;
}
