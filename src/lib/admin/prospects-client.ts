/**
 * Client navigateur de la page admin « Prospects » (super admin).
 * Types et libellés définis ici : ne jamais importer `@/lib/db/prospects` côté client (pg dans le bundle).
 */

export const PROSPECT_STATUSES = ["TO_CONTACT", "CONTACTED", "CUSTOMER", "DECLINED"] as const;
export type ProspectStatus = (typeof PROSPECT_STATUSES)[number];

export const PROSPECT_CATEGORIES = [
  "hairdresser",
  "barber",
  "beauty",
  "cosmetics",
  "massage",
  "spa",
  "nails",
  "other",
] as const;
export type ProspectCategory = (typeof PROSPECT_CATEGORIES)[number];

export type ProspectSource = "OSM" | "CSV" | "MANUAL";
export type ProspectHas = "phone" | "email" | "website";
export type ProspectSort = "name" | "city" | "updatedAt";

export type Prospect = {
  id: string;
  source: ProspectSource;
  sourceRef: string | null;
  name: string;
  category: ProspectCategory;
  city: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  status: ProspectStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProspectStats = {
  total: number;
  withPhone: number;
  withEmail: number;
  withWebsite: number;
  byStatus: Record<ProspectStatus, number>;
};

export type ProspectListResponse = {
  items: Prospect[];
  total: number;
  page: number;
  pageSize: number;
  cities: { city: string; count: number }[];
  stats: ProspectStats;
  lastSyncedAt: string | null;
};

export type ProspectFilters = {
  search: string;
  city: string;
  category: ProspectCategory | "";
  status: ProspectStatus | "";
  has: ProspectHas | "";
  sort: ProspectSort;
};

export const EMPTY_PROSPECT_FILTERS: ProspectFilters = {
  search: "",
  city: "",
  category: "",
  status: "",
  has: "",
  sort: "name",
};

export const PROSPECT_PAGE_SIZE = 50;
/** Limite annoncée par l'API d'import de fichier (≤ 2 Mo). */
export const PROSPECT_IMPORT_MAX_BYTES = 2 * 1024 * 1024;
export const PROSPECT_IMPORT_EXTENSIONS = [".xlsx", ".csv"] as const;

export const CATEGORY_LABEL: Record<ProspectCategory, string> = {
  hairdresser: "Coiffure",
  barber: "Barbier",
  beauty: "Institut de beauté",
  cosmetics: "Cosmétiques",
  massage: "Massage",
  spa: "Spa",
  nails: "Ongles",
  other: "Autre",
};

export const STATUS_LABEL: Record<ProspectStatus, string> = {
  TO_CONTACT: "À contacter",
  CONTACTED: "Contacté",
  CUSTOMER: "Client",
  DECLINED: "Refusé",
};

export const SOURCE_LABEL: Record<ProspectSource, string> = {
  OSM: "OpenStreetMap",
  CSV: "Import CSV",
  MANUAL: "Saisie manuelle",
};

export const HAS_LABEL: Record<ProspectHas, string> = {
  phone: "Avec téléphone",
  email: "Avec e-mail",
  website: "Avec site",
};

export const SORT_LABEL: Record<ProspectSort, string> = {
  name: "Nom",
  city: "Ville",
  updatedAt: "Mis à jour",
};

export function isFiltering(filters: ProspectFilters): boolean {
  return Boolean(
    filters.search.trim() || filters.city || filters.category || filters.status || filters.has,
  );
}

function filterParams(filters: ProspectFilters): URLSearchParams {
  const params = new URLSearchParams();
  const search = filters.search.trim();
  if (search) params.set("search", search);
  if (filters.city) params.set("city", filters.city);
  if (filters.category) params.set("category", filters.category);
  if (filters.status) params.set("status", filters.status);
  if (filters.has) params.set("has", filters.has);
  params.set("sort", filters.sort);
  return params;
}

/** Requête de liste : filtres + pagination. */
export function buildProspectQuery(filters: ProspectFilters, page: number, pageSize = PROSPECT_PAGE_SIZE): string {
  const params = filterParams(filters);
  params.set("page", String(Math.max(1, Math.floor(page))));
  params.set("pageSize", String(pageSize));
  return params.toString();
}

export type ProspectExportFormat = "xlsx" | "csv";

/**
 * Lien de téléchargement (.xlsx pour Google Sheets / Excel, ou .csv) : mêmes filtres que la liste,
 * sans pagination (tout le résultat filtré). Pas de barre finale : c'est un fichier.
 */
export function prospectsExportHref(filters: ProspectFilters, format: ProspectExportFormat = "csv"): string {
  const query = filterParams(filters).toString();
  return `/api/admin/prospects/export.${format}${query ? `?${query}` : ""}`;
}

/** Lien tel: limité aux chiffres et au « + » initial. */
export function telHref(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 6 || digits.length > 15) return null;
  return `tel:${trimmed.startsWith("+") ? "+" : ""}${digits}`;
}

