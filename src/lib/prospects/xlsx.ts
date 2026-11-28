/**
 * Fichiers .xlsx des prospects (Excel, Google Sheets).
 *
 * Lecture : avant exceljs, l'archive zip est contrôlée sans dépendance (répertoire central puis décompression
 * réelle plafonnée) : un fichier de 2 Mo ne peut pas se décompresser en centaines de Mo en mémoire.
 * Seule la première feuille est lue ; une formule n'est jamais évaluée (son résultat en cache est repris).
 * Écriture : toutes les valeurs en TEXTE (aucune formule, téléphones +212 intacts, sans apostrophe),
 * en-tête en gras et figé, écriture en flux (mémoire bornée même pour un export volumineux).
 */
import { PassThrough } from "node:stream";
import { inflateRawSync } from "node:zlib";
import ExcelJS from "exceljs";
import { EXPORT_COLUMNS, exportValues } from "@/lib/prospects/csv";
import { ImportFormatError, type TabularRecord } from "@/lib/prospects/import-plan";
import type { ProspectDto } from "@/lib/prospects/types";

export const XLSX_LIMITS = {
  /** Taille totale décompressée de l'archive. */
  maxUncompressedBytes: 20 * 1024 * 1024,
  /** Rapport décompressé / compressé d'une entrée de plus de 256 Ko (XML usuel : 5 à 20). */
  maxEntryRatio: 100,
  ratioCheckFromBytes: 256 * 1024,
  maxEntries: 500,
  /**
   * Cellules déclarées dans l'ensemble des feuilles (borne la mémoire d'exceljs) : 5 000 lignes × 24 colonnes.
   * Mesure locale de readXlsxRecords : 295 000 cellules → pic de ~170 Mo de heap ; 115 000 → ~105 Mo.
   */
  maxCells: 120_000,
  /** Lignes de données de la première feuille (hors en-tête). */
  maxDataRows: 5_000,
  maxColumns: 50,
} as const;

const TOO_LARGE = "Fichier .xlsx trop volumineux une fois décompressé (20 Mo au plus).";
const UNREADABLE = "Fichier .xlsx illisible. Enregistrez-le à nouveau au format Excel (.xlsx) puis réessayez.";

const SIG_EOCD = 0x06054b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_LOCAL = 0x04034b50;

type ZipEntry = { name: string; method: number; compressedSize: number; size: number; localOffset: number };

/** Entrées du répertoire central (sans rien décompresser) ; refuse ZIP64, chiffrement et tailles excessives. */
export function readZipDirectory(buf: Buffer): ZipEntry[] {
  if (buf.length < 22) throw new ImportFormatError(UNREADABLE);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 0xffff); i -= 1) {
    if (buf.readUInt32LE(i) === SIG_EOCD) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new ImportFormatError(UNREADABLE);
  const count = buf.readUInt16LE(eocd + 10);
  const directorySize = buf.readUInt32LE(eocd + 12);
  const directoryOffset = buf.readUInt32LE(eocd + 16);
  if (count === 0xffff || directoryOffset === 0xffffffff) throw new ImportFormatError(UNREADABLE);
  if (count > XLSX_LIMITS.maxEntries) throw new ImportFormatError(TOO_LARGE, 413);
  if (directoryOffset + directorySize > eocd) throw new ImportFormatError(UNREADABLE);

  const entries: ZipEntry[] = [];
  let declared = 0;
  let p = directoryOffset;
  for (let n = 0; n < count; n += 1) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== SIG_CENTRAL) throw new ImportFormatError(UNREADABLE);
    const flags = buf.readUInt16LE(p + 8);
    const method = buf.readUInt16LE(p + 10);
    const compressedSize = buf.readUInt32LE(p + 20);
    const size = buf.readUInt32LE(p + 24);
    const nameLength = buf.readUInt16LE(p + 28);
    const extraLength = buf.readUInt16LE(p + 30);
    const commentLength = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    if (flags & 0x1) throw new ImportFormatError("Fichier .xlsx protégé par mot de passe : enregistrez-le sans protection.");
    if (compressedSize === 0xffffffff || size === 0xffffffff) throw new ImportFormatError(TOO_LARGE, 413);
    declared += size;
    if (declared > XLSX_LIMITS.maxUncompressedBytes) throw new ImportFormatError(TOO_LARGE, 413);
    if (size >= XLSX_LIMITS.ratioCheckFromBytes && size > Math.max(compressedSize, 1) * XLSX_LIMITS.maxEntryRatio) {
      throw new ImportFormatError(TOO_LARGE, 413);
    }
    entries.push({
      name: buf.toString("utf8", p + 46, p + 46 + nameLength),
      method,
      compressedSize,
      size,
      localOffset,
    });
    p += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function countOccurrences(haystack: Buffer, needle: string): number {
  const pattern = Buffer.from(needle);
  let count = 0;
  for (let at = haystack.indexOf(pattern); at !== -1; at = haystack.indexOf(pattern, at + pattern.length)) count += 1;
  return count;
}

/**
 * Contrôle complet d'une archive .xlsx avant exceljs : répertoire central (tailles déclarées, ratio, nombre
 * d'entrées), puis décompression réelle plafonnée (des tailles déclarées mensongères ne passent pas),
 * présence du classeur et nombre de cellules. Lève ImportFormatError (400 illisible, 413 trop volumineux).
 */
