import type { AnalyticsPeriodPreset } from "@/lib/analytics/period";
import { resolvePreset } from "@/lib/analytics/period";
import type {
  AnalyticsOverview,
  AppointmentAnalytics,
  CustomerAnalytics,
  InventoryAnalytics,
  KpiWithCompare,
  LoyaltyAnalytics,
  MarketingAnalyticsRow,
  PaymentMethodBreakdown,
  RevenueAnalytics,
  RevenueDailyPoint,
  ReviewAnalytics,
  ServiceAnalyticsRow,
  StaffAnalyticsRow,
} from "@/types/analytics";

export const ANALYTICS_PRESETS: { value: AnalyticsPeriodPreset; label: string; short: string }[] = [
  { value: "today", label: "Aujourd'hui", short: "Aujourd'hui" },
  { value: "week", label: "7 jours", short: "7 jours" },
  { value: "month", label: "30 jours", short: "30 jours" },
  { value: "prev_month", label: "Mois précédent", short: "M-1" },
  { value: "year", label: "12 mois", short: "12 mois" },
];

export function formatPeriodRange(preset: AnalyticsPeriodPreset): string {
  const p = resolvePreset(preset);
  return `${formatIsoDate(p.from)} → ${formatIsoDate(p.to)}`;
}

export function formatIsoDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function formatGeneratedAt(): string {
  return new Date().toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Casablanca",
  });
}

export function comparePeriodLabel(overview: AnalyticsOverview | null, compare: boolean): string {
  if (!compare) return "Comparer à la période précédente";
  if (overview?.comparePeriod) {
    return `vs ${formatIsoDate(overview.comparePeriod.from)} → ${formatIsoDate(overview.comparePeriod.to)}`;
  }
  return "vs période précédente";
}

export function statusCount(data: AppointmentAnalytics | null | undefined, status: string): number {
  return data?.byStatus.find((s) => s.status === status)?.count ?? 0;
}

export function presenceRate(data: AppointmentAnalytics | null | undefined): number | null {
  if (!data || data.total <= 0) return null;
  const done = statusCount(data, "COMPLETED");
  return Math.round((done / data.total) * 1000) / 10;
}

export function avgOccupation(data: AppointmentAnalytics | null | undefined): number | null {
  if (!data?.occupationByWeekday.length) return null;
  const rates = data.occupationByWeekday.map((d) => d.rate).filter((r): r is number => r != null);
  if (!rates.length) return null;
  return Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
}

export function serviceMarginPct(s: ServiceAnalyticsRow): number | null {
  if (s.revenue <= 0) return null;
  return Math.round((s.estimatedMargin / s.revenue) * 1000) / 10;
}

export function avgServiceMargin(services: ServiceAnalyticsRow[]): number | null {
  const withRev = services.filter((s) => s.revenue > 0);
  if (!withRev.length) return null;
  const rates = withRev.map((s) => s.estimatedMargin / s.revenue);
  return Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 1000) / 10;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function deltaClass(pct: number | null): string {
  if (pct == null || pct === 0) return "text-on-surface-variant";
  return pct > 0 ? "text-primary" : "text-error";
}

export type WeeklyBar = { key: string; label: string; value: number; heightPct: number };

export function weeklyRevenueBars(daily: RevenueDailyPoint[] | undefined): WeeklyBar[] {
  if (!daily?.length) return [];
  const buckets = new Map<string, { label: string; value: number; order: number }>();
  for (const p of daily) {
    const d = new Date(`${p.date}T12:00:00+01:00`);
    const weekStart = new Date(d);
    const dow = (d.getDay() + 6) % 7;
    weekStart.setDate(d.getDate() - dow);
    const key = weekStart.toISOString().slice(0, 10);
    const prev = buckets.get(key);
    const idx = buckets.size;
    buckets.set(key, {
      label: `S${(prev?.order ?? idx) + 1}`,
      value: (prev?.value ?? 0) + p.revenue,
      order: prev?.order ?? idx,
    });
  }
  const points = [...buckets.entries()]
    .map(([key, v], i) => ({ key, label: `S${i + 1}`, value: v.value }))
    .slice(-5);
  const max = Math.max(...points.map((p) => p.value), 1);
  return points.map((p) => ({
    ...p,
    heightPct: Math.max(8, Math.round((p.value / max) * 100)),
  }));
}

