import { localPhoneDigits, PHONE_MAX_DIGITS } from "@/lib/validation/customer";

export const WEBSITE_QUOTE_LIMITS = {
  nameMin: 2,
  name: 80,
  instituteMin: 2,
  institute: 80,
  email: 120,
  phoneRaw: 30,
  project: 80,
  message: 1000,
} as const;

export type WebsiteQuoteInput = {
  name: string;
  institute: string;
  email: string;
  /** Chiffres locaux Maroc (8 à 10), ou chaîne vide. */
  phone: string;
  project: string;
  message: string;
};

export type WebsiteQuoteParsed =
  | { ok: true; honeypot: false; value: WebsiteQuoteInput }
  | { ok: true; honeypot: true }
  | { ok: false; error: string };

// Retours à la ligne et tout caractère de contrôle (dont NUL et DEL), séparateurs Unicode de ligne.
const SINGLE_LINE_FORBIDDEN = /[\u0000-\u001f\u007f\u0085\u2028\u2029]/;
// Dans le message, seuls \t, \n et \r sont admis.
const MESSAGE_FORBIDDEN = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
// Pas de chevrons, guillemets, virgule, point-virgule ni parenthèses : l'adresse sert de Reply-To.
const EMAIL_RE = /^[^\s@<>(),;:"\\[\]]+@[^\s@<>(),;:"\\[\]]+\.[^\s@<>(),;:"\\[\]]+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function fail(error: string): WebsiteQuoteParsed {
  return { ok: false, error };
}

/**
 * Valide le corps JSON de la demande de devis. Aucune valeur n'est acceptée sans contrôle de type
 * et de longueur : le serveur ne se fie pas au formulaire.
 */
export function parseWebsiteQuote(body: unknown): WebsiteQuoteParsed {
  if (!isRecord(body)) return fail("Demande invalide.");

  // Champ piège : un humain ne le voit pas. Toute valeur non vide (quel que soit le type) est un robot.
  const trap = body.website;
  const trapped = typeof trap === "string" ? trap.trim() !== "" : trap !== undefined && trap !== null;
  if (trapped) return { ok: true, honeypot: true };

  const L = WEBSITE_QUOTE_LIMITS;
  const { name, institute, email, phone, project } = body;
  const message = body.message ?? "";
  if (typeof message !== "string") return fail("Demande invalide.");

  if (typeof name !== "string" || typeof institute !== "string" || typeof email !== "string"
    || typeof project !== "string") {
    return fail("Demande invalide.");
  }
  if (phone !== undefined && phone !== null && typeof phone !== "string") return fail("Demande invalide.");

  const cleanName = name.trim();
  if (SINGLE_LINE_FORBIDDEN.test(cleanName) || cleanName.length < L.nameMin || cleanName.length > L.name) {
    return fail(`Indiquez votre nom (${L.nameMin} à ${L.name} caractères, sur une seule ligne).`);
  }
  const cleanInstitute = institute.trim();
  if (SINGLE_LINE_FORBIDDEN.test(cleanInstitute) || cleanInstitute.length < L.instituteMin
    || cleanInstitute.length > L.institute) {
    return fail(`Indiquez le nom de votre institut (${L.instituteMin} à ${L.institute} caractères, sur une seule ligne).`);
  }
  const cleanEmail = email.trim().toLowerCase();
  if (SINGLE_LINE_FORBIDDEN.test(cleanEmail) || cleanEmail.length > L.email || !EMAIL_RE.test(cleanEmail)) {
    return fail("Adresse e-mail invalide.");
  }

  const rawPhone = typeof phone === "string" ? phone.trim() : "";
  if (!rawPhone) return fail("Indiquez votre numéro de téléphone.");
  if (SINGLE_LINE_FORBIDDEN.test(rawPhone) || rawPhone.length > L.phoneRaw) {
    return fail("Numéro de téléphone invalide.");
  }
  const cleanPhone = localPhoneDigits(rawPhone);
  if (cleanPhone.length < 8 || cleanPhone.length > PHONE_MAX_DIGITS) {
    return fail("Le numéro de téléphone doit comporter entre 8 et 10 chiffres.");
  }

  const cleanProject = project.trim();
  if (!cleanProject || SINGLE_LINE_FORBIDDEN.test(cleanProject) || cleanProject.length > L.project) {
    return fail(`Indiquez le type de site souhaité (${L.project} caractères maximum, sur une seule ligne).`);
  }

  const cleanMessage = message.replace(/\r\n?/g, "\n").trim();
  if (MESSAGE_FORBIDDEN.test(cleanMessage) || cleanMessage.length > L.message) {
    return fail(`Votre projet est trop long (${L.message} caractères maximum).`);
  }

  return {
    ok: true,
    honeypot: false,
    value: {
      name: cleanName,
      institute: cleanInstitute,
      email: cleanEmail,
      phone: cleanPhone,
      project: cleanProject,
      message: cleanMessage,
    },
  };
}
