import type { AnalyticsPeriodPreset } from "@/lib/analytics/period";
import { dateToCasablancaEnd, dateToCasablancaStart, resolveCustomPeriod, resolvePreset } from "@/lib/analytics/period";
import type { AnalyticsFilters } from "@/types/analytics";

const PRESETS = new Set<AnalyticsPeriodPreset>([
  "today",
  "week",
  "month",
  "prev_month",
  "year",
  "custom",
]);

function str(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

function isoDate(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

export function parseAnalyticsFilters(
  sp: URLSearchParams,
): { ok: true; filters: AnalyticsFilters } | { ok: false; error: string } {
  const preset = str(sp.get("preset")) as AnalyticsPeriodPreset | undefined;
  const from = str(sp.get("from"));
  const to = str(sp.get("to"));
  const compare = sp.get("compare") === "true" || sp.get("compare") === "1";

  let period;
  if (preset && PRESETS.has(preset) && preset !== "custom") {
    period = resolvePreset(preset);
  } else if (from && to && isoDate(from) && isoDate(to)) {
    if (dateToCasablancaStart(from) > dateToCasablancaEnd(to)) {
      return { ok: false, error: "Période invalide." };
    }
    period = resolveCustomPeriod(from, to);
  } else {
    period = resolvePreset("month");
  }

  const filters: AnalyticsFilters = {
    period,
    compare,
    staffId: str(sp.get("staffId")) ?? null,
    serviceId: str(sp.get("serviceId")) ?? null,
    resourceId: str(sp.get("resourceId")) ?? null,
  };

  return { ok: true, filters };
}
