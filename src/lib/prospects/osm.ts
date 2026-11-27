/**
 * Import des salons et instituts du Maroc depuis OpenStreetMap (API Overpass).
 *
 * - URL fixe (jamais fournie par l'utilisateur), User-Agent générique, aucune redirection suivie ;
 * - délai maximal de 150 s et réponse bornée en octets ;
 * - une seule requête HTTP contenant deux instructions : les commerces, puis les localités
 *   (place=city|town|village) qui servent à trouver la ville la plus proche quand addr:city manque ;
 * - les éléments sans nom sont ignorés (inexploitables pour la prospection).
 *
 * Module pur : `fetchImpl` est injectable, les tests n'appellent jamais le réseau.
 */
import { CityIndex, PLACE_WEIGHTS, cleanCityValue, cleanPlaceName, latinPart, type CityPoint } from "@/lib/prospects/city";
import { pickMoroccanPhone } from "@/lib/prospects/phone";
import { PROSPECT_LIMITS, type ProspectCategory, type ProspectUpsertRow } from "@/lib/prospects/types";
import { cleanText, normalizeEmail, normalizeWebsite } from "@/lib/prospects/validation";

export const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
export const OVERPASS_USER_AGENT = "rappel-beauty-prospects/1.0";
export const OVERPASS_TIMEOUT_MS = 150_000;
export const OVERPASS_MAX_BYTES = 64 * 1024 * 1024;

const POI_SHOPS = new Set(["beauty", "hairdresser", "cosmetics", "massage", "nail_salon"]);
const PLACE_TYPES = new Set(["city", "town", "village"]);

/** Requête Overpass QL : commerces de beauté du Maroc, puis ses localités. */
export function buildOverpassQuery(): string {
  return [
    "[out:json][timeout:140];",
    'area["ISO3166-1"="MA"][admin_level=2]->.ma;',
    "(",
    '  nwr["shop"~"^(beauty|hairdresser|cosmetics|massage|nail_salon)$"](area.ma);',
    '  nwr["amenity"="spa"](area.ma);',
    '  nwr["leisure"="spa"](area.ma);',
    '  nwr["beauty"](area.ma);',
    ")->.pois;",
    // `out center` : coordonnées des nœuds et centre des voies et relations (`out tags` omet celles des nœuds).
    ".pois out center qt;",
    'nwr["place"~"^(city|town|village)$"](area.ma)->.places;',
    ".places out center qt;",
  ].join("\n");
}

export type OsmTags = Record<string, string | undefined>;
export type OverpassElement = {
  type: "node" | "way" | "relation" | string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: OsmTags;
};

export class OverpassError extends Error {
  constructor(
    message: string,
    readonly kind: "http" | "timeout" | "too_large" | "invalid" | "remark" | "network",
    readonly status?: number,
  ) {
    super(message);
    this.name = "OverpassError";
  }
}

const has = (value: string | undefined, wanted: string) =>
  (value ?? "")
    .split(";")
    .map((part) => part.trim().toLowerCase())
    .includes(wanted);

export function isProspectElement(tags: OsmTags): boolean {
  return (
    POI_SHOPS.has(tags.shop ?? "") ||
    tags.amenity === "spa" ||
    tags.leisure === "spa" ||
    (typeof tags.beauty === "string" && tags.beauty.trim() !== "")
  );
}

/** Catégorie d'un élément OSM. */
export function categorize(tags: OsmTags): ProspectCategory {
  const shop = tags.shop;
  const name = `${tags.name ?? ""} ${tags["name:fr"] ?? ""}`.toLowerCase();
  if (shop === "hairdresser") {
    if (has(tags.hairdresser, "barber") || tags.male === "yes" || /barb(?:er|ier|ershop)/.test(name)) return "barber";
    return "hairdresser";
  }
  if (shop === "nail_salon") return "nails";
  if (shop === "beauty") return has(tags.beauty, "nails") ? "nails" : "beauty";
  if (shop === "cosmetics") return "cosmetics";
  if (shop === "massage") return "massage";
  if (tags.amenity === "spa" || tags.leisure === "spa") return "spa";
  if (tags.beauty && tags.beauty.trim()) return has(tags.beauty, "nails") ? "nails" : "beauty";
  return "other";
}

