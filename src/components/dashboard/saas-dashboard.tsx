"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  CalendarDays,
  Clock3,
  CreditCard,
  Headphones,
  LayoutGrid,
  Package,

  Star,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { useCurrentUser } from "@/components/auth/session-provider";
import { businessDateTime, businessTodayIso } from "@/lib/time/business-timezone";
import { CustomerReviews } from "@/components/dashboard/customer-reviews";
import { PremiumKpiCard } from "@/components/dashboard/premium-kpi-card";
import { QuickActionsDrawer, useQuickActions } from "@/components/dashboard/quick-actions-drawer";
import { SaasDashboardMobile } from "@/components/dashboard/saas-dashboard-mobile";
import { listResources } from "@/modules/resources/service";
import { APPOINTMENT_STATUS_LABEL } from "@/modules/appointments/constants";
import { listAppointments } from "@/modules/appointments/service";
import {
  formatMad,
  formatPct,
  getAnalyticsAppointments,
  getAnalyticsCustomers,
  getAnalyticsOverview,
  getAnalyticsRevenue,
  getAnalyticsReviews,
  getAnalyticsServices,
  getAnalyticsStaff,
} from "@/modules/analytics/service";
import { getCashRegister, listBillableAppointments } from "@/modules/finance/service";
import { getStockKpis } from "@/modules/inventory/service";
import { getReviewsDashboard } from "@/modules/reviews/service";
import { listStaff } from "@/modules/staff/service";
import { listSupportTickets } from "@/modules/support/service";
import type { AnalyticsPeriodPreset } from "@/lib/analytics/period";
import { cn } from "@/lib/utils";
import { staffColor } from "@/components/agenda/staff-colors";
import { useStaffPalette } from "@/components/agenda/staff-color-provider";
import type { Appointment } from "@/types/appointment";
import type {
  AnalyticsOverview,
  AppointmentAnalytics,
  CustomerAnalytics,
  RevenueDailyPoint,
  ReviewAnalytics,
  ServiceAnalyticsRow,
  StaffAnalyticsRow,
} from "@/types/analytics";
import type { CashRegisterState } from "@/types/finance";
import type { StockKpis } from "@/types/inventory";
import type { ReviewKpis } from "@/types/review";

