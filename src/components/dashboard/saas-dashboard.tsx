"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  CalendarCheck,
  CalendarDays,
  Clock3,
  Headphones,
  LayoutGrid,
  Package,
  ShoppingBag,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { useCurrentUser } from "@/components/auth/session-provider";
import { DashboardAiInsights } from "@/components/dashboard/ai-insights";
import { QuickActionsDrawer, useQuickActions } from "@/components/dashboard/quick-actions-drawer";
import { SaasDashboardMobile } from "@/components/dashboard/saas-dashboard-mobile";
import { listResources } from "@/modules/resources/service";
import { usePlanFeatures } from "@/components/subscriptions/plan-features-provider";
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
import { getWhatsAppDashboard } from "@/modules/whatsapp/service";
import type { AnalyticsPeriodPreset } from "@/lib/analytics/period";
import { cn } from "@/lib/utils";
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
import type { WhatsAppKpis } from "@/types/whatsapp";

type PeriodKey = Extract<AnalyticsPeriodPreset, "today" | "week" | "month" | "year">;

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Aujourd'hui" },
  { key: "week", label: "Cette semaine" },
  { key: "month", label: "Ce mois" },
  { key: "year", label: String(new Date().getFullYear()) },
];

function MiniSpark({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * 100;
    const y = 22 - ((v - min) / span) * 18 - 2;
    return `${x},${y}`;
  });
  return (
    <svg className="h-7 w-24 text-primary" fill="none" viewBox="0 0 100 24">
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.5"
      />
    </svg>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]!.charAt(0)}${parts[parts.length - 1]!.charAt(0)}`.toUpperCase();
}

function heatClass(count: number, max: number) {
  if (count <= 0) return "bg-line";
  const t = count / Math.max(1, max);
  if (t < 0.25) return "bg-primary/20";
  if (t < 0.5) return "bg-primary/40";
  if (t < 0.75) return "bg-primary/70";
  return "bg-primary";
}

export function SaasDashboard() {
  const user = useCurrentUser();
  const { isEnabled } = usePlanFeatures();
  const { open: drawerOpen, setOpen: setDrawerOpen } = useQuickActions();
  const [period, setPeriod] = useState<PeriodKey>("month");
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
  const [waKpis, setWaKpis] = useState<WhatsAppKpis | null>(null);
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
    const customerPreset = period === "today" ? "month" : period;
    const todayKey = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Casablanca" });
    const dayStart = new Date(`${todayKey}T00:00:00+01:00`);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    try {
      const [ov, revenue, apptsAnalytics, customersData, todayList] = await Promise.all([
        getAnalyticsOverview({ preset: period, compare: true }),
        getAnalyticsRevenue({ preset: period, compare: true }),
        getAnalyticsAppointments({ preset: "week", compare: false }),
        getAnalyticsCustomers({ preset: customerPreset, compare: false }),
        listAppointments({ from: dayStart.toISOString(), to: dayEnd.toISOString() }),
      ]);

      if (gen !== loadGen.current) return;
      setOverview(ov);
      setDaily(revenue.daily);
      setRevenueTotals({ periodNet: revenue.totals.periodNet, prevMonth: revenue.totals.prevMonth });
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
      wa,
      reviewsDash,
      resources,
    ] = await Promise.all([
      getAnalyticsServices({ preset: customerPreset, compare: false }).catch(() => ({ items: [] })),
      getAnalyticsStaff({ preset: customerPreset, compare: false }).catch(() => ({ items: [] })),
      getAnalyticsReviews({ preset: customerPreset, compare: false }).catch(() => null),
      getCashRegister().catch(() => null),
      listBillableAppointments().catch(() => []),
      getStockKpis().catch(() => null),
      listSupportTickets().catch(() => ({ items: [] })),
      listStaff({ status: "ACTIVE", limit: 1 }).catch(() => ({
        data: [],
        pagination: { page: 1, limit: 1, total: 0, totalPages: 0 },
      })),
      getWhatsAppDashboard("pending").catch(() => null),
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
    setWaKpis(wa?.kpis ?? null);
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

  const spark = daily.map((d) => d.revenue);
  const maxService = Math.max(1, ...services.map((s) => s.revenue));
  const maxStaffRev = Math.max(1, ...staffRows.map((s) => s.revenue));
  const heat = appointmentsAnalytics?.heatmap ?? [];
  const heatMax = Math.max(1, ...heat.map((h) => h.count));
  const heatHours = [9, 11, 14, 16];
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

  return (
    <div className="flex flex-col gap-6 pb-8 lg:gap-8 lg:pb-28">
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
      />

      <div className="hidden flex-col gap-6 lg:flex lg:gap-8">
      <section className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-soft sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-gradient-to-br from-primary/10 via-[#FCCA66]/20 to-transparent blur-3xl" />
        <div className="relative z-10 flex flex-col justify-between gap-6 xl:flex-row xl:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-primary">
                Tableau de bord gérante
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FBF4F6] px-2.5 py-0.5 text-xs font-medium text-ink">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                {user.orgName}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-baseline gap-3">
              <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
                Bonjour {user.firstName}
              </h1>
              <span className="text-sm font-medium capitalize text-ink/50">— {todayLabel}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-ink/55">
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-600" />
                En ligne
              </span>
              <span>•</span>
              <span>
                {activeStaff} {activeStaff > 1 ? "praticiennes actives" : "praticienne active"}
              </span>
            </div>
            {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
          </div>
          <div className="z-10 flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-xl bg-[#FBF4F6] p-1 shadow-sm">
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPeriod(p.key)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm font-semibold transition",
                    period === p.key ? "bg-white font-bold text-primary shadow-sm" : "text-ink/50 hover:text-ink",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="flex h-12 items-center gap-2 rounded-xl bg-institut px-5 text-sm font-semibold text-gold shadow-md transition hover:bg-black"
            >
              <Zap size={18} />
              Actions rapides
            </button>
          </div>
        </div>
      </section>

      <section className="relative rounded-2xl border-l-4 border-l-primary bg-white p-5 shadow-soft sm:p-6">
        <div className="flex flex-col justify-between gap-3 pb-3 lg:flex-row lg:items-center">
          <div className="flex items-center gap-2">
            <span className="inline-block h-3.5 w-3.5 animate-pulse rounded-full bg-primary" />
            <h2 className="text-lg font-bold tracking-tight text-ink">À faire aujourd&apos;hui</h2>
            <span className="rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-bold text-primary-dark">
              {loading ? "…" : `${actionCount} action${actionCount > 1 ? "s" : ""}`}
            </span>
          </div>
          <button type="button" className="text-sm text-ink/40 hover:text-ink" onClick={() => void load()}>
            Actualiser
          </button>
        </div>
        <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
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

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiStat
          label="Chiffre d'affaires"
          value={loading ? "…" : String(overview?.revenue.value.toLocaleString("fr-MA") ?? "0")}
          unit="MAD"
          icon={Wallet}
          change={formatPct(overview?.revenue.changePercent ?? null)}
          positive={(overview?.revenue.changePercent ?? 0) >= 0}
          spark={spark}
        />
        <KpiStat
          label="Rendez-vous réalisés"
          value={loading ? "…" : String(overview?.appointments.value ?? 0)}
          unit="soins"
          icon={CalendarCheck}
          change={formatPct(overview?.appointments.changePercent ?? null)}
          positive={(overview?.appointments.changePercent ?? 0) >= 0}
          spark={spark}
        />
        <KpiStat
          label="Clientes actives"
          value={loading ? "…" : String(customers?.kpis.active ?? overview?.customers.value ?? 0)}
          unit="profils"
          icon={Users}
          change={customers ? `+${customers.kpis.newInPeriod} nouv.` : formatPct(overview?.customers.changePercent ?? null)}
          positive
          spark={spark}
        />
        <KpiStat
          label="Panier moyen"
          value={loading ? "…" : String(Math.round(overview?.averageTicket.value ?? 0).toLocaleString("fr-MA"))}
          unit="MAD"
          icon={ShoppingBag}
          change={formatPct(overview?.averageTicket.changePercent ?? null)}
          positive={(overview?.averageTicket.changePercent ?? 0) >= 0}
          spark={spark}
        />
      </section>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="flex flex-col gap-6 lg:col-span-7 lg:gap-8">
          <section className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-soft sm:p-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-primary">
                  Analyse financière
                </span>
                <h3 className="text-lg font-bold text-ink">Évolution du CA</h3>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <span className="inline-block h-3 w-3 rounded-full bg-primary" />
                  Période ({formatMad(revenueTotals?.periodNet ?? overview?.revenue.value ?? 0)})
                </span>
                <span className="inline-flex items-center gap-1.5 text-ink/50">
                  <span className="inline-block h-3 w-3 rounded-full bg-[#E4BDC2]" />
                  Mois préc. ({formatMad(revenueTotals?.prevMonth ?? overview?.revenue.previous ?? 0)})
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 rounded-xl bg-[#FBF4F6] p-3">
              <div>
                <p className="text-[11px] text-ink/45">Total cumulé</p>
                <p className="text-lg font-bold text-ink">
                  {formatMad(revenueTotals?.periodNet ?? overview?.revenue.value ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-ink/45">Mois précédent</p>
                <p className="text-lg font-bold text-ink/55">
                  {formatMad(revenueTotals?.prevMonth ?? overview?.revenue.previous ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-ink/45">Écart</p>
                <p className="text-lg font-bold text-primary">{formatPct(overview?.revenue.changePercent ?? null)}</p>
              </div>
            </div>
            <div className="h-56 pt-1">
              {loading ? (
                <p className="flex h-full items-center justify-center text-sm text-ink/45">Chargement…</p>
              ) : chartData.length === 0 ? (
                <p className="flex h-full items-center justify-center text-sm text-ink/45">
                  Aucun encaissement sur la période.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="dashCaFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#E31C5F" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#E31C5F" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#F0DDE9" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#241A22", fillOpacity: 0.4, fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value) => [`${Number(value ?? 0).toLocaleString("fr-MA")} MAD`, "CA"]}
                      contentStyle={{ borderRadius: 12, border: "1px solid #F0E3E6" }}
                    />
                    <Area type="monotone" dataKey="ca" stroke="#E31C5F" strokeWidth={3} fill="url(#dashCaFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          <section className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-soft sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <h3 className="text-lg font-bold text-ink">Rendez-vous du jour</h3>
                <span className="rounded-full bg-[#FBF4F6] px-2 py-0.5 text-[11px] font-medium text-ink">
                  {upcomingPreview.length} prochain{upcomingPreview.length > 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/agenda/"
                  className="rounded-lg bg-[#FBF4F6] px-3 py-1 text-xs font-semibold text-primary hover:bg-primary hover:text-white"
                >
                  + Nouveau RDV
                </Link>
                <Link href="/agenda/" className="px-2 py-1 text-xs text-ink/50 hover:text-ink">
                  Voir agenda
                </Link>
              </div>
            </div>
            {loading ? (
              <p className="text-sm text-ink/45">Chargement…</p>
            ) : upcomingPreview.length === 0 ? (
              <p className="text-sm text-ink/45">Aucun rendez-vous aujourd&apos;hui.</p>
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
                        "flex min-w-0 items-center justify-between gap-3 rounded-xl p-3",
                        soon ? "bg-primary-light/70" : "bg-[#FBF4F6]",
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className={cn("w-14 shrink-0 text-lg font-extrabold", soon ? "text-primary" : "text-ink")}>
                          {time}
                        </span>
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                          {initials(apt.customerName)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-ink">{apt.customerName.trim() || "Cliente"}</p>
                          <p className="truncate text-xs text-ink/50">
                            {apt.serviceName || "Prestation"} • {apt.staffName || "Équipe"}
                          </p>
                        </div>
                      </div>
                      <div className="hidden items-center gap-3 sm:flex">
                        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-ink/70 shadow-sm">
                          <span className={cn("h-2 w-2 rounded-full", soon ? "animate-pulse bg-primary" : "bg-emerald-500")} />
                          {soon ? "Arrivée imminente" : APPOINTMENT_STATUS_LABEL[apt.status]}
                        </span>
                        <span className="min-w-[70px] text-right text-lg font-bold text-primary">
                          {apt.price.toLocaleString("fr-MA")} MAD
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <section className="flex flex-col justify-between gap-4 rounded-2xl bg-white p-5 shadow-soft sm:p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-ink">Top prestations</h3>
                <span className="text-xs font-bold text-primary">Période</span>
              </div>
              {services.length === 0 ? (
                <p className="text-sm text-ink/45">Pas encore de ventes sur la période.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {services.map((s, i) => (
                    <div key={s.serviceId} className="flex flex-col gap-1">
                      <div className="flex justify-between gap-2 text-sm">
                        <span className="font-bold text-ink">
                          {i + 1}. {s.serviceName}
                        </span>
                        <span className="shrink-0 font-bold text-primary">
                          {formatMad(s.revenue)}{" "}
                          <span className="font-normal text-ink/40">({s.appointments})</span>
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#F0DDE9]">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.round((s.revenue / maxService) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Link
                href="/services/"
                className="rounded-lg bg-[#FBF4F6] py-2 text-center text-xs font-semibold text-ink/80 hover:bg-[#F0DDE9]"
              >
                Voir le catalogue
              </Link>
            </section>

            <section className="flex flex-col justify-between gap-4 rounded-2xl bg-white p-5 shadow-soft sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-ink">Affluence hebdo</h3>
                  <p className="text-xs font-semibold text-gold">
                    {peakCell.count > 0 && peakDay
                      ? `${peakDay} ${String(peakCell.hour).padStart(2, "0")}h · ${peakCell.count} RDV`
                      : "Pas encore de pic identifié"}
                  </p>
                </div>
                <LayoutGrid size={18} className="text-gold" />
              </div>
              <div className="flex flex-col gap-1">
                <div className="mb-1 grid grid-cols-8 gap-1 text-center text-[11px] text-ink/40">
                  <span>H</span>
                  {heatDays.map((d) => (
                    <span key={d.dow} className={d.dow === 6 ? "font-bold text-primary" : ""}>
                      {d.label}
                    </span>
                  ))}
                </div>
                {heatHours.map((hour) => (
                  <div key={hour} className="grid grid-cols-8 items-center gap-1 text-center text-xs">
                    <span className="font-mono text-ink/40">{String(hour).padStart(2, "0")}h</span>
                    {heatDays.map((d) => {
                      const count = heat.find((c) => c.weekday === d.dow && c.hour === hour)?.count ?? 0;
                      return (
                        <span
                          key={`${d.dow}-${hour}`}
                          title={`${d.label} ${hour}h — ${count} RDV`}
                          className={cn("h-5 rounded", heatClass(count, heatMax))}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-1 text-[11px] text-ink/40">
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded bg-line" /> Calme
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded bg-primary/40" /> Modéré
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded bg-primary" /> Saturé
                </span>
              </div>
            </section>
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-5 lg:gap-8">
          <section className="rounded-2xl bg-white p-5 shadow-soft sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FBF4F6] text-primary">
                  <Wallet size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-ink">Caisse du jour</h3>
                  <p className="text-xs font-medium text-gold">
                    {session?.status === "OPEN" ? "Session ouverte" : "Aucune session ouverte"}
                  </p>
                </div>
              </div>
              <span className="text-xl font-extrabold text-primary">{formatMad(payments?.total ?? 0)}</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-[#FBF4F6] p-3 text-center">
              <div>
                <span className="text-[11px] text-ink/45">Espèces</span>
                <p className="text-sm font-bold">{formatMad(payments?.cash ?? 0)}</p>
              </div>
              <div>
                <span className="text-[11px] text-ink/45">Carte</span>
                <p className="text-sm font-bold">{formatMad(payments?.card ?? 0)}</p>
              </div>
              <div>
                <span className="text-[11px] text-ink/45">Virements</span>
                <p className="text-sm font-bold">{formatMad(payments?.transfer ?? 0)}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between px-1 text-sm">
              <span className="font-semibold text-red-600">Sorties : −{formatMad(session?.cashOut ?? 0)}</span>
              <span className="font-bold text-ink">
                Solde :{" "}
                <span className="font-extrabold text-primary">{formatMad(session?.theoreticalBalance ?? 0)}</span>
              </span>
            </div>
            <Link
              href="/cash-register/"
              className="mt-4 flex h-11 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white shadow-sm transition hover:bg-primary-dark"
            >
              Ouvrir / Gérer la caisse
            </Link>
          </section>

          {isEnabled("ai") ? <DashboardAiInsights /> : <InsightsFallback overview={overview} stock={stock} />}

          <section className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-soft sm:p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-ink">Performance équipe</h3>
              <span className="text-xs text-ink/40">CA &amp; commissions</span>
            </div>
            {staffRows.length === 0 ? (
              <p className="text-sm text-ink/45">Pas encore de performance sur la période.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {staffRows.map((row, i) => (
                  <div key={row.staffId} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                            i === 0 ? "bg-primary text-white" : "bg-[#F0DDE9] text-ink",
                          )}
                        >
                          {row.staffName.charAt(0)}
                        </span>
                        <span className="text-sm font-bold text-ink">{row.staffName}</span>
                      </div>
                      <span className="text-sm font-extrabold text-primary">{formatMad(row.revenue)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#F0DDE9]">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.round((row.revenue / maxStaffRev) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-ink/50">
                      <span>{row.appointments} soins</span>
                      <span className="font-semibold text-gold">Com. : {formatMad(row.commission)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link
              href="/commissions/"
              className="rounded-lg bg-[#FBF4F6] py-2 text-center text-xs font-semibold text-ink/80 hover:bg-[#F0DDE9]"
            >
              Détails des commissions
            </Link>
          </section>

          <section className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-soft sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-ink">Stock &amp; produits</h3>
                <p className="text-xs text-ink/40">{stock ? `${stock.productCount} références` : "—"}</p>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FBF4F6] text-primary">
                <Package size={18} />
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-[#FBF4F6] p-2">
                <span className="text-xl font-bold text-emerald-700">{normalStock}</span>
                <p className="text-[11px] text-ink/50">Normal</p>
              </div>
              <div className="rounded-lg bg-[#FFF1D6] p-2">
                <span className="text-xl font-bold text-gold">{stock?.lowStockCount ?? 0}</span>
                <p className="text-[11px] text-gold">Faible</p>
              </div>
              <div className="rounded-lg bg-red-50 p-2">
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
              className="rounded-lg bg-[#FBF4F6] py-2 text-center text-xs font-semibold text-ink/80 hover:bg-[#F0DDE9]"
            >
              Gérer le stock
            </Link>
          </section>

          <section className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-soft sm:p-6">
            <h3 className="text-lg font-bold text-ink">Rétention &amp; no-show</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col rounded-xl bg-[#FBF4F6] p-3">
                <span className="text-[11px] text-ink/45">Clientes actives</span>
                <span className="text-xl font-bold text-ink">{customers?.kpis.active ?? 0}</span>
                <span className="text-xs font-semibold text-emerald-700">
                  {customers?.retention.returning ?? 0} récurrentes
                  {customers?.retention.retentionRate != null ? ` (${customers.retention.retentionRate} %)` : ""}
                </span>
              </div>
              <div className="flex flex-col rounded-xl bg-[#FBF4F6] p-3">
                <span className="text-[11px] text-ink/45">Taux d&apos;absence</span>
                <span className="text-xl font-bold text-primary">
                  {appointmentsAnalytics?.noShow.rate != null ? `${appointmentsAnalytics.noShow.rate} %` : "—"}
                </span>
                <span className="text-xs text-ink/50">{appointmentsAnalytics?.noShow.count ?? 0} no-shows</span>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <section className="flex flex-col justify-between rounded-2xl bg-white p-4 shadow-soft">
              <span className="text-[11px] font-bold uppercase text-primary">Campagnes</span>
              <div className="my-2">
                <p className="text-2xl font-extrabold text-ink">{waKpis?.pendingToday ?? 0}</p>
                <p className="text-xs text-ink/50">Messages WhatsApp à envoyer</p>
              </div>
              <Link href="/whatsapp/" className="text-xs font-bold text-gold">
                Ouvrir WhatsApp →
              </Link>
            </section>
            <section className="flex flex-col justify-between rounded-2xl bg-white p-4 shadow-soft">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase text-gold">Avis clientes</span>
                <Star size={14} className="fill-gold text-gold" />
              </div>
              <div className="my-2">
                <p className="text-2xl font-extrabold text-ink">
                  {reviewKpis?.averageScore != null
                    ? reviewKpis.averageScore.toFixed(1)
                    : reviewsAnalytics?.averageInternalScore != null
                      ? reviewsAnalytics.averageInternalScore.toFixed(1)
                      : "—"}{" "}
                  <span className="text-sm font-normal text-ink/40">/ 5</span>
                </p>
                <p className="text-xs text-ink/50">
                  {reviewKpis?.recordedCount ?? reviewsAnalytics?.recordedSatisfaction ?? 0} avis enregistrés
                </p>
              </div>
              <Link href="/reviews/" className="text-xs font-semibold text-primary">
                {reviewKpis?.satisfiedPercent != null
                  ? `${reviewKpis.satisfiedPercent} % satisfaites`
                  : "Voir les avis"}
              </Link>
            </section>
          </div>
        </div>
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
        accent ? "bg-primary-light/60" : "bg-[#FBF4F6] hover:bg-[#F0DDE9]",
      )}
    >
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg shadow-sm",
            accent ? "bg-primary text-white" : danger ? "bg-red-50 text-red-600" : "bg-white text-primary",
          )}
        >
          <Icon size={18} />
        </div>
        <span
          className={cn(
            "text-[11px] font-bold",
            accent ? "tracking-wider text-primary" : danger ? "text-red-600" : "text-ink/45",
          )}
        >
          {kicker}
        </span>
      </div>
      <div className="mt-3">
        <p className="text-lg font-bold leading-tight text-ink">{title}</p>
        <p className={cn("line-clamp-1 text-xs", accent ? "font-medium text-primary" : "text-ink/50")}>{subtitle}</p>
      </div>
      <Link
        href={href}
        className={cn(
          "mt-3 flex h-9 items-center justify-center gap-1 rounded-lg text-xs font-semibold shadow-sm transition",
          accent ? "bg-primary text-white hover:bg-primary-dark" : "bg-white text-ink hover:bg-primary hover:text-white",
        )}
      >
        {cta}
        <ArrowRight size={12} />
      </Link>
    </div>
  );
}

function KpiStat({
  label,
  value,
  unit,
  icon: Icon,
  change,
  positive,
  spark,
}: {
  label: string;
  value: string;
  unit: string;
  icon: typeof Wallet;
  change: string;
  positive: boolean;
  spark: number[];
}) {
  return (
    <div className="flex flex-col justify-between rounded-2xl bg-white p-5 shadow-soft transition hover:shadow-[0_18px_40px_rgba(227,28,95,0.08)]">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-ink/45">{label}</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="font-display text-3xl font-extrabold tracking-tight text-ink">{value}</span>
            <span className="text-sm font-bold text-primary">{unit}</span>
          </div>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon size={22} />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div
          className={cn(
            "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
            positive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600",
          )}
        >
          <TrendingUp size={12} />
          {change}
        </div>
        <MiniSpark values={spark} />
      </div>
    </div>
  );
}

function InsightsFallback({
  overview,
  stock,
}: {
  overview: AnalyticsOverview | null;
  stock: StockKpis | null;
}) {
  const pct = overview?.revenue.changePercent;
  const alerts = (stock?.outOfStockCount ?? 0) + (stock?.lowStockCount ?? 0);
  return (
    <section className="relative overflow-hidden rounded-2xl bg-institut p-5 text-white shadow-md sm:p-6">
      <div className="pointer-events-none absolute -bottom-8 -right-8 h-44 w-44 rounded-full bg-gold/15 blur-2xl" />
      <div className="relative z-10 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold text-institut">
          <Sparkles size={14} />
        </div>
        <span className="text-xs font-bold tracking-wide text-gold">Rappel Beauté Intelligence</span>
      </div>
      <div className="relative z-10 mt-4 space-y-3 text-sm">
        <p className="text-white/90">
          {pct == null
            ? "Suivez l’activité de votre institut en temps réel."
            : pct > 0
              ? `Votre CA a augmenté de ${pct.toFixed(1)} % par rapport à la période précédente.`
              : pct < 0
                ? `Votre CA est en baisse de ${Math.abs(pct).toFixed(1)} % par rapport à la période précédente.`
                : "Votre CA est stable par rapport à la période précédente."}
        </p>
        {alerts > 0 ? (
          <p className="text-white/80">
            {alerts} produit{alerts > 1 ? "s" : ""} à surveiller en stock.
          </p>
        ) : null}
      </div>
    </section>
  );
}
