"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  Download,
  Landmark,
  Lock,
  Package,
  RefreshCw,
  Scale,
  Settings2,
  ShoppingBag,
  Sparkles,
  Star,
  Target,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import {
  ANALYTICS_PRESETS,
  deltaClass,
  initials,
  serviceMarginPct,
  statusCount,
  type AnalyticsViewModel,
} from "@/components/analytics/analytics-helpers";
import { cn } from "@/lib/utils";
import { formatMad, formatPct } from "@/modules/analytics/service";

function paymentBarColor(method: string): string {
  switch (method) {
    case "CARD":
      return "bg-primary-container";
    case "CASH":
      return "bg-secondary";
    case "GIFT_CARD":
      return "bg-secondary-fixed";
    case "TRANSFER":
      return "bg-outline";
    case "ONLINE":
      return "bg-primary";
    case "CHECK":
      return "bg-outline";
    default:
      return "bg-surface-container-high";
  }
}

export function AnalyticsMobile(vm: AnalyticsViewModel) {
  const ov = vm.overview;
  const topServices = vm.services.slice(0, 4);
  const topStaff = [...vm.staff].sort((a, b) => b.revenue - a.revenue).slice(0, 4);
  const cancelled = statusCount(vm.appointments, "CANCELLED");
  const noShowRate = vm.appointments?.noShow.rate ?? null;
  const noShowCount = vm.appointments?.noShow.count ?? 0;
  const stockAlerts = (vm.inventory?.lowStockCount ?? 0) + (vm.inventory?.outOfStockCount ?? 0);
  const posShare =
    ov && ov.revenue.value > 0 && vm.inventory
      ? Math.round((vm.inventory.posRevenue / ov.revenue.value) * 1000) / 10
      : null;
  const topPos = vm.inventory?.topPosProducts?.[0] ?? null;
  const presetLabel = ANALYTICS_PRESETS.find((p) => p.value === vm.preset)?.label ?? vm.periodLabel;

  return (
    <div className="space-y-4 pb-4 lg:hidden">
      {/* Header */}
      <section className="flex flex-col gap-2 pt-1">
        <div className="flex flex-wrap items-center gap-1">
          <span className="inline-flex items-center gap-1 rounded-full bg-inverse-surface px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-secondary-fixed">
            <Lock className="h-3 w-3 text-secondary-container" />
            {vm.roleLabel}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary-container/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-container">
            <Target className="h-3 w-3" />
            Décision &amp; Pilotage
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
            <Scale className="h-3 w-3 text-primary" />
            CNDP Loi 09-08
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-[22px] font-semibold tracking-tight text-on-surface">
            Analytics &amp; Performance
          </h1>
          <p className="text-sm leading-relaxed text-on-surface-variant">
            Pilotage décisionnel · {vm.orgName} · MAD
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Link
            href="/settings/"
            className="flex h-11 items-center justify-center gap-1.5 rounded-lg bg-surface-container-lowest text-sm font-semibold text-on-surface shadow-sm active:scale-[0.99]"
          >
            <Settings2 className="h-4 w-4 text-secondary" />
            Objectifs
          </Link>
          <button
            type="button"
            onClick={() => vm.onExport("pdf")}
            className="flex h-11 items-center justify-center gap-1.5 rounded-lg bg-primary-container text-sm font-bold text-on-primary shadow-md active:scale-[0.99]"
          >
            <Download className="h-4 w-4" />
            Exporter
          </button>
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

      {/* Copilote */}
      <section className="relative overflow-hidden rounded-2xl bg-inverse-surface p-4 text-inverse-on-surface shadow-lg">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary-container/15 blur-3xl" />
        <div className="relative z-10">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-secondary-fixed" />
            <Sparkles className="h-5 w-5 text-secondary-fixed" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-secondary-fixed">
              Copilote · {presetLabel}
            </span>
          </div>
          <BadgeCheck className="h-4 w-4 text-secondary-container" />
        </div>
        <p className="mb-2 text-xs text-surface-dim">{vm.insight.greeting}</p>
        {vm.loading ? (
          <p className="text-sm text-surface-dim">Analyse en cours…</p>
        ) : (
          <div className="space-y-2 text-sm text-surface-bright">
            <div className="rounded-lg bg-surface-container-lowest/10 p-2.5">
              <p>{vm.insight.performance}</p>
            </div>
            {vm.insight.alert ? (
              <div className="flex items-start gap-2 rounded-lg bg-surface-container-lowest/10 p-2.5 backdrop-blur-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-secondary-container" />
                <p className="text-surface-container-high">
                  <span className="font-bold text-surface-bright">Alerte Prioritaire : </span>
                  {vm.insight.alert}
                </p>
              </div>
            ) : null}
            {vm.insight.monitors.length > 0 ? (
              <ul className="space-y-1 rounded-lg bg-surface-container-lowest/10 p-2.5 text-[12px]">
                {vm.insight.monitors.map((m) => (
                  <li key={m.text} className="flex items-start gap-2">
                    <span
                      className={cn(
                        "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                        m.tone === "error" && "bg-error",
                        m.tone === "warn" && "bg-secondary-container",
                        m.tone === "ok" && "bg-primary-fixed",
                      )}
                    />
                    {m.text}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}
        <div className="mt-3 flex flex-col gap-2">
          <Link
            href={vm.insight.ctaHref}
            className="flex h-10 w-full items-center justify-center gap-1 rounded-xl bg-primary-container text-sm font-bold text-on-primary shadow-lg shadow-primary/30 active:scale-[0.98]"
          >
            <Zap className="h-4 w-4" />
            {vm.insight.cta}
          </Link>
          {vm.insight.secondaryCta && vm.insight.secondaryHref ? (
            <Link
              href={vm.insight.secondaryHref}
              className="flex h-10 w-full items-center justify-center gap-1 rounded-xl bg-surface-container-lowest/10 text-sm font-semibold text-surface-bright active:bg-surface-container-lowest/20"
            >
              {vm.insight.secondaryCta}
            </Link>
          ) : null}
        </div>
        </div>
      </section>

      {/* Health */}
      <section className="rounded-2xl bg-surface-container-lowest p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-3">
          <HealthRing score={vm.loading ? 0 : vm.health.score} loading={vm.loading} />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-secondary">Santé globale</p>
            <p className="text-lg font-extrabold text-on-surface">
              {vm.loading ? "…" : vm.health.label}
            </p>
            <p className="text-[11px] text-on-surface-variant">
              {vm.occupation != null ? `Occupation ${vm.occupation} %` : "7 piliers"}
            </p>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {vm.health.pillars.map((p) => (
            <div
              key={p.key}
              className="w-[88px] shrink-0 rounded-lg bg-surface-container-low p-2.5"
            >
              <p className="text-[9px] font-bold uppercase tracking-wider text-on-surface-variant">
                {p.label}
              </p>
              <p className={cn("text-lg font-extrabold", p.tone)}>
                {vm.loading ? "—" : p.score}
              </p>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-container-high">
                <div
                  className={cn("h-full rounded-full", p.bar)}
                  style={{ width: vm.loading ? "0%" : `${p.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2×3 KPIs */}
      <section className="grid grid-cols-2 gap-2">
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

      {/* Weekly + PnL */}
      <section className="space-y-3 rounded-xl bg-surface-container-lowest p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-on-surface">CA Hebdomadaire &amp; PnL</h2>
            <p className="text-xs text-on-surface-variant">
              {ov ? `Total ${formatMad(ov.revenue.value)}` : presetLabel}
            </p>
          </div>
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        {vm.loading ? (
          <p className="text-sm text-on-surface-variant">Chargement…</p>
        ) : vm.weekly.length === 0 ? (
          <p className="text-sm text-on-surface-variant">Pas de points hebdomadaires.</p>
        ) : (
          <div className="flex h-28 items-end justify-between gap-1 rounded-lg bg-surface-container-low px-2 pb-1 pt-4">
            {vm.weekly.map((b, i) => {
              const isLast = i === vm.weekly.length - 1;
              return (
                <div key={b.key} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                  <span
                    className={cn(
                      "text-[9px] font-semibold",
                      isLast ? "font-bold text-primary" : "text-on-surface-variant",
                    )}
                  >
                    {b.value >= 1000 ? `${Math.round(b.value / 1000)}k` : b.value}
                  </span>
                  <div
                    className={cn(
                      "w-5 rounded-t-sm",
                      isLast ? "bg-primary-container shadow-sm" : "bg-surface-container-high",
                    )}
                    style={{ height: `${Math.round((b.heightPct / 100) * 72)}px` }}
                  />
                  <span className="text-[10px] font-bold">{b.label}</span>
                </div>
              );
            })}
          </div>
        )}
        <div className="space-y-1.5 text-sm">
          <Row label="CA encaissé" value={formatMad(vm.pnl.net)} strong />
          <Row label="Charges" value={`− ${formatMad(vm.pnl.expenses)}`} />
          <Row label="Commissions" value={`− ${formatMad(vm.pnl.commissions)}`} />
          <Row
            label="Résultat"
            value={formatMad(vm.pnl.result)}
            strong
            accent
          />
        </div>
      </section>

      {/* Funnel stepper */}
      <section className="rounded-xl bg-surface-container-lowest p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-on-surface">Funnel Rétention</h2>
            <p className="text-xs text-on-surface-variant">Cycle de vie clientes</p>
          </div>
          <Users className="h-5 w-5 text-secondary" />
        </div>
        {vm.loading ? (
          <p className="text-sm text-on-surface-variant">Chargement…</p>
        ) : (
          <ol className="space-y-2">
            {vm.funnel.map((step, idx) => (
              <li key={step.step} className="relative flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold",
                      step.vip ? "bg-secondary-fixed text-on-secondary-fixed" : "bg-primary-container text-on-primary",
                    )}
                  >
                    {step.vip ? "★" : step.step}
                  </span>
                  {idx < vm.funnel.length - 1 ? (
                    <span className="mt-1 w-px flex-1 bg-surface-container-high" />
                  ) : null}
                </div>
                <div
                  className={cn(
                    "mb-2 flex-1 rounded-lg p-2.5",
                    step.vip ? "bg-inverse-surface text-surface-bright" : "bg-surface-container-low",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={cn("text-sm font-bold", step.vip ? "text-secondary-fixed" : "text-on-surface")}>
                        {step.title}
                      </p>
                      <p className={cn("text-[11px]", step.vip ? "text-surface-variant" : "text-on-surface-variant")}>
                        {step.subtitle}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-sm font-extrabold",
                        step.vip ? "text-secondary-container" : "text-primary-container",
                      )}
                    >
                      {step.percent}%
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

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
                      style={{ width: `${m != null ? Math.min(100, m) : 40}%` }}
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
            {topStaff.map((s, idx) => (
              <li key={s.staffId} className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                    idx === 0
                      ? "bg-primary-container text-on-primary"
                      : "bg-surface-container-high text-on-surface",
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
            ))}
          </ul>
        )}
      </section>

      {/* Occupancy */}
      <section className="rounded-xl bg-surface-container-lowest p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-on-surface">Affluence Cabines</h2>
            <p className="text-xs text-on-surface-variant">
              {vm.peakDay ? `Pic ${vm.peakDay}` : "Par jour"}
              {vm.occupation != null ? ` · ${vm.occupation} %` : ""}
            </p>
          </div>
          <CalendarDays className="h-5 w-5 text-primary" />
        </div>
        {vm.loading ? (
          <p className="text-sm text-on-surface-variant">Chargement…</p>
        ) : !vm.appointments?.occupationByWeekday.length ? (
          <p className="text-sm text-on-surface-variant">Pas de données.</p>
        ) : (
          <div className="flex h-28 items-end justify-between gap-1">
            {vm.appointments.occupationByWeekday.map((d) => {
              const h = d.rate != null ? Math.max(8, d.rate) : 8;
              return (
                <div key={d.weekday} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[9px] font-semibold text-on-surface-variant">
                    {d.rate != null ? `${Math.round(d.rate)}%` : "—"}
                  </span>
                  <div
                    className={cn(
                      "w-full max-w-[22px] rounded-t-md",
                      d.level === "high" && "bg-primary-container",
                      d.level === "medium" && "bg-secondary",
                      d.level === "low" && "bg-surface-container-high",
                    )}
                    style={{ height: `${h}%` }}
                  />
                  <span className="text-[10px] font-bold">{d.label.slice(0, 2)}</span>
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
          <div className="rounded-lg bg-surface-container-low p-2.5">
            <p className="text-on-surface-variant">Annulations</p>
            <p className="font-bold">{cancelled}</p>
          </div>
          <div className="rounded-lg bg-surface-container-low p-2.5">
            <p className="text-on-surface-variant">No-shows</p>
            <p className="font-bold">
              {noShowCount}
              {noShowRate != null ? ` (${noShowRate.toLocaleString("fr-MA")} %)` : ""}
            </p>
          </div>
        </div>
      </section>

      {/* Operational rows */}
      <section className="space-y-2">
        <h2 className="px-0.5 text-base font-bold text-on-surface">Piliers Opérationnels</h2>
        <OpRow
          href="/pos/"
          icon={<ShoppingBag className="h-4 w-4" />}
          iconTone="bg-primary-container/10 text-primary-container"
          title="Boutique Produits"
          value={vm.inventory ? formatMad(vm.inventory.posRevenue) : "—"}
          hint={
            posShare != null
              ? `${posShare.toLocaleString("fr-MA")} % du CA`
              : topPos
                ? topPos.productName
                : "POS"
          }
          loading={vm.loading}
        />
        <OpRow
          href={vm.canStock ? "/stock/" : "/reports/"}
          icon={<Package className="h-4 w-4" />}
          iconTone="bg-surface-container-high text-secondary"
          title="Stock & Alertes"
          value={
            vm.inventory
              ? `${stockAlerts} alerte${stockAlerts > 1 ? "s" : ""}`
              : "—"
          }
          hint={vm.inventory ? `Valeur ${formatMad(vm.inventory.stockValue)}` : "Réserve cabine"}
          loading={vm.loading}
          alert={stockAlerts > 0}
        />
        <OpRow
          href="/cash-register/"
          icon={<CreditCard className="h-4 w-4" />}
          iconTone="bg-secondary-fixed text-on-secondary-fixed"
          title="Mix Paiements"
          value={
            vm.payments[0]
              ? `${vm.payments[0].label} ${vm.payments[0].percent.toLocaleString("fr-MA")} %`
              : "—"
          }
          hint={ov ? `Total ${formatMad(ov.revenue.value)}` : "Caisse"}
          loading={vm.loading}
          extra={
            vm.payments.length > 0 ? (
              <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-surface-container">
                {vm.payments.map((p) => (
                  <div
                    key={p.method}
                    className={cn("h-full", paymentBarColor(p.method))}
                    style={{ width: `${Math.min(100, p.percent)}%` }}
                  />
                ))}
              </div>
            ) : null
          }
        />
        <OpRow
          href={vm.canMarketing ? "/marketing/" : "/reports/"}
          icon={<Wallet className="h-4 w-4" />}
          iconTone="bg-primary-fixed text-on-primary-fixed"
          title="Marketing Attribué"
          value={formatMad(vm.marketingRevenue)}
          hint={
            vm.marketing[0]
              ? vm.marketing[0].campaignName
              : `${vm.marketing.length} campagne${vm.marketing.length > 1 ? "s" : ""}`
          }
          loading={vm.loading}
        />
        <OpRow
          href={vm.canReactivation ? "/reactivation/" : "/customers/"}
          icon={<RefreshCw className="h-4 w-4" />}
          iconTone="bg-surface-container text-primary"
          title="Réactivation"
          value={vm.customers ? String(vm.customers.kpis.reactivated) : "—"}
          hint={
            vm.customers
              ? `${vm.customers.kpis.inactive} inactives`
              : "Relances clientes"
          }
          loading={vm.loading}
        />
      </section>

      {/* Legal footer */}
      <footer className="space-y-2 rounded-xl bg-surface-container-low p-4 text-[11px] text-on-surface-variant">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-secondary" />
            Données live
          </span>
          <span className="inline-flex items-center gap-1">
            <Scale className="h-3.5 w-3.5 text-secondary" />
            CNDP Loi 09-08
          </span>
        </div>
        <Link
          href="/reports/"
          className="flex h-10 w-full items-center justify-between rounded-lg bg-surface-container-lowest px-3 text-sm font-bold text-primary shadow-sm"
        >
          Consulter les rapports
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </footer>
    </div>
  );
}

function HealthRing({ score, loading }: { score: number; loading?: boolean }) {
  const r = 28;
  const c = 2 * Math.PI * r;
  const offset = c - ((loading ? 0 : score) / 100) * c;
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
        <span className="text-sm font-extrabold text-on-surface">{loading ? "…" : score}</span>
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
  return (
    <div className="flex flex-col justify-between rounded-xl bg-surface-container-low p-3 shadow-sm">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
          {label}
        </span>
        <span className={iconClass}>{icon}</span>
      </div>
      <div className="space-y-0.5">
        <div className="text-[22px] font-extrabold leading-none text-on-surface">
          {value}{" "}
          <span className="text-[11px] font-semibold text-on-surface-variant">{unit}</span>
        </div>
        {delta ? (
          <p className={cn("text-[11px] font-bold", deltaClass(tone))}>{delta}</p>
        ) : null}
      </div>
      <p className="mt-2 pt-1 text-xs text-on-surface-variant">{foot}</p>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  accent,
}: {
  label: string;
  value: string;
  strong?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg px-2.5 py-2",
        strong ? "bg-surface-container-low" : "",
        accent && "bg-primary-container text-on-primary",
      )}
    >
      <span className={cn("text-on-surface-variant", accent && "text-on-primary/85", strong && !accent && "font-semibold text-on-surface")}>
        {label}
      </span>
      <span className={cn("font-bold", accent ? "text-on-primary" : strong ? "text-primary-container" : "text-on-surface")}>
        {value}
      </span>
    </div>
  );
}

function OpRow({
  href,
  icon,
  iconTone,
  title,
  value,
  hint,
  loading,
  alert,
  extra,
}: {
  href: string;
  icon: React.ReactNode;
  iconTone: string;
  title: string;
  value: string;
  hint: string;
  loading?: boolean;
  alert?: boolean;
  extra?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-1 rounded-xl bg-surface-container-lowest p-3.5 shadow-sm active:scale-[0.99]"
    >
      <div className="flex items-center gap-3">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", iconTone)}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-bold text-on-surface">{title}</p>
            <ArrowRight className="h-4 w-4 shrink-0 text-on-surface-variant" />
          </div>
          {loading ? (
            <p className="text-[11px] text-on-surface-variant">Chargement…</p>
          ) : (
            <p className="truncate text-[11px] text-on-surface-variant">
              <span className={cn("font-bold", alert ? "text-error" : "text-primary-container")}>
                {value}
              </span>
              {" · "}
              {hint}
            </p>
          )}
        </div>
      </div>
      {extra}
    </Link>
  );
}
