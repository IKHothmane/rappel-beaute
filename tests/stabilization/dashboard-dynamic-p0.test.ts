import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { resolvePreset } from "@/lib/analytics/period";
import { computeNetRevenue, getAnalyticsOverview } from "@/lib/db/analytics";
import { getSeedOrgId, testId, testPool } from "../helpers/db";
import type { AnalyticsFilters } from "@/types/analytics";

const run = process.env.DATABASE_URL ? describe : describe.skip;

function todayFilters(compare = true): AnalyticsFilters {
  const period = resolvePreset("today");
  return {
    period,
    compare,
    staffId: null,
    serviceId: null,
    resourceId: null,
  };
}

run("P0 — Dashboard données dynamiques", () => {
  it("organisation vide → KPI overview à zéro (jamais de démo)", async () => {
    const orgId = testId("org_empty_dash");
    await testPool.query(
      `INSERT INTO "Organization" (id, name, slug, "updatedAt")
       VALUES ($1, 'Org Vide Dashboard', $2, NOW())
       ON CONFLICT (id) DO NOTHING`,
      [orgId, `empty-dash-${orgId.slice(-8)}`],
    );

    const overview = await getAnalyticsOverview(orgId, todayFilters(true));

    expect(overview.revenue.value).toBe(0);
    expect(overview.appointments.value).toBe(0);
    expect(overview.customers.value).toBe(0);
    expect(overview.expenses.value).toBe(0);
    expect(overview.margin.value).toBe(0);
    expect(overview.averageTicket.value).toBe(0);

    await testPool.query(`DELETE FROM "Organization" WHERE id = $1`, [orgId]);
  });

  it("UPDATE Payment → CA net overview / computeNetRevenue change", async () => {
    const orgId = await getSeedOrgId();
    const f = todayFilters(false);
    const payId = testId("pay_dash");

    await testPool.query(
      `INSERT INTO "Payment" (
        id, "organizationId", amount, method, kind, status, "idempotencyKey", "paidAt", "updatedAt"
      ) VALUES ($1, $2, 100, 'CASH', 'PAYMENT', 'COMPLETED', $3, $4, NOW())`,
      [payId, orgId, `dash-p0:${payId}`, f.period.startAt],
    );

    try {
      const before = await computeNetRevenue(orgId, f);
      await testPool.query(`UPDATE "Payment" SET amount = 250 WHERE id = $1`, [payId]);
      const after = await computeNetRevenue(orgId, f);
      expect(after).toBe(before + 150);

      const overview = await getAnalyticsOverview(orgId, f);
      expect(overview.revenue.value).toBe(after);
    } finally {
      await testPool.query(`DELETE FROM "Payment" WHERE id = $1`, [payId]);
    }
  });
});

describe("P0 — aucun hardcode démo Dashboard/Agenda/Settings", () => {
  const roots = [
    path.join(process.cwd(), "src", "app", "domains", "app", "dashboard"),
    path.join(process.cwd(), "src", "app", "domains", "app", "settings", "users"),
    path.join(process.cwd(), "src", "components", "dashboard"),
    path.join(process.cwd(), "src", "components", "agenda"),
  ];

  const forbidden = [
    "4 850",
    "4850",
    '"78%"',
    "'78%'",
    "value=\"12\"",
    "value=\"8\"",
    "from \"@/lib/app-mock\"",
    "from '@/lib/app-mock'",
    "from \"@/data/mock-agenda\"",
    "from '@/data/mock-agenda'",
    "new Date(2026, 7, 30)",
  ];

  function walk(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];
    const out: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) out.push(...walk(full));
      else if (/\.(tsx?|jsx?)$/.test(entry.name)) out.push(full);
    }
    return out;
  }

  it("fichiers institut sans valeurs de démonstration", () => {
    const hits: string[] = [];
    for (const root of roots) {
      for (const file of walk(root)) {
        const src = fs.readFileSync(file, "utf8");
        for (const needle of forbidden) {
          if (src.includes(needle)) {
            hits.push(`${path.relative(process.cwd(), file)} → ${needle}`);
          }
        }
      }
    }
    expect(hits, hits.join("\n")).toEqual([]);
  });
});
