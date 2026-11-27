/**
 * Téléphones marocains au format E.164 (+212 suivi de 9 chiffres).
 * Numéro national significatif : 5 (fixe), 6 et 7 (mobile), 8 (VoIP et numéros spéciaux).
 * Un numéro étranger ou mal formé est ignoré (null) : la prospection vise le Maroc.
 */

const MOROCCAN_NSN = /^[5-8]\d{8}$/;

/** Normalise une seule valeur. Renvoie "+212XXXXXXXXX" ou null. */
export function normalizeMoroccanPhone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  // Apostrophe ajoutée par l'export CSV (protection contre les formules), extension « poste / ext ».
  let value = raw.trim().replace(/^'+/, "");
  value = value.replace(/\s*(?:ext\.?|extension|poste|x)\s*\d+\s*$/i, "");
  value = value.replace(/\(0\)/g, "");
  if (!value || value.length > 40) return null;

  const plus = value.startsWith("+");
  const digits = value.replace(/\D/g, "");
  let nsn: string;
  if (plus) {
    if (!digits.startsWith("212")) return null;
    nsn = digits.slice(3);
  } else if (digits.startsWith("00212")) {
    nsn = digits.slice(5);
  } else if (digits.startsWith("00")) {
    return null;
  } else if (digits.startsWith("212") && (digits.length === 12 || digits.length === 13)) {
    nsn = digits.slice(3);
  } else if (digits.startsWith("0") && digits.length === 10) {
    nsn = digits.slice(1);
  } else {
    nsn = digits;
  }
  // « +212 0 6… » : le 0 national ajouté par erreur après l'indicatif.
  if (nsn.length === 10 && nsn.startsWith("0")) nsn = nsn.slice(1);
  return MOROCCAN_NSN.test(nsn) ? `+212${nsn}` : null;
}

/**
 * Premier numéro marocain valide parmi des valeurs brutes, chacune pouvant en contenir plusieurs
 * (« 05 22 00 00 00 / 06 00 00 00 00 », séparateurs ; , / | ou « ou »).
 */
export function pickMoroccanPhone(values: readonly unknown[]): string | null {
  for (const value of values) {
    if (typeof value !== "string" || !value.trim()) continue;
    const whole = normalizeMoroccanPhone(value);
    if (whole) return whole;
    for (const part of value.split(/[;,/|\n]|\s+ou\s+|\s+or\s+/i)) {
      const phone = normalizeMoroccanPhone(part);
      if (phone) return phone;
    }
  }
  return null;
}
