import { describe, expect, it } from "vitest";
import { resolveCustomPeriod } from "@/lib/analytics/period";
import {
  computeNetRevenue,
  getAnalyticsOverview,
  getRefundStats,
  getStockLedgerReport,
} from "@/lib/db/analytics";
import { buildFinanceReport, buildReportByType, canAccessReportType } from "@/lib/reports/service";
import { buildReportExport } from "@/lib/reports/export";
import { parseReportExportParams } from "@/lib/validation/reports";
import { ensureSecondOrg, getSeedOrgId, testPool } from "../helpers/db";
import type { AnalyticsFilters } from "@/types/analytics";

const run = process.env.DATABASE_URL ? describe : describe.skip;

function filters(from: string, to: string, extra?: Partial<AnalyticsFilters>): AnalyticsFilters {
  return {
    period: resolveCustomPeriod(from, to),
    compare: false,
    staffId: null,
    serviceId: null,
    resourceId: null,
    ...extra,
  };
}

run("Reports — KPI identiques à Analytics", () => {
  it("rapport finance = overview analytics + remboursements", async () => {
    const orgId = await getSeedOrgId();
    const f = filters("2026-08-01", "2026-08-31");
    const [overview, report] = await Promise.all([
      getAnalyticsOverview(orgId, f),
      buildFinanceReport(orgId, f, "Institut Royal"),
    ]);

    expect(report.overview.revenue.value).toBe(overview.revenue.value);
    expect(report.overview.expenses.value).toBe(overview.expenses.value);
    expect(report.overview.margin.value).toBe(overview.margin.value);
    expect(report.overview.averageTicket.value).toBe(overview.averageTicket.value);
    expect(report.refunds).toEqual(await getRefundStats(orgId, f));
  });

  it("buildReportByType finance réutilise les mêmes queries", async () => {
    const orgId = await getSeedOrgId();
    const f = filters("2026-08-01", "2026-08-31");
    const net = await computeNetRevenue(orgId, f);
    const report = (await buildReportByType(orgId, f, "Test", "finance", "full")) as {
      overview: { revenue: { value: number } };
    };
    expect(report.overview.revenue.value).toBe(net);
  });
});

run("Reports — multi-tenant", () => {
  it("Org B n'a pas les KPI de Org A", async () => {
    const orgA = await getSeedOrgId();
    const orgB = await ensureSecondOrg();
    const f = filters("2026-01-01", "2026-12-31");
    const [netA, netB] = await Promise.all([
      computeNetRevenue(orgA, f),
      computeNetRevenue(orgB, f),
    ]);
    expect(netB).toBe(0);
    expect(netA).toBeGreaterThanOrEqual(0);
  });

  it("ledger stock scopé par organizationId", async () => {
    const orgA = await getSeedOrgId();
    const orgB = await ensureSecondOrg();
    const f = filters("2026-01-01", "2026-12-31");
    const [a, b] = await Promise.all([
      getStockLedgerReport(orgA, f),
      getStockLedgerReport(orgB, f),
    ]);
    expect(b).toEqual([]);
    expect(Array.isArray(a)).toBe(true);
  });
});

run("Reports — RBAC", () => {
  it("STAFF limité aux rapports autorisés", () => {
    expect(canAccessReportType("finance", "staff_self")).toBe(true);
    expect(canAccessReportType("customers", "staff_self")).toBe(false);
    expect(canAccessReportType("inventory", "staff_self")).toBe(false);
  });

  it("CASHIER limité finance et global", () => {
    expect(canAccessReportType("finance", "cash_only")).toBe(true);
    expect(canAccessReportType("global", "cash_only")).toBe(true);
    expect(canAccessReportType("staff", "cash_only")).toBe(false);
  });

  it("OWNER accès complet", () => {
    expect(canAccessReportType("marketing", "full")).toBe(true);
    expect(canAccessReportType("reviews", "full")).toBe(true);
  });
});

