import type { ExportFormat, ReportType } from "@/types/reports";
import {
  customersToCsv,
  financeToCsv,
  inventoryToCsv,
  servicesToCsv,
  staffToCsv,
} from "@/lib/reports/csv";
import { financeToPdf, genericToPdf } from "@/lib/reports/pdf";
import { financeToXlsx, genericToXlsx } from "@/lib/reports/xlsx";
import {
  buildFinanceReport,
  buildReportByType,
  type FinanceReport,
} from "@/lib/reports/service";
import type { AnalyticsFilters } from "@/types/analytics";
import type { AnalyticsScope } from "@/lib/rbac";

export type ExportResult = {
  buffer: Buffer;
  contentType: string;
  filename: string;
};

function filename(type: ReportType, format: ExportFormat, from: string, to: string): string {
  const ext = format === "xlsx" ? "xlsx" : format;
  return `rapport-${type}-${from}_${to}.${ext}`;
}

export async function buildReportExport(
  orgId: string,
  filters: AnalyticsFilters,
  orgName: string,
  type: ReportType,
  format: ExportFormat,
  scope: AnalyticsScope,
): Promise<ExportResult> {
  const meta = { organizationName: orgName, periodFrom: filters.period.from, periodTo: filters.period.to };

  if (type === "finance") {
    const data = await buildFinanceReport(orgId, filters, orgName);
    if (format === "csv") {
      return {
        buffer: Buffer.from(financeToCsv(data), "utf-8"),
        contentType: "text/csv; charset=utf-8",
        filename: filename(type, format, meta.periodFrom, meta.periodTo),
      };
    }
    if (format === "xlsx") {
      return {
        buffer: await financeToXlsx(data),
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename: filename(type, format, meta.periodFrom, meta.periodTo),
      };
    }
    return {
      buffer: await financeToPdf(data),
      contentType: "application/pdf",
      filename: filename(type, format, meta.periodFrom, meta.periodTo),
    };
  }

  const report = (await buildReportByType(orgId, filters, orgName, type, scope)) as Record<
    string,
    unknown
  >;

  if (format === "csv") {
    const csv = csvForType(type, report, meta);
    return {
      buffer: Buffer.from(csv, "utf-8"),
      contentType: "text/csv; charset=utf-8",
      filename: filename(type, format, meta.periodFrom, meta.periodTo),
    };
  }

  if (format === "xlsx") {
    const buffer = await xlsxForType(type, report, meta);
    return {
      buffer,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename: filename(type, format, meta.periodFrom, meta.periodTo),
    };
  }

  const buffer = await pdfForType(type, report, meta);
  return {
    buffer,
    contentType: "application/pdf",
    filename: filename(type, format, meta.periodFrom, meta.periodTo),
  };
}

function csvForType(
  type: ReportType,
  report: Record<string, unknown>,
  meta: { organizationName: string; periodFrom: string; periodTo: string },
): string {
  switch (type) {
    case "staff":
      return staffToCsv({
        meta,
        items: (report.items as { staffName: string; appointments: number; revenue: number; commission: number }[]) ?? [],
      });
    case "customers":
      return customersToCsv({
        meta,
        rows: (report.rows as {
          customerName: string;
          phone: string;
          visits: number;
          netRevenue: number;
          averageTicket: number;
          lastVisitAt: string | null;
          segment: string;
        }[]) ?? [],
      });
    case "services":
      return servicesToCsv({
        meta,
        items: (report.items as {
          serviceName: string;
          appointments: number;
          revenue: number;
          consumableCost: number;
          estimatedMargin: number;
        }[]) ?? [],
      });
    case "inventory":
      return inventoryToCsv({
        meta,
        ledger: (report.ledger as {
          productName: string;
          purchases: number;
          consumption: number;
          sales: number;
          losses: number;
          adjustments: number;
          ledgerBalance: number;
          unit: string;
        }[]) ?? [],
      });
    case "global": {
      const overview = report.overview as FinanceReport["overview"];
      const revenue = report.revenue as FinanceReport["revenue"] | undefined;
      return financeToCsv({
        meta,
        overview,
        revenue: revenue ?? {
          byPaymentMethod: [],
          daily: [],
          totals: { today: 0, week: 0, month: 0, prevMonth: 0, year: 0, periodNet: 0, periodGross: 0, refunds: 0 },
          period: { from: meta.periodFrom, to: meta.periodTo, startAt: new Date(), endAt: new Date() },
          comparePeriod: null,
        },
        refunds: { count: 0, amount: 0 },
      });
    }
    default:
      return `\uFEFFRapport ${type};${meta.organizationName}\nPériode;${meta.periodFrom} → ${meta.periodTo}\n`;
  }
}

