"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { buttonVariants } from "@/components/ui/button";
import { formatMad, formatPct } from "@/modules/analytics/service";
import { cn } from "@/lib/utils";
import type {
  AnalyticsOverview,
  AppointmentAnalytics,
  CustomerAnalytics,
  InventoryAnalytics,
  MarketingAnalyticsRow,
  AIMarketingAnalyticsSummary,
  PostVisitAnalyticsSummary,
  RevenueAnalytics,
  ServiceAnalyticsRow,
  StaffAnalyticsRow,
} from "@/types/analytics";

const CHART = {
  primary: "#E31C5F",
  ink: "#241A22",
  muted: "#F0E3E6",
  green: "#2D9F6F",
  orange: "#D97706",
  red: "#C44536",
  blue: "#3B82F6",
  soft: "#F8B4C4",
};

const PAY_COLORS = ["#2D9F6F", "#3B82F6", "#D97706", "#9333EA", "#64748B", "#E31C5F"];

type Props = {
  overview: AnalyticsOverview;
  revenue: RevenueAnalytics | null;
  appointments: AppointmentAnalytics | null;
  customers: CustomerAnalytics | null;
  services: ServiceAnalyticsRow[];
  staff: StaffAnalyticsRow[];
  inventory: InventoryAnalytics | null;
  marketing: MarketingAnalyticsRow[];
  postVisit: PostVisitAnalyticsSummary | null;
  aiMarketing: AIMarketingAnalyticsSummary | null;
  periodLabel: string;
};

function statusCount(appointments: AppointmentAnalytics, statuses: string[]) {
  return appointments.byStatus
    .filter((s) => statuses.includes(s.status))
    .reduce((sum, s) => sum + s.count, 0);
}

function Trend({ pct }: { pct: number | null }) {
  if (pct == null) return <span className="text-xs text-ink/40">—</span>;
  const up = pct >= 0;
  return (
    <span className={`text-xs font-medium ${up ? "text-emerald-700" : "text-red-600"}`}>
      {up ? "↑" : "↓"} {formatPct(pct)}
    </span>
  );
}

