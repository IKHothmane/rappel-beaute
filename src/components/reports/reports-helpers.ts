import type { AnalyticsPeriodPreset } from "@/lib/analytics/period";
import { resolvePreset } from "@/lib/analytics/period";
import type { AnalyticsScope } from "@/lib/rbac";
import type {
  AnalyticsOverview,
  AppointmentAnalytics,
  CustomerAnalytics,
  InventoryAnalytics,
  KpiWithCompare,
  MarketingAnalyticsRow,
  PaymentMethodBreakdown,
  RevenueDailyPoint,
  ReviewAnalytics,
  ServiceAnalyticsRow,
  StaffAnalyticsRow,
} from "@/types/analytics";
import type { ReportType } from "@/types/reports";

export const PRESET_OPTIONS: { value: AnalyticsPeriodPreset; label: string }[] = [
  { value: "today", label: "Aujourd'hui" },
  { value: "week", label: "Cette semaine" },
  { value: "month", label: "Mois en cours" },
  { value: "prev_month", label: "Mois précédent" },
  { value: "year", label: "Cette année" },
];

export type ModuleCardDef = {
  type: ReportType;
  title: string;
  badge: string;
  description: string;
  cta: string;
};

export const MODULE_CARDS: ModuleCardDef[] = [
  {
    type: "finance",
    title: "Rapport Financier & Trésorerie",
    badge: "Livre de caisse",
    description: "Recettes, remboursements, charges et résultat d'exploitation.",
    cta: "Consulter le grand livre",
  },
  {
    type: "agenda",
    title: "Rapport Fréquentation & RDV",
    badge: "Fréquentation",
    description: "Flux cabines, taux de remplissage, no-shows et annulations.",
    cta: "Consulter les flux cabines",
  },
  {
    type: "customers",
    title: "Rapport Clientes & Rétention",
    badge: "Base CRM",
    description: "Cohortes, segmentation VIP et clientes inactives.",
    cta: "Consulter les cohortes",
  },
  {
    type: "staff",
    title: "Rapport Équipe & Productivité",
    badge: "Ressources & RH",
    description: "Volume de soins, CA généré et commissions dues.",
    cta: "Consulter le tableau RH",
  },
  {
    type: "services",
    title: "Rapport Services & Rentabilité",
    badge: "Mix prestations",
    description: "CA par rituel, coût consommables et marge estimée.",
    cta: "Consulter la matrice soins",
  },
  {
    type: "inventory",
    title: "Rapport Stock & Consommables",
    badge: "Inventaire",
    description: "Valeur stock, alertes de seuil, pertes et ventes boutique.",
    cta: "Consulter le grand inventaire",
  },
];

export function canAccessReportType(type: ReportType, scope: AnalyticsScope): boolean {
  if (scope === "full") return true;
  if (scope === "cash_only") return type === "finance" || type === "global";
  if (scope === "staff_self") {
    return ["global", "finance", "agenda", "staff"].includes(type);
  }
  return false;
}

export function visibleReportTypes(scope: AnalyticsScope): ReportType[] {
  const all: ReportType[] = [
    "global",
    "finance",
    "agenda",
    "customers",
    "staff",
    "services",
    "inventory",
    "marketing",
    "reviews",
    "loyalty",
  ];
  return all.filter((t) => canAccessReportType(t, scope));
}

export function visibleModules(scope: AnalyticsScope): ModuleCardDef[] {
  return MODULE_CARDS.filter((m) => canAccessReportType(m.type, scope));
}

export function formatPeriodRange(preset: AnalyticsPeriodPreset): string {
  const p = resolvePreset(preset);
  return `${formatIsoDate(p.from)} → ${formatIsoDate(p.to)}`;
}

