"use client";
import { MetricCard } from "@/components/ui/metric-card";

import Link from "next/link";
import {
  CalendarCheck2,
  CalendarDays,
  CircleDollarSign,
  Landmark,
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
  initials,
  serviceMarginPct,
  type AnalyticsViewModel,
} from "@/components/analytics/analytics-helpers";
import { cn } from "@/lib/utils";
import { staffColor } from "@/components/agenda/staff-colors";
import { useStaffPalette } from "@/components/agenda/staff-color-provider";
import { formatMad, formatPct } from "@/modules/analytics/service";

export function AnalyticsMobile(vm: AnalyticsViewModel) {
  const palette = useStaffPalette();
  const ov = vm.overview;
  const topServices = vm.services.slice(0, 4);
  const topStaff = [...vm.staff].sort((a, b) => b.revenue - a.revenue).slice(0, 4);
  const presetLabel = ANALYTICS_PRESETS.find((p) => p.value === vm.preset)?.label ?? vm.periodLabel;

  return (
    <div className="space-y-4 pb-4 lg:hidden">
      {/* Header */}
      <section className="flex flex-col gap-2 pt-1">
        <div className="flex flex-col gap-1">
          <h1 className="text-[22px] font-semibold tracking-tight text-on-surface">
            Analytics &amp; Performance
          </h1>
          <p className="text-sm leading-relaxed text-on-surface-variant">
            Ventes, clientes, services et rentabilité
          </p>
        </div>
      </section>

      {/* Period chips */}
      <section className="flex flex-col gap-2 rounded-xl bg-surface-container-low p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate text-sm font-semibold text-on-surface">{vm.periodLabel}</span>
          </div>
          <button
            type="button"
            onClick={vm.onCompare}
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
              vm.compare ? "bg-surface-container text-secondary" : "bg-surface-container-lowest text-on-surface-variant",
            )}
          >
            {vm.compare ? vm.compareLabel : "Comparer"}
          </button>
        </div>
        <div className="flex gap-1.5 overflow-x-auto py-1">
          {ANALYTICS_PRESETS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => vm.onPreset(o.value)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold shadow-sm",
                vm.preset === o.value
                  ? "bg-primary-container text-on-primary"
                  : "bg-surface-container-lowest text-on-surface",
              )}
            >
              {o.short}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between pt-0.5 text-[11px] text-on-surface-variant">
          <span className="flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-secondary-container" />
            Actualisé à {vm.generatedAt} — Casablanca
          </span>
          <button type="button" onClick={vm.onRefresh} className="font-medium text-primary">
            Rafraîchir
          </button>
        </div>
        {vm.scopeNote ? <p className="text-[11px] text-on-surface-variant">{vm.scopeNote}</p> : null}
      </section>

      {/* Health */}
      <section className="rounded-2xl bg-surface-container-lowest p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <HealthRing score={vm.loading ? null : vm.health.score} loading={vm.loading} />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-secondary">Santé globale</p>
            <p className="text-lg font-extrabold text-on-surface">
              {vm.loading ? "…" : vm.health.label}
            </p>
            <p className="text-[11px] text-on-surface-variant">
              {vm.occupation != null ? `Occupation ${vm.occupation} %` : "Indicateurs mesurés"}
            </p>
          </div>
        </div>
      </section>

      {/* 2×3 KPIs */}
      <section className="grid grid-cols-2 gap-2 rb-metric-row">
        <KpiTile
          label="CA Net"
          icon={<CircleDollarSign className="h-4 w-4" />}
          iconClass="text-primary-container"
          value={vm.loading || !ov ? "—" : ov.revenue.value.toLocaleString("fr-MA")}
          unit="DH"
          delta={!vm.loading && ov ? formatPct(ov.revenue.changePercent) : null}
          tone={ov?.revenue.changePercent ?? null}
          foot={ov ? `vs ${ov.revenue.previous != null ? formatMad(ov.revenue.previous) : "—"}` : "—"}
        />
        <KpiTile
          label="RDV Total"
          icon={<CalendarCheck2 className="h-4 w-4" />}
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
          unit="RDV"
          delta={!vm.loading && ov ? formatPct(ov.appointments.changePercent) : null}
          tone={ov?.appointments.changePercent ?? null}
          foot={vm.presence != null ? `Présence ${vm.presence.toLocaleString("fr-MA")} %` : "Tous statuts"}
        />
        <KpiTile
          label="Clientes"
          icon={<Users className="h-4 w-4" />}
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
          unit="Actives"
          delta={null}
          tone={null}
          foot={
            vm.customers
              ? `+${vm.customers.kpis.newInPeriod} · ${vm.customers.kpis.vip} VIP`
              : "Fenêtre 90 j"
          }
        />
        <KpiTile
          label="Panier Moyen"
          icon={<ShoppingBag className="h-4 w-4" />}
          iconClass="text-secondary"
          value={vm.loading || !ov ? "—" : ov.averageTicket.value.toLocaleString("fr-MA")}
          unit="DH"
          delta={!vm.loading && ov ? formatPct(ov.averageTicket.changePercent) : null}
          tone={ov?.averageTicket.changePercent ?? null}
          foot="Ticket consolidé"
        />
        <KpiTile
          label="E-Réputation"
          icon={<Star className="h-4 w-4" />}
          iconClass="text-secondary"
          value={
            vm.loading || vm.reviews?.averageInternalScore == null
              ? "—"
              : vm.reviews.averageInternalScore.toLocaleString("fr-MA", { maximumFractionDigits: 1 })
          }
          unit="/5"
          delta={null}
          tone={null}
          foot={vm.reviews ? `${vm.reviews.recordedSatisfaction} avis` : "—"}
        />
        <KpiTile
          label="Marge Net"
          icon={<Landmark className="h-4 w-4" />}
          iconClass="text-primary-container"
          value={vm.loading || !ov ? "—" : ov.margin.value.toLocaleString("fr-MA")}
          unit="DH"
          delta={!vm.loading && ov ? formatPct(ov.margin.changePercent) : null}
          tone={ov?.margin.changePercent ?? null}
          foot={
            vm.pnl.marginRate != null
              ? `Taux ${vm.pnl.marginRate.toLocaleString("fr-MA")} %`
              : "Résultat"
          }
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
        compact
      />

      <PnlCard pnl={vm.pnl} loading={vm.loading} />

      {/* Top services */}
      <section className="rounded-xl bg-surface-container-lowest p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-on-surface">Top Prestations</h2>
            <p className="text-xs text-on-surface-variant">
              {vm.avgMargin != null
                ? `Marge moy. ${vm.avgMargin.toLocaleString("fr-MA")} %`
                : "Par CA"}
            </p>
          </div>
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        {vm.loading ? (
          <p className="text-sm text-on-surface-variant">Chargement…</p>
        ) : topServices.length === 0 ? (
          <p className="text-sm text-on-surface-variant">Aucune prestation.</p>
        ) : (
          <ul className="space-y-2.5">
            {topServices.map((s) => {
              const m = serviceMarginPct(s);
              return (
                <li key={s.serviceId}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{s.serviceName}</p>
                      <p className="text-[11px] text-on-surface-variant">
                        {s.appointments} soin{s.appointments > 1 ? "s" : ""}
                        {m != null ? ` · ${m.toLocaleString("fr-MA")} %` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-primary-container">
                      {formatMad(s.revenue)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-container">
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
      </section>

      {/* Staff */}
      <section className="rounded-xl bg-surface-container-lowest p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-on-surface">Productivité Équipe</h2>
            <p className="text-xs text-on-surface-variant">
              {vm.staff.length} praticienne{vm.staff.length > 1 ? "s" : ""}
            </p>
          </div>
          <Users className="h-5 w-5 text-secondary" />
        </div>
        {vm.loading ? (
          <p className="text-sm text-on-surface-variant">Chargement…</p>
        ) : topStaff.length === 0 ? (
          <p className="text-sm text-on-surface-variant">Aucune donnée.</p>
        ) : (
          <ul className="space-y-2.5">
            {topStaff.map((s) => {
              const color = staffColor(s.staffId, palette);
              return (
              <li key={s.staffId} className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                    color.soft,
                    color.text,
                  )}
                >
                  {initials(s.staffName)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{s.staffName}</p>
                  <p className="text-[11px] text-on-surface-variant">{s.appointments} RDV</p>
                </div>
                <span className="shrink-0 text-sm font-bold">{formatMad(s.revenue)}</span>
              </li>
              );
            })}
          </ul>
        )}
      </section>

      <AffluenceCard appointments={vm.appointments} occupation={vm.occupation} loading={vm.loading} />

    </div>
  );
}

function HealthRing({ score, loading }: { score: number | null; loading?: boolean }) {
  const r = 28;
  const c = 2 * Math.PI * r;
  const shown = loading || score == null ? 0 : score;
  const offset = c - (shown / 100) * c;
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" className="stroke-surface-container-high" strokeWidth="6" />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          className="stroke-primary-container"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-extrabold text-on-surface">{loading ? "…" : score == null ? "—" : score}</span>
      </div>
    </div>
  );
}

function KpiTile({
  label,
  icon,
  iconClass,
  value,
  unit,
  delta,
  tone,
  foot,
}: {
  label: string;
  icon: React.ReactNode;
  iconClass: string;
  value: string;
  unit: string;
  delta: string | null;
  tone: number | null;
  foot: string;
}) {
  return <MetricCard title={label} value={value} icon={icon} hint={foot} unit={unit} delta={delta} deltaNegative={tone != null && tone < 0}></MetricCard>;
}