export type HealthPillar = {
  key: string;
  label: string;
  score: number;
  tone: string;
  bar: string;
};

export type HealthScore = {
  score: number;
  label: string;
  pillars: HealthPillar[];
};

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function buildHealthScore(opts: {
  overview: AnalyticsOverview | null;
  appointments: AppointmentAnalytics | null;
  customers: CustomerAnalytics | null;
  inventory: InventoryAnalytics | null;
  reviews: ReviewAnalytics | null;
  marketing: MarketingAnalyticsRow[];
  staff: StaffAnalyticsRow[];
}): HealthScore {
  const marginRate =
    opts.overview && opts.overview.revenue.value > 0
      ? (opts.overview.margin.value / opts.overview.revenue.value) * 100
      : null;
  const finance = clampScore(marginRate != null ? 50 + marginRate * 0.6 : 55);

  const reviewScore = opts.reviews?.averageInternalScore;
  const reputation = clampScore(reviewScore != null ? (reviewScore / 5) * 100 : 60);

  const staffTotal = opts.staff.reduce((s, r) => s + r.revenue, 0);
  const team = clampScore(opts.staff.length ? Math.min(95, 55 + opts.staff.length * 8 + (staffTotal > 0 ? 10 : 0)) : 50);

  const retention = opts.customers?.retention.retentionRate;
  const clientes = clampScore(retention != null ? retention : opts.customers ? 55 + Math.min(30, opts.customers.kpis.active / 20) : 50);

  const occ = avgOccupation(opts.appointments);
  const cabines = clampScore(occ != null ? occ : 55);

  let stocks = 70;
  if (opts.inventory) {
    const alerts = opts.inventory.lowStockCount + opts.inventory.outOfStockCount;
    stocks = clampScore(100 - alerts * 4);
  }

  const mktRev = opts.marketing.reduce((s, r) => s + r.associatedRevenue, 0);
  const marketing = clampScore(opts.marketing.length ? Math.min(95, 50 + opts.marketing.length * 6 + (mktRev > 0 ? 15 : 0)) : 45);

  const pillars: HealthPillar[] = [
    { key: "finance", label: "Finance", score: finance, tone: "text-primary", bar: "bg-primary" },
    { key: "reputation", label: "Réputation", score: reputation, tone: "text-secondary", bar: "bg-secondary-container" },
    { key: "team", label: "Équipe", score: team, tone: "text-on-surface", bar: "bg-primary-container" },
    { key: "customers", label: "Clientes", score: clientes, tone: "text-on-surface", bar: "bg-primary-container" },
    { key: "cabins", label: "Cabines", score: cabines, tone: "text-on-surface", bar: "bg-secondary" },
    { key: "stock", label: "Stocks", score: stocks, tone: "text-on-surface", bar: "bg-secondary" },
    { key: "marketing", label: "Marketing", score: marketing, tone: "text-on-surface", bar: "bg-outline" },
  ];

  const score = clampScore(pillars.reduce((s, p) => s + p.score, 0) / pillars.length);
  const label = score >= 85 ? "Niveau Excellence" : score >= 70 ? "Niveau Solide" : score >= 55 ? "Niveau Correct" : "À améliorer";

  return { score, label, pillars };
}

export type RetentionStep = {
  step: number;
  title: string;
  subtitle: string;
  percent: number;
  vip?: boolean;
};

