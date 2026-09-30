import { pool } from "@/lib/db/pool";

export async function getOrganizationLogoUrl(organizationId: string): Promise<string | null> {
  const { rows } = await pool.query<{ logoUrl: string | null }>(
    `SELECT "logoUrl" FROM "Organization" WHERE id = $1`,
    [organizationId],
  );
  return rows[0]?.logoUrl ?? null;
}

export async function setOrganizationLogoUrl(
  organizationId: string,
  logoUrl: string | null,
): Promise<void> {
  await pool.query(
    `UPDATE "Organization" SET "logoUrl" = $1, "updatedAt" = NOW() WHERE id = $2`,
    [logoUrl, organizationId],
  );
}
