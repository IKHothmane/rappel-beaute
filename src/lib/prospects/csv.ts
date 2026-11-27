/**
 * Import et export CSV des prospects. Module pur (aucun accès base).
 *
 * Import : séparateur « , » ou « ; » (détecté sur la ligne d'en-tête), guillemets RFC 4180, BOM UTF-8,
 * en-têtes insensibles à la casse et aux accents. Dédoublonnage : téléphone normalisé
 * (sourceRef = 'phone:+212…'), à défaut nom + ville (sourceRef = 'name:<empreinte>').
 * Export : UTF-8 avec BOM, « ; » (Excel en français), cellules texte protégées contre les formules.
 */
import { createHash } from "node:crypto";
import { cleanCityValue } from "@/lib/prospects/city";
import { pickMoroccanPhone } from "@/lib/prospects/phone";
import { PROSPECT_LIMITS, type ProspectDto, type ProspectUpsertRow } from "@/lib/prospects/types";
import {
  cleanText,
  foldKey,
  isPlaceholder,
  normalizeEmail,
  normalizeWebsite,
  parseCategoryLoose,
} from "@/lib/prospects/validation";

export const CSV_MAX_BYTES = 2 * 1024 * 1024;
export const CSV_MAX_ROWS = 20_000;
/** Erreurs renvoyées au plus (le compteur skipped reste exact). */
export const CSV_MAX_REPORTED_ERRORS = 200;

export type CsvRecord = { line: number; cells: string[] };

export class CsvFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CsvFormatError";
  }
}

/** Séparateur de la première ligne (hors guillemets) : le plus fréquent entre « ; » et « , ». */
export function detectSeparator(text: string): "," | ";" {
  let commas = 0;
  let semicolons = 0;
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '"') quoted = !quoted;
    else if (!quoted && (ch === "\n" || ch === "\r")) break;
    else if (!quoted && ch === ",") commas += 1;
    else if (!quoted && ch === ";") semicolons += 1;
  }
  return semicolons > commas ? ";" : ",";
}

/**
 * Découpe un texte CSV en enregistrements. Gère "" dans un champ entre guillemets, les retours à la ligne
 * entre guillemets et les fins de ligne CRLF / LF / CR. `line` est la ligne physique où commence l'enregistrement.
 */
export function parseCsv(input: string, separator?: "," | ";"): CsvRecord[] {
  const text = input.startsWith("﻿") ? input.slice(1) : input;
  const sep = separator ?? detectSeparator(text);
  const records: CsvRecord[] = [];
  let cells: string[] = [];
  let cell = "";
  let quoted = false;
  let line = 1;
  let recordLine = 1;
  let i = 0;

  const endRecord = () => {
    cells.push(cell);
    if (!(cells.length === 1 && cells[0].trim() === "")) records.push({ line: recordLine, cells });
    cells = [];
    cell = "";
  };

  while (i < text.length) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i += 1;
        continue;
      }
      if (ch === "\n" || (ch === "\r" && text[i + 1] !== "\n")) line += 1;
      cell += ch;
      i += 1;
      continue;
    }
    if (ch === '"' && cell.trim() === "") {
      quoted = true;
      cell = "";
      i += 1;
      continue;
    }
    if (ch === sep) {
      cells.push(cell);
      cell = "";
      i += 1;
      continue;
    }
    if (ch === "\r" || ch === "\n") {
      endRecord();
      i += ch === "\r" && text[i + 1] === "\n" ? 2 : 1;
      line += 1;
      recordLine = line;
      continue;
    }
    cell += ch;
    i += 1;
  }
  if (quoted) throw new CsvFormatError(`Guillemet non fermé (enregistrement commençant ligne ${recordLine}).`);
  if (cell !== "" || cells.length > 0) endRecord();
  return records;
}

type CsvField = "name" | "category" | "city" | "address" | "phone" | "email" | "website";

/** En-têtes reconnus, après suppression des accents, de la casse et de la ponctuation. */
const HEADER_ALIASES: Record<string, CsvField> = {
  name: "name",
  nom: "name",
  category: "category",
  categorie: "category",
  city: "city",
  ville: "city",
  address: "address",
  adresse: "address",
  phone: "phone",
  telephone: "phone",
  tel: "phone",
  email: "email",
  mail: "email",
  website: "website",
  site: "website",
  siteweb: "website",
  siteinternet: "website",
};

export function mapCsvHeaders(headers: readonly string[]): Partial<Record<CsvField, number>> {
  const map: Partial<Record<CsvField, number>> = {};
  headers.forEach((header, index) => {
    const field = HEADER_ALIASES[foldKey(header)];
    if (field && map[field] === undefined) map[field] = index;
  });
  return map;
}

/** Retire l'apostrophe que l'export ajoute devant = + - @ (aller-retour export → import). */
function unprotect(value: string): string {
  return /^'[=+\-@\t\r]/.test(value) ? value.slice(1) : value;
}

/** Clé de dédoublonnage sans téléphone : nom + ville sans accents ni casse, empreinte courte (64 caractères max en base). */
export function nameCityRef(name: string, city: string | null): string {
  const digest = createHash("sha256")
    .update(`${foldKey(name)}|${foldKey(city ?? "")}`)
    .digest("hex")
    .slice(0, 40);
  return `name:${digest}`;
}

