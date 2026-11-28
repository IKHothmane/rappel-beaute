import type { PoolClient } from "pg";
import type { PlatformSessionUser } from "@/lib/auth/types";
import { newId } from "@/lib/db/ids";
import { writePlatformAuditLog } from "@/lib/db/platform-audit";
import { pool } from "@/lib/db/pool";
import { withTransaction } from "@/lib/db/transaction";
import { IMPORT_MAX_REPORTED_ERRORS, type ImportPlan, type ImportRow } from "@/lib/prospects/import-plan";
import type { ManualProspectInput, ProspectPatch } from "@/lib/prospects/validation";
import {
  PROSPECT_STATUSES,
  type ProspectDto,
  type ProspectListFilters,
  type ProspectListQuery,
  type ProspectListResult,
  type ProspectSort,
  type ProspectSource,
  type ProspectStats,
  type ProspectStatus,
  type ProspectUpsertRow,
} from "@/lib/prospects/types";

/**
 * Prospection du back-office (table plateforme "Prospect", migration 20261126090000_platform_prospects).
 * Accès réservé au rôle rappel_platform : ces fonctions ne s'appellent que depuis une route platformRoute.
 * Les imports (OSM, CSV) ne modifient jamais "status" ni "notes", propres à l'équipe commerciale, et
 * n'effacent jamais une valeur existante avec un champ vide.
 */

type Queryable = Pick<PoolClient, "query">;

const SELECT_COLUMNS = `p.id, p.source, p."sourceRef", p.name, p.category, p.city, p.address, p.latitude, p.longitude,
  p.phone, p.email, p.website, p.status, p.notes, p."lastSyncedAt", p."createdAt", p."updatedAt"`;