/**
 * Conversation WhatsApp (wa.me) sans message prérempli : ouvre seulement la discussion.
 * Le téléphone est attendu en E.164 ; un numéro national marocain (06…, 07…, 05…) est converti en 212….
 */
export function whatsappHref(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (!phone.trim().startsWith("+") && digits.startsWith("0") && digits.length === 10) {
    digits = `212${digits.slice(1)}`;
  }
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length < 8 || digits.length > 15) return null;
  return `https://wa.me/${digits}`;
}

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;

export function isPlausibleEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export function mailtoHref(email: string | null | undefined): string | null {
  if (!email) return null;
  const trimmed = email.trim();
  if (!isPlausibleEmail(trimmed)) return null;
  return `mailto:${trimmed}`;
}

/**
 * Site web issu d'OSM/CSV (donnée non fiable) : seul http(s) devient un lien, jamais javascript:, data:, etc.
 * Sans protocole (« salon.ma »), https:// est ajouté.
 */
export function safeWebsiteHref(website: string | null | undefined): string | null {
  if (!website) return null;
  const raw = website.trim();
  if (!raw || /\s/.test(raw)) return null;
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw);
  const candidate = hasScheme ? raw : `https://${raw.replace(/^\/+/, "")}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Libellé court d'un site (sans protocole ni « www. »). */
export function websiteLabel(href: string): string {
  try {
    const url = new URL(href);
    const path = url.pathname === "/" ? "" : url.pathname;
    return `${url.hostname.replace(/^www\./, "")}${path}`;
  } catch {
    return href;
  }
}

export function osmMapHref(latitude: number | null | undefined, longitude: number | null | undefined): string | null {
  if (typeof latitude !== "number" || typeof longitude !== "number") return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  const lat = Number(latitude.toFixed(6));
  const lon = Number(longitude.toFixed(6));
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=18/${lat}/${lon}`;
}

/** Fiche d'origine OpenStreetMap (sourceRef « node/123 », « way/456 », « relation/789 »). */
export function osmObjectHref(sourceRef: string | null | undefined): string | null {
  const m = /^(node|way|relation)[/:](\d+)$/.exec((sourceRef ?? "").trim());
  return m ? `https://www.openstreetmap.org/${m[1]}/${m[2]}` : null;
}

/** Affichage lisible d'un numéro E.164 marocain (+212 6 12 34 56 78) ; sinon la valeur brute. */
export function formatProspectPhone(phone: string): string {
  const m = /^\+212(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(phone.replace(/\s/g, ""));
  return m ? `+212 ${m[1]} ${m[2]} ${m[3]} ${m[4]} ${m[5]}` : phone;
}

// ---------------------------------------------------------------------------
// Appels API (same-origin, cookies inclus, jamais en cache)
// ---------------------------------------------------------------------------

export class ProspectsApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string>;

  constructor(message: string, status: number, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = "ProspectsApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

const NETWORK_ERROR = "Connexion impossible. Vérifiez le réseau puis réessayez.";

function defaultMessage(status: number): string {
  if (status === 401) return "Session expirée. Reconnectez-vous pour continuer.";
  if (status === 403) return "Accès réservé au super administrateur.";
  if (status === 404) return "Service prospects indisponible pour le moment (404).";
  if (status === 413) return "Fichier trop volumineux (2 Mo maximum).";
  if (status === 429) return "Trop de requêtes. Patientez quelques secondes puis réessayez.";
  if (status >= 500) return `Le serveur n'a pas pu traiter la demande (erreur ${status}).`;
  return `Erreur ${status}.`;
}

function normalizeFieldErrors(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, msg] of Object.entries(value as Record<string, unknown>)) {
    if (typeof msg === "string" && msg) out[key] = msg;
    else if (Array.isArray(msg) && typeof msg[0] === "string") out[key] = msg[0];
  }
  return out;
}