run("Reports — filtres", () => {
  it("filtre période restreint le CA", async () => {
    const orgId = await getSeedOrgId();
    const wide = filters("2026-01-01", "2026-12-31");
    const narrow = filters("2099-01-01", "2099-01-31");
    const [w, n] = await Promise.all([
      computeNetRevenue(orgId, wide),
      computeNetRevenue(orgId, narrow),
    ]);
    expect(n).toBe(0);
    expect(w).toBeGreaterThanOrEqual(n);
  });

  it("filtre staffId restreint le CA", async () => {
    const orgId = await getSeedOrgId();
    const f = filters("2026-08-01", "2026-08-31");
    const all = await computeNetRevenue(orgId, f);
    const staff = await computeNetRevenue(orgId, { ...f, staffId: "e2" });
    expect(staff).toBeLessThanOrEqual(all);
  });

  it("filtre serviceId restreint le CA", async () => {
    const orgId = await getSeedOrgId();
    const f = filters("2026-08-01", "2026-08-31");
    const all = await computeNetRevenue(orgId, f);
    const svc = await computeNetRevenue(orgId, { ...f, serviceId: "s1" });
    expect(svc).toBeLessThanOrEqual(all);
  });
});

run("Reports — exports serveur", () => {
  it("CSV finance non vide", async () => {
    const orgId = await getSeedOrgId();
    const f = filters("2026-08-01", "2026-08-31");
    const out = await buildReportExport(orgId, f, "Institut Royal", "finance", "csv", "full");
    expect(out.contentType).toContain("csv");
    expect(out.buffer.length).toBeGreaterThan(20);
    expect(out.buffer.toString("utf-8")).toContain("CA net");
  });

  it("XLSX finance génère un buffer valide", async () => {
    const orgId = await getSeedOrgId();
    const f = filters("2026-08-01", "2026-08-31");
    const out = await buildReportExport(orgId, f, "Institut Royal", "finance", "xlsx", "full");
    expect(out.contentType).toContain("spreadsheet");
    expect(out.buffer.subarray(0, 2).toString()).toBe("PK");
  });

  it("PDF finance génère un buffer valide", async () => {
    const orgId = await getSeedOrgId();
    const f = filters("2026-08-01", "2026-08-31");
    const out = await buildReportExport(orgId, f, "Institut Royal", "finance", "pdf", "full");
    expect(out.contentType).toBe("application/pdf");
    expect(out.buffer.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("export staff CSV", async () => {
    const orgId = await getSeedOrgId();
    const f = filters("2026-08-01", "2026-08-31");
    const out = await buildReportExport(orgId, f, "Institut Royal", "staff", "csv", "full");
    expect(out.buffer.toString("utf-8")).toContain("Employée");
  });
});

run("Reports — sécurité paramètres", () => {
  it("parseReportExportParams ignore organizationId client", () => {
    const sp = new URLSearchParams("format=csv&type=finance&organizationId=org_hack");
    const parsed = parseReportExportParams(sp);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.format).toBe("csv");
      expect(parsed.type).toBe("finance");
    }
    expect(sp.has("organizationId")).toBe(false);
  });

  it("format ou type invalides rejetés", () => {
    expect(parseReportExportParams(new URLSearchParams("format=xml&type=finance")).ok).toBe(false);
    expect(parseReportExportParams(new URLSearchParams("format=csv&type=unknown")).ok).toBe(false);
  });
});

run("Reports — audit export (schéma)", () => {
  it("AuditLog accepte REPORT_EXPORTED", async () => {
    const orgId = await getSeedOrgId();
    const { writeAuditLog } = await import("@/lib/db/audit");
    await writeAuditLog({
      organizationId: orgId,
      actorId: "u1",
      entityType: "Report",
      entityId: "finance",
      action: "REPORT_EXPORTED",
      after: { reportType: "finance", format: "csv", periodFrom: "2026-08-01", periodTo: "2026-08-31" },
    });
    const { rows } = await testPool.query<{ action: string }>(
      `SELECT action FROM "AuditLog"
       WHERE "organizationId" = $1 AND action = 'REPORT_EXPORTED'
       ORDER BY "createdAt" DESC LIMIT 1`,
      [orgId],
    );
    expect(rows[0]?.action).toBe("REPORT_EXPORTED");
  });
});