function coordinates(element: OverpassElement): { lat: number; lon: number } | null {
  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;
  if (typeof lat !== "number" || typeof lon !== "number") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
}

/** Premier e-mail / site valide d'une étiquette pouvant en contenir plusieurs (séparés par « ; »). */
function firstValid(values: (string | undefined)[], normalize: (value: string) => string | null): string | null {
  for (const value of values) {
    if (!value) continue;
    for (const part of value.split(";")) {
      const normalized = normalize(part);
      if (normalized) return normalized;
    }
  }
  return null;
}

export function osmAddress(tags: OsmTags): string | null {
  const street = cleanText(tags["addr:street"]);
  const number = cleanText(tags["addr:housenumber"]);
  const postcode = cleanText(tags["addr:postcode"]);
  let address: string | null = null;
  if (street) address = [number, street].filter(Boolean).join(" ");
  else address = cleanText(tags["addr:full"]);
  if (address && postcode) address = `${address}, ${postcode}`;
  if (!address) return null;
  return address.length > PROSPECT_LIMITS.address ? address.slice(0, PROSPECT_LIMITS.address).trim() : address;
}

function truncate(value: string | null, max: number): string | null {
  if (!value) return null;
  return value.length > max ? value.slice(0, max).trim() : value;
}

export type OsmParseStats = {
  elements: number;
  prospectElements: number;
  named: number;
  unnamed: number;
  places: number;
  withCoordinates: number;
  withPhone: number;
  withEmail: number;
  withWebsite: number;
  cityFromAddress: number;
  cityFromNearest: number;
  withoutCity: number;
  distinctCities: number;
};

export type OsmParseResult = { rows: ProspectUpsertRow[]; stats: OsmParseStats };

/** Localités du jeu de réponses (éléments place=city|town|village), avec un nom latin propre. */
export function extractPlaces(elements: readonly OverpassElement[]): CityPoint[] {
  const places: CityPoint[] = [];
  for (const element of elements) {
    const tags = element.tags ?? {};
    if (!PLACE_TYPES.has(tags.place ?? "")) continue;
    const point = coordinates(element);
    const name = cleanPlaceName(tags);
    if (!point || !name) continue;
    places.push({ name: truncate(name, PROSPECT_LIMITS.city) as string, lat: point.lat, lon: point.lon, weight: PLACE_WEIGHTS[tags.place as string] ?? 1 });
  }
  return places;
}

/** Transforme une réponse Overpass en lignes prêtes à l'upsert (dédoublonnées par type/id). */
export function parseOverpassElements(elements: readonly OverpassElement[]): OsmParseResult {
  const index = new CityIndex(extractPlaces(elements));
  const byRef = new Map<string, ProspectUpsertRow>();
  const stats: OsmParseStats = {
    elements: elements.length,
    prospectElements: 0,
    named: 0,
    unnamed: 0,
    places: index.size,
    withCoordinates: 0,
    withPhone: 0,
    withEmail: 0,
    withWebsite: 0,
    cityFromAddress: 0,
    cityFromNearest: 0,
    withoutCity: 0,
    distinctCities: 0,
  };

  for (const element of elements) {
    const tags = element.tags ?? {};
    if (!isProspectElement(tags)) continue;
    if (!["node", "way", "relation"].includes(element.type) || !Number.isSafeInteger(element.id)) continue;
    stats.prospectElements += 1;
    const name = truncate(cleanText(tags.name) ?? cleanText(tags["name:fr"]) ?? cleanText(tags["name:en"]) ?? cleanText(tags["name:ar"]), PROSPECT_LIMITS.name);
    if (!name) {
      stats.unnamed += 1;
      continue;
    }
    const sourceRef = `${element.type}/${element.id}`;
    if (byRef.has(sourceRef)) continue;
    stats.named += 1;

    const point = coordinates(element);
    let city = latinPart(tags["addr:city"]) ? cleanCityValue(tags["addr:city"]) : null;
    if (city) stats.cityFromAddress += 1;
    else if (point) {
      const nearest = index.nearest(point.lat, point.lon);
      if (nearest) {
        city = nearest.name;
        stats.cityFromNearest += 1;
      }
    }
    // addr:city sans partie latine et aucune localité proche : la valeur d'origine vaut mieux que rien.
    if (!city) city = cleanCityValue(tags["addr:city"]);
    if (!city) stats.withoutCity += 1;

    const row: ProspectUpsertRow = {
      sourceRef,
      name,
      category: categorize(tags),
      city: truncate(city, PROSPECT_LIMITS.city),
      address: osmAddress(tags),
      latitude: point?.lat ?? null,
      longitude: point?.lon ?? null,
      phone: pickMoroccanPhone([tags.phone, tags["contact:phone"], tags["contact:mobile"], tags.mobile]),
      email: firstValid([tags.email, tags["contact:email"]], normalizeEmail),
      website: firstValid([tags.website, tags["contact:website"], tags.url], normalizeWebsite),
    };
    if (point) stats.withCoordinates += 1;
    if (row.phone) stats.withPhone += 1;
    if (row.email) stats.withEmail += 1;
    if (row.website) stats.withWebsite += 1;
    byRef.set(sourceRef, row);
  }
  const rows = [...byRef.values()];
  stats.distinctCities = new Set(rows.map((row) => row.city?.toLowerCase()).filter(Boolean)).size;
  return { rows, stats };
}

