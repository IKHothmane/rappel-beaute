import { describe, expect, it } from "vitest";
import { resolveCustomPeriod } from "@/lib/analytics/period";
import { computeNetRevenue } from "@/lib/db/analytics";
import { getSeedOrgId, testPool } from "../helpers/db";
import type { AnalyticsFilters } from "@/types/analytics";

const run = process.env.DATABASE_URL ? describe : describe.skip;

function filters(from: string, to: string): AnalyticsFilters {
  const period = resolveCustomPeriod(from, to);
  return {
    period,
    compare: false,
    staffId: null,
    serviceId: null,
    resourceId: null,
  };
}

run("Analytics — calculs serveur", () => {
  it("CA net = paiements − remboursements", async () => {
    const orgId = await getSeedOrgId();
    const f = filters("2026-08-01", "2026-08-31");
    const net = await computeNetRevenue(orgId, f);

    const { rows } = await testPool.query<{ net: string }>(
      `SELECT COALESCE(SUM(
         CASE WHEN kind = 'REFUND' THEN -amount ELSE amount END
       ), 0)::text AS net
       FROM "Payment"
       WHERE "organizationId" = $1 AND status = 'COMPLETED'
         AND "paidAt" >= $2 AND "paidAt" <= $3`,
      [orgId, f.period.startAt, f.period.endAt],
    );
    const expected = Math.round(parseFloat(rows[0]?.net ?? "0") * 100) / 100;
    expect(net).toBe(expected);
  });

  it("Org A ne voit pas les paiements Org B", async () => {
    const orgA = await getSeedOrgId();
    const orgB = "org_test_stabilization_b";
    await testPool.query(
      `INSERT INTO "Organization" (id, name, slug, "updatedAt")
       VALUES ($1,'Test B','test-b',NOW()) ON CONFLICT DO NOTHING`,
      [orgB],
    );

    const f = filters("2026-01-01", "2026-12-31");
    const netB = await computeNetRevenue(orgB, f);
    const netA = await computeNetRevenue(orgA, f);
    expect(netB).toBe(0);
    expect(netA).toBeGreaterThanOrEqual(0);
  });

  it("filtre staffId restreint le CA", async () => {
    const orgId = await getSeedOrgId();
    const f = filters("2026-08-01", "2026-08-31");
    const all = await computeNetRevenue(orgId, f);
    const staff = await computeNetRevenue(orgId, { ...f, staffId: "e2" });
    expect(staff).toBeLessThanOrEqual(all);
  });
});

run("Analytics — RBAC scope", () => {
  it("STAFF a accès limité analytics", async () => {
    const { getAnalyticsScope } = await import("@/lib/rbac");
    expect(getAnalyticsScope("STAFF")).toBe("staff_self");
    expect(getAnalyticsScope("CASHIER")).toBe("cash_only");
    expect(getAnalyticsScope("OWNER")).toBe("full");
  });
});
