/**
 * Plan d'import commun aux CSV, fichiers .xlsx et Google Sheets. Module pur (aucun accès base).
 *
 * Colonnes reconnues (casse, accents et ponctuation ignorés) : id, nom|name, categorie|category, ville|city,
 * adresse|address, telephone|tel|phone, email|mail, site|website, statut|status, notes.
 * - Ligne avec un id : candidate à la mise à jour de CETTE fiche (valeurs non vides seulement), vérifiée en base ;
 *   un id inconnu fait de la ligne une nouvelle fiche, sans réutiliser l'id.
 * - Ligne sans id : dédoublonnage par téléphone normalisé (sourceRef 'phone:+212…'), à défaut nom + ville.
 * - Toute valeur fournie mais invalide (téléphone, e-mail, site, statut, longueur) écarte la ligne.
 */
import { createHash } from "node:crypto";
import { cleanCityValue } from "@/lib/prospects/city";
import { pickMoroccanPhone } from "@/lib/prospects/phone";
import { PROSPECT_LIMITS, type ProspectCategory, type ProspectStatus } from "@/lib/prospects/types";
import {
  cleanText,
  foldKey,
  isPlaceholder,
  isProspectId,
  normalizeEmail,
  normalizeWebsite,
  parseCategoryStrict,
  parseStatusLoose,
} from "@/lib/prospects/validation";

export const IMPORT_MAX_ROWS = 20_000;
/** Erreurs renvoyées au plus (le compteur skipped reste exact). */
export const IMPORT_MAX_REPORTED_ERRORS = 200;

export type TabularRecord = { line: number; cells: string[] };

/** Fichier illisible ou hors limites ; `status` est la réponse HTTP à donner. */
export class ImportFormatError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 413 | 422 = 400,
  ) {
    super(message);
    this.name = "ImportFormatError";
  }
}

export const IMPORT_FILE_MAX_BYTES = 2 * 1024 * 1024;

/**
 * Fichier envoyé en base64 { filename, contentBase64 } : extension .xlsx ou .csv seulement, base64 strict
 * (préfixe data:…;base64, toléré), 2 Mo décodés au plus (413), estimé avant tout décodage.
 */
export function decodeImportFile(filename: unknown, contentBase64: unknown): { kind: "xlsx" | "csv"; bytes: Buffer } {
  if (typeof filename !== "string" || !filename.trim() || filename.length > 255) {
    throw new ImportFormatError("Nom de fichier manquant.");
  }
  const extension = /\.(xlsx|csv)$/i.exec(filename.trim())?.[1]?.toLowerCase();
  if (extension !== "xlsx" && extension !== "csv") {
    throw new ImportFormatError("Seuls les fichiers .xlsx et .csv sont acceptés.");
  }
  if (typeof contentBase64 !== "string") throw new ImportFormatError("Contenu du fichier manquant.");
  const base64 = contentBase64.replace(/^data:[^,]{0,200};base64,/i, "").replace(/\s+/g, "");
  if (!base64) throw new ImportFormatError("Fichier vide.");
  if (base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    throw new ImportFormatError("Contenu du fichier invalide (base64 attendu).");
  }
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  if ((base64.length / 4) * 3 - padding > IMPORT_FILE_MAX_BYTES) {
    throw new ImportFormatError("Fichier trop volumineux (2 Mo au plus).", 413);
  }
  const bytes = Buffer.from(base64, "base64");
  if (bytes.length === 0) throw new ImportFormatError("Fichier vide.");
  return { kind: extension, bytes };
}

const SHEET_ERROR = /^#(?:ERROR!|REF!|VALUE!|NAME\?|N\/A|DIV\/0!|NUM!|NULL!|SPILL!|CALC!)$/i;

type ImportField ="id" | "name" | "category" | "city" | "address" | "phone" | "email" | "website" | "status" | "notes";

const HEADER_ALIASES: Record<string, ImportField> = {
  id: "id",
  identifiant: "id",
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
  status: "status",
  statut: "status",
  notes: "notes",
  note: "notes",
};

export function mapImportHeaders(headers: readonly string[]): Partial<Record<ImportField, number>> {
  const map: Partial<Record<ImportField, number>> = {};
  headers.forEach((header, index) => {
    const field = HEADER_ALIASES[foldKey(header)];
    if (field && map[field] === undefined) map[field] = index;
  });
  return map;
}

