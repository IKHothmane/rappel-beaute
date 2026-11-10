import { randomBytes } from "crypto";
import { Pool } from "pg";
import { withTenantIsolation } from "@/lib/db/tenant-pool";
import { SERVICE_NAME_SUGGESTIONS } from "@/lib/services/catalog-names";

const pool = withTenantIsolation(new Pool({ connectionString: process.env.DATABASE_URL }));

function newId() {
  return `scd_${randomBytes(8).toString("hex")}`;
}

export type ServiceCatalogDefaultItem = {
  name: string;
  imageUrl: string | null;
  updatedAt: string | null;
};

export async function listServiceCatalogDefaults(): Promise<ServiceCatalogDefaultItem[]> {
  const { rows } = await pool.query<{ name: string; imageUrl: string; updatedAt: Date }>(
    `SELECT name, "imageUrl", "updatedAt" FROM "ServiceCatalogDefault"`,
  );
  const byName = new Map(rows.map((row) => [row.name, row]));

  return SERVICE_NAME_SUGGESTIONS.map((name) => {
    const row = byName.get(name);
    return {
      name,
      imageUrl: row?.imageUrl ?? null,
      updatedAt: row?.updatedAt?.toISOString() ?? null,
    };
  });
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
  const allowed = (SERVICE_NAME_SUGGESTIONS as readonly string[]).includes(name);
  if (!allowed) throw new Error("UNKNOWN_SERVICE_NAME");

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
