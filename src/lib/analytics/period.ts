import { ANALYTICS_TIMEZONE } from "@/lib/analytics/kpi-definitions";

export type AnalyticsPeriodPreset =
  | "today"
  | "week"
  | "month"
  | "prev_month"
  | "year"
  | "custom";

export type AnalyticsPeriod = {
  from: string;
  to: string;
  startAt: Date;
  endAt: Date;
  preset?: AnalyticsPeriodPreset;
};

/** Bornes inclusives en fuseau Casablanca (+01:00, pas de DST) */
export function dateToCasablancaStart(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00+01:00`);
}

export function dateToCasablancaEnd(isoDate: string): Date {
  return new Date(`${isoDate}T23:59:59.999+01:00`);
}

export function formatDateCasablanca(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: ANALYTICS_TIMEZONE });
}

export function resolvePreset(preset: AnalyticsPeriodPreset, ref = new Date()): AnalyticsPeriod {
  const today = formatDateCasablanca(ref);
  const todayStart = dateToCasablancaStart(today);

  if (preset === "today") {
    return {
      from: today,
      to: today,
      startAt: todayStart,
      endAt: dateToCasablancaEnd(today),
      preset,
    };
  }

  if (preset === "week") {
    const day = ref.toLocaleDateString("en-US", { weekday: "short", timeZone: ANALYTICS_TIMEZONE });
    const dowMap: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
    const offset = dowMap[day.slice(0, 3)] ?? 0;
    const monday = new Date(todayStart);
    monday.setDate(monday.getDate() - offset);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    return {
      from: formatDateCasablanca(monday),
      to: formatDateCasablanca(sunday),
      startAt: monday,
      endAt: dateToCasablancaEnd(formatDateCasablanca(sunday)),
      preset,
    };
  }

  if (preset === "month") {
    const parts = today.split("-").map(Number);
    const y = parts[0];
    const m = parts[1];
    const from = `${y}-${String(m).padStart(2, "0")}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const to = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    return {
      from,
      to,
      startAt: dateToCasablancaStart(from),
      endAt: dateToCasablancaEnd(to),
      preset,
    };
  }

  if (preset === "prev_month") {
    const parts = today.split("-").map(Number);
    let y = parts[0];
    let m = parts[1] - 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    const from = `${y}-${String(m).padStart(2, "0")}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const to = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    return {
      from,
      to,
      startAt: dateToCasablancaStart(from),
      endAt: dateToCasablancaEnd(to),
      preset,
    };
  }

  // year
  const y = Number(today.slice(0, 4));
  const from = `${y}-01-01`;
  const to = `${y}-12-31`;
  return {
    from,
    to,
    startAt: dateToCasablancaStart(from),
    endAt: dateToCasablancaEnd(to),
    preset: "year",
  };
}

export function resolveCustomPeriod(from: string, to: string): AnalyticsPeriod {
  return {
    from,
    to,
    startAt: dateToCasablancaStart(from),
    endAt: dateToCasablancaEnd(to),
    preset: "custom",
  };
}

/** Période précédente de même durée (compare) */
export function previousPeriod(period: AnalyticsPeriod): AnalyticsPeriod {
  const ms = period.endAt.getTime() - period.startAt.getTime() + 1;
  const prevEnd = new Date(period.startAt.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - ms + 1);
  return {
    from: formatDateCasablanca(prevStart),
    to: formatDateCasablanca(prevEnd),
    startAt: prevStart,
    endAt: prevEnd,
    preset: period.preset,
  };
}

export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
