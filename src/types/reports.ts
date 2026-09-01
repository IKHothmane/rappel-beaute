import type { AnalyticsOverview, RevenueAnalytics } from "@/types/analytics";
import type { AnalyticsScope } from "@/lib/rbac";
import type { RefundStats } from "@/lib/db/analytics";

export type ReportType =
  | "global"
  | "finance"
  | "agenda"
  | "customers"
  | "services"
  | "staff"
  | "inventory"
  | "marketing"
  | "reviews"
  | "loyalty";

export type ExportFormat = "csv" | "xlsx" | "pdf";

export type ReportMeta = {
  organizationName: string;
  reportType: ReportType;
  periodFrom: string;
  periodTo: string;
  generatedAt: string;
};

export type FinanceReport = {
  meta: ReportMeta;
  overview: AnalyticsOverview;
  revenue: RevenueAnalytics;
  refunds: RefundStats;
};

export type GlobalReport = {
  meta: ReportMeta;
  overview: AnalyticsOverview;
  scope: AnalyticsScope;
  revenue?: RevenueAnalytics;
  customers?: import("@/types/analytics").CustomerAnalytics;
  appointments?: import("@/types/analytics").AppointmentAnalytics;
};

export type CustomerReportRow = {
  customerId: string;
  customerName: string;
  phone: string;
  visits: number;
  netRevenue: number;
  averageTicket: number;
  lastVisitAt: string | null;
  segment: string;
};

export type StockLedgerReportRow = {
  productId: string;
  productName: string;
  unit: string;
  purchases: number;
  consumption: number;
  sales: number;
  losses: number;
  adjustments: number;
  ledgerBalance: number;
};

export const REPORT_TYPE_LABEL: Record<ReportType, string> = {
  global: "Vue globale",
  finance: "Finance",
  agenda: "Agenda",
  customers: "Clientes",
  services: "Services",
  staff: "Employées",
  inventory: "Stock",
  marketing: "Marketing",
  reviews: "Avis",
  loyalty: "Fidélité",
};