export function retentionFunnel(customers: CustomerAnalytics | null): RetentionStep[] {
  if (!customers) {
    return [
      { step: 1, title: "1ère Visite Découverte", subtitle: "Fichier clientes", percent: 100 },
      { step: 2, title: "Clientes actives", subtitle: "Fenêtre 90 j", percent: 0 },
      { step: 3, title: "Rétention", subtitle: "Revenues", percent: 0 },
      { step: 4, title: "VIP", subtitle: "Segment premium", percent: 0, vip: true },
    ];
  }
  const total = Math.max(1, customers.kpis.total);
  const activePct = Math.round((customers.kpis.active / total) * 100);
  const retPct = customers.retention.retentionRate != null ? Math.round(customers.retention.retentionRate) : Math.round(activePct * 0.8);
  const vipPct = Math.round((customers.kpis.vip / total) * 100);
  return [
    {
      step: 1,
      title: "1ère Visite Découverte",
      subtitle: `${customers.kpis.total.toLocaleString("fr-MA")} clientes enregistrées`,
      percent: 100,
    },
    {
      step: 2,
      title: "Clientes Actives (90 j)",
      subtitle: `${customers.kpis.active.toLocaleString("fr-MA")} actives`,
      percent: activePct,
    },
    {
      step: 3,
      title: "Rétention / Récurrentes",
      subtitle: `${customers.retention.returning.toLocaleString("fr-MA")} clientes revenues`,
      percent: Math.min(100, retPct),
    },
    {
      step: 4,
      title: "Segment VIP",
      subtitle: `${customers.kpis.vip.toLocaleString("fr-MA")} VIP`,
      percent: Math.min(100, vipPct),
      vip: true,
    },
  ];
}

export type AnalyticsInsight = {
  greeting: string;
  performance: string;
  alert: string | null;
  monitors: { tone: "error" | "warn" | "ok"; text: string }[];
  cta: string;
  ctaHref: string;
  secondaryCta: string | null;
  secondaryHref: string | null;
};

export function buildAnalyticsInsight(opts: {
  firstName: string;
  overview: AnalyticsOverview | null;
  services: ServiceAnalyticsRow[];
  customers: CustomerAnalytics | null;
  inventory: InventoryAnalytics | null;
  appointments: AppointmentAnalytics | null;
  canReactivation: boolean;
  canMarketing: boolean;
}): AnalyticsInsight {
  const ca = opts.overview?.revenue.value ?? 0;
  const pct = opts.overview?.revenue.changePercent;
  const top = opts.services[0];
  const share =
    top && opts.services.reduce((s, r) => s + r.revenue, 0) > 0
      ? Math.round((top.revenue / opts.services.reduce((s, r) => s + r.revenue, 0)) * 100)
      : null;

  const performance =
    pct == null
      ? `CA de la période : ${ca.toLocaleString("fr-MA")} DH${top ? `. Première ligne : ${top.serviceName}.` : "."}`
      : `Votre CA ${pct >= 0 ? "progresse" : "varie"} de ${pct >= 0 ? "+" : ""}${pct.toFixed(1)} % (${ca.toLocaleString("fr-MA")} DH)${top ? `. ${top.serviceName}${share != null ? ` représente ${share} % du CA soins` : ""}.` : "."}`;

  const inactive = opts.customers?.kpis.inactive ?? 0;
  const alert =
    inactive > 0
      ? `${inactive.toLocaleString("fr-MA")} clientes inactives (seuil 90 j). Potentiel de relance à estimer dans le module réactivation.`
      : null;

  const monitors: AnalyticsInsight["monitors"] = [];
  if (opts.inventory && opts.inventory.outOfStockCount > 0) {
    monitors.push({
      tone: "error",
      text: `${opts.inventory.outOfStockCount} référence${opts.inventory.outOfStockCount > 1 ? "s" : ""} en rupture`,
    });
  } else if (opts.inventory && opts.inventory.lowStockCount > 0) {
    monitors.push({
      tone: "warn",
      text: `${opts.inventory.lowStockCount} alerte${opts.inventory.lowStockCount > 1 ? "s" : ""} de stock bas`,
    });
  }
  const cancelled = statusCount(opts.appointments, "CANCELLED");
  if (cancelled > 0) {
    monitors.push({ tone: "warn", text: `${cancelled} annulation${cancelled > 1 ? "s" : ""} sur la période` });
  }
  if (opts.overview && opts.overview.revenue.value > 0) {
    const m = Math.round((opts.overview.margin.value / opts.overview.revenue.value) * 1000) / 10;
    monitors.push({ tone: "ok", text: `Marge d'exploitation : ${m.toLocaleString("fr-MA")} %` });
  }

  if (inactive > 0 && opts.canReactivation) {
    return {
      greeting: `Bonjour ${opts.firstName}`,
      performance,
      alert,
      monitors,
      cta: "Ouvrir la réactivation",
      ctaHref: "/reactivation/",
      secondaryCta: `Inspecter le segment inactif (${inactive})`,
      secondaryHref: "/customers/",
    };
  }
  if (inactive > 0 && opts.canMarketing) {
    return {
      greeting: `Bonjour ${opts.firstName}`,
      performance,
      alert,
      monitors,
      cta: "Préparer une campagne",
      ctaHref: "/marketing/",
      secondaryCta: "Voir les clientes",
      secondaryHref: "/customers/",
    };
  }
  return {
    greeting: `Bonjour ${opts.firstName}`,
    performance,
    alert,
    monitors,
    cta: "Consulter les rapports",
    ctaHref: "/reports/",
    secondaryCta: null,
    secondaryHref: null,
  };
}

