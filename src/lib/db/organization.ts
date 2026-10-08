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

export async function getOrganizationWebsite(organizationId: string): Promise<string | null> {
  const { rows } = await pool.query<{ website: string | null }>(
    `SELECT website FROM "Organization" WHERE id = $1`,
    [organizationId],
  );
  return rows[0]?.website ?? null;
}

export async function setOrganizationWebsite(
  organizationId: string,
  website: string | null,
): Promise<void> {
  await pool.query(
    `UPDATE "Organization" SET website = $1, "updatedAt" = NOW() WHERE id = $2`,
    [website, organizationId],
  );
}

export async function getOrganizationAddress(organizationId: string): Promise<string | null> {
  const { rows } = await pool.query<{ address: string | null }>(
    `SELECT address FROM "Organization" WHERE id = $1`,
    [organizationId],
  );
  return rows[0]?.address ?? null;
}

export async function setOrganizationAddress(
  organizationId: string,
  address: string | null,
): Promise<void> {
  await pool.query(
    `UPDATE "Organization" SET address = $1, "updatedAt" = NOW() WHERE id = $2`,
    [address, organizationId],
  );
}