async function prospectsFetch<T>(
  path: string,
  init: {
    method?: "GET" | "POST" | "PATCH";
    body?: unknown;
    signal?: AbortSignal;
    /** Remplacent le message du serveur. */
    messages?: Partial<Record<number, string>>;
    /** Utilisés seulement si le serveur ne donne pas de message. */
    fallbackMessages?: Partial<Record<number, string>>;
  } = {},
): Promise<T> {
  const method = init.method ?? "GET";
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      credentials: "include",
      cache: "no-store",
      signal: init.signal,
      headers: method === "GET" ? { Accept: "application/json" } : { Accept: "application/json", "Content-Type": "application/json" },
      body: method === "GET" || init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ProspectsApiError(NETWORK_ERROR, 0);
  }

  if (!res.ok) {
    // Un proxy (502/504) renvoie souvent du HTML : le corps JSON est facultatif.
    const body = (await res.json().catch(() => null)) as { error?: unknown; fieldErrors?: unknown } | null;
    const serverMessage = body && typeof body.error === "string" && body.error ? body.error : null;
    const message =
      init.messages?.[res.status] ?? serverMessage ?? init.fallbackMessages?.[res.status] ?? defaultMessage(res.status);
    throw new ProspectsApiError(message, res.status, normalizeFieldErrors(body?.fieldErrors));
  }

  try {
    return (await res.json()) as T;
  } catch {
    throw new ProspectsApiError("Réponse du serveur illisible.", res.status);
  }
}

export function fetchProspects(filters: ProspectFilters, page: number, signal?: AbortSignal) {
  return prospectsFetch<ProspectListResponse>(`/api/admin/prospects/?${buildProspectQuery(filters, page)}`, { signal });
}

export function updateProspect(id: string, patch: { status?: ProspectStatus; notes?: string | null }) {
  return prospectsFetch<{ item: Prospect }>(`/api/admin/prospects/${encodeURIComponent(id)}/`, {
    method: "PATCH",
    body: patch,
  });
}

export type CreateProspectInput = {
  name: string;
  category: ProspectCategory;
  city?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
};

export function createProspect(input: CreateProspectInput) {
  return prospectsFetch<{ item: Prospect }>("/api/admin/prospects/", { method: "POST", body: input });
}

export type OsmSyncResult = { inserted: number; updated: number; total: number; durationMs: number };

export function syncProspectsFromOsm() {
  return prospectsFetch<OsmSyncResult>("/api/admin/prospects/sync-osm/", {
    method: "POST",
    body: {},
    messages: {
      409: "Une synchronisation OpenStreetMap est déjà en cours. Réessayez dans quelques minutes.",
      502: "OpenStreetMap ne répond pas pour le moment. Réessayez plus tard.",
      504: "OpenStreetMap a mis trop de temps à répondre. Réessayez plus tard.",
    },
  });
}

export type ProspectImportResult = {
  inserted: number;
  updated: number;
  unchanged?: number;
  skipped: number;
  errors: { line: number; error: string }[];
};

/** Extension acceptée (.xlsx ou .csv), sinon null. */
export function importFileExtension(filename: string): (typeof PROSPECT_IMPORT_EXTENSIONS)[number] | null {
  const m = /\.(xlsx|csv)$/i.exec(filename.trim());
  return m ? (`.${m[1].toLowerCase()}` as (typeof PROSPECT_IMPORT_EXTENSIONS)[number]) : null;
}

/** Contenu binaire en base64, par tranches (pas de dépassement de pile sur 2 Mo). */
export async function readFileAsBase64(file: Blob): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function importProspectsFile(input: { filename: string; contentBase64: string }) {
  return prospectsFetch<ProspectImportResult>("/api/admin/prospects/import-file/", {
    method: "POST",
    body: input,
    messages: { 413: "Fichier trop volumineux (2 Mo maximum)." },
  });
}

/** Lien de feuille Google Sheets (docs.google.com/spreadsheets/d/…). */
export function isGoogleSheetUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && url.hostname === "docs.google.com" && /^\/spreadsheets\/d\/[\w-]{10,}/.test(url.pathname);
  } catch {
    return false;
  }
}

export function importProspectsSheet(url: string) {
  return prospectsFetch<ProspectImportResult>("/api/admin/prospects/import-sheet/", {
    method: "POST",
    body: { url: url.trim() },
    fallbackMessages: {
      422: "La feuille n'est pas accessible : partagez-la avec « Toute personne disposant du lien : Lecteur ».",
      502: "Google Sheets ne répond pas pour le moment. Réessayez plus tard ou envoyez le fichier.",
    },
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Casablanca",
  }).format(date);
}