async function xlsxForType(
  type: ReportType,
  report: Record<string, unknown>,
  meta: { organizationName: string; periodFrom: string; periodTo: string },
): Promise<Buffer> {
  if (type === "global" && report.overview) {
    const fakeFinance: FinanceReport = {
      meta: {
        organizationName: meta.organizationName,
        reportType: "global",
        periodFrom: meta.periodFrom,
        periodTo: meta.periodTo,
        generatedAt: new Date().toISOString(),
      },
      overview: report.overview as FinanceReport["overview"],
      revenue: (report.revenue as FinanceReport["revenue"]) ?? {
        byPaymentMethod: [],
        daily: [],
        totals: { today: 0, week: 0, month: 0, prevMonth: 0, year: 0, periodNet: 0, periodGross: 0, refunds: 0 },
        period: { from: meta.periodFrom, to: meta.periodTo, startAt: new Date(), endAt: new Date() },
        comparePeriod: null,
      },
      refunds: { count: 0, amount: 0 },
    };
    return financeToXlsx(fakeFinance);
  }

  const { headers, rows, title } = tabularForType(type, report);
  return genericToXlsx(title, headers, rows, meta);
}

async function pdfForType(
  type: ReportType,
  report: Record<string, unknown>,
  meta: { organizationName: string; periodFrom: string; periodTo: string },
): Promise<Buffer> {
  if (type === "global" && report.overview) {
    const ov = report.overview as FinanceReport["overview"];
    return genericToPdf("Vue globale", meta, [
      {
        heading: "Résumé",
        lines: [
          `CA net ${ov.revenue.value} MAD`,
          `Dépenses ${ov.expenses.value} MAD`,
          `Marge ${ov.margin.value} MAD`,
          `Panier moyen ${ov.averageTicket.value} MAD`,
        ],
      },
    ]);
  }

  const { headers, rows, title } = tabularForType(type, report);
  const lines = rows.slice(0, 40).map((r) => r.map(String).join("  |  "));
  return genericToPdf(title, meta, [{ heading: headers.join(" | "), lines }]);
}

function tabularForType(
  type: ReportType,
  report: Record<string, unknown>,
): { title: string; headers: string[]; rows: unknown[][] } {
  switch (type) {
    case "staff":
      return {
        title: "Rapport employées",
        headers: ["Employée", "RDV", "CA", "Commission"],
        rows: ((report.items as { staffName: string; appointments: number; revenue: number; commission: number }[]) ?? []).map(
          (s) => [s.staffName, s.appointments, s.revenue, s.commission],
        ),
      };
    case "customers":
      return {
        title: "Rapport clientes",
        headers: ["Cliente", "Visites", "CA net", "Segment"],
        rows: ((report.rows as { customerName: string; visits: number; netRevenue: number; segment: string }[]) ?? []).map(
          (c) => [c.customerName, c.visits, c.netRevenue, c.segment],
        ),
      };
    case "services":
      return {
        title: "Rapport services",
        headers: ["Service", "Prestations", "CA", "Marge"],
        rows: ((report.items as { serviceName: string; appointments: number; revenue: number; estimatedMargin: number }[]) ?? []).map(
          (s) => [s.serviceName, s.appointments, s.revenue, s.estimatedMargin],
        ),
      };
    case "inventory":
      return {
        title: "Rapport stock",
        headers: ["Produit", "Achats", "Consommation", "Stock théorique"],
        rows: ((report.ledger as { productName: string; purchases: number; consumption: number; ledgerBalance: number }[]) ?? []).map(
          (p) => [p.productName, p.purchases, p.consumption, p.ledgerBalance],
        ),
      };
    default:
      return { title: `Rapport ${type}`, headers: ["Info"], rows: [["Données disponibles via l'interface"]] };
  }
}
