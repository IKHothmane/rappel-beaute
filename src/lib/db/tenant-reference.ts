import type { PoolClient } from "pg";

/** Check and lock a reference in the caller's transaction, never in a separate pool query. */
export async function assertTenantReference(
  client: PoolClient,
  organizationId: string,
  table: "Supplier" | "Customer" | "Payment" | "User",
  id: string | null | undefined,
): Promise<void> {
  if (id == null) return;
  const { rowCount } = await client.query(
    `SELECT id FROM "${table}" WHERE id = $1 AND "organizationId" = $2 FOR SHARE`,
    [id, organizationId],
  );
  // Same error for a missing record and a record owned by another tenant.
  if (!rowCount) throw new Error("REFERENCE_NOT_FOUND");
}
