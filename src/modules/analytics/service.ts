import type {
  AnalyticsFilters,
  AnalyticsOverview,
  AnalyticsScope,
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
import type { AnalyticsPeriodPreset } from "@/lib/analytics/period";

const fetchOpts = { credentials: "include" as const, cache: "no-store" as const };

function queryString(filters: Partial<AnalyticsFilters> & { preset?: AnalyticsPeriodPreset }) {
  const q = new URLSearchParams();
  if (filters.preset) q.set("preset", filters.preset);
  if (filters.period) {
    q.set("from", filters.period.from);
    q.set("to", filters.period.to);
  }
  if (filters.compare) q.set("compare", "true");
  if (filters.staffId) q.set("staffId", filters.staffId);
  if (filters.serviceId) q.set("serviceId", filters.serviceId);
  if (filters.resourceId) q.set("resourceId", filters.resourceId);
  return q.toString();
}

async function parseJson<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      typeof data === "object" && data && "error" in data
        ? String((data as { error: string }).error)
        : "Erreur réseau",
    );
  }
  return data as T;
}

export function formatMad(n: number): string {
  return `${n.toLocaleString("fr-MA", { maximumFractionDigits: 0 })} MAD`;
}

export function formatPct(n: number | null): string {
  if (n == null) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)} %`;
}

export function formatCompareHint(current: number, previous: number | null): string | undefined {
  if (previous == null) return undefined;
  return `vs ${formatMad(previous)}`;
}

export async function getAnalyticsOverview(
  filters: Partial<AnalyticsFilters> & { preset?: AnalyticsPeriodPreset },
): Promise<AnalyticsOverview & { scope: AnalyticsScope }> {
  const res = await fetch(`/api/analytics/overview/?${queryString(filters)}`, fetchOpts);
  return parseJson(res);
}

export async function getAnalyticsRevenue(
  filters: Partial<AnalyticsFilters> & { preset?: AnalyticsPeriodPreset },
): Promise<RevenueAnalytics & { scope: AnalyticsScope }> {
  const res = await fetch(`/api/analytics/revenue/?${queryString(filters)}`, fetchOpts);
  return parseJson(res);
}

export async function getAnalyticsCustomers(
  filters: Partial<AnalyticsFilters> & { preset?: AnalyticsPeriodPreset },
): Promise<CustomerAnalytics & { scope: AnalyticsScope }> {
  const res = await fetch(`/api/analytics/customers/?${queryString(filters)}`, fetchOpts);
  return parseJson(res);
}

export async function getAnalyticsAppointments(
  filters: Partial<AnalyticsFilters> & { preset?: AnalyticsPeriodPreset },
): Promise<AppointmentAnalytics & { scope: AnalyticsScope }> {
  const res = await fetch(`/api/analytics/appointments/?${queryString(filters)}`, fetchOpts);
  return parseJson(res);
}

export async function getAnalyticsServices(
  filters: Partial<AnalyticsFilters> & { preset?: AnalyticsPeriodPreset },
): Promise<{ items: ServiceAnalyticsRow[]; scope: AnalyticsScope }> {
  const res = await fetch(`/api/analytics/services/?${queryString(filters)}`, fetchOpts);
  return parseJson(res);
}

export async function getAnalyticsStaff(
  filters: Partial<AnalyticsFilters> & { preset?: AnalyticsPeriodPreset },
): Promise<{ items: StaffAnalyticsRow[]; scope: AnalyticsScope }> {
  const res = await fetch(`/api/analytics/staff/?${queryString(filters)}`, fetchOpts);
  return parseJson(res);
}

export async function getAnalyticsInventory(
  filters: Partial<AnalyticsFilters> & { preset?: AnalyticsPeriodPreset },
): Promise<InventoryAnalytics & { scope: AnalyticsScope }> {
  const res = await fetch(`/api/analytics/inventory/?${queryString(filters)}`, fetchOpts);
  return parseJson(res);
}

export async function getAnalyticsMarketing(
  filters: Partial<AnalyticsFilters> & { preset?: AnalyticsPeriodPreset },
): Promise<{ items: MarketingAnalyticsRow[]; scope: AnalyticsScope }> {
  const res = await fetch(`/api/analytics/marketing/?${queryString(filters)}`, fetchOpts);
  return parseJson(res);
}

export async function getAnalyticsLoyalty(
  filters: Partial<AnalyticsFilters> & { preset?: AnalyticsPeriodPreset },
): Promise<LoyaltyAnalytics & { scope: AnalyticsScope }> {
  const res = await fetch(`/api/analytics/loyalty/?${queryString(filters)}`, fetchOpts);
  return parseJson(res);
}

export async function getAnalyticsReviews(
  filters: Partial<AnalyticsFilters> & { preset?: AnalyticsPeriodPreset },
): Promise<ReviewAnalytics & { scope: AnalyticsScope }> {
  const res = await fetch(`/api/analytics/reviews/?${queryString(filters)}`, fetchOpts);
  return parseJson(res);
}

export { KPI_DEFINITIONS } from "@/lib/analytics/kpi-definitions";
