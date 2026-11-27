/**
 * Villes des prospects : nettoyage des noms multilingues d'OpenStreetMap et ville la plus proche.
 * Module pur, sans accès réseau ni base.
 */

const LATIN_LETTER = /\p{Script=Latin}/u;
/** Tout ce qui n'est ni latin, ni chiffre, ni séparateur usuel d'un nom de lieu devient un espace. */
const NON_LATIN_CHUNK = /[^\p{Script=Latin}\p{N}\s'’.\-()&]+/gu;
const EDGE_PUNCTUATION = /^[\s\-–—/|,;:.()&]+|[\s\-–—/|,;:(&]+$/gu;

/**
 * Partie latine d'un nom multilingue : « Agadir ⴰⴳⴰⴷⵉⵔ أگادير » → « Agadir ».
 * Renvoie null quand le nom ne contient aucune lettre latine.
 */
export function latinPart(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.normalize("NFC");
  if (!LATIN_LETTER.test(value)) return null;
  const tidy = (text: string) => text.replace(/\(\s*\)/g, " ").replace(/\s+/g, " ").replace(EDGE_PUNCTUATION, "").trim();
  let cleaned = tidy(value.replace(NON_LATIN_CHUNK, " "));
  // « مدينة (Ville) » → « Ville) » : une parenthèse orpheline est retirée.
  if ((cleaned.match(/\(/g) ?? []).length !== (cleaned.match(/\)/g) ?? []).length) cleaned = tidy(cleaned.replace(/[()]/g, " "));
  return cleaned && LATIN_LETTER.test(cleaned) ? cleaned : null;
}

/** Nom affichable d'une ville : name:fr, sinon la partie latine de name, sinon name:en, sinon name tel quel. */
export function cleanPlaceName(tags: Record<string, string | undefined>): string | null {
  const candidates = [tags["name:fr"], tags.name, tags["name:en"]];
  for (const candidate of candidates) {
    const latin = latinPart(candidate);
    if (latin) return latin;
  }
  const name = tags.name?.trim();
  return name ? name : null;
}

/** « CASABLANCA » ou « el jadida » → « Casablanca », « El Jadida » ; une casse déjà mixte est conservée. */
export function tidyCityCase(value: string): string {
  const letters = value.replace(/[^\p{L}]/gu, "");
  if (!letters || (letters !== letters.toLowerCase() && letters !== letters.toUpperCase())) return value;
  return value.toLowerCase().replace(/(^|[\s\-'’])(\p{L})/gu, (_match, sep: string, ch: string) => sep + ch.toUpperCase());
}

/** Nom de ville saisi (addr:city, CSV) : partie latine si présente, espaces et casse normalisés. */
export function cleanCityValue(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.replace(/\s+/g, " ").trim();
  if (!trimmed) return null;
  const latin = latinPart(trimmed);
  return latin ? tidyCityCase(latin) : trimmed;
}

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * `weight` : importance de la localité (1 par défaut). La distance comparée est km / weight : un salon de
 * périphérie reste rattaché à la grande ville voisine plutôt qu'au premier douar venu.
 */
export type CityPoint = { name: string; lat: number; lon: number; weight?: number };

/** Poids par type de localité OpenStreetMap (place=city|town|village). */
export const PLACE_WEIGHTS: Record<string, number> = { city: 3, town: 1.5, village: 1 };

/** Au-delà, aucune ville n'est attribuée : le lieu est trop isolé pour être rattaché sans erreur. */
export const NEAREST_CITY_MAX_KM = 50;
const CELL_DEG = 0.25;

/**
 * Index de recherche de la ville la plus proche (grille de 0,25°, seules les cellules à portée sont lues).
 * Évite la comparaison de chaque prospect à chaque localité (plusieurs dizaines de millions de calculs).
 */
export class CityIndex {
  private readonly cells = new Map<string, CityPoint[]>();
  readonly size: number;

  constructor(points: readonly CityPoint[]) {
    let size = 0;
    for (const point of points) {
      if (!Number.isFinite(point.lat) || !Number.isFinite(point.lon) || !point.name) continue;
      const key = this.key(Math.floor(point.lat / CELL_DEG), Math.floor(point.lon / CELL_DEG));
      const list = this.cells.get(key);
      if (list) list.push(point);
      else this.cells.set(key, [point]);
      size += 1;
    }
    this.size = size;
  }

  private key(row: number, col: number) {
    return `${row}:${col}`;
  }

  /** Localité de plus petite distance pondérée (km / weight) parmi celles situées à maxKm au plus. */
  nearest(lat: number, lon: number, maxKm = NEAREST_CITY_MAX_KM): CityPoint | null {
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || this.size === 0) return null;
    const row = Math.floor(lat / CELL_DEG);
    const col = Math.floor(lon / CELL_DEG);
    // Largeur minimale d'une cellule à cette latitude (la longitude se resserre vers le pôle).
    const cellKm = CELL_DEG * 111 * Math.cos(toRad(Math.min(Math.abs(lat) + CELL_DEG, 89)));
    const reach = Math.ceil(maxKm / cellKm);
    let best: CityPoint | null = null;
    let bestScore = Infinity;
    for (let r = row - reach; r <= row + reach; r += 1) {
      for (let c = col - reach; c <= col + reach; c += 1) {
        for (const point of this.cells.get(this.key(r, c)) ?? []) {
          const km = haversineKm(lat, lon, point.lat, point.lon);
          if (km > maxKm) continue;
          const score = km / Math.max(point.weight ?? 1, 0.1);
          if (score < bestScore) {
            bestScore = score;
            best = point;
          }
        }
      }
    }
    return best;
  }
}
