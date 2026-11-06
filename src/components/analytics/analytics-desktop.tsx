"use client";

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
import { AnalyticsCharts } from "@/components/analytics/analytics-charts";
import {
  ANALYTICS_PRESETS,
  deltaClass,
  formatIsoDate,
  initials,
  serviceMarginPct,
  hourlyAffluence,
  statusCount,
  weekdayAffluence,
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
  const cancelled = statusCount(vm.appointments, "CANCELLED");
  const noShowRate = vm.appointments?.noShow.rate ?? null;
  const noShowCount = vm.appointments?.noShow.count ?? 0;
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
          <div className="grid grid-cols-4 gap-3 xl:grid-cols-7">
            {vm.health.pillars.map((p) => (
              <div key={p.key} className="min-w-0 rounded-lg bg-surface-container-low p-3">
                <p className="text-[11px] font-bold uppercase leading-tight text-on-surface-variant">
                  {p.label}
                </p>
                <p className={cn("mt-1 min-h-7 text-xl font-extrabold leading-none", p.tone)}>
                  {vm.loading || p.score == null ? "" : p.score}
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-container-high">
                  <div
                    className={cn("h-full rounded-full", p.bar)}
                    style={{ width: vm.loading || p.score == null ? "0%" : `${p.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5 KPIs mockup */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
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

      {/* PnL | Funnel */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="flex flex-col gap-6 xl:col-span-7">
          <div className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-[22px] font-bold text-on-surface">PnL Express</h3>
                <p className="text-[13px] text-on-surface-variant">Compte de résultat simplifié — chiffres réels</p>
              </div>
              {vm.pnl.marginRate != null ? (
                <span className="rounded-full bg-primary-container/10 px-3 py-1 text-[11px] font-bold text-primary-container">
                  Marge {vm.pnl.marginRate.toLocaleString("fr-MA")} %
                </span>
              ) : null}
            </div>
            {vm.loading ? (
              <p className="text-sm text-on-surface-variant">Chargement du PnL…</p>
            ) : (
              <div className="space-y-2 text-[15px]">
                <PnlRow
                  label="CA encaissé"
                  value={`+ ${formatMad(vm.pnl.net)}`}
                  bar={Math.min(100, 100)}
                  barClass="bg-primary-container"
                  strong
                />
                <PnlRow
                  label="Charges directes"
                  value={`− ${formatMad(vm.pnl.expenses)}`}
                  bar={vm.pnl.expenseShare}
                  barClass="bg-outline"
                />
                <PnlRow
                  label="Commissions praticiennes"
                  value={`− ${formatMad(vm.pnl.commissions)}`}
                  bar={vm.pnl.commissionShare}
                  barClass="bg-secondary"
                />
                <div className="mt-2 flex items-center justify-between rounded-xl bg-primary-container p-4 text-on-primary shadow-md">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-on-primary/80">
                      Résultat opérationnel
                    </p>
                    <p className="text-lg font-bold">Marge d&apos;exploitation nette</p>
                  </div>
                  <p className="text-[32px] font-extrabold leading-none tracking-tight">
                    {formatMad(vm.pnl.result)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="xl:col-span-5">
          <div className="flex h-full flex-col gap-4 rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-[22px] font-bold text-on-surface">Funnel Rétention &amp; Fidélité</h3>
                <p className="text-[13px] text-on-surface-variant">
                  Cycle de vie clientes — données CRM période
                </p>
              </div>
              <span className="rounded-full bg-secondary-fixed px-2.5 py-1 text-[10px] font-bold uppercase text-on-secondary-fixed">
                Exclusif
              </span>
            </div>
            {vm.loading ? (
              <p className="text-sm text-on-surface-variant">Chargement du funnel…</p>
            ) : vm.funnel.length === 0 ? (
              <p className="text-sm text-on-surface-variant">Pas encore de clientes au fichier.</p>
            ) : (
              <div className="flex flex-1 flex-col gap-3">
                {vm.funnel.map((step) => (
                  <div
                    key={step.step}
                    className={cn(
                      "relative overflow-hidden rounded-xl bg-surface-container-low p-4",
                      step.vip && "bg-inverse-surface text-surface-bright shadow-sm",
                    )}
                  >
                    <div className="relative z-10 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold",
                            step.vip
                              ? "bg-secondary-fixed text-on-secondary-fixed"
                              : step.step === 2
                                ? "bg-primary-fixed text-on-primary-fixed-variant"
                                : step.step === 3
                                  ? "bg-primary-fixed-dim text-on-primary-fixed-variant"
                                  : "bg-surface-container-highest text-on-surface",
                          )}
                        >
                          {step.vip ? "★" : step.step}
                        </span>
                        <div>
                          <p
                            className={cn(
                              "font-bold",
                              step.vip ? "text-secondary-fixed" : "text-on-surface",
                            )}
                          >
                            {step.title}
                          </p>
                          <p
                            className={cn(
                              "text-[12px]",
                              step.vip ? "text-surface-variant" : "text-on-surface-variant",
                            )}
                          >
                            {step.subtitle}
                          </p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "text-lg font-extrabold",
                          step.vip
                            ? "text-secondary-container"
                            : step.step >= 2
                              ? "text-primary-container"
                              : "text-on-surface",
                        )}
                      >
                        {step.percent} %
                      </span>
                    </div>
                    <div
                      className={cn(
                        "absolute inset-y-0 left-0 rounded-xl",
                        step.vip
                          ? "bg-secondary-fixed/20"
                          : step.step === 2
                            ? "bg-primary-fixed-dim/30"
                            : step.step === 3
                              ? "bg-primary-container/20"
                              : "bg-surface-container/60",
                      )}
                      style={{ width: `${Math.min(100, step.percent)}%` }}
                    />
                  </div>
                ))}
                {vm.customers ? (
                  <div className="mt-auto grid grid-cols-3 gap-2 pt-2 text-center">
                    <MiniStat label="Nouvelles" value={String(vm.customers.kpis.newInPeriod)} />
                    <MiniStat label="Actives" value={String(vm.customers.kpis.active)} />
                    <MiniStat label="Inactives" value={String(vm.customers.kpis.inactive)} />
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </section>

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

        <div className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-on-surface">Affluence &amp; Remplissage</h3>
              <p className="text-[12px] text-on-surface-variant">
                {vm.peakDay ? `Pic ${vm.peakDay}` : "Distribution par jour"}
                {vm.occupation != null ? ` · moy. ${vm.occupation} %` : ""}
              </p>
            </div>
            <CalendarDays className="h-5 w-5 text-primary" />
          </div>
          {vm.loading ? (
            <p className="text-sm text-on-surface-variant">Chargement…</p>
          ) : !weekdayAffluence(vm.appointments).some((d) => d.count > 0) ? (
            <p className="text-sm text-on-surface-variant">Pas de rendez-vous sur la période.</p>
          ) : (
            <>
              <div className="flex h-36 items-end justify-between gap-1.5">
                {weekdayAffluence(vm.appointments).map((d) => (
                  <div key={d.weekday} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[10px] font-semibold text-on-surface">
                      {d.count}
                    </span>
                    <div
                      className={cn(
                        "w-full max-w-[28px] rounded-t-md bg-primary-container",
                        d.count === 0 && "bg-transparent",
                      )}
                      style={{ height: `${d.heightPct}%` }}
                    />
                    <span className="text-[11px] font-bold text-on-surface">{d.label.slice(0, 3)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex h-8 items-end gap-0.5">
                {hourlyAffluence(vm.appointments).map((h) => (
                  <div key={h.hour} className="flex h-full flex-1 items-end" title={`${h.hour}h · ${h.count} RDV`}>
                    <div
                      className="w-full rounded-t-sm bg-secondary"
                      style={{ height: `${h.heightPct}%` }}
                    />
                  </div>
                ))}
              </div>
              <p className="mt-1 text-[10px] text-on-surface-variant">Rendez-vous de 08 h à 23 h</p>
            </>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2 text-[12px]">
            <div className="rounded-lg bg-surface-container-low p-2.5">
              <p className="text-on-surface-variant">Annulations</p>
              <p className="font-bold text-on-surface">{cancelled}</p>
            </div>
            <div className="rounded-lg bg-surface-container-low p-2.5">
              <p className="text-on-surface-variant">No-shows</p>
              <p className="font-bold text-on-surface">
                {noShowCount}
                {noShowRate != null ? ` (${noShowRate.toLocaleString("fr-MA")} %)` : ""}
              </p>
            </div>
          </div>
        </div>
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
  return (
    <div className="flex flex-col justify-between gap-3 rounded-[22px] border border-[#F1E8EC] bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#E7B9CD] hover:shadow-md">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#765E6B]">{label}</span>
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FAF4F7]",
            iconClass,
          )}
        >
          {icon}
        </div>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span
              className={cn(
                "text-[28px] font-bold leading-none tracking-tight xl:text-[32px]",
                valueNegative ? "text-red-600" : "text-[#30202C]",
              )}
            >
              {value}
            </span>
            {unit ? <span className="text-sm font-bold text-[#981C52]">{unit}</span> : null}
          </div>
          {delta ? (
            <p className={cn("mt-1.5 text-[11px] font-bold", deltaClass(tone))}>{delta}</p>
          ) : null}
        </div>
        {spark && spark.length > 1 ? <MiniSpark values={spark} negative={valueNegative} /> : null}
      </div>
    </div>
  );
}

function PnlRow({
  label,
  value,
  bar,
  barClass,
  strong,
}: {
  label: string;
  value: string;
  bar: number;
  barClass: string;
  strong?: boolean;
}) {
  return (
    <div className={cn("rounded-lg p-3", strong ? "bg-surface-container-low" : "hover:bg-surface-container-low/60")}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={cn(strong ? "font-bold text-on-surface" : "text-on-surface-variant")}>{label}</span>
        <span className={cn("font-bold", strong ? "text-primary-container" : "text-on-surface")}>{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-container">
        <div className={cn("h-full rounded-full", barClass)} style={{ width: `${Math.min(100, bar)}%` }} />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-container-low p-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{label}</p>
      <p className="text-sm font-extrabold text-on-surface">{value}</p>
    </div>
  );
}