export function inspectXlsxArchive(buf: Buffer): { entries: number; uncompressedBytes: number; cells: number } {
  if (buf.length < 4 || buf.readUInt32LE(0) !== SIG_LOCAL) throw new ImportFormatError(UNREADABLE);
  const entries = readZipDirectory(buf);
  if (!entries.some((entry) => entry.name === "xl/workbook.xml")) throw new ImportFormatError(UNREADABLE);

  let total = 0;
  let cells = 0;
  for (const entry of entries) {
    const at = entry.localOffset;
    if (at + 30 > buf.length || buf.readUInt32LE(at) !== SIG_LOCAL) throw new ImportFormatError(UNREADABLE);
    const start = at + 30 + buf.readUInt16LE(at + 26) + buf.readUInt16LE(at + 28);
    const end = start + entry.compressedSize;
    if (end > buf.length) throw new ImportFormatError(UNREADABLE);
    const data = buf.subarray(start, end);
    let content: Buffer;
    if (entry.method === 0) content = data;
    else if (entry.method === 8) {
      try {
        content = inflateRawSync(data, { maxOutputLength: Math.max(1, XLSX_LIMITS.maxUncompressedBytes - total) });
      } catch (error) {
        const code = (error as { code?: unknown }).code;
        if (code === "ERR_BUFFER_TOO_LARGE" || error instanceof RangeError) throw new ImportFormatError(TOO_LARGE, 413);
        throw new ImportFormatError(UNREADABLE);
      }
    } else throw new ImportFormatError(UNREADABLE);
    if (content.length !== entry.size) throw new ImportFormatError(UNREADABLE);
    total += content.length;
    if (total > XLSX_LIMITS.maxUncompressedBytes) throw new ImportFormatError(TOO_LARGE, 413);
    if (/^xl\/worksheets\/[^/]+\.xml$/i.test(entry.name)) {
      cells += countOccurrences(content, "<c ") + countOccurrences(content, "<c>");
      if (cells > XLSX_LIMITS.maxCells) {
        throw new ImportFormatError(
          `Fichier .xlsx trop volumineux : ${XLSX_LIMITS.maxCells.toLocaleString("fr-FR")} cellules au plus (supprimez les colonnes ou feuilles inutiles).`,
          413,
        );
      }
    }
  }
  return { entries: entries.length, uncompressedBytes: total, cells };
}

/** Texte d'une cellule : jamais d'évaluation ; une formule donne son résultat en cache (vide s'il manque). */
export function cellText(value: ExcelJS.CellValue | undefined, depth = 0): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? "" : value.toISOString().slice(0, 10);
  if (typeof value !== "object" || depth > 2) return "";
  const object = value as unknown as Record<string, unknown>;
  // Cellule en erreur : le code (#ERROR!, #REF!…) est rendu tel quel pour que l'import signale la ligne.
  if (typeof object.error === "string") return object.error;
  if ("formula" in object || "sharedFormula" in object) {
    return cellText(object.result as ExcelJS.CellValue | undefined, depth + 1);
  }
  if (Array.isArray(object.richText)) {
    return (object.richText as { text?: unknown }[]).map((part) => (typeof part.text === "string" ? part.text : "")).join("");
  }
  if ("hyperlink" in object) {
    const text = cellText(object.text as ExcelJS.CellValue | undefined, depth + 1);
    return text || (typeof object.hyperlink === "string" ? object.hyperlink : "");
  }
  return "";
}

/** Enregistrements de la première feuille d'un fichier .xlsx (ligne = numéro de ligne Excel). */
export async function readXlsxRecords(bytes: Buffer): Promise<TabularRecord[]> {
  inspectXlsxArchive(bytes);
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(bytes as unknown as ExcelJS.Buffer);
  } catch {
    throw new ImportFormatError(UNREADABLE);
  }
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new ImportFormatError("Le fichier .xlsx ne contient aucune feuille.");

  const records: TabularRecord[] = [];
  let rows = 0;
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    rows += 1;
    if (rows > XLSX_LIMITS.maxDataRows + 1) return;
    const cells: string[] = [];
    const last = Math.min(row.cellCount, XLSX_LIMITS.maxColumns);
    for (let column = 1; column <= last; column += 1) cells.push(cellText(row.getCell(column).value));
    records.push({ line: rowNumber, cells });
  });
  if (rows > XLSX_LIMITS.maxDataRows + 1) {
    throw new ImportFormatError(`Trop de lignes : ${XLSX_LIMITS.maxDataRows} lignes de données au plus par fichier .xlsx.`);
  }
  return records;
}

const COLUMN_WIDTHS: Record<(typeof EXPORT_COLUMNS)[number], number> = {
  id: 20,
  nom: 36,
  categorie: 14,
  ville: 18,
  adresse: 36,
  telephone: 17,
  email: 30,
  site: 34,
  statut: 13,
  notes: 40,
  source: 9,
};

/** Classeur .xlsx de l'export : une feuille « Prospects », valeurs en texte, en-tête gras et figé. */
export async function prospectsToXlsx(items: readonly ProspectDto[]): Promise<Buffer> {
  const stream = new PassThrough();
  const chunks: Buffer[] = [];
  stream.on("data", (chunk: Buffer) => chunks.push(chunk));
  const finished = new Promise<void>((resolve, reject) => {
    stream.on("end", resolve);
    stream.on("error", reject);
  });

  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream, useStyles: true, useSharedStrings: true });
  workbook.creator = "Rappel Beauté";
  const sheet = workbook.addWorksheet("Prospects", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = EXPORT_COLUMNS.map((key) => ({ key, width: COLUMN_WIDTHS[key], style: { numFmt: "@" } }));
  const header = sheet.addRow([...EXPORT_COLUMNS]);
  header.font = { bold: true };
  header.commit();
  for (const item of items) {
    // Chaînes uniquement : exceljs n'écrit une formule que pour un objet { formula }, jamais pour un texte.
    sheet.addRow(exportValues(item).map((value) => value ?? null)).commit();
  }
  sheet.commit();
  await workbook.commit();
  await finished;
  return Buffer.concat(chunks);
}
