/**
 * Validation des entrées de la prospection (API, CSV, OpenStreetMap). Module pur.
 */
import { cleanCityValue } from "@/lib/prospects/city";
import { pickMoroccanPhone } from "@/lib/prospects/phone";
import {
  PROSPECT_HAS_FILTERS,
  PROSPECT_ID_RE,
  PROSPECT_LIMITS,
  PROSPECT_SORTS,
  PROSPECT_STATUSES,
  PROSPECT_STATUS_LABELS,
  isProspectCategory,
  isProspectStatus,
  type ProspectCategory,
  type ProspectHasFilter,
  type ProspectListQuery,
  type ProspectSort,
  type ProspectStatus,
} from "@/lib/prospects/types";

/** Même forme d'adresse que l'authentification : un « @ », un point dans le domaine, aucun espace ni séparateur. */
const EMAIL_RE = /^[^\s@,;:<>"()[\]\\]+@[^\s@,;:<>"()[\]\\]+\.[^\s@,;:<>"()[\]\\]+$/;
/** Caractères de contrôle (hors tabulation et sauts de ligne, traités à part). */
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Espaces normalisés, caractères de contrôle retirés ; chaîne vide → null. */
export function cleanText(value: unknown, { multiline = false } = {}): string | null {
  if (typeof value !== "string") return null;
  let text = value.replace(CONTROL_CHARS, "").normalize("NFC");
  text = multiline
    ? text.replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim()
    : text.replace(/\s+/g, " ").trim();
  return text ? text : null;
}

export function normalizeEmail(value: unknown): string | null {
  const text = cleanText(value);
  if (!text) return null;
  const email = text.replace(/^mailto:/i, "").toLowerCase();
  return email.length <= PROSPECT_LIMITS.email && EMAIL_RE.test(email) ? email : null;
}

/**
 * Site web http(s) uniquement. « www.exemple.ma » reçoit https:// ; tout autre schéma (javascript:, data:, ftp:)
 * ou une URL avec identifiants est refusé.
 */
export function normalizeWebsite(value: unknown): string | null {
  const text = cleanText(value);
  if (!text || text.length > PROSPECT_LIMITS.website) return null;
  let candidate = text;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(candidate)) {
    if (!/^[\p{L}\p{N}-]+(\.[\p{L}\p{N}-]+)+(:\d+)?([/?#].*)?$/u.test(candidate)) return null;
    candidate = `https://${candidate}`;
  }
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  if (!url.hostname.includes(".")) return null;
  const href = url.href;
  return href.length <= PROSPECT_LIMITS.website ? href : null;
}

/** Valeurs d'un tableur signifiant « vide ». */
const PLACEHOLDERS = new Set(["-", "--", "/", "n/a", "na", "nc", "n.c.", "aucun", "aucune", "none", "null", "néant", "neant", "?"]);
export function isPlaceholder(value: string | null | undefined): boolean {
  return !value || PLACEHOLDERS.has(value.trim().toLowerCase());
}

/** Catégories saisies à la main ou dans un CSV (valeurs techniques et libellés français). */
const CATEGORY_SYNONYMS: Record<string, ProspectCategory> = {
  coiffeur: "hairdresser",
  coiffeuse: "hairdresser",
  coiffure: "hairdresser",
  salondecoiffure: "hairdresser",
  barbier: "barber",
  barbershop: "barber",
  beaute: "beauty",
  institut: "beauty",
  institutdebeaute: "beauty",
  esthetique: "beauty",
  estheticienne: "beauty",
  cosmetique: "cosmetics",
  cosmetiques: "cosmetics",
  parfumerie: "cosmetics",
  hammam: "spa",
  ongles: "nails",
  onglerie: "nails",
  manucure: "nails",
  nailsalon: "nails",
  autre: "other",
};

export function foldKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Catégorie reconnue (code ou libellé français), sinon null. */
export function parseCategoryStrict(value: unknown): ProspectCategory | null {
  if (typeof value !== "string") return null;
  const key = foldKey(value);
  if (!key) return null;
  if (isProspectCategory(key)) return key;
  return CATEGORY_SYNONYMS[key] ?? null;
}

/** Catégorie d'une saisie libre ; une valeur inconnue ou vide vaut « other ». */
export function parseCategoryLoose(value: unknown): ProspectCategory {
  return parseCategoryStrict(value) ?? "other";
}

const STATUS_SYNONYMS: Record<string, ProspectStatus> = {
  ...Object.fromEntries(PROSPECT_STATUSES.map((status) => [foldKey(status), status])),
  ...Object.fromEntries(Object.entries(PROSPECT_STATUS_LABELS).map(([status, label]) => [foldKey(label), status as ProspectStatus])),
  contactee: "CONTACTED",
  refuse: "DECLINED",
  refusee: "DECLINED",
};

/** Statut d'un import : code (TO_CONTACT…) ou libellé français (« À contacter »…), sinon null. */
export function parseStatusLoose(value: unknown): ProspectStatus | null {
  if (typeof value !== "string") return null;
  return STATUS_SYNONYMS[foldKey(value)] ?? null;
}

export const isProspectId = (value: unknown): value is string => typeof value === "string" && PROSPECT_ID_RE.test(value);

export type FieldErrors = Partial<Record<"name" | "category" | "city" | "address" | "phone" | "email" | "website" | "status" | "notes", string>>;

export type ManualProspectInput = {
  name: string;
  category: ProspectCategory;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
};

const optionalString = (body: Record<string, unknown>, key: string): { ok: true; value: string | null } | { ok: false } => {
  const raw = body[key];
  if (raw === undefined || raw === null) return { ok: true, value: null };
  if (typeof raw !== "string") return { ok: false };
  return { ok: true, value: cleanText(raw) };
};

/** Corps de POST /api/admin/prospects : validation stricte, toutes les erreurs de champ d'un coup. */
export function parseManualProspect(
  body: Record<string, unknown>,
): { ok: true; value: ManualProspectInput } | { ok: false; fieldErrors: FieldErrors } {
  const fieldErrors: FieldErrors = {};

  const name = typeof body.name === "string" ? cleanText(body.name) : null;
  if (!name) fieldErrors.name = "Nom requis.";
  else if (name.length > PROSPECT_LIMITS.name) fieldErrors.name = `Nom limité à ${PROSPECT_LIMITS.name} caractères.`;

  const category = body.category;
  if (!isProspectCategory(category)) fieldErrors.category = "Catégorie invalide.";

  const city = optionalString(body, "city");
  let cityValue: string | null = null;
  if (!city.ok) fieldErrors.city = "Ville invalide.";
  else if (city.value) {
    cityValue = cleanCityValue(city.value);
    if (cityValue && cityValue.length > PROSPECT_LIMITS.city) fieldErrors.city = `Ville limitée à ${PROSPECT_LIMITS.city} caractères.`;
  }

  const address = optionalString(body, "address");
  if (!address.ok) fieldErrors.address = "Adresse invalide.";
  else if (address.value && address.value.length > PROSPECT_LIMITS.address) {
    fieldErrors.address = `Adresse limitée à ${PROSPECT_LIMITS.address} caractères.`;
  }

  const phoneRaw = optionalString(body, "phone");
  let phone: string | null = null;
  if (!phoneRaw.ok) fieldErrors.phone = "Téléphone invalide.";
  else if (phoneRaw.value) {
    phone = pickMoroccanPhone([phoneRaw.value]);
    if (!phone) fieldErrors.phone = "Téléphone marocain invalide (ex. 06 00 00 00 00 ou +212 6 00 00 00 00).";
  }

  const emailRaw = optionalString(body, "email");
  let email: string | null = null;
  if (!emailRaw.ok) fieldErrors.email = "E-mail invalide.";
  else if (emailRaw.value) {
    email = normalizeEmail(emailRaw.value);
    if (!email) fieldErrors.email = "E-mail invalide.";
  }

  const websiteRaw = optionalString(body, "website");
  let website: string | null = null;
  if (!websiteRaw.ok) fieldErrors.website = "Site web invalide.";
  else if (websiteRaw.value) {
    website = normalizeWebsite(websiteRaw.value);
    if (!website) fieldErrors.website = "Site web invalide (http ou https uniquement).";
  }

  if (Object.keys(fieldErrors).length > 0 || !name || !isProspectCategory(category)) {
    return { ok: false, fieldErrors };
  }
  return {
    ok: true,
    value: {
      name,
      category,
      city: cityValue,
      address: address.ok ? address.value : null,
      phone,
      email,
      website,
    },
  };
}

export type ProspectPatch = { status?: ProspectStatus; notes?: string | null };

/** Corps de PATCH /api/admin/prospects/[id] : seuls status et notes sont admis. */
export function parseProspectPatch(
  body: Record<string, unknown>,
): { ok: true; value: ProspectPatch } | { ok: false; error: string; fieldErrors?: FieldErrors } {
  const allowed = new Set(["status", "notes"]);
  const unknownKeys = Object.keys(body).filter((key) => !allowed.has(key));
  if (unknownKeys.length > 0) return { ok: false, error: "Seuls le statut et les notes sont modifiables." };

  const patch: ProspectPatch = {};
  const fieldErrors: FieldErrors = {};
  if ("status" in body) {
    if (isProspectStatus(body.status)) patch.status = body.status;
    else fieldErrors.status = "Statut invalide.";
  }
  if ("notes" in body) {
    if (body.notes === null) patch.notes = null;
    else if (typeof body.notes !== "string") fieldErrors.notes = "Notes invalides.";
    else {
      const notes = cleanText(body.notes, { multiline: true });
      if (notes && notes.length > PROSPECT_LIMITS.notes) fieldErrors.notes = `Notes limitées à ${PROSPECT_LIMITS.notes} caractères.`;
      else patch.notes = notes;
    }
  }
  if (Object.keys(fieldErrors).length > 0) return { ok: false, error: "Données invalides.", fieldErrors };
  if (!("status" in patch) && !("notes" in patch)) return { ok: false, error: "Aucune modification." };
  return { ok: true, value: patch };
}

const UNSET = new Set(["", "all", "tous", "toutes"]);
const isUnset = (value: string | null) => value === null || UNSET.has(value.trim().toLowerCase());

function parsePositiveInt(raw: string | null, fallback: number): number | null {
  if (isUnset(raw)) return fallback;
  const text = (raw as string).trim();
  if (!/^\d{1,6}$/.test(text)) return null;
  const value = Number(text);
  return value >= 1 ? value : null;
}

export const PROSPECT_PAGE_SIZE_MAX = 200;

/** Filtres de GET /api/admin/prospects et de l'export. Une valeur hors liste répond 400. */
export function parseProspectFilters(
  params: URLSearchParams,
): { ok: true; value: ProspectListQuery } | { ok: false; error: string } {
  const search = params.get("search");
  const city = params.get("city");
  const category = params.get("category");
  const status = params.get("status");
  const has = params.get("has");
  const sort = params.get("sort");

  const query: ProspectListQuery = { page: 1, pageSize: 50, sort: "name" };
  if (!isUnset(search)) {
    const text = cleanText(search);
    if (text && text.length > PROSPECT_LIMITS.search) return { ok: false, error: "Recherche trop longue." };
    if (text) query.search = text;
  }
  if (!isUnset(city)) {
    const text = cleanText(city);
    if (text && text.length > PROSPECT_LIMITS.city) return { ok: false, error: "Ville invalide." };
    if (text) query.city = text;
  }
  if (!isUnset(category)) {
    if (!isProspectCategory(category)) return { ok: false, error: "Catégorie invalide." };
    query.category = category;
  }
  if (!isUnset(status)) {
    if (!isProspectStatus(status)) return { ok: false, error: "Statut invalide." };
    query.status = status;
  }
  if (!isUnset(has)) {
    if (!(PROSPECT_HAS_FILTERS as readonly string[]).includes(has as string)) return { ok: false, error: "Filtre invalide." };
    query.has = has as ProspectHasFilter;
  }
  if (!isUnset(sort)) {
    if (!(PROSPECT_SORTS as readonly string[]).includes(sort as string)) return { ok: false, error: "Tri invalide." };
    query.sort = sort as ProspectSort;
  }
  const page = parsePositiveInt(params.get("page"), 1);
  const pageSize = parsePositiveInt(params.get("pageSize"), 50);
  if (page === null || pageSize === null) return { ok: false, error: "Pagination invalide." };
  query.page = Math.min(page, 100_000);
  query.pageSize = Math.min(pageSize, PROSPECT_PAGE_SIZE_MAX);
  return { ok: true, value: query };
}
