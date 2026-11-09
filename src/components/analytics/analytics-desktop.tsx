"use client";
import { MetricCard } from "@/components/ui/metric-card";

import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck2,
  CalendarDays,
  CircleDollarSign,
  Landmark,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Star,
  Users,
  Wallet,
} from "lucide-react";
import { AffluenceCard } from "@/components/analytics/affluence-card";
import { PnlCard } from "@/components/analytics/pnl-card";
import { AnalyticsCharts } from "@/components/analytics/analytics-charts";
import {
  ANALYTICS_PRESETS,
  deltaClass,
  formatIsoDate,
  initials,
  serviceMarginPct,
  type AnalyticsViewModel,
} from "@/components/analytics/analytics-helpers";
import { resolvePreset } from "@/lib/analytics/period";
import { cn } from "@/lib/utils";
import { staffColor } from "@/components/agenda/staff-colors";
import { useStaffPalette } from "@/components/agenda/staff-color-provider";
import { formatMad, formatPct } from "@/modules/analytics/service";

export function AnalyticsDesktop({ vm }: { vm: AnalyticsViewModel }) {
  const palette = useStaffPalette();
  const ov = vm.overview;
  const topServices = vm.services.slice(0, 4);
  const topStaff = [...vm.staff].sort((a, b) => b.revenue - a.revenue).slice(0, 4);
  const presetLabel = ANALYTICS_PRESETS.find((p) => p.value === vm.preset)?.label ?? vm.periodLabel;
  const periodBounds = resolvePreset(vm.preset);
  const dateRangeLabel = `${formatIsoDate(periodBounds.from)} - ${formatIsoDate(periodBounds.to)}`;
  const sparkValues = (vm.revenue?.daily ?? []).map((d) => d.revenue).slice(-14);

  return (
    <div className="hidden space-y-5 lg:block">
      <header
        className="relative flex min-h-[96px] items-center overflow-hidden rounded-[20px] border border-[#EFD9E1] bg-[#F9E8E7] px-5 py-4 shadow-sm sm:min-h-[108px] sm:px-7"
        style={{
          backgroundImage:
            'linear-gradient(90deg,rgba(255,247,247,.92) 0%,rgba(255,239,239,.55) 42%,rgba(255,239,239,.15) 100%),url("/marketing/hero-background.png")',
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
        <div className="relative z-10 min-w-0">
          <h1 className="font-serif text-2xl font-bold tracking-tight text-[#58152F] sm:text-3xl">
            Analytics &amp; Performance
          </h1>
          <p className="mt-1 max-w-lg text-sm leading-5 text-[#654254]">
            Pilotez efficacement votre institut : ventes, clientes, services, équipe et rentabilité.
          </p>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-[#F1E8EC] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl bg-[#FCF8FA] px-3 py-2 text-sm">
            <CalendarDays className="h-4 w-4 text-[#981C52]" aria-hidden />
            <span className="font-bold text-[#30202C]">{dateRangeLabel}</span>
            <span className="rounded-full bg-[#FCE9F4] px-2 py-0.5 text-[10px] font-bold uppercase text-[#981C52]">
              {presetLabel}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ANALYTICS_PRESETS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => vm.onPreset(o.value)}
                className={cn(
                  "h-10 rounded-xl px-3 text-sm font-semibold transition-colors",
                  vm.preset === o.value
                    ? "bg-[#981C52] text-white shadow-sm"
                    : "bg-[#FCF8FA] text-[#765E6B] hover:bg-[#FAF0F5]",
                )}
              >
                {o.short}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={vm.onCompare}
            className={cn(
              "flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold",
              vm.compare ? "bg-[#FFF1F7] text-[#981C52]" : "bg-[#FCF8FA] text-[#765E6B]",
            )}
          >
            {vm.compareLabel}
          </button>
        </div>
        <button
          type="button"
          onClick={vm.onRefresh}
          className="flex items-center gap-1 text-xs text-[#765E6B]"
        >
          <RefreshCw className="h-3.5 w-3.5 text-[#981C52]" aria-hidden />
          Actualisé à {vm.generatedAt} — Casablanca
        </button>
      </div>
      {vm.scopeNote ? <p className="text-xs text-[#765E6B]">{vm.scopeNote}</p> : null}

      {/* Health score */}
      <section className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-5">
            <HealthGauge score={vm.loading ? null : vm.health.score} loading={vm.loading} />
            <div>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-secondary-fixed px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-on-secondary-fixed">
                  {vm.loading ? "…" : vm.health.label}
                </span>
                {!vm.loading && vm.health.score != null && vm.health.score >= 85 ? (
                  <span className="text-[10px] font-bold text-secondary">Top performance</span>
                ) : null}
              </div>
              <h2 className="text-[28px] font-extrabold tracking-tight text-on-surface">
                Santé d&apos;Établissement
              </h2>
              <p className="text-sm text-on-surface-variant">
                Indicateur composite : marge, occupation, rétention et avis
                {vm.occupation != null ? ` · occupation ${vm.occupation} %` : ""}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5 KPIs mockup */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5 rb-metric-row">
        <MacroCard
          label="Chiffre d'affaires"
          icon={<CircleDollarSign className="h-5 w-5" />}
          iconClass="text-primary-container"
          value={vm.loading || !ov ? "—" : ov.revenue.value.toLocaleString("fr-MA")}
          unit="MAD"
          delta={!vm.loading && ov ? formatPct(ov.revenue.changePercent) : null}
          tone={ov?.revenue.changePercent ?? null}
          spark={sparkValues}
          valueNegative={Boolean(ov && ov.revenue.value < 0)}
        />
        <MacroCard
          label="Rendez-vous"
          icon={<CalendarCheck2 className="h-5 w-5" />}
          iconClass="text-secondary"
          value={
            vm.loading
              ? "—"
              : vm.appointments
                ? String(vm.appointments.total)
                : ov
                  ? String(ov.appointments.value)
                  : "—"
          }
          unit=""
          delta={!vm.loading && ov ? formatPct(ov.appointments.changePercent) : null}
          tone={ov?.appointments.changePercent ?? null}
        />
        <MacroCard
          label="Clientes actives"
          icon={<Users className="h-5 w-5" />}
          iconClass="text-primary"
          value={
            vm.loading
              ? "—"
              : vm.customers
                ? String(vm.customers.kpis.active)
                : ov
                  ? String(ov.customers.value)
                  : "—"
          }
          unit=""
          delta={
            !vm.loading && ov?.customers.changePercent != null
              ? formatPct(ov.customers.changePercent)
              : null
          }
          tone={ov?.customers.changePercent ?? null}
        />
        <MacroCard
          label="Panier moyen"
          icon={<ShoppingBag className="h-5 w-5" />}
          iconClass="text-secondary"
          value={vm.loading || !ov ? "—" : ov.averageTicket.value.toLocaleString("fr-MA")}
          unit="MAD"
          delta={!vm.loading && ov ? formatPct(ov.averageTicket.changePercent) : null}
          tone={ov?.averageTicket.changePercent ?? null}
          spark={sparkValues}
        />
        <MacroCard
          label="Bénéfice net"
          icon={<Landmark className="h-5 w-5" />}
          iconClass="text-primary-container"
          value={vm.loading || !ov ? "—" : ov.margin.value.toLocaleString("fr-MA")}
          unit="MAD"
          delta={!vm.loading && ov ? formatPct(ov.margin.changePercent) : null}
          tone={ov?.margin.changePercent ?? null}
          spark={sparkValues}
          valueNegative={Boolean(ov && ov.margin.value < 0)}
        />
      </section>

      <AnalyticsCharts
        loading={vm.loading}
        periodLabel={vm.periodLabel}
        revenue={vm.revenue}
        appointments={vm.appointments}
        customers={vm.customers}
        services={vm.services}
        staff={vm.staff}
      />

      <PnlCard pnl={vm.pnl} loading={vm.loading} />

      {/* Top services / Staff / Affluence */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-on-surface">Top Prestations &amp; Marges</h3>
              <p className="text-[12px] text-on-surface-variant">
                {vm.avgMargin != null
                  ? `Marge moyenne ${vm.avgMargin.toLocaleString("fr-MA")} %`
                  : "Classement par CA"}
              </p>
            </div>
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          {vm.loading ? (
            <p className="text-sm text-on-surface-variant">Chargement…</p>
          ) : topServices.length === 0 ? (
            <p className="text-sm text-on-surface-variant">Aucune prestation sur la période.</p>
          ) : (
            <ul className="space-y-3">
              {topServices.map((s) => {
                const m = serviceMarginPct(s);
                return (
                  <li key={s.serviceId} className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-on-surface">{s.serviceName}</p>
                        <p className="text-[11px] text-on-surface-variant">
                          {s.appointments} soin{s.appointments > 1 ? "s" : ""}
                          {m != null ? ` · marge ${m.toLocaleString("fr-MA")} %` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-bold text-primary-container">
                        {formatMad(s.revenue)}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-container">
                      <div
                        className="h-full rounded-full bg-primary-container"
                        style={{ width: `${m != null ? Math.min(100, m) : 0}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <Link
            href="/services/"
            className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
          >
            Voir le catalogue soins <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-on-surface">Équipe &amp; Productivité</h3>
              <p className="text-[12px] text-on-surface-variant">
                {vm.staff.length} praticienne{vm.staff.length > 1 ? "s" : ""} · CA &amp; RDV
              </p>
            </div>
            <Users className="h-5 w-5 text-secondary" />
          </div>
          {vm.loading ? (
            <p className="text-sm text-on-surface-variant">Chargement…</p>
          ) : topStaff.length === 0 ? (
            <p className="text-sm text-on-surface-variant">Aucune donnée équipe.</p>
          ) : (
            <ul className="space-y-3">
              {topStaff.map((s) => {
                const color = staffColor(s.staffId, palette);
                return (
                <li key={s.staffId} className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      color.soft,
                      color.text,
                    )}
                  >
                    {initials(s.staffName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-on-surface">{s.staffName}</p>
                    <p className="text-[11px] text-on-surface-variant">
                      {s.appointments} RDV · commission {formatMad(s.commission)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold">{formatMad(s.revenue)}</span>
                </li>
                );
              })}
            </ul>
          )}
          <Link
            href="/staff/"
            className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
          >
            Rapport équipe <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <AffluenceCard appointments={vm.appointments} occupation={vm.occupation} loading={vm.loading} />
      </section>

    </div>
  );
}

function HealthGauge({ score, loading }: { score: number | null; loading?: boolean }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const shown = loading || score == null ? 0 : score;
  const offset = c - (shown / 100) * c;
  return (
    <div className="relative h-36 w-36 shrink-0">
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          className="stroke-surface-container-high"
          strokeWidth="10"
        />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          className="stroke-primary-container transition-[stroke-dashoffset] duration-500"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex rotate-0 flex-col items-center justify-center">
        <span className="text-[34px] font-extrabold leading-none tracking-tight text-on-surface">
          {loading ? "…" : score == null ? "—" : score}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">/ 100</span>
      </div>
    </div>
  );
}

function MiniSpark({ values, negative }: { values: number[]; negative?: boolean }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const w = 72;
  const h = 28;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} className="overflow-visible" aria-hidden>
      <polyline
        fill="none"
        stroke={negative ? "#C44536" : "#E31C5F"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts}
      />
    </svg>
  );
}

function MacroCard({
  label,
  icon,
  iconClass,
  value,
  unit,
  delta,
  tone,
  spark,
  valueNegative,
}: {
  label: string;
  icon: React.ReactNode;
  iconClass: string;
  value: string;
  unit: string;
  delta: string | null;
  tone: number | null;
  spark?: number[];
  valueNegative?: boolean;
}) {
  return <MetricCard title={label} value={value} icon={icon} unit={unit} delta={delta} deltaNegative={tone != null && tone < 0} negative={valueNegative}>{spark && spark.length > 1 ? <MiniSpark values={spark} negative={valueNegative} /> : null}</MetricCard>;
}