type ProspectRow = {
  id: string;
  source: ProspectDto["source"];
  sourceRef: string | null;
  name: string;
  category: ProspectDto["category"];
  city: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  status: ProspectStatus;
  notes: string | null;
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function toDto(row: ProspectRow): ProspectDto {
  return {
    id: row.id,
    source: row.source,
    sourceRef: row.sourceRef,
    name: row.name,
    category: row.category,
    city: row.city,
    address: row.address,
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
    phone: row.phone,
    email: row.email,
    website: row.website,
    status: row.status,
    notes: row.notes,
    lastSyncedAt: row.lastSyncedAt ? row.lastSyncedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (ch) => `\\${ch}`);

/** Clause WHERE paramétrée des filtres de liste et d'export. */
export function buildProspectWhere(filters: ProspectListFilters): { sql: string; params: unknown[] } {
  const params: unknown[] = [];
  const clauses: string[] = [];
  const add = (value: unknown) => {
    params.push(value);
    return `$${params.length}`;
  };
  if (filters.search) {
    const like = add(`%${escapeLike(filters.search)}%`);
    const parts = ["name", "city", "address", "phone", "email"].map((column) => `p.${column} ILIKE ${like} ESCAPE '\\'`);
    // « 06 00 00 » retrouve « +212600000… » : chiffres sans le 0 national ni l'indicatif.
    const digits = filters.search.replace(/\D/g, "");
    if (digits.length >= 4) {
      const national = digits.startsWith("212") ? digits.slice(3) : digits.replace(/^0+/, "");
      if (national.length >= 3) parts.push(`p.phone LIKE ${add(`%${national}%`)}`);
    }
    clauses.push(`(${parts.join(" OR ")})`);
  }
  if (filters.city) clauses.push(`LOWER(p.city) = LOWER(${add(filters.city)})`);
  if (filters.category) clauses.push(`p.category = ${add(filters.category)}`);
  if (filters.status) clauses.push(`p.status = ${add(filters.status)}`);
  if (filters.has === "phone") clauses.push(`p.phone IS NOT NULL`);
  if (filters.has === "email") clauses.push(`p.email IS NOT NULL`);
  if (filters.has === "website") clauses.push(`p.website IS NOT NULL`);
  return { sql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", params };
}

const ORDER_BY: Record<ProspectSort, string> = {
  name: `LOWER(p.name) ASC, p.id ASC`,
  city: `LOWER(p.city) ASC NULLS LAST, LOWER(p.name) ASC, p.id ASC`,
  updatedAt: `p."updatedAt" DESC, p.id ASC`,
};

async function readStats(): Promise<{ stats: ProspectStats; lastSyncedAt: string | null }> {
  const { rows } = await pool.query<Record<string, string | Date | null>>(
    `SELECT COUNT(*)::text AS total,
            COUNT(p.phone)::text AS "withPhone",
            COUNT(p.email)::text AS "withEmail",
            COUNT(p.website)::text AS "withWebsite",
            ${PROSPECT_STATUSES.map((status) => `COUNT(*) FILTER (WHERE p.status = '${status}')::text AS "${status}"`).join(",\n            ")},
            MAX(p."lastSyncedAt") FILTER (WHERE p.source = 'OSM') AS "lastSyncedAt"
     FROM "Prospect" p`,
  );
  const row = rows[0] ?? {};
  const int = (key: string) => parseInt(String(row[key] ?? "0"), 10) || 0;
  const byStatus = Object.fromEntries(PROSPECT_STATUSES.map((status) => [status, int(status)])) as Record<ProspectStatus, number>;
  const last = row.lastSyncedAt instanceof Date ? row.lastSyncedAt.toISOString() : null;
  return {
    stats: { total: int("total"), withPhone: int("withPhone"), withEmail: int("withEmail"), withWebsite: int("withWebsite"), byStatus },
    lastSyncedAt: last,
  };
}

/** Villes présentes (toutes lignes), regroupées sans tenir compte de la casse, les plus fréquentes d'abord. */
async function readCities(): Promise<{ city: string; count: number }[]> {
  const { rows } = await pool.query<{ city: string; count: string }>(
    `SELECT MODE() WITHIN GROUP (ORDER BY p.city) AS city, COUNT(*)::text AS count
     FROM "Prospect" p
     WHERE p.city IS NOT NULL
     GROUP BY LOWER(p.city)
     ORDER BY COUNT(*) DESC, LOWER(MODE() WITHIN GROUP (ORDER BY p.city)) ASC
     LIMIT 500`,
  );
  return rows.map((row) => ({ city: row.city, count: parseInt(row.count, 10) || 0 }));
}

/**
 * Liste filtrée et paginée. `total` compte les lignes filtrées ; `stats`, `cities` et `lastSyncedAt` portent
 * sur toute la table (compteurs et liste de villes du filtre).
 */
export async function listProspects(query: ProspectListQuery): Promise<ProspectListResult> {
  const where = buildProspectWhere(query);
  const offset = (query.page - 1) * query.pageSize;
  const [items, total, summary, cities] = await Promise.all([
    pool.query<ProspectRow>(
      `SELECT ${SELECT_COLUMNS} FROM "Prospect" p ${where.sql}
       ORDER BY ${ORDER_BY[query.sort]}
       LIMIT $${where.params.length + 1} OFFSET $${where.params.length + 2}`,
      [...where.params, query.pageSize, offset],
    ),
    pool.query<{ total: string }>(`SELECT COUNT(*)::text AS total FROM "Prospect" p ${where.sql}`, where.params),
    readStats(),
    readCities(),
  ]);
  return {
    items: items.rows.map(toDto),
    total: parseInt(total.rows[0]?.total ?? "0", 10) || 0,
    page: query.page,
    pageSize: query.pageSize,
    cities,
    stats: summary.stats,
    lastSyncedAt: summary.lastSyncedAt,
  };
}

export const PROSPECT_EXPORT_MAX_ROWS = 50_000;

/** Lignes de l'export CSV (mêmes filtres et tri que la liste, sans pagination, plafonnées). */
export async function listProspectsForExport(query: ProspectListFilters & { sort: ProspectSort }): Promise<ProspectDto[]> {
  const where = buildProspectWhere(query);
  const { rows } = await pool.query<ProspectRow>(
    `SELECT ${SELECT_COLUMNS} FROM "Prospect" p ${where.sql}
     ORDER BY ${ORDER_BY[query.sort]}
     LIMIT $${where.params.length + 1}`,
    [...where.params, PROSPECT_EXPORT_MAX_ROWS],
  );
  return rows.map(toDto);
}

/* ------------------------------------------------------------------------------------------------------------
 * Upsert des imports
 * ---------------------------------------------------------------------------------------------------------- */

/** Colonnes complétées par COALESCE : un champ vide de l'import ne remplace jamais une valeur existante. */
const KEEP_IF_EMPTY = ["city", "address", "latitude", "longitude", "phone", "email", "website"] as const;
const NEXT_VALUES: Record<string, string> = {
  name: `EXCLUDED.name`,
  // « other » (catégorie absente ou inconnue) ne remplace pas une catégorie connue.
  category: `CASE WHEN EXCLUDED.category = 'other' THEN "Prospect".category ELSE EXCLUDED.category END`,
  ...Object.fromEntries(KEEP_IF_EMPTY.map((column) => [column, `COALESCE(EXCLUDED.${column}, "Prospect".${column})`])),
};
const MERGED_COLUMNS = Object.keys(NEXT_VALUES);
const DATA_CHANGED = `(${MERGED_COLUMNS.map((c) => NEXT_VALUES[c]).join(", ")}) IS DISTINCT FROM (${MERGED_COLUMNS.map((c) => `"Prospect".${c}`).join(", ")})`;

/**
 * Cible ON CONFLICT ("source", "sourceRef") = index unique "Prospect_source_sourceRef_key".
 * status et notes ne figurent pas dans le SET : ils restent ceux de l'équipe. "updatedAt" ne change que si une
 * donnée change ; "lastSyncedAt" suit la dernière synchronisation OSM qui a vu la ligne.
 */
const UPSERT_SQL = `
INSERT INTO "Prospect" (id, source, "sourceRef", name, category, city, address, latitude, longitude, phone, email, website,
                        "lastSyncedAt", "createdAt", "updatedAt")
SELECT t.id, $1, t.ref, t.name, t.category, t.city, t.address, t.lat, t.lon, t.phone, t.email, t.website,
       $13::timestamptz, now(), now()
FROM unnest($2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::float8[], $9::float8[],
            $10::text[], $11::text[], $12::text[])
  AS t(id, ref, name, category, city, address, lat, lon, phone, email, website)
ON CONFLICT ("source", "sourceRef") DO UPDATE SET
  ${MERGED_COLUMNS.map((column) => `${column} = ${NEXT_VALUES[column]}`).join(",\n  ")},
  "lastSyncedAt" = COALESCE(EXCLUDED."lastSyncedAt", "Prospect"."lastSyncedAt"),
  "updatedAt" = CASE WHEN ${DATA_CHANGED} THEN now() ELSE "Prospect"."updatedAt" END
RETURNING "sourceRef" AS ref, (xmax = 0) AS inserted, ("updatedAt" = now()) AS touched`;

const UPSERT_CHUNK = 500;

export type UpsertCounts = { inserted: number; updated: number; unchanged: number; total: number };
type UpsertOutcome = { ref: string; inserted: boolean; touched: boolean };

/** Upsert par lots de 500 ; renvoie le résultat de chaque ligne (insérée, données modifiées). */
async function upsertRowsDetailed(
  client: Queryable,
  source: Exclude<ProspectSource, "MANUAL">,
  unique: readonly ProspectUpsertRow[],
  syncedAt: Date | null,
): Promise<UpsertOutcome[]> {
  const outcomes: UpsertOutcome[] = [];
  for (let start = 0; start < unique.length; start += UPSERT_CHUNK) {
    const chunk = unique.slice(start, start + UPSERT_CHUNK);
    const result = await client.query<UpsertOutcome>(UPSERT_SQL, [
      source,
      chunk.map(() => newId("prsp")),
      chunk.map((row) => row.sourceRef),
      chunk.map((row) => row.name),
      chunk.map((row) => row.category),
      chunk.map((row) => row.city),
      chunk.map((row) => row.address),
      chunk.map((row) => row.latitude),
      chunk.map((row) => row.longitude),
      chunk.map((row) => row.phone),
      chunk.map((row) => row.email),
      chunk.map((row) => row.website),
      syncedAt,
    ]);
    outcomes.push(...result.rows);
  }
  return outcomes;
}

/**
 * Upsert par lots (une instruction par lot de 500). Les doublons de "sourceRef" sont retirés avant l'envoi :
 * une même instruction ne peut pas modifier deux fois la même ligne.
 * `updated` : lignes existantes retrouvées (données modifiées ou non) ; `unchanged` : parmi elles, sans changement.
 */
export async function upsertProspectRows(
  client: Queryable,
  source: Exclude<ProspectSource, "MANUAL">,
  rows: readonly ProspectUpsertRow[],
  syncedAt: Date | null,
): Promise<UpsertCounts> {
  const unique = [...new Map(rows.map((row) => [row.sourceRef, row])).values()];
  const counts: UpsertCounts = { inserted: 0, updated: 0, unchanged: 0, total: unique.length };
  for (const row of await upsertRowsDetailed(client, source, unique, syncedAt)) {
    if (row.inserted) counts.inserted += 1;
    else {
      counts.updated += 1;
      if (!row.touched) counts.unchanged += 1;
    }
  }
  return counts;
}

const actorName = (actor: PlatformSessionUser) => `${actor.firstName} ${actor.lastName}`.trim();

/* ------------------------------------------------------------------------------------------------------------
 * Synchronisation OpenStreetMap : une seule à la fois (verrou consultatif PostgreSQL + garde du processus)
 * ---------------------------------------------------------------------------------------------------------- */

export class ProspectSyncBusyError extends Error {
  constructor() {
    super("PROSPECT_SYNC_BUSY");
    this.name = "ProspectSyncBusyError";
  }
}

const SYNC_LOCK_KEY = "rappel:prospects:osm-sync";
const globalForSync = globalThis as unknown as { __rappelProspectSyncRunning?: boolean };

export type OsmSyncResult = UpsertCounts & { durationMs: number };

/**
 * Prend le verrou consultatif de session sur une connexion dédiée AVANT l'appel Overpass (deux synchros
 * n'interrogent jamais Overpass en même temps, y compris sur deux instances), écrit les lignes et le journal
 * d'audit dans une même transaction sur cette connexion, puis rend le verrou. Si le verrou ne peut pas être
 * rendu, la connexion est détruite (le verrou disparaît avec elle) au lieu de revenir au pool.
 */
export async function syncOsmProspects(
  actor: PlatformSessionUser,
  load: () => Promise<{ rows: ProspectUpsertRow[]; stats?: Record<string, number> }>,
): Promise<OsmSyncResult> {
  if (globalForSync.__rappelProspectSyncRunning) throw new ProspectSyncBusyError();
  globalForSync.__rappelProspectSyncRunning = true;
  const started = Date.now();
  let client: PoolClient | null = null;
  let locked = false;
  let broken: Error | undefined;
  try {
    client = await pool.connect();
    const lock = await client.query<{ locked: boolean }>(
      `SELECT pg_try_advisory_lock(hashtextextended($1, 0)) AS locked`,
      [SYNC_LOCK_KEY],
    );
    locked = lock.rows[0]?.locked === true;
    if (!locked) throw new ProspectSyncBusyError();

    const parsed = await load();
    const syncedAt = new Date();
    await client.query("BEGIN");
    try {
      const counts = await upsertProspectRows(client, "OSM", parsed.rows, syncedAt);
      const durationMs = Date.now() - started;
      await writePlatformAuditLog({
        client,
        platformUserId: actor.id,
        platformUserName: actorName(actor),
        entityType: "Prospect",
        entityId: "osm-sync",
        action: "PROSPECTS_OSM_SYNCED",
        after: {
          ...counts,
          durationMs,
          // Compteurs agrégés seulement : aucune donnée d'un commerce dans le journal.
          ...(parsed.stats ? { unnamed: parsed.stats.unnamed ?? 0, places: parsed.stats.places ?? 0 } : {}),
        },
      });
      await client.query("COMMIT");
      return { ...counts, durationMs };
    } catch (error) {
      await client.query("ROLLBACK").catch((rollbackError: unknown) => {
        broken = rollbackError instanceof Error ? rollbackError : new Error(String(rollbackError));
      });
      throw error;
    }
  } finally {
    if (client) {
      if (locked) {
        try {
          const unlock = await client.query<{ unlocked: boolean }>(
            `SELECT pg_advisory_unlock(hashtextextended($1, 0)) AS unlocked`,
            [SYNC_LOCK_KEY],
          );
          if (unlock.rows[0]?.unlocked !== true) broken = new Error("PROSPECT_SYNC_UNLOCK_FAILED");
        } catch (error) {
          broken = error instanceof Error ? error : new Error(String(error));
        }
      }
      client.release(broken);
    }
    globalForSync.__rappelProspectSyncRunning = false;
  }
}

/* ------------------------------------------------------------------------------------------------------------
 * Import CSV, création manuelle, modification du suivi
 * ---------------------------------------------------------------------------------------------------------- */

export type ProspectImportFormat = "csv" | "xlsx" | "google-sheet";
export type ProspectImportResult = {
  inserted: number;
  updated: number;
  unchanged: number;
  skipped: number;
  errors: { line: number; error: string }[];
};

const IMPORT_AUDIT_ACTION: Record<ProspectImportFormat, string> = {
  csv: "PROSPECTS_CSV_IMPORTED",
  xlsx: "PROSPECTS_XLSX_IMPORTED",
  "google-sheet": "PROSPECTS_SHEET_IMPORTED",
};

/**
 * Mise à jour par id : seules les valeurs non vides du fichier remplacent celles de la fiche (COALESCE).
 * Seules les fiches réellement modifiées sont écrites ; "o" (même table) donne l'état d'avant pour compter
 * les changements de statut.
 */
const UPDATE_BY_ID_SQL = `
UPDATE "Prospect" AS p SET
  name = COALESCE(v.name, p.name),
  category = COALESCE(v.category, p.category),
  city = COALESCE(v.city, p.city),
  address = COALESCE(v.address, p.address),
  phone = COALESCE(v.phone, p.phone),
  email = COALESCE(v.email, p.email),
  website = COALESCE(v.website, p.website),
  status = COALESCE(v.status, p.status),
  notes = COALESCE(v.notes, p.notes),
  "updatedAt" = now()
FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::text[], $9::text[], $10::text[])
       AS v(id, name, category, city, address, phone, email, website, status, notes),
     "Prospect" AS o
WHERE p.id = v.id AND o.id = v.id
  AND (COALESCE(v.name, p.name), COALESCE(v.category, p.category), COALESCE(v.city, p.city), COALESCE(v.address, p.address),
       COALESCE(v.phone, p.phone), COALESCE(v.email, p.email), COALESCE(v.website, p.website),
       COALESCE(v.status, p.status), COALESCE(v.notes, p.notes))
      IS DISTINCT FROM (p.name, p.category, p.city, p.address, p.phone, p.email, p.website, p.status, p.notes)
RETURNING p.id, (o.status IS DISTINCT FROM p.status) AS "statusChanged"`;

/** Statut et notes fournis par le fichier pour une fiche retrouvée (ou créée) par sa clé de dédoublonnage. */
const APPLY_TRACKING_SQL = `
UPDATE "Prospect" AS p SET
  status = COALESCE(v.status, p.status),
  notes = COALESCE(v.notes, p.notes),
  "updatedAt" = now()
FROM unnest($2::text[], $3::text[], $4::text[]) AS v(ref, status, notes),
     "Prospect" AS o
WHERE p.source = $1 AND p."sourceRef" = v.ref AND o.id = p.id
  AND (COALESCE(v.status, p.status), COALESCE(v.notes, p.notes)) IS DISTINCT FROM (p.status, p.notes)
RETURNING p."sourceRef" AS ref, (o.status IS DISTINCT FROM p.status) AS "statusChanged"`;

/**
 * Import commun (CSV, .xlsx, Google Sheets), dans une seule transaction avec son journal d'audit (compteurs) :
 * 1. lignes dont l'id désigne une fiche existante (verrouillée) : mise à jour de CETTE fiche, valeurs non vides ;
 * 2. autres lignes (sans id ou id inconnu, jamais réutilisé) : upsert source CSV par téléphone ou nom + ville,
 *    sans toucher statut ni notes ; puis statut / notes du fichier appliqués seulement s'ils sont fournis.
 * `updated` : fiches existantes retrouvées ; `unchanged` : parmi elles, sans aucun changement.
 */
export async function importProspects(
  actor: PlatformSessionUser,
  plan: ImportPlan,
  format: ProspectImportFormat,
): Promise<ProspectImportResult> {
  return withTransaction(async (client) => {
    let skipped = plan.skipped;
    const errors = [...plan.errors];
    const skip = (line: number, error: string) => {
      skipped += 1;
      errors.push({ line, error });
    };

    const candidateIds = [...new Set(plan.rows.map((row) => row.id).filter((id): id is string => !!id))];
    const known = new Set<string>();
    for (let start = 0; start < candidateIds.length; start += UPSERT_CHUNK) {
      const { rows } = await client.query<{ id: string }>(
        `SELECT id FROM "Prospect" WHERE id = ANY($1::text[]) FOR UPDATE`,
        [candidateIds.slice(start, start + UPSERT_CHUNK)],
      );
      for (const row of rows) known.add(row.id);
    }

    const byId: ImportRow[] = [];
    const fresh: (ImportRow & { sourceRef: string; name: string })[] = [];
    const firstLineByRef = new Map<string, number>();
    for (const row of plan.rows) {
      if (row.id && known.has(row.id)) {
        byId.push(row);
        continue;
      }
      if (!row.name || !row.sourceRef) {
        skip(row.line, "Nom manquant (identifiant inconnu).");
        continue;
      }
      const first = firstLineByRef.get(row.sourceRef);
      if (first !== undefined) {
        skip(row.line, `Doublon de la ligne ${first}.`);
        continue;
      }
      firstLineByRef.set(row.sourceRef, row.line);
      fresh.push(row as ImportRow & { sourceRef: string; name: string });
    }

    // 1. Mise à jour par id.
    let idChanged = 0;
    let statusChanged = 0;
    for (let start = 0; start < byId.length; start += UPSERT_CHUNK) {
      const chunk = byId.slice(start, start + UPSERT_CHUNK);
      const { rows } = await client.query<{ id: string; statusChanged: boolean }>(UPDATE_BY_ID_SQL, [
        chunk.map((row) => row.id),
        chunk.map((row) => row.name),
        chunk.map((row) => row.category),
        chunk.map((row) => row.city),
        chunk.map((row) => row.address),
        chunk.map((row) => row.phone),
        chunk.map((row) => row.email),
        chunk.map((row) => row.website),
        chunk.map((row) => row.status),
        chunk.map((row) => row.notes),
      ]);
      idChanged += rows.length;
      statusChanged += rows.filter((row) => row.statusChanged).length;
    }

    // 2. Nouvelles fiches ou fiches retrouvées par téléphone / nom + ville.
    const outcomes = await upsertRowsDetailed(
      client,
      "CSV",
      fresh.map((row) => ({
        sourceRef: row.sourceRef,
        name: row.name,
        category: row.category ?? "other",
        city: row.city,
        address: row.address,
        latitude: null,
        longitude: null,
        phone: row.phone,
        email: row.email,
        website: row.website,
      })),
      null,
    );
    const insertedRefs = new Set(outcomes.filter((row) => row.inserted).map((row) => row.ref));
    const tracked = fresh.filter((row) => row.status || row.notes);
    const trackingChanged = new Set<string>();
    for (let start = 0; start < tracked.length; start += UPSERT_CHUNK) {
      const chunk = tracked.slice(start, start + UPSERT_CHUNK);
      const { rows } = await client.query<{ ref: string; statusChanged: boolean }>(APPLY_TRACKING_SQL, [
        "CSV",
        chunk.map((row) => row.sourceRef),
        chunk.map((row) => row.status),
        chunk.map((row) => row.notes),
      ]);
      for (const row of rows) {
        trackingChanged.add(row.ref);
        if (row.statusChanged && !insertedRefs.has(row.ref)) statusChanged += 1;
      }
    }

    const matched = outcomes.filter((row) => !row.inserted);
    const result: ProspectImportResult = {
      inserted: insertedRefs.size,
      updated: byId.length + matched.length,
      unchanged: byId.length - idChanged + matched.filter((row) => !row.touched && !trackingChanged.has(row.ref)).length,
      skipped,
      errors: errors.sort((a, b) => a.line - b.line).slice(0, IMPORT_MAX_REPORTED_ERRORS),
    };
    await writePlatformAuditLog({
      client,
      platformUserId: actor.id,
      platformUserName: actorName(actor),
      entityType: "Prospect",
      entityId: `${format}-import`,
      action: IMPORT_AUDIT_ACTION[format],
      // Compteurs seulement : aucune donnée d'un prospect dans le journal.
      after: {
        inserted: result.inserted,
        updated: result.updated,
        unchanged: result.unchanged,
        updatedById: byId.length,
        statusChanged,
        skipped: result.skipped,
        errors: errors.length,
      },
    });
    return result;
  });
}

export class ProspectDuplicateError extends Error {
  constructor() {
    super("PROSPECT_DUPLICATE_PHONE");
    this.name = "ProspectDuplicateError";
  }
}

/**
 * Saisie manuelle (source MANUAL, sans "sourceRef"). Un téléphone déjà présent, quelle que soit la source,
 * est refusé ; le verrou de transaction sur ce numéro empêche deux créations simultanées du même prospect.
 */
export async function createManualProspect(actor: PlatformSessionUser, input: ManualProspectInput): Promise<ProspectDto> {
  return withTransaction(async (client) => {
    if (input.phone) {
      await client.query(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, [`rappel:prospects:phone:${input.phone}`]);
      const existing = await client.query(`SELECT 1 FROM "Prospect" WHERE phone = $1 LIMIT 1`, [input.phone]);
      if (existing.rowCount) throw new ProspectDuplicateError();
    }
    const { rows } = await client.query<ProspectRow>(
      `INSERT INTO "Prospect" AS p (id, source, "sourceRef", name, category, city, address, phone, email, website, "updatedAt")
       VALUES ($1, 'MANUAL', NULL, $2, $3, $4, $5, $6, $7, $8, now())
       RETURNING ${SELECT_COLUMNS}`,
      [newId("prsp"), input.name, input.category, input.city, input.address, input.phone, input.email, input.website],
    );
    const item = toDto(rows[0]);
    await writePlatformAuditLog({
      client,
      platformUserId: actor.id,
      platformUserName: actorName(actor),
      entityType: "Prospect",
      entityId: item.id,
      action: "PROSPECT_CREATED",
      after: { source: "MANUAL", category: item.category },
    });
    return item;
  });
}

export class ProspectNotFoundError extends Error {
  constructor() {
    super("PROSPECT_NOT_FOUND");
    this.name = "ProspectNotFoundError";
  }
}

/**
 * Suivi commercial : seuls "status" et "notes" sont modifiables. La ligne est verrouillée (FOR UPDATE) pendant
 * la comparaison ; un changement de statut est journalisé dans la même transaction (statuts avant / après,
 * jamais le texte des notes).
 */
export async function updateProspectTracking(
  actor: PlatformSessionUser,
  id: string,
  patch: ProspectPatch,
): Promise<ProspectDto> {
  return withTransaction(async (client) => {
    const current = await client.query<{ status: ProspectStatus; notes: string | null }>(
      `SELECT status, notes FROM "Prospect" WHERE id = $1 FOR UPDATE`,
      [id],
    );
    const before = current.rows[0];
    if (!before) throw new ProspectNotFoundError();

    const nextStatus = patch.status ?? before.status;
    const nextNotes = patch.notes !== undefined ? patch.notes : before.notes;
    const statusChanged = nextStatus !== before.status;
    const notesChanged = nextNotes !== before.notes;

    const { rows } =
      statusChanged || notesChanged
        ? await client.query<ProspectRow>(
            `UPDATE "Prospect" AS p SET status = $2, notes = $3, "updatedAt" = now()
             WHERE p.id = $1
             RETURNING ${SELECT_COLUMNS}`,
            [id, nextStatus, nextNotes],
          )
        : await client.query<ProspectRow>(`SELECT ${SELECT_COLUMNS} FROM "Prospect" p WHERE p.id = $1`, [id]);

    if (statusChanged) {
      await writePlatformAuditLog({
        client,
        platformUserId: actor.id,
        platformUserName: actorName(actor),
        entityType: "Prospect",
        entityId: id,
        action: "PROSPECT_STATUS_CHANGED",
        before: { status: before.status },
        after: { status: nextStatus, notesChanged },
      });
    }
    return toDto(rows[0]);
  });
}
