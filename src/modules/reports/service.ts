import type { AnalyticsPeriodPreset } from "@/lib/analytics/period";
import type { AnalyticsFilters, AnalyticsScope } from "@/types/analytics";
import type { ExportFormat, ReportType } from "@/types/reports";
import { formatMad } from "@/modules/analytics/service";

const fetchOpts = { credentials: "include" as const, cache: "no-store" as const };

function queryString(
  filters: Partial<AnalyticsFilters> & { preset?: AnalyticsPeriodPreset; type?: ReportType },
) {
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
  if (filters.type) q.set("type", filters.type);
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

export async function getReport<T>(
  type: ReportType,
  filters: Partial<AnalyticsFilters> & { preset?: AnalyticsPeriodPreset },
): Promise<T & { scope: AnalyticsScope }> {
  const res = await fetch(`/api/reports/?${queryString({ ...filters, type })}`, fetchOpts);
  return parseJson(res);
}

export function openReportExport(
  type: ReportType,
  format: ExportFormat,
  filters: Partial<AnalyticsFilters> & { preset?: AnalyticsPeriodPreset },
): void {
  const q = queryString({ ...filters, type });
  window.open(`/api/reports/export/?format=${format}&${q}`, "_blank");
}

export { formatMad, KPI_DEFINITIONS } from "@/modules/analytics/service";