/** Retire l'apostrophe que l'export CSV ajoute devant = + - @ (aller-retour export → import). */
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

export type ImportRow = {
  line: number;
  /** Fiche visée par la colonne id (forme valide) ; son existence est vérifiée à l'écriture. */
  id: string | null;
  /** Clé de dédoublonnage d'une nouvelle fiche ; null quand le nom manque (ligne utilisable seulement par id). */
  sourceRef: string | null;
  name: string | null;
  /** null : vide ou inconnue (une nouvelle fiche reçoit alors « other », une fiche existante garde la sienne). */
  category: ProspectCategory | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  status: ProspectStatus | null;
  notes: string | null;
};

export type ImportPlan = {
  rows: ImportRow[];
  skipped: number;
  errors: { line: number; error: string }[];
};

/** Analyse les enregistrements (première ligne = en-tête) et renvoie les lignes valides et les lignes écartées. */
export function planTabularImport(records: readonly TabularRecord[]): ImportPlan {
  const nonEmpty = records.filter((record) => record.cells.some((cell) => cell.trim() !== ""));
  if (nonEmpty.length === 0) throw new ImportFormatError("Fichier vide.");
  const [header, ...data] = nonEmpty;
  const columns = mapImportHeaders(header.cells);
  if (columns.name === undefined && columns.id === undefined) {
    throw new ImportFormatError("Colonne « nom » (ou « name ») introuvable sur la première ligne.");
  }
  if (data.length > IMPORT_MAX_ROWS) {
    throw new ImportFormatError(`Trop de lignes : ${IMPORT_MAX_ROWS} au maximum par import.`, 413);
  }

  const rows: ImportRow[] = [];
  const errors: ImportPlan["errors"] = [];
  let skipped = 0;
  const firstLineByKey = new Map<string, number>();
  const skip = (line: number, error: string) => {
    skipped += 1;
    if (errors.length < IMPORT_MAX_REPORTED_ERRORS) errors.push({ line, error });
  };
  const rawOf = (cells: string[], field: ImportField): string | null => {
    const index = columns[field];
    if (index === undefined) return null;
    const raw = cells[index];
    if (raw === undefined) return null;
    const value = unprotect(raw.trim());
    return value && !isPlaceholder(value) ? value : null;
  };
  const cellOf = (cells: string[], field: ImportField) => cleanText(rawOf(cells, field));

  // Erreur de formule d'un tableur (ex. « +212 6… » saisi dans Google Sheets devient #ERROR!) : la ligne est
  // signalée au lieu d'être importée avec une valeur perdue.
  const formulaError = (cells: string[]) =>
    Object.values(columns).some((index) => index !== undefined && SHEET_ERROR.test((cells[index] ?? "").trim()));

  for (const { line, cells } of data) {
    if (formulaError(cells)) {
      skip(line, "Erreur de formule dans la feuille : saisissez la valeur comme du texte (ex. '+212…).");
      continue;
    }
    const idRaw = cellOf(cells, "id");
    const id = idRaw && isProspectId(idRaw) ? idRaw : null;

    const name = cellOf(cells, "name");
    if (!name && !id) {
      skip(line, "Nom manquant.");
      continue;
    }
    if (name && name.length > PROSPECT_LIMITS.name) {
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
    const statusRaw = cellOf(cells, "status");
    const status = statusRaw ? parseStatusLoose(statusRaw) : null;
    if (statusRaw && !status) {
      skip(line, "Statut inconnu (À contacter, Contacté, Client ou Refus).");
      continue;
    }
    const notes = cleanText(rawOf(cells, "notes"), { multiline: true });
    if (notes && notes.length > PROSPECT_LIMITS.notes) {
      skip(line, `Notes trop longues (${PROSPECT_LIMITS.notes} caractères au plus).`);
      continue;
    }

    const sourceRef = name ? (phone ? `phone:${phone}` : nameCityRef(name, city)) : null;
    const key = id ? `id:${id}` : (sourceRef as string);
    const first = firstLineByKey.get(key);
    if (first !== undefined) {
      skip(line, `Doublon de la ligne ${first}.`);
      continue;
    }
    firstLineByKey.set(key, line);
    rows.push({
      line,
      id,
      sourceRef,
      name,
      category: parseCategoryStrict(cellOf(cells, "category")),
      city,
      address,
      phone,
      email,
      website,
      status,
      notes,
    });
  }
  return { rows, skipped, errors };
}
