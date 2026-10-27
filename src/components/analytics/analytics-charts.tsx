"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMad } from "@/modules/analytics/service";
import type {
  AppointmentAnalytics,
  CustomerAnalytics,
  RevenueAnalytics,
  ServiceAnalyticsRow,
  StaffAnalyticsRow,
} from "@/types/analytics";

const COLORS = {
  primary: "#E31C5F",
  soft: "#F8B4C4",
  green: "#2D9F6F",
  orange: "#D97706",
  red: "#C44536",
  blue: "#3B82F6",
  purple: "#9333EA",
  slate: "#64748B",
  muted: "#F0E3E6",
  ink: "#241A22",
};

const PAY_COLORS = [
  COLORS.green,
  COLORS.blue,
  COLORS.orange,
  COLORS.purple,
  COLORS.slate,
  COLORS.primary,
];

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: COLORS.green,
  CANCELLED: COLORS.orange,
  NO_SHOW: COLORS.red,
  PENDING: COLORS.blue,
  CONFIRMED: COLORS.blue,
  ARRIVED: COLORS.purple,
  IN_PROGRESS: COLORS.soft,
};

const STATUS_LABELS: Record<string, string> = {
  COMPLETED: "Terminés",
  CANCELLED: "Annulés",
  NO_SHOW: "Absents",
  PENDING: "En attente",
  CONFIRMED: "Confirmés",
  ARRIVED: "Arrivées",
  IN_PROGRESS: "En cours",
};

type Props = {
  loading: boolean;
  periodLabel: string;
  revenue: RevenueAnalytics | null;
  appointments: AppointmentAnalytics | null;
  customers: CustomerAnalytics | null;
  services: ServiceAnalyticsRow[];
  staff: StaffAnalyticsRow[];
  compact?: boolean;
};