export type PnlExpress = {
  net: number;
  expenses: number;
  commissions: number;
  result: number;
  marginRate: number | null;
  expenseShare: number;
  commissionShare: number;
  resultShare: number;
};

export function buildPnlExpress(
  overview: AnalyticsOverview | null,
  staff: StaffAnalyticsRow[],
): PnlExpress {
  const net = overview?.revenue.value ?? 0;
  const expenses = overview?.expenses.value ?? 0;
  const commissions = staff.reduce((s, r) => s + r.commission, 0);
  const result = overview?.margin.value ?? net - expenses;
  const base = Math.max(net, 1);
  return {
    net,
    expenses,
    commissions,
    result,
    marginRate: net > 0 ? Math.round((result / net) * 1000) / 10 : null,
    expenseShare: Math.min(100, Math.round((expenses / base) * 1000) / 10),
    commissionShare: Math.min(100, Math.round((commissions / base) * 1000) / 10),
    resultShare: Math.min(100, Math.round((Math.max(0, result) / base) * 1000) / 10),
  };
}

export function marketingAttributed(rows: MarketingAnalyticsRow[]): number {
  return rows.reduce((s, r) => s + r.associatedRevenue, 0);
}

export function peakWeekday(data: AppointmentAnalytics | null): string | null {
  if (!data?.occupationByWeekday.length) return null;
  let best = data.occupationByWeekday[0];
  for (const d of data.occupationByWeekday) {
    if ((d.bookedMinutes ?? 0) > (best.bookedMinutes ?? 0)) best = d;
  }
  return best.label;
}

export type AnalyticsViewModel = {
  orgName: string;
  roleLabel: string;
  firstName: string;
  loading: boolean;
  scopeNote: string | null;
  periodLabel: string;
  compareLabel: string;
  compare: boolean;
  onCompare: () => void;
  generatedAt: string;
  preset: AnalyticsPeriodPreset;
  onPreset: (p: AnalyticsPeriodPreset) => void;
  overview: AnalyticsOverview | null;
  revenue: RevenueAnalytics | null;
  appointments: AppointmentAnalytics | null;
  customers: CustomerAnalytics | null;
  services: ServiceAnalyticsRow[];
  staff: StaffAnalyticsRow[];
  inventory: InventoryAnalytics | null;
  marketing: MarketingAnalyticsRow[];
  reviews: ReviewAnalytics | null;
  loyalty: LoyaltyAnalytics | null;
  payments: PaymentMethodBreakdown[];
  insight: AnalyticsInsight;
  health: HealthScore;
  funnel: RetentionStep[];
  weekly: WeeklyBar[];
  pnl: PnlExpress;
  presence: number | null;
  occupation: number | null;
  avgMargin: number | null;
  marketingRevenue: number;
  peakDay: string | null;
  onExport: (format: "csv" | "xlsx" | "pdf") => void;
  onRefresh: () => void;
  canReactivation: boolean;
  canMarketing: boolean;
  canStock: boolean;
  canGiftCards: boolean;
};
