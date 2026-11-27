/**
 * Prospection plateforme : salons et instituts à démarcher (table "Prospect").
 * Module pur : aucune dépendance base de données, utilisable par les tests et les scripts.
 */

export const PROSPECT_SOURCES = ["OSM", "CSV", "MANUAL"] as const;
export type ProspectSource = (typeof PROSPECT_SOURCES)[number];

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

export const PROSPECT_STATUSES = ["TO_CONTACT", "CONTACTED", "CUSTOMER", "DECLINED"] as const;
export type ProspectStatus = (typeof PROSPECT_STATUSES)[number];

/** Libellés français des exports (relus par les imports, comme les codes). */
export const PROSPECT_STATUS_LABELS: Record<ProspectStatus, string> = {
  TO_CONTACT: "À contacter",
  CONTACTED: "Contacté",
  CUSTOMER: "Client",
  DECLINED: "Refus",
};

/** Identifiant d'un prospect (préfixe + hexadécimal) ; toute autre forme est traitée comme inconnue. */
export const PROSPECT_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

export const PROSPECT_HAS_FILTERS = ["phone", "email", "website"] as const;
export type ProspectHasFilter = (typeof PROSPECT_HAS_FILTERS)[number];

export const PROSPECT_SORTS = ["name", "city", "updatedAt"] as const;
export type ProspectSort = (typeof PROSPECT_SORTS)[number];

/** Limites de longueur, alignées sur les contraintes de la table. */
export const PROSPECT_LIMITS = {
  name: 200,
  city: 120,
  address: 300,
  email: 254,
  website: 500,
  notes: 2000,
  sourceRef: 300,
  search: 100,
} as const;

/** Données d'un prospect à insérer ou mettre à jour (hors statut et notes, propres à l'équipe). */
export type ProspectUpsertRow = {
  sourceRef: string;
  name: string;
  category: ProspectCategory;
  city: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  website: string | null;
};

export type ProspectDto = {
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
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProspectListFilters = {
  search?: string;
  city?: string;
  category?: ProspectCategory;
  status?: ProspectStatus;
  has?: ProspectHasFilter;
};

export type ProspectListQuery = ProspectListFilters & {
  page: number;
  pageSize: number;
  sort: ProspectSort;
};

export type ProspectStats = {
  total: number;
  withPhone: number;
  withEmail: number;
  withWebsite: number;
  byStatus: Record<ProspectStatus, number>;
};

export type ProspectListResult = {
  items: ProspectDto[];
  total: number;
  page: number;
  pageSize: number;
  cities: { city: string; count: number }[];
  stats: ProspectStats;
  lastSyncedAt: string | null;
};

export function isProspectCategory(value: unknown): value is ProspectCategory {
  return typeof value === "string" && (PROSPECT_CATEGORIES as readonly string[]).includes(value);
}

export function isProspectStatus(value: unknown): value is ProspectStatus {
  return typeof value === "string" && (PROSPECT_STATUSES as readonly string[]).includes(value);
}