export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

async function readCapped(response: Response, maxBytes: number): Promise<string> {
  const declared = response.headers.get("content-length");
  if (declared && /^\d+$/.test(declared) && Number(declared) > maxBytes) {
    throw new OverpassError("Réponse Overpass trop volumineuse.", "too_large");
  }
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new OverpassError("Réponse Overpass trop volumineuse.", "too_large");
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

/** Appel Overpass borné. Lève OverpassError (HTTP, délai, taille, JSON invalide, erreur signalée par « remark »). */
export async function fetchOverpassElements(
  options: { fetchImpl?: FetchLike; timeoutMs?: number; maxBytes?: number; query?: string } = {},
): Promise<OverpassElement[]> {
  const fetchImpl: FetchLike = options.fetchImpl ?? ((input, init) => fetch(input, init));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? OVERPASS_TIMEOUT_MS);
  try {
    let response: Response;
    try {
      response = await fetchImpl(OVERPASS_URL, {
        method: "POST",
        headers: {
          "User-Agent": OVERPASS_USER_AGENT,
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
        body: new URLSearchParams({ data: options.query ?? buildOverpassQuery() }).toString(),
        signal: controller.signal,
        redirect: "error",
        cache: "no-store",
      });
    } catch (error) {
      if (controller.signal.aborted) throw new OverpassError("Délai Overpass dépassé.", "timeout");
      throw new OverpassError(`Overpass injoignable${error instanceof Error ? ` (${error.name})` : ""}.`, "network");
    }
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      throw new OverpassError(`Overpass a répondu ${response.status}.`, "http", response.status);
    }
    let text: string;
    try {
      text = await readCapped(response, options.maxBytes ?? OVERPASS_MAX_BYTES);
    } catch (error) {
      if (error instanceof OverpassError) throw error;
      if (controller.signal.aborted) throw new OverpassError("Délai Overpass dépassé.", "timeout");
      throw new OverpassError("Lecture de la réponse Overpass interrompue.", "network");
    }
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new OverpassError("Réponse Overpass illisible.", "invalid");
    }
    const body = json as { elements?: unknown; remark?: unknown };
    // Overpass signale un dépassement de délai ou de mémoire par « remark » avec un statut 200 : résultat partiel.
    if (typeof body.remark === "string" && /error|timed out|timeout|out of memory/i.test(body.remark)) {
      throw new OverpassError("Overpass a interrompu la requête (délai ou mémoire).", "remark");
    }
    if (!Array.isArray(body.elements)) throw new OverpassError("Réponse Overpass sans éléments.", "invalid");
    return body.elements.filter(
      (element): element is OverpassElement =>
        !!element && typeof element === "object" && typeof (element as OverpassElement).type === "string",
    );
  } finally {
    clearTimeout(timer);
  }
}

/** Récupère et analyse les prospects OSM du Maroc. */
export async function fetchOsmProspects(options: { fetchImpl?: FetchLike; timeoutMs?: number; maxBytes?: number } = {}) {
  const elements = await fetchOverpassElements(options);
  return parseOverpassElements(elements);
}
