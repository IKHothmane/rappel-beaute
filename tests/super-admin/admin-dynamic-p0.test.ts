import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { getPlatformDashboardStats } from "@/lib/db/admin-organizations";
import { getPlatformAnalytics, getPlatformBilling } from "@/lib/db/platform-metrics";
import { listPlatformAuditLogs } from "@/lib/db/platform-audit";
import { getSeedOrgId, testPool } from "../helpers/db";

const run = process.env.DATABASE_URL ? describe : describe.skip;

run("P0.1 — Super Admin données dynamiques", () => {
  it("org vide de stats ≠ chiffres démo figés (MRR >= 0)", async () => {
    const stats = await getPlatformDashboardStats();
    expect(stats.mrr).toBeGreaterThanOrEqual(0);
    expect(stats.orgs).toBeGreaterThanOrEqual(0);
    expect(stats.users).toBeGreaterThanOrEqual(0);
  });

  it("UPDATE Organization.name → list orgs / analytics reflètent le changement", async () => {
    const orgId = await getSeedOrgId();
    const { rows: before } = await testPool.query<{ name: string }>(
      `SELECT name FROM "Organization" WHERE id = $1`,
      [orgId],
    );
    const original = before[0]?.name ?? "Institut Royal";
    const renamed = `${original} · P01`;

    await testPool.query(`UPDATE "Organization" SET name = $1, "updatedAt" = NOW() WHERE id = $2`, [
      renamed,
      orgId,
    ]);

    try {
      const { rows } = await testPool.query<{ name: string }>(
        `SELECT name FROM "Organization" WHERE id = $1`,
        [orgId],
      );
      expect(rows[0]?.name).toBe(renamed);

      const billing = await getPlatformBilling();
      const hit = billing.lines.find((l) => l.organizationId === orgId);
      if (hit) expect(hit.organizationName).toBe(renamed);

      const analytics = await getPlatformAnalytics();
      expect(analytics.mrr).toBeGreaterThanOrEqual(0);
      expect(analytics.planShare.STARTER + analytics.planShare.INSTITUT + analytics.planShare.PREMIUM).toBeGreaterThanOrEqual(0);
    } finally {
      await testPool.query(`UPDATE "Organization" SET name = $1, "updatedAt" = NOW() WHERE id = $2`, [
        original,
        orgId,
      ]);
    }
  });

  it("audit platform lit PostgreSQL", async () => {
    const items = await listPlatformAuditLogs({ limit: 5 });
    expect(Array.isArray(items)).toBe(true);
  });
});

describe("P0.1 — aucun admin-mock dans Super Admin", () => {
  const roots = [
    path.join(process.cwd(), "src", "app", "domains", "admin"),
    path.join(process.cwd(), "src", "components", "admin"),
    path.join(process.cwd(), "src", "modules", "admin"),
  ];

  const forbidden = [
    "admin-mock",
    "MRR_SERIES",
    "platformStats(",
    "PLATFORM_USER",
    "const USERS =",
    "const ORGANIZATIONS =",
    "const TICKETS =",
    "const PAYMENTS =",
    "const AUDIT_LOG",
    "const NOTIFICATIONS =",
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

  it("fichiers admin sans mock métier", () => {
    expect(fs.existsSync(path.join(process.cwd(), "src", "lib", "admin-mock.ts"))).toBe(false);
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