export function formatIsoDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function formatGeneratedAt(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("fr-FR", {
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

export function presetBadge(preset: AnalyticsPeriodPreset): string {
  return PRESET_OPTIONS.find((o) => o.value === preset)?.label ?? preset;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function statusCount(data: AppointmentAnalytics | null | undefined, status: string): number {
  return data?.byStatus.find((s) => s.status === status)?.count ?? 0;
}

export function avgOccupation(data: AppointmentAnalytics | null | undefined): number | null {
  if (!data?.occupationByWeekday.length) return null;
  const rates = data.occupationByWeekday.map((d) => d.rate).filter((r): r is number => r != null);
  if (!rates.length) return null;
  return Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
}

export function presenceRate(data: AppointmentAnalytics | null | undefined): number | null {
  if (!data || data.total <= 0) return null;
  const done = statusCount(data, "COMPLETED");
  return Math.round((done / data.total) * 1000) / 10;
}

export type ProfitAndLoss = {
  gross: number | null;
  refunds: number;
  net: number;
  expenses: number;
  commissions: number;
  margin: number;
  marginRate: number | null;
};

export function buildPnl(opts: {
  overview: AnalyticsOverview | null;
  periodGross: number | null;
  refunds: number;
  commissions: number;
}): ProfitAndLoss {
  const net = opts.overview?.revenue.value ?? 0;
  const expenses = opts.overview?.expenses.value ?? 0;
  const margin = opts.overview?.margin.value ?? net - expenses;
  return {
    gross: opts.periodGross,
    refunds: opts.refunds,
    net,
    expenses,
    commissions: opts.commissions,
    margin,
    marginRate: net > 0 ? Math.round((margin / net) * 1000) / 10 : null,
  };
}

export type ChartBar = { key: string; label: string; value: number; heightPct: number };

export function chartBars(daily: RevenueDailyPoint[] | undefined): ChartBar[] {
  if (!daily?.length) return [];
  let points: { key: string; label: string; value: number }[];
  if (daily.length > 14) {
    const buckets = new Map<string, { label: string; value: number }>();
    for (const p of daily) {
      const key = p.date.slice(0, 7);
      const prev = buckets.get(key);
      const monthLabel = new Date(`${key}-15T12:00:00`).toLocaleDateString("fr-FR", {
        month: "short",
        timeZone: "Africa/Casablanca",
      });
      buckets.set(key, { label: monthLabel.replace(".", ""), value: (prev?.value ?? 0) + p.revenue });
    }
    points = [...buckets.entries()].map(([key, v]) => ({ key, ...v }));
  } else {
    points = daily.map((p) => ({
      key: p.date,
      label: new Date(`${p.date}T12:00:00`).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        timeZone: "Africa/Casablanca",
      }),
      value: p.revenue,
    }));
  }
  const max = Math.max(...points.map((p) => p.value), 1);
  return points.map((p) => ({
    ...p,
    heightPct: Math.max(6, Math.round((p.value / max) * 100)),
  }));
}

export function paymentBarColor(method: string): string {
  switch (method) {
    case "CARD":
      return "bg-primary-container";
    case "CASH":
      return "bg-secondary";
    case "GIFT_CARD":
      return "bg-secondary-fixed-dim";
    case "TRANSFER":
      return "bg-ink/35";
    case "ONLINE":
      return "bg-primary";
    case "CHECK":
      return "bg-outline";
    default:
      return "bg-surface-dim";
  }
}

export function paymentDotColor(method: string): string {
  switch (method) {
    case "CARD":
      return "bg-primary-container";
    case "CASH":
      return "bg-secondary";
    case "GIFT_CARD":
      return "bg-secondary-fixed-dim";
    case "TRANSFER":
      return "bg-ink/35";
    case "ONLINE":
      return "bg-primary";
    case "CHECK":
      return "bg-outline";
    default:
      return "bg-surface-dim";
  }
}

export type RankedSale = {
  key: string;
  name: string;
  subtitle: string;
  revenue: number;
  volume: number;
  kind: "service" | "product";
};

export function topSales(
  services: ServiceAnalyticsRow[],
  inventory: InventoryAnalytics | null,
  limit = 5,
): RankedSale[] {
  const fromServices: RankedSale[] = services.map((s) => ({
    key: s.serviceId,
    name: s.serviceName,
    subtitle: `${s.appointments} soin${s.appointments > 1 ? "s" : ""}`,
    revenue: s.revenue,
    volume: s.appointments,
    kind: "service",
  }));
  const fromPos: RankedSale[] = (inventory?.topPosProducts ?? []).map((p) => ({
    key: p.productId,
    name: p.productName,
    subtitle: `${p.quantity} unité${p.quantity > 1 ? "s" : ""} · boutique`,
    revenue: p.revenue,
    volume: p.quantity,
    kind: "product",
  }));
  return [...fromServices, ...fromPos].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}

export function serviceShare(row: ServiceAnalyticsRow, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((row.revenue / total) * 1000) / 10;
}

export function avgServiceMargin(services: ServiceAnalyticsRow[]): number | null {
  const withRev = services.filter((s) => s.revenue > 0);
  if (!withRev.length) return null;
  const rates = withRev.map((s) => s.estimatedMargin / s.revenue);
  return Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 1000) / 10;
}

export function marketingRoi(rows: MarketingAnalyticsRow[]): number | null {
  const targeted = rows.reduce((s, r) => s + r.targeted, 0);
  if (targeted <= 0) return null;
  const revenue = rows.reduce((s, r) => s + r.associatedRevenue, 0);
  return Math.round((revenue / targeted) * 10) / 10;
}

export function reviewScoreLabel(reviews: ReviewAnalytics | null): string {
  if (!reviews || reviews.averageInternalScore == null) return "Note interne indisponible";
  return `${reviews.averageInternalScore.toLocaleString("fr-MA", { maximumFractionDigits: 1 })} / 5 · ${reviews.recordedSatisfaction} avis`;
}

export type ReportsInsight = {
  performance: string;
  vigilance: string;
  recommendation: string;
  cta: string;
  href: string;
};

export function reportsInsight(opts: {
  revenue: KpiWithCompare | null;
  topService: ServiceAnalyticsRow | null;
  serviceShare: number | null;
  inactive: number | null;
  cancelled: number | null;
  noShowRate: number | null;
  canMarketing: boolean;
  canReactivation: boolean;
}): ReportsInsight {
  const ca = opts.revenue?.value ?? 0;
  const pct = opts.revenue?.changePercent;
  const prev = opts.revenue?.previous;
  const performance =
    pct == null
      ? `CA net de la période : ${ca.toLocaleString("fr-MA")} MAD${opts.topService ? `. Premier soin : ${opts.topService.serviceName}.` : "."}`
      : `${pct > 0 ? "+" : ""}${pct.toFixed(1)} % de variation du CA net (${ca.toLocaleString("fr-MA")} MAD${prev != null ? ` vs ${prev.toLocaleString("fr-MA")} MAD` : ""})${opts.topService ? `. Meilleure ligne : ${opts.topService.serviceName}${opts.serviceShare != null ? ` (${opts.serviceShare.toLocaleString("fr-MA")} % du CA soins)` : ""}.` : "."}`;

  const alerts: string[] = [];
  if (opts.noShowRate != null && opts.noShowRate > 0) {
    alerts.push(`Taux de no-show : ${opts.noShowRate.toLocaleString("fr-MA")} %.`);
  }
  if ((opts.cancelled ?? 0) > 0) {
    alerts.push(`${opts.cancelled} annulation${(opts.cancelled ?? 0) > 1 ? "s" : ""} sur la période.`);
  }
  if ((opts.inactive ?? 0) > 0) {
    alerts.push(`${opts.inactive} cliente${(opts.inactive ?? 0) > 1 ? "s" : ""} inactive${(opts.inactive ?? 0) > 1 ? "s" : ""} (seuil 90 j).`);
  }
  const vigilance = alerts.length
    ? alerts.join(" ")
    : "Aucun signal d'alerte sur les indicateurs disponibles (annulations, no-shows, dormance).";

  if ((opts.inactive ?? 0) > 0 && opts.canReactivation) {
    return {
      performance,
      vigilance,
      recommendation: `Préparer une relance ciblée sur les ${opts.inactive} clientes inactives — le montant récupérable n'est pas estimé ici.`,
      cta: "Ouvrir la relance",
      href: "/reactivation/",
    };
  }
  if ((opts.inactive ?? 0) > 0 && opts.canMarketing) {
    return {
      performance,
      vigilance,
      recommendation: "Créer une campagne opt-in pour relancer le segment inactif, sans envoi automatique.",
      cta: "Ouvrir les campagnes",
      href: "/marketing/",
    };
  }
  return {
    performance,
    vigilance,
    recommendation: "Exporter le rapport de la période, puis croiser finance et fréquentation dans les modules ci-dessous.",
    cta: "Voir le grand livre",
    href: "#rapport-detail",
  };
}

export function deltaClass(pct: number | null): string {
  if (pct == null || pct === 0) return "text-on-surface-variant";
  return pct > 0 ? "text-primary" : "text-error";
}

export function healthyStockCount(inventory: InventoryAnalytics | null, ledgerLen: number): number | null {
  if (!inventory) return ledgerLen || null;
  const alerts = inventory.lowStockCount + inventory.outOfStockCount;
  if (!ledgerLen) return null;
  return Math.max(0, ledgerLen - alerts);
}

export type FilterOption = { id: string; name: string };

export type ReportsViewModel = {
  orgName: string;
  roleLabel: string;
  loading: boolean;
  scopeNote: string | null;
  periodLabel: string;
  compareLabel: string;
  compare: boolean;
  onCompare: () => void;
  generatedAt: string;
  preset: AnalyticsPeriodPreset;
  onPreset: (p: AnalyticsPeriodPreset) => void;
  showStaffServiceFilters: boolean;
  staffId: string;
  serviceId: string;
  staffOpts: FilterOption[];
  serviceOpts: FilterOption[];
  onStaff: (id: string) => void;
  onService: (id: string) => void;
  overview: AnalyticsOverview | null;
  agenda: AppointmentAnalytics | null;
  customers: CustomerAnalytics | null;
  services: ServiceAnalyticsRow[];
  staffRows: StaffAnalyticsRow[];
  inventory: InventoryAnalytics | null;
  ledgerLen: number;
  marketing: MarketingAnalyticsRow[];
  reviews: ReviewAnalytics | null;
  giftBalance: number | null;
  modules: ModuleCardDef[];
  activeType: ReportType;
  onSelectType: (t: ReportType) => void;
  insight: ReportsInsight;
  pnl: ProfitAndLoss;
  bars: ChartBar[];
  payments: PaymentMethodBreakdown[];
  top: RankedSale[];
  onExport: (format: "csv" | "xlsx" | "pdf") => void;
  onPrint: () => void;
  onAuto: () => void;
  onRefresh: () => void;
  canMarketing: boolean;
  canGiftCards: boolean;
  canReviews: boolean;
  canCommissions: boolean;
  canLoyalty: boolean;
};
