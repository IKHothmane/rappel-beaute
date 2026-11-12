import { randomBytes } from "crypto";
import { SERVICE_NAME_SUGGESTIONS } from "@/lib/services/catalog-names";
import { pool } from "@/lib/db/pool";

function newId() {
  return `scd_${randomBytes(8).toString("hex")}`;
}

type ServiceCatalogDefaultItem = {
  name: string;
  imageUrl: string | null;
  updatedAt: string | null;
  /** "suggested" = liste de la plateforme ; "added" = service créé par un institut. */
  source?: "suggested" | "added";
  /** Nombre d’instituts qui proposent ce service. */
  usedBy?: number;
};

export const SERVICE_NAME_MAX_LENGTH = 120;

const normalizeName = (name: string) => name.trim().replace(/\s+/g, " ").toLowerCase();

/** Tous les services : suggestions plateforme + services ajoutés par les instituts (sans doublons). */
export async function listServiceCatalogDefaults(): Promise<ServiceCatalogDefaultItem[]> {
  const [{ rows }, { rows: added }] = await Promise.all([
    pool.query<{ name: string; imageUrl: string; updatedAt: Date }>(
      `SELECT name, "imageUrl", "updatedAt" FROM "ServiceCatalogDefault"`,
    ),
    pool.query<{ name: string; usedBy: string }>(
      `SELECT MIN(TRIM(name)) AS name, COUNT(DISTINCT "organizationId")::text AS "usedBy"
       FROM "Service"
       WHERE TRIM(name) <> ''
       GROUP BY LOWER(REGEXP_REPLACE(TRIM(name), '\\s+', ' ', 'g'))`,
    ),
  ]);
  const byName = new Map(rows.map((row) => [normalizeName(row.name), row]));
  const usage = new Map(added.map((row) => [normalizeName(row.name), parseInt(row.usedBy, 10)]));

  const toItem = (name: string, source: "suggested" | "added"): ServiceCatalogDefaultItem => {
    const key = normalizeName(name);
    const row = byName.get(key);
    return {
      name: row?.name ?? name,
      imageUrl: row?.imageUrl ?? null,
      updatedAt: row?.updatedAt?.toISOString() ?? null,
      source,
      usedBy: usage.get(key) ?? 0,
    };
  };

  const seen = new Set<string>();
  const items: ServiceCatalogDefaultItem[] = [];
  for (const name of SERVICE_NAME_SUGGESTIONS) {
    seen.add(normalizeName(name));
    items.push(toItem(name, "suggested"));
  }
  const extra = [...added.map((r) => r.name), ...rows.map((r) => r.name)]
    .filter((name) => !seen.has(normalizeName(name)) && seen.add(normalizeName(name)))
    .sort((a, b) => a.localeCompare(b, "fr"));
  for (const name of extra) items.push(toItem(name, "added"));
  return items;
}

export async function getServiceCatalogDefaultsMap(): Promise<Record<string, string>> {
  const { rows } = await pool.query<{ name: string; imageUrl: string }>(
    `SELECT name, "imageUrl" FROM "ServiceCatalogDefault" WHERE "imageUrl" IS NOT NULL AND "imageUrl" <> ''`,
  );
  const map: Record<string, string> = {};
  for (const row of rows) map[row.name] = row.imageUrl;
  return map;
}

export async function upsertServiceCatalogDefault(
  name: string,
  imageUrl: string,
  updatedBy?: string | null,
): Promise<ServiceCatalogDefaultItem> {
  if (!name.trim() || name.length > SERVICE_NAME_MAX_LENGTH) throw new Error("UNKNOWN_SERVICE_NAME");

  const { rows } = await pool.query<{ name: string; imageUrl: string; updatedAt: Date }>(
    `INSERT INTO "ServiceCatalogDefault" (id, name, "imageUrl", "updatedAt", "updatedBy", "createdAt")
     VALUES ($1, $2, $3, NOW(), $4, NOW())
     ON CONFLICT (name) DO UPDATE SET
       "imageUrl" = EXCLUDED."imageUrl",
       "updatedAt" = NOW(),
       "updatedBy" = EXCLUDED."updatedBy"
     RETURNING name, "imageUrl", "updatedAt"`,
    [newId(), name, imageUrl, updatedBy ?? null],
  );

  const row = rows[0]!;
  return {
    name: row.name,
    imageUrl: row.imageUrl,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function deleteServiceCatalogDefault(name: string): Promise<void> {
  await pool.query(`DELETE FROM "ServiceCatalogDefault" WHERE name = $1`, [name]);
}
