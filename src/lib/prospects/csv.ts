/**
 * Lecture et export CSV des prospects. Module pur (aucun accès base).
 *
 * Lecture : séparateur « , » ou « ; » (détecté sur la ligne d'en-tête), guillemets RFC 4180, BOM UTF-8.
 * L'analyse des colonnes et le dédoublonnage sont communs à tous les imports (import-plan.ts).
 * Export : UTF-8 avec BOM, « ; » (Excel en français), cellules texte protégées contre les formules.
 */
import {
  ImportFormatError,
  planTabularImport,
  type ImportPlan,
  type TabularRecord,
} from "@/lib/prospects/import-plan";
import { PROSPECT_STATUS_LABELS, type ProspectDto } from "@/lib/prospects/types";

export const CSV_MAX_BYTES = 2 * 1024 * 1024;

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
export function parseCsv(input: string, separator?: "," | ";"): TabularRecord[] {
  const text = input.startsWith("﻿") ? input.slice(1) : input;
  const sep = separator ?? detectSeparator(text);
  const records: TabularRecord[] = [];
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
  if (quoted) throw new ImportFormatError(`Guillemet non fermé (enregistrement commençant ligne ${recordLine}).`);
  if (cell !== "" || cells.length > 0) endRecord();
  return records;
}

/** Plan d'import d'un texte CSV. */
export function planCsvImport(csv: string): ImportPlan {
  return planTabularImport(parseCsv(csv));
}

/**
 * Octets d'un fichier .csv : UTF-8 (BOM accepté) ; s'ils ne sont pas de l'UTF-8 valide, Windows-1252
 * (« CSV séparateur point-virgule » d'Excel en français).
 */
export function decodeCsvBytes(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
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

/** Colonnes communes aux exports CSV et .xlsx (relues telles quelles par les imports). */
export const EXPORT_COLUMNS = [
  "id",
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
] as const;

export const CSV_EXPORT_HEADERS = [...EXPORT_COLUMNS, "latitude", "longitude", "mis_a_jour"] as const;

/** Valeurs d'une ligne d'export, dans l'ordre de EXPORT_COLUMNS (statut en libellé français). */
export function exportValues(item: ProspectDto): (string | null)[] {
  return [
    item.id,
    item.name,
    item.category,
    item.city,
    item.address,
    item.phone,
    item.email,
    item.website,
    PROSPECT_STATUS_LABELS[item.status] ?? item.status,
    item.notes,
    item.source,
  ];
}

/** Export complet : BOM UTF-8, « ; », CRLF. */
export function prospectsToCsv(items: readonly ProspectDto[]): string {
  const lines = [CSV_EXPORT_HEADERS.join(";")];
  for (const item of items) {
    lines.push(
      [...exportValues(item), item.latitude, item.longitude, item.updatedAt].map((value) => csvCell(value)).join(";"),
    );
  }
  return `﻿${lines.join("\r\n")}\r\n`;
}
