"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  Download,
  FileSpreadsheet,
  FileText,
  Landmark,
  MapPin,
  Package,
  RefreshCw,
  Scale,
  Settings2,
  Share2,
  Shield,
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

export function AnalyticsDesktop({ vm }: { vm: AnalyticsViewModel }) {
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!exportOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [exportOpen]);

  return (
    <div className="hidden space-y-6 lg:block">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-inverse-surface px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-secondary-fixed shadow-sm">
                <Shield className="h-3 w-3 text-secondary-container" fill="currentColor" />
                {vm.roleLabel}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-container/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-container">
                <Target className="h-3 w-3" />
                Décision &amp; Pilotage
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-high px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                <Scale className="h-3 w-3 text-primary" />
                Conforme CNDP Loi 09-08
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-container px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-secondary">
                <MapPin className="h-3 w-3" />
                {vm.orgName}
              </span>
            </div>
            <h1 className="mt-1 text-[40px] font-bold leading-tight tracking-tight text-on-surface">
              Analytics &amp; Performance Décisionnelle{" "}
              <span className="font-serif italic text-primary-container">— {vm.orgName}</span>
            </h1>
            <p className="max-w-4xl text-[15px] text-on-surface-variant">
              Pilotage décisionnel en temps réel : CA, rétention, équipe, stock et marketing — consolidé en
              dirhams marocains (MAD).
            </p>
          </div>
          <div className="relative flex items-center gap-2">
            <Link
              href="/settings/"
              className="flex h-12 items-center gap-2 rounded-lg bg-surface-container-lowest px-4 text-sm font-semibold text-on-surface shadow-sm transition-all hover:bg-surface-container"
            >
              <Settings2 className="h-5 w-5 text-on-surface-variant" />
              Configurer Objectifs
            </Link>
            <div className="relative" ref={exportRef}>
              <button
                type="button"
                onClick={() => setExportOpen((v) => !v)}
                className="flex h-12 items-center gap-2 rounded-lg bg-primary-container px-5 text-sm font-bold text-on-primary shadow-md transition-all hover:bg-primary hover:shadow-lg"
              >
                <Share2 className="h-5 w-5" />
                Exporter
                <ChevronDown className="h-4 w-4" />
              </button>
              {exportOpen ? (
                <div className="absolute right-0 z-50 mt-2 flex w-64 flex-col gap-1 rounded-xl bg-surface-container-lowest p-2 shadow-2xl">
                  <ExportItem
                    icon={<FileText className="h-4 w-4" />}
                    title="PDF décisionnel"
                    hint="Synthèse imprimable"
                    onClick={() => {
                      vm.onExport("pdf");
                      setExportOpen(false);
                    }}
                  />
                  <ExportItem
                    icon={<FileSpreadsheet className="h-4 w-4" />}
                    title="Excel / XLSX"
                    hint="Tableaux analytiques"
                    onClick={() => {
                      vm.onExport("xlsx");
                      setExportOpen(false);
                    }}
                  />
                  <ExportItem
                    icon={<Download className="h-4 w-4" />}
                    title="CSV"
                    hint="Export brut"
                    onClick={() => {
                      vm.onExport("csv");
                      setExportOpen(false);
                    }}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-container-lowest p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg bg-surface-container-low px-3 py-2 text-sm">
              <CalendarDays className="h-4 w-4 text-secondary" />
              <span className="font-bold">{vm.periodLabel}</span>
              <span className="rounded-full bg-secondary-fixed px-2 py-0.5 text-[10px] font-bold uppercase text-on-secondary-fixed">
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
                    "h-10 rounded-lg px-3 text-sm font-semibold transition-colors",
                    vm.preset === o.value
                      ? "bg-primary-container text-on-primary font-bold shadow-sm"
                      : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
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
                "flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold",
                vm.compare ? "bg-surface-container-high text-primary" : "bg-surface-container-low text-on-surface",
              )}
            >
              {vm.compareLabel}
            </button>
          </div>
          <button type="button" onClick={vm.onRefresh} className="flex items-center gap-1 text-xs text-on-surface-variant">
            <RefreshCw className="h-3.5 w-3.5 text-secondary" />
            Actualisé à {vm.generatedAt} — Casablanca
          </button>
        </div>
        {vm.scopeNote ? <p className="text-xs text-on-surface-variant">{vm.scopeNote}</p> : null}
      </header>

      {/* Copilote */}
      <section className="relative overflow-hidden rounded-2xl bg-inverse-surface p-8 text-inverse-on-surface shadow-xl">
        <div className="pointer-events-none absolute -right-16 -top-16 h-80 w-80 rounded-full bg-primary-container/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-1/3 h-64 w-64 rounded-full bg-secondary-fixed/10 blur-3xl" />
        <div className="relative z-10 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-bright/10 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/30 text-secondary-fixed">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[22px] font-extrabold tracking-tight text-surface-bright">
                    Copilote IA Prestige
                  </span>
                  <span className="rounded-full bg-secondary-fixed px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-on-secondary-fixed">
                    Synthèse · {presetLabel}
                  </span>
                </div>
                <p className="text-[13px] text-surface-dim">
                  {vm.insight.greeting} · {vm.orgName}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={vm.insight.ctaHref}
                className="flex h-10 items-center gap-1.5 rounded-lg bg-primary-container px-4 text-sm font-bold text-on-primary shadow-lg shadow-primary/30 transition-all hover:bg-primary"
              >
                <Zap className="h-4 w-4" />
                {vm.insight.cta}
              </Link>
              {vm.insight.secondaryCta && vm.insight.secondaryHref ? (
                <Link
                  href={vm.insight.secondaryHref}
                  className="flex h-10 items-center gap-1.5 rounded-lg bg-surface-container-lowest/10 px-4 text-sm font-semibold text-surface-bright transition-all hover:bg-surface-container-lowest/20"
                >
                  <Users className="h-4 w-4 text-secondary-fixed" />
                  {vm.insight.secondaryCta}
                </Link>
              ) : null}
            </div>
          </div>

          {vm.loading ? (
            <p className="text-sm text-surface-dim">Analyse des indicateurs en cours…</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div className="flex flex-col gap-2 rounded-lg bg-surface-container-lowest/10 p-4 backdrop-blur-md lg:col-span-5">
                <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-secondary-fixed">
                  <ArrowUpRight className="h-4 w-4" />
                  Performance
                </p>
                <p className="text-[15px] text-surface-bright">{vm.insight.performance}</p>
              </div>
              <div className="flex flex-col gap-2 rounded-lg bg-surface-container-lowest/10 p-4 backdrop-blur-md lg:col-span-4">
                <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-error-container">
                  <AlertTriangle className="h-4 w-4" />
                  Vigilance
                </p>
                {vm.insight.alert ? (
                  <p className="text-[15px] text-surface-bright">{vm.insight.alert}</p>
                ) : (
                  <p className="text-[15px] text-surface-dim">Aucune alerte prioritaire sur la période.</p>
                )}
              </div>
              <div className="flex flex-col gap-2 rounded-lg bg-surface-container-lowest/10 p-4 backdrop-blur-md lg:col-span-3">
                <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-primary-fixed">
                  <BadgeCheck className="h-4 w-4" />
                  Moniteurs
                </p>
                {vm.insight.monitors.length === 0 ? (
                  <p className="text-sm text-surface-dim">Rien à signaler.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {vm.insight.monitors.map((m) => (
                      <li key={m.text} className="flex items-start gap-2 text-[13px] text-surface-bright">
                        <span
                          className={cn(
                            "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                            m.tone === "error" && "bg-error",
                            m.tone === "warn" && "bg-secondary-container",
                            m.tone === "ok" && "bg-primary-fixed",
                          )}
                        />
                        {m.text}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Health score */}
      <section className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="flex items-center gap-5">
            <HealthGauge score={vm.loading ? 0 : vm.health.score} loading={vm.loading} />
            <div>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-secondary-fixed px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-on-secondary-fixed">
                  {vm.loading ? "…" : vm.health.label}
                </span>
                {!vm.loading && vm.health.score >= 85 ? (
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
          <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {vm.health.pillars.map((p) => (
              <div key={p.key} className="rounded-lg bg-surface-container-low p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{p.label}</p>
                <p className={cn("mt-1 text-xl font-extrabold", p.tone)}>
                  {vm.loading ? "—" : p.score}
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-container-high">
                  <div
                    className={cn("h-full rounded-full", p.bar)}
                    style={{ width: vm.loading ? "0%" : `${p.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6 KPIs */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <MacroCard
          label="Chiffre d'Affaires"
          icon={<CircleDollarSign className="h-5 w-5" />}
          iconClass="text-primary-container"
          value={vm.loading || !ov ? "—" : ov.revenue.value.toLocaleString("fr-MA")}
          unit="DH"
          delta={!vm.loading && ov ? formatPct(ov.revenue.changePercent) : null}
          tone={ov?.revenue.changePercent ?? null}
          hint={ov?.revenue.previous != null ? `vs ${formatMad(ov.revenue.previous)}` : undefined}
          footLabel="CA net période"
          footValue={ov ? formatMad(ov.revenue.value) : "—"}
        />
        <MacroCard
          label="Rendez-vous Total"
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
          unit="RDV"
          delta={!vm.loading && ov ? formatPct(ov.appointments.changePercent) : null}
          tone={ov?.appointments.changePercent ?? null}
          footLabel="Présence effective"
          footValue={vm.presence != null ? `${vm.presence.toLocaleString("fr-MA")} %` : "—"}
        />
        <MacroCard
          label="Clientes Actives"
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
          unit="Actives"
          delta={null}
          tone={null}
          hint={vm.customers ? `${vm.customers.kpis.total} au fichier` : "Fenêtre 90 j"}
          footLabel="Nouvelles / VIP"
          footValue={
            vm.customers
              ? `+${vm.customers.kpis.newInPeriod} · ${vm.customers.kpis.vip} VIP`
              : "—"
          }
          footAccent
        />
        <MacroCard
          label="Panier Moyen"
          icon={<ShoppingBag className="h-5 w-5" />}
          iconClass="text-secondary"
          value={vm.loading || !ov ? "—" : ov.averageTicket.value.toLocaleString("fr-MA")}
          unit="DH"
          delta={!vm.loading && ov ? formatPct(ov.averageTicket.changePercent) : null}
          tone={ov?.averageTicket.changePercent ?? null}
          footLabel="Ticket moyen consolidé"
          footValue={ov ? formatMad(ov.averageTicket.value) : "—"}
        />
        <MacroCard
          label="E-Réputation"
          icon={<Star className="h-5 w-5" />}
          iconClass="text-secondary"
          value={
            vm.loading || vm.reviews?.averageInternalScore == null
              ? "—"
              : vm.reviews.averageInternalScore.toLocaleString("fr-MA", { maximumFractionDigits: 1 })
          }
          unit="/ 5"
          delta={null}
          tone={null}
          hint={
            vm.reviews
              ? `${vm.reviews.recordedSatisfaction} avis · ${vm.reviews.sentInPeriod} envois`
              : undefined
          }
          footLabel="Satisfaction enregistrée"
          footValue={vm.reviews ? String(vm.reviews.recordedSatisfaction) : "—"}
        />
        <MacroCard
          label="Bénéfice / Marge Net"
          icon={<Landmark className="h-5 w-5" />}
          iconClass="text-primary-container"
          value={vm.loading || !ov ? "—" : ov.margin.value.toLocaleString("fr-MA")}
          unit="DH"
          delta={!vm.loading && ov ? formatPct(ov.margin.changePercent) : null}
          tone={ov?.margin.changePercent ?? null}
          footLabel="Taux de marge"
          footValue={
            vm.pnl.marginRate != null ? `${vm.pnl.marginRate.toLocaleString("fr-MA")} %` : "—"
          }
        />
      </section>

      {/* Weekly + PnL | Funnel */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="flex flex-col gap-6 xl:col-span-7">
          <div className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h3 className="text-[22px] font-bold text-on-surface">Évolution Hebdomadaire du CA</h3>
                <p className="text-[13px] text-on-surface-variant">
                  Progression par tranche de 7 jours
                  {ov ? ` · total ${formatMad(ov.revenue.value)}` : ""}
                </p>
              </div>
              <span className="rounded-full bg-secondary-fixed px-3 py-1 text-[11px] font-bold text-on-secondary-fixed">
                {presetLabel}
              </span>
            </div>
            {vm.loading ? (
              <p className="text-sm text-on-surface-variant">Chargement du CA hebdomadaire…</p>
            ) : vm.weekly.length === 0 ? (
              <p className="text-sm text-on-surface-variant">Pas de points de CA sur cette période.</p>
            ) : (
              <div className="flex h-56 items-end justify-between gap-3 border-b border-surface-container pb-4 pt-6">
                {vm.weekly.map((b, i) => {
                  const isLast = i === vm.weekly.length - 1;
                  return (
                    <div key={b.key} className="group flex flex-1 flex-col items-center gap-2">
                      <span
                        className={cn(
                          "text-[11px] font-bold",
                          isLast ? "text-primary" : "text-on-surface-variant",
                        )}
                      >
                        {formatMad(b.value)}
                      </span>
                      <div
                        className={cn(
                          "relative w-full max-w-[48px] rounded-t-lg",
                          isLast ? "bg-secondary-fixed" : "bg-surface-container-high",
                        )}
                        style={{ height: `${b.heightPct}%` }}
                      >
                        <div
                          className={cn(
                            "absolute inset-x-0 bottom-0 rounded-t-lg",
                            isLast ? "bg-primary-container" : "bg-primary/80",
                          )}
                          style={{ height: isLast ? "100%" : "90%" }}
                        />
                      </div>
                      <span className={cn("text-sm font-bold", isLast && "text-primary-container")}>
                        {b.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

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
                        style={{ width: `${m != null ? Math.min(100, m) : 40}%` }}
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
              {topStaff.map((s, idx) => (
                <li key={s.staffId} className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      idx === 0
                        ? "bg-primary-container text-on-primary"
                        : "bg-surface-container-high text-on-surface",
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
              ))}
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
          ) : !vm.appointments?.occupationByWeekday.length ? (
            <p className="text-sm text-on-surface-variant">Pas de données d&apos;occupation.</p>
          ) : (
            <div className="flex h-36 items-end justify-between gap-1.5">
              {vm.appointments.occupationByWeekday.map((d) => {
                const h = d.rate != null ? Math.max(8, d.rate) : 8;
                return (
                  <div key={d.weekday} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[10px] font-semibold text-on-surface-variant">
                      {d.rate != null ? `${Math.round(d.rate)}%` : "—"}
                    </span>
                    <div
                      className={cn(
                        "w-full max-w-[28px] rounded-t-md",
                        d.level === "high" && "bg-primary-container",
                        d.level === "medium" && "bg-secondary",
                        d.level === "low" && "bg-surface-container-high",
                      )}
                      style={{ height: `${h}%` }}
                    />
                    <span className="text-[11px] font-bold text-on-surface">{d.label.slice(0, 3)}</span>
                  </div>
                );
              })}
            </div>
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

      {/* Operational modules */}
      <section className="flex flex-col gap-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-[22px] font-bold text-on-surface">Modules Opérationnels</h2>
            <p className="text-[13px] text-on-surface-variant">
              Boutique, stock, encaissements, marketing et réactivation
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          <ModuleCard
            href="/pos/"
            icon={<ShoppingBag className="h-5 w-5" />}
            iconTone="bg-primary-container/10 text-primary-container"
            badge={posShare != null ? `${posShare.toLocaleString("fr-MA")} % du CA` : "Retail"}
            badgeTone="text-secondary"
            title="Boutique Produits"
            description={
              vm.inventory
                ? `${formatMad(vm.inventory.posRevenue)} · ${vm.inventory.posStockConsumed} unités sorties`
                : "CA POS produits"
            }
            lines={[
              {
                label: "CA boutique",
                value: vm.inventory ? formatMad(vm.inventory.posRevenue) : "—",
                strong: true,
              },
              {
                label: "Top vente",
                value: topPos ? topPos.productName : "—",
              },
            ]}
            loading={vm.loading}
          />
          <ModuleCard
            href={vm.canStock ? "/stock/" : "/reports/"}
            icon={<Package className="h-5 w-5" />}
            iconTone="bg-surface-container-high text-secondary"
            badge={stockAlerts > 0 ? `${stockAlerts} alerte${stockAlerts > 1 ? "s" : ""}` : "OK"}
            badgeTone={stockAlerts > 0 ? "text-error" : "text-secondary"}
            title="Stock & Réserve"
            description={
              vm.inventory
                ? `Valeur ${formatMad(vm.inventory.stockValue)} · ${vm.inventory.outOfStockCount} rupture${vm.inventory.outOfStockCount > 1 ? "s" : ""}`
                : "Alertes et valeur marchande"
            }
            lines={[
              {
                label: "Stock bas",
                value: vm.inventory ? String(vm.inventory.lowStockCount) : "—",
              },
              {
                label: "Ruptures",
                value: vm.inventory ? String(vm.inventory.outOfStockCount) : "—",
                strong: stockAlerts > 0,
              },
            ]}
            loading={vm.loading}
          />
          <ModuleCard
            href="/cash-register/"
            icon={<CreditCard className="h-5 w-5" />}
            iconTone="bg-secondary-fixed text-on-secondary-fixed"
            badge="Mix caisse"
            badgeTone="text-on-surface-variant"
            title="Règlement Caisse"
            description="Répartition des encaissements par moyen de paiement"
            lines={
              vm.payments.length
                ? vm.payments.slice(0, 3).map((p, i) => ({
                    label: p.label,
                    value: `${p.percent.toLocaleString("fr-MA")} % · ${formatMad(p.amount)}`,
                    strong: i === 0,
                  }))
                : [{ label: "Paiements", value: "—" }]
            }
            extra={
              vm.payments.length > 0 ? (
                <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-surface-container">
                  {vm.payments.map((p) => (
                    <div
                      key={p.method}
                      className={cn("h-full", paymentBarColor(p.method))}
                      style={{ width: `${Math.min(100, p.percent)}%` }}
                      title={p.label}
                    />
                  ))}
                </div>
              ) : null
            }
            loading={vm.loading}
          />
          <ModuleCard
            href={vm.canMarketing ? "/marketing/" : "/reports/"}
            icon={<Wallet className="h-5 w-5" />}
            iconTone="bg-primary-fixed text-on-primary-fixed"
            badge={`${vm.marketing.length} campagne${vm.marketing.length > 1 ? "s" : ""}`}
            badgeTone="text-primary"
            title="Marketing Attribué"
            description="CA associé aux campagnes sur la période"
            lines={[
              {
                label: "CA attribué",
                value: formatMad(vm.marketingRevenue),
                strong: true,
              },
              {
                label: "Top campagne",
                value: vm.marketing[0]?.campaignName ?? "—",
              },
            ]}
            loading={vm.loading}
          />
          <ModuleCard
            href={vm.canReactivation ? "/reactivation/" : "/customers/"}
            icon={<RefreshCw className="h-5 w-5" />}
            iconTone="bg-surface-container text-primary"
            badge="Relances"
            badgeTone="text-primary"
            title="Réactivation"
            description="Clientes réactivées sur la fenêtre analytique"
            lines={[
              {
                label: "Réactivées",
                value: vm.customers ? String(vm.customers.kpis.reactivated) : "—",
                strong: true,
              },
              {
                label: "Inactives",
                value: vm.customers ? String(vm.customers.kpis.inactive) : "—",
              },
            ]}
            loading={vm.loading}
          />
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-container-low px-5 py-4 text-[12px] text-on-surface-variant">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-secondary" />
            Données consolidées en temps réel
          </span>
          <span className="inline-flex items-center gap-1">
            <Scale className="h-3.5 w-3.5 text-secondary" />
            Conformité CNDP Loi 09-08
          </span>
        </div>
        <Link href="/reports/" className="inline-flex items-center gap-1 font-bold text-primary hover:underline">
          Consulter le Grand Livre &amp; Rapports
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </footer>
    </div>
  );
}

function HealthGauge({ score, loading }: { score: number; loading?: boolean }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c - ((loading ? 0 : score) / 100) * c;
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
          {loading ? "…" : score}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">/ 100</span>
      </div>
    </div>
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
  hint,
  footLabel,
  footValue,
  footAccent,
}: {
  label: string;
  icon: React.ReactNode;
  iconClass: string;
  value: string;
  unit: string;
  delta: string | null;
  tone: number | null;
  hint?: string;
  footLabel: string;
  footValue: string;
  footAccent?: boolean;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 rounded-2xl bg-surface-container-lowest p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">{label}</span>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-low", iconClass)}>
          {icon}
        </div>
      </div>
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[32px] font-bold leading-none tracking-tight text-on-surface">{value}</span>
          {unit ? <span className="text-sm font-bold text-secondary">{unit}</span> : null}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {delta ? <span className={cn("text-[11px] font-bold", deltaClass(tone))}>{delta}</span> : null}
          {hint ? <span className="text-[12px] text-on-surface-variant">{hint}</span> : null}
        </div>
      </div>
      <div className="flex items-center justify-between pt-1 text-[12px] text-on-surface-variant">
        <span>{footLabel}</span>
        <span className={cn("font-bold", footAccent ? "text-primary-container" : "text-on-surface")}>
          {footValue}
        </span>
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

function ExportItem({
  icon,
  title,
  hint,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-surface-container-low"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container text-primary">
        {icon}
      </span>
      <span className="flex flex-col">
        <span className="text-sm font-bold">{title}</span>
        <span className="text-[10px] text-on-surface-variant">{hint}</span>
      </span>
    </button>
  );
}

function ModuleCard({
  href,
  icon,
  iconTone,
  badge,
  badgeTone,
  title,
  description,
  lines,
  extra,
  loading,
}: {
  href: string;
  icon: React.ReactNode;
  iconTone: string;
  badge: string;
  badgeTone: string;
  title: string;
  description: string;
  lines: { label: string; value: string; strong?: boolean }[];
  extra?: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col justify-between gap-3 rounded-2xl bg-surface-container-lowest p-5 shadow-sm transition-all hover:shadow-md"
    >
      <div>
        <div className="flex items-center justify-between">
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", iconTone)}>{icon}</div>
          <span className={cn("text-[11px] font-bold uppercase tracking-widest", badgeTone)}>{badge}</span>
        </div>
        <h3 className="mt-2 text-base font-bold text-on-surface transition-colors group-hover:text-primary-container">
          {title}
        </h3>
        <p className="mt-0.5 text-[12px] text-on-surface-variant">{description}</p>
      </div>
      {loading ? (
        <p className="text-sm text-on-surface-variant">Chargement…</p>
      ) : (
        <div className="flex flex-col gap-1 rounded-lg bg-surface-container-low p-3 text-sm">
          {lines.map((line) => (
            <div
              key={line.label}
              className={cn("flex justify-between gap-2", line.strong && "border-t border-surface-container pt-1")}
            >
              <span className="truncate text-on-surface-variant">{line.label}</span>
              <span
                className={cn(
                  "max-w-[55%] truncate shrink-0 font-semibold",
                  line.strong && "font-bold text-primary-container",
                )}
              >
                {line.value}
              </span>
            </div>
          ))}
          {extra}
        </div>
      )}
      <span className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-surface-container text-sm font-bold transition-colors group-hover:bg-primary-container group-hover:text-on-primary">
        Ouvrir <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  );
}