function ChartCard({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl bg-surface-container-lowest p-4 shadow-sm sm:p-5 ${className}`}>
      <div className="mb-3">
        <h3 className="text-base font-bold text-on-surface sm:text-lg">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-xs text-on-surface-variant sm:text-[13px]">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="flex h-full min-h-[160px] items-center justify-center text-center text-sm text-on-surface-variant">
      {text}
    </p>
  );
}

function tipStyle() {
  return {
    borderRadius: 12,
    border: "1px solid #F0E3E6",
    boxShadow: "0 8px 24px rgba(36,26,34,0.06)",
    fontSize: 12,
  };
}

export function AnalyticsCharts({
  loading,
  periodLabel,
  revenue,
  appointments,
  customers,
  services,
  staff,
  compact = false,
}: Props) {
  const daily = useMemo(() => {
    if (!revenue?.daily?.length) return [];
    return revenue.daily.map((d) => ({
      label: d.label || d.date.slice(5),
      ca: d.revenue,
    }));
  }, [revenue]);

  const payments = useMemo(() => {
    return (revenue?.byPaymentMethod ?? [])
      .filter((m) => m.amount > 0)
      .map((m) => ({ name: m.label, value: m.amount, percent: m.percent }));
  }, [revenue]);

  const statusBars = useMemo(() => {
    if (!appointments?.byStatus?.length) return [];
    return appointments.byStatus
      .filter((s) => s.count > 0)
      .map((s) => ({
        name: STATUS_LABELS[s.status] ?? s.status,
        count: s.count,
        fill: STATUS_COLORS[s.status] ?? COLORS.slate,
      }));
  }, [appointments]);

  const byHour = useMemo(() => {
    if (!appointments?.byHour?.length) return [];
    return appointments.byHour
      .filter((h) => h.hour >= 8 && h.hour <= 21)
      .map((h) => ({ label: h.label || `${h.hour}h`, count: h.count }));
  }, [appointments]);

  const topServices = useMemo(() => {
    return [...services]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6)
      .map((s) => ({
        name: s.serviceName.length > 18 ? `${s.serviceName.slice(0, 16)}…` : s.serviceName,
        fullName: s.serviceName,
        ca: s.revenue,
      }))
      .reverse();
  }, [services]);

  const topStaff = useMemo(() => {
    return [...staff]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6)
      .map((s) => ({
        name: s.staffName.length > 16 ? `${s.staffName.slice(0, 14)}…` : s.staffName,
        fullName: s.staffName,
        ca: s.revenue,
      }))
      .reverse();
  }, [staff]);

  const newCustomers = useMemo(() => {
    return (customers?.newByMonth ?? []).map((m) => ({
      label: m.label,
      count: m.count,
    }));
  }, [customers]);

  const chartH = compact ? "h-48" : "h-56";
  const chartHTall = compact ? "h-52" : "h-64";

  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-56 animate-pulse rounded-2xl bg-surface-container-low"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ChartCard
        title="Évolution du chiffre d'affaires"
        subtitle={`CA journalier · ${periodLabel}`}
      >
        {daily.length === 0 ? (
          <Empty text="Aucun encaissement sur cette période." />
        ) : (
          <div className={chartHTall}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart data={daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="analyticsPageCa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={COLORS.muted} vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: COLORS.ink, fillOpacity: 0.45, fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  tick={{ fill: COLORS.ink, fillOpacity: 0.45, fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={tipStyle()}
                  formatter={(value) => [formatMad(Number(value ?? 0)), "CA"]}
                />
                <Area
                  type="monotone"
                  dataKey="ca"
                  stroke={COLORS.primary}
                  strokeWidth={2.5}
                  fill="url(#analyticsPageCa)"
                  animationDuration={700}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Rendez-vous par statut" subtitle="Répartition sur la période">
          {statusBars.length === 0 ? (
            <Empty text="Aucun rendez-vous sur cette période." />
          ) : (
            <div className={chartH}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={statusBars} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={COLORS.muted} vertical={false} />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: COLORS.ink, fillOpacity: 0.5, fontSize: 11 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    width={28}
                    tick={{ fill: COLORS.ink, fillOpacity: 0.45, fontSize: 11 }}
                  />
                  <Tooltip contentStyle={tipStyle()} formatter={(v) => [Number(v ?? 0), "RDV"]} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {statusBars.map((row) => (
                      <Cell key={row.name} fill={row.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Modes de paiement" subtitle="Part du CA encaissé">
          {payments.length === 0 ? (
            <Empty text="Aucun paiement sur cette période." />
          ) : (
            <div className={`flex ${chartH} items-center gap-2`}>
              <div className="h-full min-w-0 flex-1">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <PieChart>
                    <Pie
                      data={payments}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={compact ? 42 : 52}
                      outerRadius={compact ? 68 : 82}
                      paddingAngle={2}
                    >
                      {payments.map((entry, i) => (
                        <Cell key={entry.name} fill={PAY_COLORS[i % PAY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tipStyle()}
                      formatter={(value, name) => [formatMad(Number(value ?? 0)), String(name)]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="w-[42%] space-y-1.5 text-xs sm:text-[13px]">
                {payments.map((p, i) => (
                  <li key={p.name} className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: PAY_COLORS[i % PAY_COLORS.length] }}
                      />
                      <span className="truncate text-on-surface-variant">{p.name}</span>
                    </span>
                    <span className="shrink-0 font-semibold text-on-surface">
                      {p.percent.toLocaleString("fr-MA", { maximumFractionDigits: 0 })} %
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Affluence horaire" subtitle="RDV par heure d’ouverture">
          {byHour.every((h) => h.count === 0) ? (
            <Empty text="Pas assez de données d’affluence." />
          ) : (
            <div className={chartH}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={byHour} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={COLORS.muted} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: COLORS.ink, fillOpacity: 0.45, fontSize: 10 }}
                    interval={compact ? 2 : 1}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    width={28}
                    tick={{ fill: COLORS.ink, fillOpacity: 0.45, fontSize: 11 }}
                  />
                  <Tooltip contentStyle={tipStyle()} formatter={(v) => [Number(v ?? 0), "RDV"]} />
                  <Bar dataKey="count" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Nouvelles clientes" subtitle="Inscriptions par mois">
          {newCustomers.length === 0 ? (
            <Empty text="Aucune nouvelle cliente sur la période." />
          ) : (
            <div className={chartH}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={newCustomers} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="analyticsNewCust" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS.blue} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={COLORS.blue} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={COLORS.muted} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: COLORS.ink, fillOpacity: 0.45, fontSize: 11 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    width={28}
                    tick={{ fill: COLORS.ink, fillOpacity: 0.45, fontSize: 11 }}
                  />
                  <Tooltip contentStyle={tipStyle()} formatter={(v) => [Number(v ?? 0), "Clientes"]} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke={COLORS.blue}
                    strokeWidth={2}
                    fill="url(#analyticsNewCust)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Top services" subtitle="CA par prestation">
          {topServices.length === 0 ? (
            <Empty text="Aucun service facturé sur la période." />
          ) : (
            <div className={chartHTall}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart
                  layout="vertical"
                  data={topServices}
                  margin={{ top: 4, right: 12, left: 4, bottom: 0 }}
                >
                  <CartesianGrid stroke={COLORS.muted} horizontal={false} />
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: COLORS.ink, fillOpacity: 0.45, fontSize: 11 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={compact ? 88 : 110}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: COLORS.ink, fillOpacity: 0.65, fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={tipStyle()}
                    formatter={(value) => [formatMad(Number(value ?? 0)), "CA"]}
                    labelFormatter={(_, payload) => {
                      const row = payload?.[0]?.payload as { fullName?: string } | undefined;
                      return row?.fullName ?? "";
                    }}
                  />
                  <Bar dataKey="ca" fill={COLORS.primary} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Top équipe" subtitle="CA par praticienne">
          {topStaff.length === 0 ? (
            <Empty text="Aucun CA équipe sur la période." />
          ) : (
            <div className={chartHTall}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart
                  layout="vertical"
                  data={topStaff}
                  margin={{ top: 4, right: 12, left: 4, bottom: 0 }}
                >
                  <CartesianGrid stroke={COLORS.muted} horizontal={false} />
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: COLORS.ink, fillOpacity: 0.45, fontSize: 11 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={compact ? 88 : 110}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: COLORS.ink, fillOpacity: 0.65, fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={tipStyle()}
                    formatter={(value) => [formatMad(Number(value ?? 0)), "CA"]}
                    labelFormatter={(_, payload) => {
                      const row = payload?.[0]?.payload as { fullName?: string } | undefined;
                      return row?.fullName ?? "";
                    }}
                  />
                  <Bar dataKey="ca" fill={COLORS.green} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
