import { randomBytes } from "crypto";
import { Pool } from "pg";
import { RESOURCE_TYPES, type ResourceType } from "@/types/resource";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function newId() {
  return `rcd_${randomBytes(8).toString("hex")}`;
}

export type ResourceCatalogDefaultItem = {
  type: ResourceType;
  imageUrl: string | null;
  updatedAt: string | null;
};

export async function listResourceCatalogDefaults(): Promise<ResourceCatalogDefaultItem[]> {
  const { rows } = await pool.query<{ type: ResourceType; imageUrl: string; updatedAt: Date }>(
    `SELECT type, "imageUrl", "updatedAt" FROM "ResourceCatalogDefault"`,
  );
  const byType = new Map(rows.map((row) => [row.type, row]));

  return RESOURCE_TYPES.map((type) => {
    const row = byType.get(type);
    return {
      type,
      imageUrl: row?.imageUrl ?? null,
      updatedAt: row?.updatedAt?.toISOString() ?? null,
    };
  });
}

export async function getResourceCatalogDefaultsMap(): Promise<Partial<Record<ResourceType, string>>> {
  const { rows } = await pool.query<{ type: ResourceType; imageUrl: string }>(
    `SELECT type, "imageUrl" FROM "ResourceCatalogDefault" WHERE "imageUrl" IS NOT NULL AND "imageUrl" <> ''`,
  );
  const map: Partial<Record<ResourceType, string>> = {};
  for (const row of rows) map[row.type] = row.imageUrl;
  return map;
}

export async function upsertResourceCatalogDefault(
  type: ResourceType,
  imageUrl: string,
  updatedBy?: string | null,
): Promise<ResourceCatalogDefaultItem> {
  if (!RESOURCE_TYPES.includes(type)) throw new Error("UNKNOWN_RESOURCE_TYPE");

  const { rows } = await pool.query<{ type: ResourceType; imageUrl: string; updatedAt: Date }>(
    `INSERT INTO "ResourceCatalogDefault" (id, type, "imageUrl", "updatedAt", "updatedBy", "createdAt")
     VALUES ($1, $2::"ResourceType", $3, NOW(), $4, NOW())
     ON CONFLICT (type) DO UPDATE SET
       "imageUrl" = EXCLUDED."imageUrl",
       "updatedAt" = NOW(),
       "updatedBy" = EXCLUDED."updatedBy"
     RETURNING type, "imageUrl", "updatedAt"`,
    [newId(), type, imageUrl, updatedBy ?? null],
  );

  const row = rows[0]!;
  return {
    type: row.type,
    imageUrl: row.imageUrl,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function deleteResourceCatalogDefault(type: ResourceType): Promise<void> {
  await pool.query(`DELETE FROM "ResourceCatalogDefault" WHERE type = $1::"ResourceType"`, [type]);
}