export type CsvImportPlan = {
  rows: (ProspectUpsertRow & { line: number })[];
  skipped: number;
  errors: { line: number; error: string }[];
};

/** Analyse complète d'un CSV : lignes valides prêtes à l'upsert, lignes ignorées avec leur motif. */
export function planCsvImport(csv: string): CsvImportPlan {
  const records = parseCsv(csv);
  if (records.length === 0) throw new CsvFormatError("Fichier vide.");
  const [header, ...data] = records;
  const columns = mapCsvHeaders(header.cells);
  if (columns.name === undefined) {
    throw new CsvFormatError("Colonne « nom » (ou « name ») introuvable sur la première ligne.");
  }
  if (data.length > CSV_MAX_ROWS) {
    throw new CsvFormatError(`Trop de lignes : ${CSV_MAX_ROWS} au maximum par import.`);
  }

  const rows: CsvImportPlan["rows"] = [];
  const errors: CsvImportPlan["errors"] = [];
  let skipped = 0;
  const firstLineByRef = new Map<string, number>();
  const skip = (line: number, error: string) => {
    skipped += 1;
    if (errors.length < CSV_MAX_REPORTED_ERRORS) errors.push({ line, error });
  };
  const cellOf = (cells: string[], field: CsvField): string | null => {
    const index = columns[field];
    if (index === undefined) return null;
    const raw = cells[index];
    if (raw === undefined) return null;
    const text = cleanText(unprotect(raw.trim()));
    return text && !isPlaceholder(text) ? text : null;
  };

  for (const { line, cells } of data) {
    if (cells.every((value) => value.trim() === "")) continue;
    const name = cellOf(cells, "name");
    if (!name) {
      skip(line, "Nom manquant.");
      continue;
    }
    if (name.length > PROSPECT_LIMITS.name) {
      skip(line, `Nom trop long (${PROSPECT_LIMITS.name} caractères au plus).`);
      continue;
    }
    const cityRaw = cellOf(cells, "city");
    const city = cityRaw ? cleanCityValue(cityRaw) : null;
    if (city && city.length > PROSPECT_LIMITS.city) {
      skip(line, `Ville trop longue (${PROSPECT_LIMITS.city} caractères au plus).`);
      continue;
    }
    const address = cellOf(cells, "address");
    if (address && address.length > PROSPECT_LIMITS.address) {
      skip(line, `Adresse trop longue (${PROSPECT_LIMITS.address} caractères au plus).`);
      continue;
    }
    const phoneRaw = cellOf(cells, "phone");
    const phone = phoneRaw ? pickMoroccanPhone([phoneRaw]) : null;
    if (phoneRaw && !phone) {
      skip(line, "Téléphone marocain invalide.");
      continue;
    }
    const emailRaw = cellOf(cells, "email");
    const email = emailRaw ? normalizeEmail(emailRaw) : null;
    if (emailRaw && !email) {
      skip(line, "E-mail invalide.");
      continue;
    }
    const websiteRaw = cellOf(cells, "website");
    const website = websiteRaw ? normalizeWebsite(websiteRaw) : null;
    if (websiteRaw && !website) {
      skip(line, "Site web invalide (http ou https uniquement).");
      continue;
    }

    const sourceRef = phone ? `phone:${phone}` : nameCityRef(name, city);
    const first = firstLineByRef.get(sourceRef);
    if (first !== undefined) {
      skip(line, `Doublon de la ligne ${first}.`);
      continue;
    }
    firstLineByRef.set(sourceRef, line);
    rows.push({
      line,
      sourceRef,
      name,
      category: parseCategoryLoose(cellOf(cells, "category")),
      city,
      address,
      latitude: null,
      longitude: null,
      phone,
      email,
      website,
    });
  }
  return { rows, skipped, errors };
}

/**
 * Cellule d'export : une valeur texte commençant par = + - @, une tabulation ou un retour chariot reçoit une
 * apostrophe (un tableur ne l'évalue alors pas comme formule) ; guillemets si nécessaire.
 * Les nombres produits par le code (latitude, longitude) ne sont pas préfixés : ce ne sont pas des formules.
 */
export function csvCell(value: string | number | null | undefined, separator = ";"): string {
  if (value === null || value === undefined) return "";
  let text = typeof value === "number" ? (Number.isFinite(value) ? String(value) : "") : value;
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (text.includes(separator) || /["\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

export const EXPORT_HEADERS = [
  "nom",
  "categorie",
  "ville",
  "adresse",
  "telephone",
  "email",
  "site",
  "statut",
  "notes",
  "source",
  "latitude",
  "longitude",
  "mis_a_jour",
] as const;

/** Export complet : BOM UTF-8, « ; », CRLF. Les en-têtes sont relus tels quels par l'import. */
export function prospectsToCsv(items: readonly ProspectDto[]): string {
  const lines = [EXPORT_HEADERS.join(";")];
  for (const item of items) {
    lines.push(
      [
        item.name,
        item.category,
        item.city,
        item.address,
        item.phone,
        item.email,
        item.website,
        item.status,
        item.notes,
        item.source,
        item.latitude,
        item.longitude,
        item.updatedAt,
      ]
        .map((value) => csvCell(value))
        .join(";"),
    );
  }
  return `﻿${lines.join("\r\n")}\r\n`;
}