type PeriodKey = Extract<AnalyticsPeriodPreset, "today" | "week" | "month" | "year">;

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Aujourd'hui" },
  { key: "week", label: "Cette semaine" },
  { key: "month", label: "Ce mois" },
  { key: "year", label: "2026" },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]!.charAt(0)}${parts[parts.length - 1]!.charAt(0)}`.toUpperCase();
}

function heatClass(count: number, max: number) {
  if (count <= 0) return "bg-[#F0E5EC]";
  const t = count / Math.max(1, max);
  if (t < 0.25) return "bg-[#B60050]/20";
  if (t < 0.5) return "bg-[#B60050]/40";
  if (t < 0.75) return "bg-[#B60050]/70";
  return "bg-[#B60050]";
}

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-xl bg-[#FCE7F1]/80", className)}
      aria-hidden
    />
  );
}

function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#EAD5E0] bg-[#FFF9FB] px-4 py-8 text-center">
      <p className="text-sm font-semibold text-[#4A2F3E]">{title}</p>
      {hint ? <p className="max-w-xs text-xs text-[#8A7482]">{hint}</p> : null}
    </div>
  );
}

export function SaasDashboard() {
  const palette = useStaffPalette();
  const user = useCurrentUser();
  const { open: drawerOpen, setOpen: setDrawerOpen } = useQuickActions();
  const [period, setPeriod] = useState<PeriodKey>("year");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [daily, setDaily] = useState<RevenueDailyPoint[]>([]);
  const [revenueTotals, setRevenueTotals] = useState<{ periodNet: number; prevMonth: number } | null>(
    null,
  );
  const [appointmentsAnalytics, setAppointmentsAnalytics] = useState<AppointmentAnalytics | null>(
    null,
  );
  const [customers, setCustomers] = useState<CustomerAnalytics | null>(null);
  const [services, setServices] = useState<ServiceAnalyticsRow[]>([]);
  const [staffRows, setStaffRows] = useState<StaffAnalyticsRow[]>([]);
  const [reviewsAnalytics, setReviewsAnalytics] = useState<ReviewAnalytics | null>(null);
  const [todayAppts, setTodayAppts] = useState<Appointment[]>([]);
  const [cash, setCash] = useState<CashRegisterState | null>(null);
  const [billable, setBillable] = useState({ remaining: 0, count: 0 });
  const [stock, setStock] = useState<StockKpis | null>(null);
  const [openTickets, setOpenTickets] = useState(0);
  const [platformReplyTickets, setPlatformReplyTickets] = useState(0);
  const [activeStaff, setActiveStaff] = useState(0);
  const [resourceCount, setResourceCount] = useState(0);
  const [reviewKpis, setReviewKpis] = useState<ReviewKpis | null>(null);
  const loadGen = useRef(0);

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Africa/Casablanca",
      }),
    [],
  );

  const load = useCallback(async () => {
    const gen = ++loadGen.current;
    setLoading(true);
    setError(null);
    const todayKey = businessTodayIso();
    const dayStart = businessDateTime(todayKey, "00:00");
    const [year, month, day] = todayKey.split("-").map(Number);
    const nextDay = new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
    const dayEnd = businessDateTime(nextDay, "00:00");

    try {
      const [ov, revenue, apptsAnalytics, customersData, todayList] = await Promise.all([
        getAnalyticsOverview({ preset: period, compare: true }),
        getAnalyticsRevenue({ preset: period, compare: true }),
        getAnalyticsAppointments({ preset: period, compare: false }).catch(() => null),
        getAnalyticsCustomers({ preset: period, compare: false }).catch(() => null),
        listAppointments({ from: dayStart.toISOString(), to: dayEnd.toISOString() }).catch(() => []),
      ]);

      if (gen !== loadGen.current) return;
      setOverview(ov);
      setDaily(revenue.daily ?? []);
      setRevenueTotals({
        periodNet: revenue.totals?.periodNet ?? ov.revenue.value ?? 0,
        prevMonth: revenue.totals?.prevMonth ?? ov.revenue.previous ?? 0,
      });
      setAppointmentsAnalytics(apptsAnalytics);
      setCustomers(customersData);
      setTodayAppts(
        todayList
          .filter((a) => a.status !== "CANCELLED")
          .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
      );
    } catch (e) {
      if (gen === loadGen.current) {
        setError(e instanceof Error ? e.message : "Impossible de charger le tableau de bord.");
      }
    } finally {
      if (gen === loadGen.current) setLoading(false);
    }

    if (gen !== loadGen.current) return;

    const [
      servicesData,
      staffData,
      reviewsData,
      cashState,
      billableList,
      stockKpis,
      tickets,
      staffList,
      reviewsDash,
      resources,
    ] = await Promise.all([
      getAnalyticsServices({ preset: period, compare: false }).catch(() => ({ items: [] })),
      getAnalyticsStaff({ preset: period, compare: false }).catch(() => ({ items: [] })),
      getAnalyticsReviews({ preset: period, compare: false }).catch(() => null),
      getCashRegister().catch(() => null),
      listBillableAppointments().catch(() => []),
      getStockKpis().catch(() => null),
      listSupportTickets().catch(() => ({ items: [] })),
      listStaff({ status: "ACTIVE", limit: 1 }).catch(() => ({
        data: [],
        pagination: { page: 1, limit: 1, total: 0, totalPages: 0 },
      })),
      getReviewsDashboard().catch(() => null),
      listResources({ active: true, limit: 1 }).catch(() => ({
        data: [],
        pagination: { page: 1, limit: 1, total: 0, totalPages: 0 },
      })),
    ]);

    if (gen !== loadGen.current) return;

    setServices([...servicesData.items].sort((a, b) => b.revenue - a.revenue).slice(0, 5));
    setStaffRows([...staffData.items].sort((a, b) => b.revenue - a.revenue).slice(0, 5));
    setReviewsAnalytics(reviewsData);
    setCash(cashState);
    setBillable({
      remaining: billableList.reduce((s, a) => s + a.remaining, 0),
      count: billableList.filter((a) => a.remaining > 0).length,
    });
    setStock(stockKpis);
    const open = tickets.items.filter((t) =>
      ["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER"].includes(t.status),
    );
    setOpenTickets(open.length);
    setPlatformReplyTickets(open.filter((t) => t.lastSenderType === "PLATFORM").length);
    setActiveStaff(staffList.pagination.total);
    setResourceCount(resources.pagination.total);
    setReviewKpis(reviewsDash?.kpis ?? null);
  }, [period]);

  useEffect(() => {
    void load();
  }, [load]);

  const now = Date.now();
  const imminent = todayAppts.filter((a) => {
    const t = new Date(a.startAt).getTime();
    return t >= now && t <= now + 2 * 60 * 60 * 1000 && a.status !== "COMPLETED" && a.status !== "NO_SHOW";
  });
  const upcomingPreview = todayAppts
    .filter((a) => a.status !== "COMPLETED" && a.status !== "NO_SHOW")
    .slice(0, 4);

  const stockAlerts = (stock?.lowStockCount ?? 0) + (stock?.outOfStockCount ?? 0);
  const actionCount = [
    todayAppts.length > 0,
    imminent.length > 0,
    billable.count > 0,
    stockAlerts > 0,
    openTickets > 0,
  ].filter(Boolean).length;

  const revenueTrend = daily.map((d) => d.revenue);
  const maxService = Math.max(1, ...services.map((s) => s.revenue));
  const maxStaffRev = Math.max(1, ...staffRows.map((s) => s.revenue));
  const heat = appointmentsAnalytics?.heatmap ?? [];
  const heatMax = Math.max(1, ...heat.map((h) => h.count));
  const heatHours = Array.from({ length: 13 }, (_, i) => i + 8);
  const heatDays = [
    { dow: 1, label: "Lun" },
    { dow: 2, label: "Mar" },
    { dow: 3, label: "Mer" },
    { dow: 4, label: "Jeu" },
    { dow: 5, label: "Ven" },
    { dow: 6, label: "Sam" },
    { dow: 0, label: "Dim" },
  ];
  const peakCell = heat.reduce(
    (best, cell) => (cell.count > best.count ? cell : best),
    { weekday: 0, hour: 0, count: 0 },
  );
  const peakDay = heatDays.find((d) => d.dow === peakCell.weekday)?.label ?? null;
  const session = cash?.session;
  const payments = session?.paymentsToday;
  const normalStock = stock
    ? Math.max(0, stock.activeCount - stock.lowStockCount - stock.outOfStockCount)
    : 0;
  const chartData = daily.map((d) => ({ day: d.label || d.date.slice(5), ca: d.revenue }));
  const hasChartData = chartData.some((d) => d.ca > 0);
  const periodRevenue = revenueTotals?.periodNet ?? overview?.revenue.value ?? 0;
  const periodAppointments = appointmentsAnalytics?.total ?? overview?.appointments.value ?? 0;
  const revenueChange = overview?.revenue.changePercent ?? null;
  const appointmentsChange = overview?.appointments.changePercent ?? null;
  const periodLabel = PERIODS.find((p) => p.key === period)?.label ?? "période";

  return (
    <div className="flex flex-col gap-5 pb-8 lg:gap-5 lg:pb-24">
      <SaasDashboardMobile
        firstName={user.firstName}
        orgName={user.orgName}
        todayLabel={todayLabel}
        period={period}
        onPeriodChange={setPeriod}
        loading={loading}
        error={error}
        activeStaff={activeStaff}
        resourceCount={resourceCount}
        todayCount={todayAppts.length}
        imminent={imminent}
        billable={billable}
        stockAlerts={stockAlerts}
        openTickets={openTickets}
        platformReplyTickets={platformReplyTickets}
        overview={overview}
        customers={customers}
        cash={cash}
        appointments={upcomingPreview}
        staffRows={staffRows}
        stock={stock}
        appointmentsAnalytics={appointmentsAnalytics}
        revenueTotals={revenueTotals}
        reviewKpis={reviewKpis}
        reviewsAnalytics={reviewsAnalytics}
      />

      <div className="hidden flex-col gap-5 lg:flex">
        {/* 1. En-tête */}
        <header className="rb-card-hero">
          <div className="relative z-10 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-3">
                <h1>Bonjour {user.firstName}</h1>
                <span className="text-sm font-medium capitalize text-[#887787]">— {todayLabel}</span>
              </div>
              <p className="mt-1 max-w-lg text-sm leading-5 text-[#654254]">
                {user.orgName}
                {" · "}
                {activeStaff} {activeStaff > 1 ? "praticiennes actives" : "praticienne active"}
                {resourceCount > 0 ? ` · ${resourceCount} ressource${resourceCount > 1 ? "s" : ""}` : ""}
              </p>
              {error ? (
                <p role="alert" className="mt-1 text-sm text-red-600">
                  {error}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div
                className="flex items-center rounded-xl bg-[#F8F0F4] p-1"
                role="group"
                aria-label="Période d'analyse"
              >
                {PERIODS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPeriod(p.key)}
                    aria-pressed={period === p.key}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-sm font-semibold transition",
                      period === p.key
                        ? "bg-white font-bold text-[#B60050] shadow-sm"
                        : "text-[#887787] hover:text-[#261524]",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="flex h-11 items-center gap-2 rounded-xl bg-[#75133D] px-5 text-sm font-semibold text-white shadow-md transition hover:bg-[#5c0f30]"
              >
                <Zap size={18} aria-hidden />
                Actions rapides
              </button>
            </div>
          </div>
        </header>

        {/* 2. KPI */}
        <div className="rb-metric-row">
          <PremiumKpiCard
            title="Chiffre d'affaires"
            value={`${periodRevenue.toLocaleString("fr-MA")} MAD`}
            icon={Wallet}
            tone="pink"
            featured
            change={revenueChange}
            subtitle={periodLabel}
            trend={revenueTrend}
            loading={loading}
          />
          <PremiumKpiCard
            title="Rendez-vous"
            value={String(periodAppointments)}
            icon={CalendarDays}
            tone="purple"
            change={appointmentsChange}
            subtitle={periodLabel}
            chart="bars"
            trend={appointmentsAnalytics?.byHour.map((point) => point.count)}
            loading={loading}
          />
          <PremiumKpiCard
            title="Nouvelles clientes"
            value={customers ? String(customers.kpis.newInPeriod) : "—"}
            icon={Users}
            tone="green"
            subtitle={periodLabel}
            trend={customers?.newByMonth.map((point) => point.count)}
            loading={loading}
          />
          <PremiumKpiCard
            title="Taux d’occupation"
            value={(() => {
              const slots = appointmentsAnalytics?.occupationByWeekday ?? [];
              const available = slots.reduce((sum, day) => sum + day.availableMinutes, 0);
              return available > 0 ? `${Math.round(slots.reduce((sum, day) => sum + day.bookedMinutes, 0) / available * 100)} %` : "—";
            })()}
            progress={(() => {
              const slots = appointmentsAnalytics?.occupationByWeekday ?? [];
              const available = slots.reduce((sum, day) => sum + day.availableMinutes, 0);
              return available > 0 ? slots.reduce((sum, day) => sum + day.bookedMinutes, 0) / available * 100 : null;
            })()}
            icon={Clock3}
            tone="orange"
            subtitle={periodLabel}
            loading={loading}
          />
          <PremiumKpiCard title="Fidélisation" value={customers?.retention.retentionRate != null ? `${Math.round(customers.retention.retentionRate)} %` : "—"} icon={Star} subtitle={periodLabel} loading={loading} />
        </div>

        {/* 3. Actions du jour */}
        <section className="rb-card border-l-4 border-l-[#B60050] p-5 sm:p-6" aria-labelledby="dash-todo-title">
          <div className="flex flex-col justify-between gap-3 pb-3 sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-[#B60050]" aria-hidden />
              <h2 id="dash-todo-title" className="text-lg font-bold tracking-tight">
                À faire aujourd&apos;hui
              </h2>
              <span className="rounded-full bg-[#FCE7F1] px-2 py-0.5 text-[11px] font-bold text-[#75133D]">
                {loading ? "…" : `${actionCount} action${actionCount > 1 ? "s" : ""}`}
              </span>
            </div>
            <button
              type="button"
              className="text-sm text-[#887787] hover:text-[#261524]"
              onClick={() => void load()}
            >
              Actualiser
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            <ActionTile
              href="/agenda/"
              icon={CalendarDays}
              kicker="Planning"
              title={loading ? "…" : `${todayAppts.length} RDV`}
              subtitle="Journée en cours"
              cta="Voir planning"
            />
            <ActionTile
              href="/agenda/"
              icon={Clock3}
              kicker="Imminent"
              accent
              title={loading ? "…" : `${imminent.length} soin${imminent.length > 1 ? "s" : ""}`}
              subtitle="Dans les 2 heures"
              cta="Ouvrir l'agenda"
            />
            <ActionTile
              href="/cash-register/"
              icon={Banknote}
              kicker="Caisse"
              title={loading ? "…" : formatMad(billable.remaining)}
              subtitle={`${billable.count} paiement${billable.count > 1 ? "s" : ""} en attente`}
              cta="Encaisser"
            />
            <ActionTile
              href="/inventory/"
              icon={Package}
              kicker="Seuil bas"
              danger={stockAlerts > 0}
              title={loading ? "…" : `${stockAlerts} produit${stockAlerts > 1 ? "s" : ""}`}
              subtitle="Stock cabine à surveiller"
              cta="Commander"
            />
            <ActionTile
              href="/support/"
              icon={Headphones}
              kicker="Support"
              title={loading ? "…" : `${openTickets} ticket${openTickets > 1 ? "s" : ""}`}
              subtitle={
                platformReplyTickets > 0
                  ? `${platformReplyTickets} réponse${platformReplyTickets > 1 ? "s" : ""} reçue${platformReplyTickets > 1 ? "s" : ""}`
                  : "Aucun nouveau message"
              }
              cta="Lire message"
            />
          </div>
        </section>

        {/* 4. CA + Caisse */}
        <div className="grid grid-cols-1 items-stretch gap-5 xl:grid-cols-12">
          <section
            className="rb-card flex flex-col p-5 sm:p-6 xl:col-span-7"
            aria-labelledby="dash-ca-title"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <h3 id="dash-ca-title" className="font-serif text-[22px] font-bold text-[#54112F]">
                Analyse financière
              </h3>
              <div className="grid grid-cols-3 gap-4 sm:gap-6">
                <div>
                  <p className="text-[11px] font-medium text-[#8D7382]">Total cumulé</p>
                  <p className="mt-0.5 text-base font-extrabold text-[#301625] sm:text-lg">
                    {loading ? "…" : formatMad(revenueTotals?.periodNet ?? overview?.revenue.value ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-[#8D7382]">Mois précédent</p>
                  <p className="mt-0.5 text-base font-extrabold text-[#6F5666] sm:text-lg">
                    {loading ? "…" : formatMad(revenueTotals?.prevMonth ?? overview?.revenue.previous ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-[#8D7382]">Écart</p>
                  <p
                    className={cn(
                      "mt-0.5 text-base font-extrabold sm:text-lg",
                      (revenueChange ?? 0) >= 0 ? "text-[#16834B]" : "text-[#B60050]",
                    )}
                  >
                    {loading ? "…" : formatPct(revenueChange)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 h-[280px] w-full">
              {loading ? (
                <SkeletonBlock className="h-full w-full" />
              ) : !hasChartData ? (
                <EmptyState
                  title="Aucun encaissement sur la période"
                  hint="Le graphique s’affichera dès les premiers paiements enregistrés."
                />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart
                    data={chartData}
                    margin={{ top: 14, right: 12, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="dashboardLuxuryRevenue"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="#C40C5C" stopOpacity={0.22} />
                        <stop offset="100%" stopColor="#C40C5C" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#F2E4EA" strokeDasharray="4 4" vertical={false} />
                    <XAxis
                      dataKey="day"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#987C8C", fontSize: 11 }}
                      interval="preserveStartEnd"
                      minTickGap={24}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#FFFFFF",
                        border: "1px solid #F0DCE5",
                        borderRadius: 14,
                        boxShadow: "0 12px 30px rgba(70,20,40,0.1)",
                      }}
                      formatter={(value) => [
                        `${Number(value ?? 0).toLocaleString("fr-MA")} MAD`,
                        "Chiffre d'affaires",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="ca"
                      stroke="#B60050"
                      strokeWidth={3}
                      fill="url(#dashboardLuxuryRevenue)"
                      dot={{
                        fill: "#FFFFFF",
                        stroke: "#B60050",
                        strokeWidth: 2,
                        r: 3,
                      }}
                      activeDot={{
                        r: 6,
                        fill: "#B60050",
                        stroke: "#FFFFFF",
                        strokeWidth: 3,
                      }}
                      animationDuration={700}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          <section
            className="rb-card flex flex-col p-5 sm:p-6 xl:col-span-5"
            aria-labelledby="dash-cash-title"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="dash-cash-title" className="font-serif text-[22px] font-bold text-[#54112F]">
                  Caisse du jour
                </h3>
                <p className="mt-1 text-xs font-medium text-[#8D7382]">
                  {session?.status === "OPEN" ? "Session ouverte" : "Aucune session ouverte"}
                </p>
              </div>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FCE7F1] text-[#B60050]">
                <Wallet size={18} aria-hidden />
              </span>
            </div>

            <p className="mt-8 font-serif text-5xl font-extrabold tracking-tight text-[#B60050]">
              {loading ? "…" : formatMad(payments?.total ?? 0)}
            </p>

            <div className="mt-8 grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-[#FFF5F9] px-3 py-4 text-center">
                <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#B60050] shadow-sm">
                  <Banknote size={15} aria-hidden />
                </span>
                <p className="mt-2.5 text-[11px] font-medium text-[#8D7382]">Espèces</p>
                <p className="mt-1 text-sm font-extrabold text-[#301625]">
                  {formatMad(payments?.cash ?? 0)}
                </p>
              </div>
              <div className="rounded-2xl bg-[#FFF5F9] px-3 py-4 text-center">
                <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#B60050] shadow-sm">
                  <CreditCard size={15} aria-hidden />
                </span>
                <p className="mt-2.5 text-[11px] font-medium text-[#8D7382]">Carte</p>
                <p className="mt-1 text-sm font-extrabold text-[#301625]">
                  {formatMad(payments?.card ?? 0)}
                </p>
              </div>
              <div className="rounded-2xl bg-[#FFF5F9] px-3 py-4 text-center">
                <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#B60050] shadow-sm">
                  <ArrowRight size={15} aria-hidden />
                </span>
                <p className="mt-2.5 text-[11px] font-medium text-[#8D7382]">Virements</p>
                <p className="mt-1 text-sm font-extrabold text-[#301625]">
                  {formatMad(payments?.transfer ?? 0)}
                </p>
              </div>
            </div>

            <Link
              href="/cash-register/"
              className="mt-auto flex h-12 items-center justify-center gap-2 rounded-xl bg-[#B60050] text-sm font-bold text-white shadow-md shadow-[#B60050]/20 transition hover:bg-[#8d0c40]"
            >
              Ouvrir / Gérer la caisse
              <ArrowRight size={16} aria-hidden />
            </Link>
          </section>
        </div>

        {/* 5. RDV / Performance / Stock / Rétention */}
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2 xl:grid-cols-4">
          <section className="rb-card flex flex-col gap-3 p-5 sm:p-5 xl:col-span-1" aria-labelledby="dash-rdv-title">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <h3 id="dash-rdv-title" className="truncate text-base font-bold">
                  Rendez-vous du jour
                </h3>
                <span className="shrink-0 rounded-full bg-[#F8F0F4] px-2 py-0.5 text-[11px] font-medium text-[#655362]">
                  {upcomingPreview.length}
                </span>
              </div>
              <Link
                href="/agenda/"
                className="shrink-0 rounded-lg bg-[#FCE7F1] px-2.5 py-1 text-[11px] font-semibold text-[#B60050] hover:bg-[#B60050] hover:text-white"
              >
                + Nouveau
              </Link>
            </div>
            {loading ? (
              <div className="space-y-2">
                <SkeletonBlock className="h-14 w-full" />
                <SkeletonBlock className="h-14 w-full" />
              </div>
            ) : upcomingPreview.length === 0 ? (
              <EmptyState title="Aucun rendez-vous aujourd’hui" hint="Planifiez depuis l’agenda." />
            ) : (
              <div className="flex flex-col gap-2">
                {upcomingPreview.map((apt) => {
                  const soon = imminent.some((a) => a.id === apt.id);
                  const time = new Date(apt.startAt).toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Africa/Casablanca",
                  });
                  return (
                    <div
                      key={apt.id}
                      className={cn(
                        "flex min-w-0 items-center gap-2 rounded-xl p-2.5",
                        soon ? "bg-[#FCE7F1]" : "bg-[#F8F0F4]",
                      )}
                    >
                      <span
                        className={cn(
                          "w-11 shrink-0 text-sm font-extrabold",
                          soon ? "text-[#B60050]" : "text-[#261524]",
                        )}
                      >
                        {time}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-[#261524]">
                          {apt.customerName.trim() || "Cliente"}
                        </p>
                        <p className="truncate text-[11px] text-[#887787]">
                          {apt.serviceName || "Prestation"} · {apt.staffName || "Équipe"}
                        </p>
                      </div>
                      <span className="sr-only">
                        {soon ? "Arrivée imminente" : APPOINTMENT_STATUS_LABEL[apt.status]}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            <Link href="/agenda/" className="mt-auto text-center text-xs font-semibold text-[#B60050]">
              Voir l’agenda →
            </Link>
          </section>

          <section className="rb-card flex flex-col gap-3 p-5" aria-labelledby="dash-team-title">
            <div className="flex items-center justify-between">
              <h3 id="dash-team-title" className="text-base font-bold">
                Performance équipe
              </h3>
              <span className="text-[11px] text-[#887787]">CA &amp; com.</span>
            </div>
            {loading ? (
              <SkeletonBlock className="h-28 w-full" />
            ) : staffRows.length === 0 ? (
              <EmptyState title="Pas encore de performance" hint="Les stats apparaissent après les soins réalisés." />
            ) : (
              <div className="flex flex-col gap-3">
                {staffRows.map((row) => {
                  const color = staffColor(row.staffId, palette);
                  return (
                    <div key={row.staffId} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className={cn(
                              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                              color.soft,
                              color.text,
                            )}
                          >
                            {row.staffName.charAt(0)}
                          </span>
                          <span className="truncate text-sm font-bold text-[#261524]">{row.staffName}</span>
                        </div>
                        <span className="shrink-0 text-sm font-extrabold text-[#B60050]">
                          {formatMad(row.revenue)}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[#F0E5EC]">
                        <div
                          className={cn("h-full rounded-full", color.bar)}
                          style={{ width: `${Math.round((row.revenue / maxStaffRev) * 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-[#887787]">
                        <span>{row.appointments} soins</span>
                        <span className="font-semibold text-[#75133D]">
                          Com. : {formatMad(row.commission)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rb-card flex flex-col gap-3 p-5" aria-labelledby="dash-stock-title">
            <div className="flex items-center justify-between">
              <div>
                <h3 id="dash-stock-title" className="text-base font-bold">
                  Stock &amp; produits
                </h3>
                <p className="text-xs text-[#887787]">
                  {stock ? `${stock.productCount} références` : "—"}
                </p>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FCE7F1] text-[#B60050]">
                <Package size={18} aria-hidden />
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-[#F0FDF4] p-2">
                <span className="text-xl font-bold text-emerald-700">{normalStock}</span>
                <p className="text-[11px] text-[#887787]">Normal</p>
              </div>
              <div className="rounded-xl bg-[#FFF7ED] p-2">
                <span className="text-xl font-bold text-orange-600">{stock?.lowStockCount ?? 0}</span>
                <p className="text-[11px] text-orange-700">Faible</p>
              </div>
              <div className="rounded-xl bg-red-50 p-2">
                <span className="text-xl font-bold text-red-600">{stock?.outOfStockCount ?? 0}</span>
                <p className="text-[11px] font-bold text-red-600">Rupture</p>
              </div>
            </div>
            {(stock?.outOfStockCount ?? 0) > 0 ? (
              <div className="rounded-lg bg-red-50 px-2 py-1.5 text-xs font-semibold text-red-600">
                {stock?.outOfStockCount} produit{(stock?.outOfStockCount ?? 0) > 1 ? "s" : ""} à commander
              </div>
            ) : null}
            <Link
              href="/inventory/"
              className="mt-auto rounded-xl bg-[#F8F0F4] py-2 text-center text-xs font-semibold text-[#4A2F3E] hover:bg-[#FCE7F1]"
            >
              Gérer le stock
            </Link>
          </section>

          <section className="rb-card flex flex-col gap-3 p-5" aria-labelledby="dash-retention-title">
            <h3 id="dash-retention-title" className="text-base font-bold">
              Rétention &amp; no-show
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <div className="rounded-xl bg-[#F8F0F4] p-3">
                <span className="text-[11px] text-[#887787]">Clientes actives</span>
                <p className="text-xl font-bold text-[#261524]">{customers?.kpis.active ?? 0}</p>
                <p className="text-xs font-semibold text-emerald-700">
                  {customers?.retention.returning ?? 0} récurrentes
                  {customers?.retention.retentionRate != null
                    ? ` (${customers.retention.retentionRate} %)`
                    : ""}
                </p>
              </div>
              <div className="rounded-xl bg-[#F8F0F4] p-3">
                <span className="text-[11px] text-[#887787]">Taux d&apos;absence</span>
                <p className="text-xl font-bold text-[#B60050]">
                  {appointmentsAnalytics?.noShow.rate != null
                    ? `${appointmentsAnalytics.noShow.rate} %`
                    : "—"}
                </p>
                <p className="text-xs text-[#887787]">
                  {appointmentsAnalytics?.noShow.count ?? 0} no-shows
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* 6. Top prestations / Heatmap / Avis */}
        <div className="grid grid-cols-1 items-stretch gap-5 xl:grid-cols-3">
          <section className="rb-card flex flex-col gap-3 p-5" aria-labelledby="dash-top-title">
            <div className="flex items-center justify-between">
              <h3 id="dash-top-title" className="text-base font-bold">
                Top prestations
              </h3>
              <span className="text-xs font-bold text-[#B60050]">Période</span>
            </div>
            {loading ? (
              <SkeletonBlock className="h-32 w-full" />
            ) : services.length === 0 ? (
              <EmptyState title="Pas encore de ventes" hint="Les prestations les plus demandées apparaîtront ici." />
            ) : (
              <div className="flex flex-col gap-3">
                {services.map((s, i) => (
                  <div key={s.serviceId} className="flex flex-col gap-1">
                    <div className="flex justify-between gap-2 text-sm">
                      <span className="font-bold text-[#261524]">
                        {i + 1}. {s.serviceName}
                      </span>
                      <span className="shrink-0 font-bold text-[#B60050]">
                        {formatMad(s.revenue)}{" "}
                        <span className="font-normal text-[#887787]">({s.appointments})</span>
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#F0E5EC]">
                      <div
                        className="h-full rounded-full bg-[#B60050]"
                        style={{ width: `${Math.round((s.revenue / maxService) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link
              href="/services/"
              className="mt-auto rounded-xl bg-[#F8F0F4] py-2 text-center text-xs font-semibold text-[#4A2F3E] hover:bg-[#FCE7F1]"
            >
              Voir le catalogue
            </Link>
          </section>

          <section className="rb-card flex flex-col gap-3 p-5" aria-labelledby="dash-heat-title">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 id="dash-heat-title" className="text-base font-bold">
                  Affluence
                </h3>
                <p className="text-xs font-semibold text-[#75133D]">
                  {peakCell.count > 0 && peakDay
                    ? `${peakDay} ${String(peakCell.hour).padStart(2, "0")}h · ${peakCell.count} RDV · ${periodLabel}`
                    : `Pas encore de pic · ${periodLabel}`}
                </p>
              </div>
              <LayoutGrid size={18} className="text-[#B60050]" aria-hidden />
            </div>
            {loading ? (
              <SkeletonBlock className="h-40 w-full" />
            ) : heat.every((c) => c.count === 0) ? (
              <EmptyState
                title="Pas encore d’affluence"
                hint={`La heatmap se remplit avec les rendez-vous de la période (${periodLabel}).`}
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <div className="min-w-[280px]">
                    <div className="mb-1 grid grid-cols-8 gap-1 text-center text-[10px] text-[#887787]">
                      <span>H</span>
                      {heatDays.map((d) => (
                        <span key={d.dow} className={d.dow === 6 ? "font-bold text-[#B60050]" : ""}>
                          {d.label}
                        </span>
                      ))}
                    </div>
                    {heatHours.map((hour) => (
                      <div key={hour} className="mb-0.5 grid grid-cols-8 items-center gap-1 text-center text-[10px]">
                        <span className="font-mono text-[#887787]">
                          {String(hour).padStart(2, "0")}h
                        </span>
                        {heatDays.map((d) => {
                          const count =
                            heat.find((c) => c.weekday === d.dow && c.hour === hour)?.count ?? 0;
                          return (
                            <span
                              key={`${d.dow}-${hour}`}
                              title={`${d.label} ${hour}h — ${count} RDV`}
                              className={cn("h-4 rounded", heatClass(count, heatMax))}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1 text-[11px] text-[#887787]">
                  <span className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded bg-[#F0E5EC]" aria-hidden /> Calme
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded bg-[#B60050]/40" aria-hidden /> Modérée
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded bg-[#B60050]" aria-hidden /> Forte
                  </span>
                </div>
              </>
            )}
          </section>

          <CustomerReviews kpis={reviewKpis} analytics={reviewsAnalytics} loading={loading} />
        </div>
      </div>

      <div className="hidden lg:block">
        <QuickActionsDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
      </div>
    </div>
  );
}

function ActionTile({
  href,
  icon: Icon,
  kicker,
  title,
  subtitle,
  cta,
  accent,
  danger,
}: {
  href: string;
  icon: typeof CalendarDays;
  kicker: string;
  title: string;
  subtitle: string;
  cta: string;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-xl p-4 transition",
        accent ? "bg-[#FCE7F1]" : "bg-[#F8F0F4] hover:bg-[#F0E5EC]",
      )}
    >
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg shadow-sm",
            accent
              ? "bg-[#B60050] text-white"
              : danger
                ? "bg-red-50 text-red-600"
                : "bg-white text-[#B60050]",
          )}
        >
          <Icon size={18} aria-hidden />
        </div>
        <span
          className={cn(
            "text-[11px] font-bold",
            accent ? "text-[#B60050]" : danger ? "text-red-600" : "text-[#887787]",
          )}
        >
          {kicker}
        </span>
      </div>
      <div className="mt-3">
        <p className="text-lg font-bold leading-tight text-[#261524]">{title}</p>
        <p className={cn("line-clamp-1 text-xs", accent ? "font-medium text-[#B60050]" : "text-[#887787]")}>
          {subtitle}
        </p>
      </div>
      <Link
        href={href}
        className={cn(
          "mt-3 flex h-9 items-center justify-center gap-1 rounded-lg text-xs font-semibold shadow-sm transition",
          accent
            ? "bg-[#B60050] text-white hover:bg-[#75133D]"
            : "bg-white text-[#261524] hover:bg-[#B60050] hover:text-white",
        )}
      >
        {cta}
        <ArrowRight size={12} aria-hidden />
      </Link>
    </div>
  );
}