function Section({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`surface p-4 sm:p-5 ${className}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-ink/60">
        <span>{label}</span>
        <span className="font-mono">
          {value.toLocaleString("fr-MA")} / {max.toLocaleString("fr-MA")} · {pct}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Heatmap({
  data,
}: {
  data: { weekday: number; hour: number; count: number }[];
}) {
  const hours = Array.from({ length: 11 }, (_, i) => i + 9); // 9–19
  const days = [1, 2, 3, 4, 5, 6]; // Lun–Sam
  const labels = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  const max = Math.max(1, ...data.map((d) => d.count));

  function cell(dow: number, hour: number) {
    return data.find((d) => d.weekday === dow && d.hour === hour)?.count ?? 0;
  }

  function bg(count: number) {
    if (count === 0) return "bg-line/40";
    const t = count / max;
    if (t < 0.25) return "bg-primary/15";
    if (t < 0.5) return "bg-primary/35";
    if (t < 0.75) return "bg-primary/60";
    return "bg-primary";
  }

  return (
    <div className="overflow-x-auto">
      <div className="inline-grid min-w-[520px] gap-1" style={{ gridTemplateColumns: `48px repeat(${hours.length}, 1fr)` }}>
        <div />
        {hours.map((h) => (
          <div key={h} className="text-center text-[10px] text-ink/45">
            {h}h
          </div>
        ))}
        {days.map((dow, i) => (
          <div key={dow} className="contents">
            <div className="flex items-center text-[11px] text-ink/55">
              {labels[i]}
            </div>
            {hours.map((h) => {
              const c = cell(dow, h);
              return (
                <div
                  key={`${dow}-${h}`}
                  title={`${labels[i]} ${h}h — ${c} RDV`}
                  className={`flex h-7 items-center justify-center rounded-sm text-[9px] ${bg(c)} ${c > max * 0.6 ? "text-white" : "text-ink/70"}`}
                >
                  {c > 0 ? c : ""}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-ink/40">Plus foncé = plus de rendez-vous</p>
    </div>
  );
}

export function AnalyticsOverviewDashboard({
  overview,
  revenue,
  appointments,
  customers,
  services,
  staff,
  inventory,
  marketing,
  postVisit,
  aiMarketing,
  periodLabel,
}: Props) {
  const [staffMetric, setStaffMetric] = useState<"revenue" | "appointments" | "ticket">("revenue");
  const [serviceMetric, setServiceMetric] = useState<"revenue" | "appointments">("revenue");

  const completed = appointments ? statusCount(appointments, ["COMPLETED"]) : 0;
  const cancelled = appointments ? statusCount(appointments, ["CANCELLED"]) : 0;
  const noShow = appointments ? statusCount(appointments, ["NO_SHOW"]) : 0;
  const upcoming = appointments
    ? statusCount(appointments, ["PENDING", "CONFIRMED", "ARRIVED", "IN_PROGRESS"])
    : 0;
  const presenceRate =
    completed + noShow > 0 ? Math.round((completed / (completed + noShow)) * 1000) / 10 : null;
  const cancelRate =
    appointments && appointments.total > 0
      ? Math.round((cancelled / appointments.total) * 1000) / 10
      : null;

  const apptBarData = useMemo(() => {
    if (!appointments) return [];
    return [
      { name: "Terminés", count: completed, fill: CHART.green },
      { name: "Annulés", count: cancelled, fill: CHART.orange },
      { name: "Absents", count: noShow, fill: CHART.red },
      { name: "À venir", count: upcoming, fill: CHART.blue },
    ];
  }, [appointments, completed, cancelled, noShow, upcoming]);

  const topServices = useMemo(() => {
    const sorted = [...services].sort((a, b) =>
      serviceMetric === "revenue" ? b.revenue - a.revenue : b.appointments - a.appointments,
    );
    return sorted.slice(0, 6);
  }, [services, serviceMetric]);

  const staffChart = useMemo(() => {
    return [...staff]
      .map((s) => ({
        name: s.staffName,
        value:
          staffMetric === "revenue"
            ? s.revenue
            : staffMetric === "appointments"
              ? s.appointments
              : s.appointments > 0
                ? Math.round(s.revenue / s.appointments)
                : 0,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [staff, staffMetric]);

  const payData = revenue?.byPaymentMethod.filter((m) => m.amount > 0) ?? [];

  const marketingTotals = useMemo(() => {
    const targeted = marketing.reduce((s, c) => s + c.targeted, 0);
    const sent = marketing.reduce((s, c) => s + c.sent, 0);
    const appts = marketing.reduce((s, c) => s + c.associatedAppointments, 0);
    const ca = marketing.reduce((s, c) => s + c.associatedRevenue, 0);
    return { campaigns: marketing.length, targeted, sent, appts, ca };
  }, [marketing]);

  const bestCampaign = useMemo(() => {
    if (!marketing.length) return null;
    return [...marketing].sort((a, b) => b.associatedRevenue - a.associatedRevenue)[0];
  }, [marketing]);

  const insights = useMemo(() => {
    const items: { tone: "info" | "warn" | "action"; text: string; href?: string }[] = [];
    if (overview.revenue.changePercent != null) {
      items.push({
        tone: overview.revenue.changePercent >= 0 ? "info" : "warn",
        text: `Votre CA a ${overview.revenue.changePercent >= 0 ? "augmenté" : "diminué"} de ${Math.abs(overview.revenue.changePercent).toFixed(1)} % sur ${periodLabel.toLowerCase()}.`,
      });
    }
    if (services.length && overview.revenue.value > 0) {
      const top = [...services].sort((a, b) => b.revenue - a.revenue)[0];
      const share = Math.round((top.revenue / overview.revenue.value) * 1000) / 10;
      items.push({
        tone: "info",
        text: `« ${top.serviceName} » génère ${share} % de votre CA.`,
      });
    }
    if (cancelRate != null && cancelRate >= 8) {
      items.push({
        tone: "warn",
        text: `Taux d'annulation à ${cancelRate} % — surveillez les créneaux sensibles.`,
      });
    }
    if (customers && customers.kpis.inactive > 0) {
      items.push({
        tone: "action",
        text: `${customers.kpis.inactive} clientes inactives. Relancez-les avec une campagne « Retour cliente ».`,
        href: "/marketing/",
      });
    }
    if (inventory && inventory.lowStockCount > 0) {
      items.push({
        tone: "warn",
        text: `${inventory.lowStockCount} produit${inventory.lowStockCount > 1 ? "s" : ""} en stock faible.`,
        href: "/stock/",
      });
    }
    return items.slice(0, 5);
  }, [overview, services, cancelRate, customers, inventory, periodLabel]);

  const goals = useMemo(() => {
    const caGoal = Math.max(
      overview.revenue.value,
      Math.round((overview.revenue.previous ?? overview.revenue.value) * 1.15) || overview.revenue.value * 1.2,
    );
    const rdvGoal = Math.max(
      overview.appointments.value,
      Math.round((overview.appointments.previous ?? overview.appointments.value) * 1.15) ||
        overview.appointments.value * 1.2,
    );
    const newGoal = Math.max(
      customers?.kpis.newInPeriod ?? 0,
      Math.round((customers?.kpis.newInPeriod ?? 10) * 1.2) || 10,
    );
    return { caGoal, rdvGoal, newGoal };
  }, [overview, customers]);

  const peakHour = appointments?.byHour.reduce(
    (best, h) => (h.count > best.count ? h : best),
    { hour: 0, label: "—", count: 0 },
  );

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="surface p-4">
          <p className="text-xs text-ink/45">CA</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{formatMad(overview.revenue.value)}</p>
          <div className="mt-1 flex items-center gap-2">
            <Trend pct={overview.revenue.changePercent} />
            <span className="text-[11px] text-ink/40">vs période préc.</span>
          </div>
        </div>
        <div className="surface p-4">
          <p className="text-xs text-ink/45">Rendez-vous</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">
            {overview.appointments.value.toLocaleString("fr-MA")}
          </p>
          <Trend pct={overview.appointments.changePercent} />
        </div>
        <div className="surface p-4">
          <p className="text-xs text-ink/45">Clientes actives</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">
            {overview.customers.value.toLocaleString("fr-MA")}
          </p>
          <Trend pct={overview.customers.changePercent} />
        </div>
        <div className="surface p-4">
          <p className="text-xs text-ink/45">Panier moyen</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">
            {formatMad(overview.averageTicket.value)}
          </p>
          <Trend pct={overview.averageTicket.changePercent} />
        </div>
      </div>

      {/* CA évolution */}
      <Section title="Évolution du chiffre d'affaires">
        {revenue && revenue.daily.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart data={revenue.daily}>
                <defs>
                  <linearGradient id="analyticsCaFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART.primary} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={CHART.primary} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={CHART.muted} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: CHART.ink, fillOpacity: 0.45 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: CHART.ink, fillOpacity: 0.45 }} tickLine={false} axisLine={false} width={48} />
                <Tooltip formatter={(v) => [formatMad(Number(v ?? 0)), "CA"]} />
                <Area type="monotone" dataKey="revenue" stroke={CHART.primary} strokeWidth={2.5} fill="url(#analyticsCaFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-10 text-center text-sm text-ink/45">Aucun encaissement sur la période.</p>
        )}
        <div className="mt-3 grid gap-2 sm:grid-cols-3 text-sm">
          <p>
            <span className="text-ink/45">CA </span>
            <span className="font-mono font-medium">{formatMad(overview.revenue.value)}</span>
          </p>
          <p>
            <span className="text-ink/45">Dépenses </span>
            <span className="font-mono font-medium">{formatMad(overview.expenses.value)}</span>
          </p>
          <p>
            <span className="text-ink/45">Marge </span>
            <span className="font-mono font-medium">{formatMad(overview.margin.value)}</span>
          </p>
        </div>
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* RDV */}
        <Section title="Rendez-vous">
          {appointments ? (
            <>
              <p className="mb-3 text-2xl font-semibold">{appointments.total.toLocaleString("fr-MA")} <span className="text-sm font-normal text-ink/45">total</span></p>
              <div className="mb-4 h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={apptBarData}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={32} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {apptBarData.map((e) => (
                        <Cell key={e.name} fill={e.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p>Taux de présence <strong className="float-right font-mono">{presenceRate != null ? `${presenceRate} %` : "—"}</strong></p>
                <p>Taux d&apos;annulation <strong className="float-right font-mono">{cancelRate != null ? `${cancelRate} %` : "—"}</strong></p>
              </div>
            </>
          ) : (
            <p className="text-sm text-ink/45">Chargement…</p>
          )}
        </Section>

        {/* Paiements */}
        <Section title="Répartition des paiements">
          {payData.length > 0 ? (
            <>
              <div className="mx-auto h-48 w-full max-w-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={payData} dataKey="amount" nameKey="label" innerRadius={48} outerRadius={72} paddingAngle={2}>
                      {payData.map((_, i) => (
                        <Cell key={i} fill={PAY_COLORS[i % PAY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatMad(Number(v ?? 0))} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 space-y-1 text-sm">
                {payData.map((m) => (
                  <div key={m.method} className="flex justify-between">
                    <span>{m.label}</span>
                    <span className="font-mono text-ink/70">{m.percent} % · {formatMad(m.amount)}</span>
                  </div>
                ))}
              </div>
              {revenue ? (
                <div className="mt-3 border-t border-line pt-3 text-sm space-y-1">
                  <div className="flex justify-between"><span>CA encaissé</span><span className="font-mono">{formatMad(revenue.totals.periodNet)}</span></div>
                  <div className="flex justify-between"><span>Remboursements</span><span className="font-mono">{formatMad(revenue.totals.refunds)}</span></div>
                </div>
              ) : null}
            </>
          ) : (
            <p className="py-8 text-center text-sm text-ink/45">Aucun paiement sur la période.</p>
          )}
        </Section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Prestations */}
        <Section
          title="Prestations"
          action={
            <div className="flex gap-1 rounded-lg border border-line p-0.5 text-xs">
              <button
                type="button"
                className={`rounded-md px-2 py-1 ${serviceMetric === "revenue" ? "bg-ink text-white" : "text-ink/55"}`}
                onClick={() => setServiceMetric("revenue")}
              >
                Par CA
              </button>
              <button
                type="button"
                className={`rounded-md px-2 py-1 ${serviceMetric === "appointments" ? "bg-ink text-white" : "text-ink/55"}`}
                onClick={() => setServiceMetric("appointments")}
              >
                Par ventes
              </button>
            </div>
          }
        >
          {topServices.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={topServices.map((s) => ({
                    name: s.serviceName.length > 18 ? `${s.serviceName.slice(0, 16)}…` : s.serviceName,
                    value: serviceMetric === "revenue" ? s.revenue : s.appointments,
                    full: s.serviceName,
                  }))}
                  margin={{ left: 8, right: 16 }}
                >
                  <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(v) =>
                      serviceMetric === "revenue" ? formatMad(Number(v ?? 0)) : String(v)
                    }
                  />
                  <Bar dataKey="value" fill={CHART.primary} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-ink/45">Aucune prestation.</p>
          )}
          {topServices.length > 0 ? (
            <ul className="mt-2 divide-y divide-line text-sm">
              {topServices.slice(0, 5).map((s) => (
                <li key={s.serviceId} className="flex justify-between gap-2 py-2">
                  <span className="truncate">{s.serviceName}</span>
                  <span className="shrink-0 font-mono text-ink/60">
                    {s.appointments} · {formatMad(s.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </Section>

        {/* Clientes */}
        <Section title="Clientes">
          {customers ? (
            <>
              <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl bg-primary-light/40 p-3">
                  <p className="text-xs text-ink/45">Total</p>
                  <p className="text-lg font-semibold">{customers.kpis.total.toLocaleString("fr-MA")}</p>
                </div>
                <div className="rounded-xl bg-primary-light/40 p-3">
                  <p className="text-xs text-ink/45">Nouvelles</p>
                  <p className="text-lg font-semibold">{customers.kpis.newInPeriod.toLocaleString("fr-MA")}</p>
                </div>
                <div className="rounded-xl bg-primary-light/40 p-3">
                  <p className="text-xs text-ink/45">Actives</p>
                  <p className="text-lg font-semibold">{customers.kpis.active.toLocaleString("fr-MA")}</p>
                </div>
                <div className="rounded-xl bg-primary-light/40 p-3">
                  <p className="text-xs text-ink/45">Inactives</p>
                  <p className="text-lg font-semibold">{customers.kpis.inactive.toLocaleString("fr-MA")}</p>
                </div>
                <div className="rounded-xl bg-primary-light/40 p-3">
                  <p className="text-xs text-ink/45">Fidèles / VIP</p>
                  <p className="text-lg font-semibold">{customers.kpis.vip.toLocaleString("fr-MA")}</p>
                </div>
                <div className="rounded-xl bg-primary-light/40 p-3">
                  <p className="text-xs text-ink/45">Rétention</p>
                  <p className="text-lg font-semibold">
                    {customers.retention.retentionRate != null
                      ? `${customers.retention.retentionRate} %`
                      : "—"}
                  </p>
                </div>
              </div>
              {customers.newByMonth.length > 0 ? (
                <div className="h-40">
                  <p className="mb-1 text-xs text-ink/45">Nouvelles clientes</p>
                  <ResponsiveContainer width="100%" height="90%">
                    <AreaChart data={customers.newByMonth}>
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10 }} width={28} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="count" stroke={CHART.blue} fill={CHART.soft} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : null}
              <div className="mt-3 border-t border-line pt-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Première visite (nouvelles)</span>
                  <span className="font-mono">{customers.kpis.newInPeriod}</span>
                </div>
                <div className="flex justify-between">
                  <span>Retour (récurrentes période)</span>
                  <span className="font-mono">{customers.retention.returning}</span>
                </div>
                <div className="flex justify-between">
                  <span>Taux de retour</span>
                  <span className="font-mono">
                    {customers.retention.retentionRate != null
                      ? `${customers.retention.retentionRate} %`
                      : "—"}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-ink/45">Chargement…</p>
          )}
        </Section>
      </div>

      {/* Équipe */}
      <Section
        title="Activité de l'équipe"
        action={
          <div className="flex gap-1 rounded-lg border border-line p-0.5 text-xs">
            {(
              [
                ["revenue", "CA"],
                ["appointments", "RDV"],
                ["ticket", "Panier"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                className={`rounded-md px-2 py-1 ${staffMetric === k ? "bg-ink text-white" : "text-ink/55"}`}
                onClick={() => setStaffMetric(k)}
              >
                {label}
              </button>
            ))}
          </div>
        }
      >
        <p className="mb-3 text-xs text-ink/45">
          Statistiques d&apos;activité — pas un classement de performance.
        </p>
        {staffChart.length > 0 ? (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={staffChart} margin={{ left: 8, right: 16 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(v) =>
                    staffMetric === "appointments" ? String(v) : formatMad(Number(v ?? 0))
                  }
                />
                <Bar dataKey="value" fill="#7C3A6A" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-ink/45">Aucune donnée équipe.</p>
        )}
      </Section>

      {/* Heatmap */}
      <Section title="Heures de fréquentation">
        {appointments && (appointments.heatmap?.length ?? 0) > 0 ? (
          <>
            <Heatmap data={appointments.heatmap} />
            {peakHour && peakHour.count > 0 ? (
              <p className="mt-3 text-sm text-ink/60">
                Créneau le plus demandé : <strong>{peakHour.label}</strong> ({peakHour.count} RDV)
              </p>
            ) : null}
          </>
        ) : appointments?.byHour.some((h) => h.count > 0) ? (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={appointments.byHour}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} width={28} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="count" fill={CHART.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-ink/45">Pas assez de RDV pour la heatmap.</p>
        )}
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Stock */}
        <Section
          title="Stock"
          action={
            <Link href="/stock/" className="text-xs font-medium text-primary hover:underline">
              Voir le stock
            </Link>
          }
        >
          {inventory ? (
            <>
              <p className="text-2xl font-semibold">{formatMad(inventory.stockValue)}</p>
              <p className="text-xs text-ink/45">Valeur actuelle</p>
              <div className="mt-4 space-y-2">
                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span>Stock faible</span>
                    <span className="font-mono">{inventory.lowStockCount}</span>
                  </div>
                  <div className="h-2 rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-amber-500"
                      style={{ width: `${Math.min(100, inventory.lowStockCount * 8)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span>Ruptures</span>
                    <span className="font-mono">{inventory.outOfStockCount}</span>
                  </div>
                  <div className="h-2 rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-red-500"
                      style={{ width: `${Math.min(100, inventory.outOfStockCount * 12)}%` }}
                    />
                  </div>
                </div>
              </div>
              {inventory.lowStockCount > 0 ? (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  {inventory.lowStockCount} produit{inventory.lowStockCount > 1 ? "s" : ""} bientôt en
                  rupture
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-ink/45">Chargement…</p>
          )}
        </Section>

        {/* Marketing funnel */}
        <Section
          title="Marketing"
          action={
            <Link href="/marketing/" className="text-xs font-medium text-primary hover:underline">
              Campagnes
            </Link>
          }
        >
          <div className="space-y-2 text-sm">
            <FunnelStep label="Campagnes" value={String(marketingTotals.campaigns)} />
            <FunnelStep label="Clientes ciblées" value={marketingTotals.targeted.toLocaleString("fr-MA")} />
            <FunnelStep label="Messages envoyés" value={marketingTotals.sent.toLocaleString("fr-MA")} />
            {postVisit ? (
              <FunnelStep label="Post-visite envoyées" value={String(postVisit.sent)} />
            ) : null}
            <FunnelStep
              label="RDV générés"
              value={marketingTotals.appts.toLocaleString("fr-MA")}
            />
            <FunnelStep label="CA associé" value={formatMad(marketingTotals.ca)} highlight />
          </div>
          {aiMarketing ? (
            <p className="mt-3 text-xs text-ink/45">
              IA Marketing : {aiMarketing.sent} envoyés · {aiMarketing.bookings} réservations
            </p>
          ) : null}
          {bestCampaign && bestCampaign.associatedRevenue > 0 ? (
            <div className="mt-4 rounded-xl border border-line bg-primary-light/40 p-3 text-sm">
              <p className="font-medium">{bestCampaign.campaignName}</p>
              <p className="mt-1 text-ink/60">
                CA généré : {formatMad(bestCampaign.associatedRevenue)} ·{" "}
                {bestCampaign.associatedAppointments} RDV
              </p>
            </div>
          ) : null}
        </Section>
      </div>

      {/* CA vs dépenses */}
      <Section title="CA vs dépenses">
        <div className="grid gap-3 sm:grid-cols-3 mb-4">
          <div className="rounded-xl bg-primary-light/40 p-3">
            <p className="text-xs text-ink/45">CA</p>
            <p className="font-mono text-lg font-semibold">{formatMad(overview.revenue.value)}</p>
          </div>
          <div className="rounded-xl bg-primary-light/40 p-3">
            <p className="text-xs text-ink/45">Dépenses</p>
            <p className="font-mono text-lg font-semibold">{formatMad(overview.expenses.value)}</p>
          </div>
          <div className="rounded-xl bg-primary-light/40 p-3">
            <p className="text-xs text-ink/45">Bénéfice (marge)</p>
            <p className="font-mono text-lg font-semibold">{formatMad(overview.margin.value)}</p>
          </div>
        </div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { name: "CA", value: overview.revenue.value, fill: CHART.primary },
                { name: "Dépenses", value: overview.expenses.value, fill: CHART.orange },
                { name: "Marge", value: overview.margin.value, fill: CHART.green },
              ]}
            >
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={48} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatMad(Number(v ?? 0))} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {[CHART.primary, CHART.orange, CHART.green].map((c, i) => (
                  <Cell key={i} fill={c} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {/* Insights */}
      <Section title="Insights Rappel Beauty">
        {insights.length === 0 ? (
          <p className="text-sm text-ink/45">Pas encore assez de données pour des insights.</p>
        ) : (
          <ul className="space-y-2">
            {insights.map((ins, i) => (
              <li
                key={i}
                className={`rounded-xl px-3 py-2.5 text-sm ${
                  ins.tone === "warn"
                    ? "bg-amber-50 text-amber-950"
                    : ins.tone === "action"
                      ? "bg-primary-light/50 text-ink"
                      : "bg-primary-light/40 text-ink/80"
                }`}
              >
                <span className="mr-1.5">
                  {ins.tone === "warn" ? "⚠️" : ins.tone === "action" ? "🎯" : "💡"}
                </span>
                {ins.text}
                {ins.href ? (
                  <Link href={ins.href} className="ml-2 font-medium text-primary hover:underline">
                    Agir →
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {customers && customers.kpis.inactive > 0 ? (
          <div className="mt-4">
            <Link
              href="/marketing/"
              className={cn(buttonVariants({ variant: "brand", size: "sm" }))}
            >
              Créer une campagne retour
            </Link>
          </div>
        ) : null}
      </Section>

      {/* Objectifs */}
      <Section title={`Objectifs — ${periodLabel}`}>
        <p className="mb-3 text-xs text-ink/40">
          Objectifs suggérés (+15 % vs période précédente) — personnalisables plus tard.
        </p>
        <div className="space-y-3">
          <ProgressBar
            label="CA"
            value={Math.round(overview.revenue.value)}
            max={Math.round(goals.caGoal)}
          />
          <ProgressBar
            label="Rendez-vous"
            value={overview.appointments.value}
            max={Math.round(goals.rdvGoal)}
          />
          <ProgressBar
            label="Nouvelles clientes"
            value={customers?.kpis.newInPeriod ?? 0}
            max={Math.round(goals.newGoal)}
          />
        </div>
      </Section>
    </div>
  );
}

function FunnelStep({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg px-3 py-2 ${
        highlight ? "bg-primary-light/40 font-medium" : "bg-primary-light/40"
      }`}
    >
      <span className="text-ink/60">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
