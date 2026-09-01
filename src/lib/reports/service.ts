import type { AnalyticsScope } from "@/lib/rbac";
import type {
  AnalyticsOverview,
  AppointmentAnalytics,
  CustomerAnalytics,
  InventoryAnalytics,
  LoyaltyAnalytics,
  MarketingAnalyticsRow,
  RevenueAnalytics,
  ReviewAnalytics,
  ServiceAnalyticsRow,
  StaffAnalyticsRow,
} from "@/types/analytics";
import type {
  CustomerReportRow,
  FinanceReport,
  GlobalReport,
  ReportMeta,
  ReportType,
  StockLedgerReportRow,
} from "@/types/reports";
import type { AnalyticsFilters } from "@/types/analytics";
import {
  getAnalyticsOverview,
  getAppointmentAnalytics,
  getCustomerAnalytics,
  getCustomerReportRows,
  getInventoryAnalytics,
  getLoyaltyAnalytics,
  getMarketingAnalytics,
  getRefundStats,
  getRevenueAnalytics,
  getReviewAnalytics,
  getServiceAnalytics,
  getStaffAnalytics,
  getStockLedgerReport,
  sumExpenses,
  getOrganizationName,
} from "@/lib/db/analytics";

export async function buildFinanceReport(
  orgId: string,
  filters: AnalyticsFilters,
  orgName: string,
): Promise<FinanceReport> {
  const [overview, revenue, refunds] = await Promise.all([
    getAnalyticsOverview(orgId, filters),
    getRevenueAnalytics(orgId, filters),
    getRefundStats(orgId, filters),
  ]);

  return {
    meta: reportMeta(orgName, filters, "finance"),
    overview,
    revenue,
    refunds,
  };
}

export async function buildGlobalReport(
  orgId: string,
  filters: AnalyticsFilters,
  orgName: string,
  scope: AnalyticsScope,
): Promise<GlobalReport> {
  const overview = await getAnalyticsOverview(orgId, filters);
  const partial: GlobalReport = {
    meta: reportMeta(orgName, filters, "global"),
    overview,
    scope,
  };

  if (scope === "cash_only") {
    partial.revenue = await getRevenueAnalytics(orgId, filters);
    return partial;
  }

  const [revenue, customers, appointments] = await Promise.all([
    getRevenueAnalytics(orgId, filters),
    scope === "full" ? getCustomerAnalytics(orgId, filters) : Promise.resolve(undefined),
    getAppointmentAnalytics(orgId, filters),
  ]);

  partial.revenue = revenue;
  partial.customers = customers;
  partial.appointments = appointments;
  return partial;
}

export async function buildReportByType(
  orgId: string,
  filters: AnalyticsFilters,
  orgName: string,
  type: ReportType,
  scope: AnalyticsScope,
): Promise<unknown> {
  switch (type) {
    case "global":
      return buildGlobalReport(orgId, filters, orgName, scope);
    case "finance":
      return buildFinanceReport(orgId, filters, orgName);
    case "agenda":
      return {
        meta: reportMeta(orgName, filters, type),
        data: await getAppointmentAnalytics(orgId, filters),
      };
    case "customers":
      return {
        meta: reportMeta(orgName, filters, type),
        kpis: await getCustomerAnalytics(orgId, filters),
        rows: await getCustomerReportRows(orgId, filters),
      };
    case "services":
      return {
        meta: reportMeta(orgName, filters, type),
        items: await getServiceAnalytics(orgId, filters),
      };
    case "staff":
      return {
        meta: reportMeta(orgName, filters, type),
        items: await getStaffAnalytics(orgId, filters),
      };
    case "inventory":
      return {
        meta: reportMeta(orgName, filters, type),
        summary: await getInventoryAnalytics(orgId, filters),
        ledger: await getStockLedgerReport(orgId, filters),
      };
    case "marketing":
      return {
        meta: reportMeta(orgName, filters, type),
        items: await getMarketingAnalytics(orgId, filters),
      };
    case "reviews":
      return {
        meta: reportMeta(orgName, filters, type),
        data: await getReviewAnalytics(orgId, filters),
      };
    case "loyalty":
      return {
        meta: reportMeta(orgName, filters, type),
        data: await getLoyaltyAnalytics(orgId, filters),
      };
    default:
      return buildGlobalReport(orgId, filters, orgName, scope);
  }
}

function reportMeta(orgName: string, filters: AnalyticsFilters, type: ReportType): ReportMeta {
  return {
    organizationName: orgName,
    reportType: type,
    periodFrom: filters.period.from,
    periodTo: filters.period.to,
    generatedAt: new Date().toISOString(),
  };
}

export type {
  AnalyticsOverview,
  RevenueAnalytics,
  CustomerAnalytics,
  AppointmentAnalytics,
  ServiceAnalyticsRow,
  StaffAnalyticsRow,
  InventoryAnalytics,
  MarketingAnalyticsRow,
  ReviewAnalytics,
  LoyaltyAnalytics,
  CustomerReportRow,
  StockLedgerReportRow,
  FinanceReport,
  GlobalReport,
};

/** Vérifie accès export selon scope */
export function canAccessReportType(type: ReportType, scope: AnalyticsScope): boolean {
  if (scope === "full") return true;
  if (scope === "cash_only") return type === "finance" || type === "global";
  if (scope === "staff_self") {
    return ["global", "finance", "agenda", "staff"].includes(type);
  }
  return false;
}
