import { pool } from "@/lib/db/pool";
import type { OrganizationPaymentHistoryEntry } from "@/types/platform";

function validIso(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

function validAmount(value: unknown): number | null {
  const n = typeof value === "string" && value.trim() ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Payment confirmations recorded by platform administrators for this institute.
 * Amount, currency and period come from the audit event itself (not from the current
 * subscription price). Events written before those fields existed return null for them.
 * The institute is matched like COALESCE("organizationId", "organizationIdSnapshot") so the history
 * stays reachable after the institute row (and its FK link) is gone.
 */
export async function listOrganizationPaymentHistory(
  organizationId: string,
): Promise<OrganizationPaymentHistoryEntry[]> {
  const { rows } = await pool.query<{
    id: string;
    action: "SUBSCRIPTION_MARKED_PAID" | "SUBSCRIPTION_MARKED_UNPAID";
    createdAt: Date;
    platformUserName: string | null;
    after: unknown;
  }>(
    `SELECT id, action, "createdAt", "platformUserName", "after"
     FROM "PlatformAuditLog"
     WHERE ("organizationId" = $1 OR ("organizationId" IS NULL AND "organizationIdSnapshot" = $1))
       AND "entityType" = 'Subscription'
       AND action IN ('SUBSCRIPTION_MARKED_PAID', 'SUBSCRIPTION_MARKED_UNPAID')
     ORDER BY "createdAt" DESC, id DESC
     LIMIT 50`,
    [organizationId],
  );
  return rows.map((row) => {
    const after = row.after && typeof row.after === "object" && !Array.isArray(row.after)
      ? (row.after as Record<string, unknown>)
      : {};
    const currency = typeof after.currency === "string" && after.currency.trim() ? after.currency.trim() : null;
    return {
      id: row.id,
      paid: row.action === "SUBSCRIPTION_MARKED_PAID",
      recordedAt: row.createdAt.toISOString(),
      recordedBy: row.platformUserName,
      amount: validAmount(after.priceSnapshot),
      currency,
      periodStart: validIso(after.periodStart),
      periodEnd: validIso(after.periodEnd ?? after.currentPeriodEnd),
    };
  });
}
