import { localPhoneDigits } from "@/lib/validation/customer";

export const LOYALTY_NAME_MAX_LENGTH = 80;
export const LOYALTY_PHONE_MAX_LENGTH = 32;
export const LOYALTY_COMMENT_MAX_LENGTH = 800;

export const LOYALTY_PHONE_ALREADY_KNOWN_CODE = "PHONE_ALREADY_KNOWN";
export const LOYALTY_PHONE_ALREADY_KNOWN_MESSAGE =
  "Ce numéro est déjà connu de l’institut. Présentez votre carte à l’accueil pour la relier à votre fiche.";

/** Numéro marocain écrit en international : 212…, +212…, 00212… (avec ou sans « 0 » parasite après l'indicatif). */
function moroccanInternationalRest(digits: string): string | null {
  const international = digits.replace(/^00/, "");
  if (!international.startsWith("212")) return null;
  return international.slice(3).replace(/^0/, "");
}

/** Accept local and international formats without imposing a country's digit count. */
export function validLoyaltyPhone(value: string) {
  if (value.length > LOYALTY_PHONE_MAX_LENGTH || !/^\+?[\d\s().-]+$/.test(value.trim()) || !/\d/.test(value)) return false;
  // Un numéro marocain en international doit donner un numéro local complet (0 + 9 chiffres).
  const rest = moroccanInternationalRest(value.replace(/\D/g, ""));
  return rest === null || /^\d{9}$/.test(rest);
}

/**
 * Format canonique stocké dans Customer.phone : numéro marocain en local « 0612345678 »
 * (le format de la réservation publique, de la caisse, de la création manuelle et de la connexion,
 * cf. localPhoneDigits). Les variantes 06…, 212…, +212…, 00212… et les séparateurs donnent le même résultat.
 * Un numéro étranger garde son indicatif sous la forme « +33612345678 » (« 00 » converti en « + »),
 * sans troncature ni contrainte de longueur.
 */
export function normalizeLoyaltyPhone(value: string) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  const moroccanRest = moroccanInternationalRest(digits);
  if (moroccanRest !== null) return localPhoneDigits(`212${moroccanRest}`);
  if (trimmed.startsWith("+")) return `+${digits}`;
  if (digits.startsWith("00") && digits.length > 2) return `+${digits.slice(2)}`;
  return digits;
}

/**
 * Valeurs de Customer.phone pouvant désigner le même numéro, pour détecter une fiche existante
 * même si elle a été enregistrée dans un ancien format (212…, +212…, 00212…, sans « 0 » initial).
 */
export function loyaltyPhoneLookupVariants(canonical: string): string[] {
  if (!canonical) return [];
  const variants = new Set<string>([canonical]);
  if (/^0\d{9}$/.test(canonical)) {
    const rest = canonical.slice(1);
    for (const variant of [rest, `212${rest}`, `+212${rest}`, `00212${rest}`]) variants.add(variant);
  } else if (canonical.startsWith("+")) {
    variants.add(canonical.slice(1));
  }
  return [...variants];
}
