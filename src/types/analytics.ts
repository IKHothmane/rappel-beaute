import type { AnalyticsPeriod } from "@/lib/analytics/period";

export type AnalyticsScope = "full" | "staff_self" | "cash_only";

export type AnalyticsFilters = {
  period: AnalyticsPeriod;
  compare: boolean;
  staffId: string | null;
  serviceId: string | null;
  resourceId: string | null;
};

export type KpiWithCompare = {
  value: number;
  previous: number | null;
  changePercent: number | null;
};

export type AnalyticsOverview = {
  period: AnalyticsPeriod;
  comparePeriod: AnalyticsPeriod | null;
  revenue: KpiWithCompare;
  expenses: KpiWithCompare;
  margin: KpiWithCompare;
  averageTicket: KpiWithCompare;
  appointments: KpiWithCompare;
  customers: KpiWithCompare;
  scope: AnalyticsScope;
};

export type RevenueDailyPoint = {
  date: string;
  label: string;
  revenue: number;
};

export type RevenueAnalytics = {
  period: AnalyticsPeriod;
  comparePeriod: AnalyticsPeriod | null;
  totals: {
    today: number;
    week: number;
    month: number;
    prevMonth: number;
    year: number;
    periodNet: number;
    periodGross: number;
    refunds: number;
  };
  daily: RevenueDailyPoint[];
  byPaymentMethod: PaymentMethodBreakdown[];
};

export type PaymentMethodBreakdown = {
  method: string;
  label: string;
  count: number;
  amount: number;
  percent: number;
};

export type ServiceAnalyticsRow = {
  serviceId: string;
  serviceName: string;
  appointments: number;
  revenue: number;
  averageTicket: number;
  consumableCost: number;
  estimatedMargin: number;
};

export type StaffAnalyticsRow = {
  staffId: string;
  staffName: string;
  appointments: number;
  revenue: number;
  commission: number;
};

export type CustomerAnalytics = {
  kpis: {
    total: number;
    newInPeriod: number;
    active: number;
    inactive: number;
    vip: number;
    atRisk: number;
    reactivated: number;
  };
  newByMonth: { month: string; label: string; count: number }[];
  retention: {
    returning: number;
    newCustomers: number;
    retentionRate: number | null;
    reactivationRate: number | null;
  };
  topCustomers: {
    customerId: string;
    customerName: string;
    revenue: number;
    visits: number;
    averageTicket: number;
    ltv: number;
  }[];
};

export type AppointmentAnalytics = {
  total: number;
  byStatus: { status: string; count: number }[];
  noShow: { count: number; concerned: number; rate: number | null };
  occupationByWeekday: {
    weekday: number;
    label: string;
    bookedMinutes: number;
    availableMinutes: number;
    rate: number | null;
    level: "high" | "medium" | "low";
  }[];
};

export type InventoryAnalytics = {
  stockValue: number;
  consumptionValue: number;
  purchasesValue: number;
  lossesValue: number;
  adjustmentsValue: number;
  outOfStockCount: number;
  lowStockCount: number;
  topConsumption: { productId: string; productName: string; quantity: number; unit: string }[];
  lossesByReason: { reason: string; value: number }[];
};

export type MarketingAnalyticsRow = {
  campaignId: string;
  campaignName: string;
  targeted: number;
  sent: number;
  associatedAppointments: number;
  associatedRevenue: number;
};

export type ReviewAnalytics = {
  sentInPeriod: number;
  recordedSatisfaction: number;
  bySatisfaction: { satisfaction: string; label: string; count: number }[];
  averageInternalScore: number | null;
};

export type LoyaltyAnalytics = {
  pointsEarned: number;
  pointsRedeemed: number;
  rewardsUsed: number;
  vipCustomers: number;
  activePackages: number;
  sessionsUsed: number;
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: "Espèces",
  CARD: "Carte",
  TRANSFER: "Virement",
  ONLINE: "En ligne",
  GIFT_CARD: "Carte cadeau",
  CHECK: "Chèque",
  OTHER: "Autre",
};
