"use client";

import Link from "next/link";
import type { Ref } from "react";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Bath,
  CalendarCheck2,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  Download,
  FileSpreadsheet,
  FileText,
  IdCard,
  Landmark,
  MapPin,
  Package,
  Printer,
  RefreshCw,
  Scale,
  Settings2,
  Share2,
  Shield,
  Sparkles,
  Star,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import {
  PRESET_OPTIONS,
  avgOccupation,
  avgServiceMargin,
  deltaClass,
  healthyStockCount,
  initials,
  marketingRoi,
  paymentBarColor,
  paymentDotColor,
  presenceRate,
  reviewScoreLabel,
  serviceShare,
  statusCount,
  type ModuleCardDef,
  type ReportsViewModel,
} from "@/components/reports/reports-helpers";
import { cn } from "@/lib/utils";
import { formatMad, formatPct } from "@/modules/analytics/service";
import type { AnalyticsPeriodPreset } from "@/lib/analytics/period";
import type { LoyaltyAnalytics } from "@/types/analytics";
import type { CustomerReportRow, ReportType, StockLedgerReportRow } from "@/types/reports";

export function ReportsDesktop({
  vm,
  exportOpen,
  setExportOpen,
  exportRef,
  customerRows,
  ledger,
  loyalty,
  canReactivation,
}: {
  vm: ReportsViewModel;
  exportOpen: boolean;
  setExportOpen: (v: boolean) => void;
  exportRef: Ref<HTMLDivElement>;
  customerRows: CustomerReportRow[];
  ledger: StockLedgerReportRow[];
  loyalty: LoyaltyAnalytics | null;
  canReactivation: boolean;
}) {
  const ov = vm.overview;
  const completed = statusCount(vm.agenda, "COMPLETED");
  const cancelled = statusCount(vm.agenda, "CANCELLED");
  const presence = presenceRate(vm.agenda);
  const occ = avgOccupation(vm.agenda);
  const stockOk = healthyStockCount(vm.inventory, vm.ledgerLen);
  const serviceTotal = vm.services.reduce((s, r) => s + r.revenue, 0);
  const staffRev = vm.staffRows.reduce((s, r) => s + r.revenue, 0);
  const staffComm = vm.staffRows.reduce((s, r) => s + r.commission, 0);
  const staffRdv = vm.staffRows.reduce((s, r) => s + r.appointments, 0);
  const roi = marketingRoi(vm.marketing);
  const marginPct = avgServiceMargin(vm.services);

  return (
    <div className="hidden space-y-6 print:block lg:block">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#FFDEA4] shadow-sm">
                <Shield className="h-3 w-3" fill="currentColor" />
                {vm.roleLabel}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-high px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-on-surface">
                <BadgeCheck className="h-3 w-3 text-primary" />
                Données live
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary-fixed px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-on-secondary-fixed">
                <Scale className="h-3 w-3 text-secondary" />
                Conforme CNDP Loi 09-08
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                <MapPin className="h-3 w-3 text-secondary" />
                {vm.orgName}
              </span>
            </div>
            <h1 className="mt-1 text-[40px] font-bold leading-tight tracking-tight text-on-surface">
              Rapports &amp; Centre d&apos;Audit Financier{" "}
              <span className="font-serif italic text-primary-container">— {vm.orgName}</span>
            </h1>
            <p className="max-w-4xl text-[15px] text-on-surface-variant">
              Générez, analysez, comparez et exportez les rapports comptables et opérationnels consolidés (Livre de
              Caisse, RDV, Clientes, Staff, Prestations, Stock).
            </p>
          </div>
          <div className="relative flex items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={vm.onAuto}
              className="flex h-12 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-on-surface shadow-sm transition-all hover:bg-surface-container"
            >
              <Settings2 className="h-5 w-5 text-secondary" />
              Rapports Automatisés
            </button>
            <div className="relative" ref={exportRef}>
              <button
                type="button"
                onClick={() => setExportOpen(!exportOpen)}
                className="flex h-12 items-center gap-2 rounded-lg bg-primary-container px-5 text-sm font-bold text-on-primary-container shadow-md transition-all hover:bg-primary hover:shadow-lg"
              >
                <Share2 className="h-5 w-5" />
                Exporter le Rapport
                <ChevronDown className="h-4 w-4" />
              </button>
              {exportOpen ? (
                <div className="absolute right-0 z-50 mt-2 flex w-64 flex-col gap-1 rounded-xl bg-white p-2 shadow-2xl">
                  <ExportItem icon={<FileText className="h-4 w-4" />} title="PDF Expert-Comptable" hint="Synthèse imprimable" onClick={() => vm.onExport("pdf")} />
                  <ExportItem icon={<FileSpreadsheet className="h-4 w-4" />} title="Excel / XLSX Analytique" hint="Tableaux croisés dynamiques" onClick={() => vm.onExport("xlsx")} />
                  <ExportItem icon={<FileSpreadsheet className="h-4 w-4" />} title="CSV Grand Livre" hint="Export brut transactions" onClick={() => vm.onExport("csv")} />
                  <div className="my-1 h-px bg-surface-container" />
                  <ExportItem icon={<Printer className="h-4 w-4" />} title="Imprimer le Bilan" hint="Format A4 navigateur" onClick={vm.onPrint} />
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm print:hidden">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg bg-surface-container-low px-3 py-2 text-sm">
              <CalendarDays className="h-4 w-4 text-secondary" />
              <span className="font-bold">{vm.periodLabel}</span>
              <span className="rounded-full bg-secondary-fixed px-2 py-0.5 text-[10px] font-bold uppercase text-on-secondary-fixed">
                {PRESET_OPTIONS.find((o) => o.value === vm.preset)?.label}
              </span>
            </div>
            <select
              aria-label="Période"
              value={vm.preset}
              onChange={(e) => vm.onPreset(e.target.value as AnalyticsPeriodPreset)}
              className="h-10 rounded-lg bg-surface-container-low px-3 text-sm font-semibold"
            >
              {PRESET_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
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
            {vm.showStaffServiceFilters ? (
              <>
                <select
                  aria-label="Praticienne"
                  value={vm.staffId}
                  onChange={(e) => vm.onStaff(e.target.value)}
                  className="h-10 rounded-lg bg-surface-container-low px-3 text-sm font-semibold"
                >
                  <option value="">Toutes les praticiennes</option>
                  {vm.staffOpts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Prestation"
                  value={vm.serviceId}
                  onChange={(e) => vm.onService(e.target.value)}
                  className="h-10 rounded-lg bg-surface-container-low px-3 text-sm font-semibold"
                >
                  <option value="">Toutes les prestations</option>
                  {vm.serviceOpts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </>
            ) : null}
          </div>
          <button type="button" onClick={vm.onRefresh} className="flex items-center gap-1 text-xs text-on-surface-variant">
            <RefreshCw className="h-3.5 w-3.5 text-secondary" />
            Actualisé à {vm.generatedAt} — Casablanca
          </button>
        </div>
        {vm.scopeNote ? <p className="text-xs text-on-surface-variant">{vm.scopeNote}</p> : null}
      </header>

      <section className="relative overflow-hidden rounded-xl bg-ink p-8 text-[#FEECF7] shadow-xl">
        <div className="pointer-events-none absolute -right-16 -top-16 h-80 w-80 rounded-full bg-primary-container/20 blur-3xl" />
        <div className="relative z-10 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/30 text-[#FFDEA4]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[22px] font-extrabold tracking-tight text-white">Copilote IA Prestige</span>
                  <span className="rounded-full bg-[#FFDEA4] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#261900]">
                    Audit Live · {PRESET_OPTIONS.find((o) => o.value === vm.preset)?.label}
                  </span>
                </div>
                <p className="text-[13px] text-[#E7D5E0]">
                  Analyse des indicateurs et recommandations opérationnelles — {vm.orgName}
                </p>
              </div>
            </div>
            <div className="flex gap-2 print:hidden">
              {vm.insight.href.startsWith("/") ? (
                <Link
                  href={vm.insight.href}
                  className="flex h-10 items-center gap-1.5 rounded-lg bg-primary-container px-4 text-sm font-bold text-white shadow-sm transition-all hover:bg-primary"
                >
                  <Zap className="h-4 w-4" />
                  {vm.insight.cta}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => vm.onSelectType("finance")}
                  className="flex h-10 items-center gap-1.5 rounded-lg bg-primary-container px-4 text-sm font-bold text-white shadow-sm transition-all hover:bg-primary"
                >
                  <Zap className="h-4 w-4" />
                  {vm.insight.cta}
                </button>
              )}
              <button
                type="button"
                onClick={() => vm.onExport("pdf")}
                className="flex h-10 items-center gap-1.5 rounded-lg bg-white/10 px-4 text-sm font-semibold text-white transition-all hover:bg-white/20"
              >
                <Download className="h-4 w-4" />
                Télécharger l&apos;Audit IA
              </button>
            </div>
          </div>
          {vm.loading ? (
            <p className="text-sm text-white/70">Chargement des indicateurs…</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="flex flex-col justify-between gap-2 rounded-lg bg-white/5 p-4 backdrop-blur-md">
                <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#FFDEA4]">
                  <ArrowUpRight className="h-4 w-4" />
                  Constat Clé de Performance
                </p>
                <p className="text-[15px] text-white">{vm.insight.performance}</p>
              </div>
              <div className="flex flex-col justify-between gap-2 rounded-lg bg-white/5 p-4 backdrop-blur-md">
                <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#FFDAD6]">
                  <AlertTriangle className="h-4 w-4" />
                  Vigilance Opérationnelle
                </p>
                <p className="text-[15px] text-white">{vm.insight.vigilance}</p>
              </div>
              <div className="flex flex-col justify-between gap-2 rounded-lg bg-white/5 p-4 backdrop-blur-md">
                <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#FFD9DE]">
                  <Sparkles className="h-4 w-4" />
                  Recommandation Tactique
                </p>
                <p className="text-[15px] text-white">{vm.insight.recommendation}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MacroCard
          label="Chiffre d'Affaires Net"
          icon={<CircleDollarSign className="h-5 w-5" />}
          iconClass="text-primary-container"
          value={ov ? ov.revenue.value.toLocaleString("fr-MA") : "—"}
          unit="DH"
          delta={ov ? formatPct(ov.revenue.changePercent) : null}
          tone={ov?.revenue.changePercent ?? null}
          hint={ov?.revenue.previous != null ? `vs ${formatMad(ov.revenue.previous)}` : undefined}
          footLabel="Panier moyen consolidé"
          footValue={ov ? formatMad(ov.averageTicket.value) : "—"}
        />
        <MacroCard
          label="Rendez-vous Honorés"
          icon={<CalendarCheck2 className="h-5 w-5" />}
          iconClass="text-secondary"
          value={vm.agenda ? String(completed) : ov ? String(ov.appointments.value) : "—"}
          unit="RDV"
          delta={ov ? formatPct(ov.appointments.changePercent) : null}
          tone={ov?.appointments.changePercent ?? null}
          hint={vm.agenda ? `${vm.agenda.total} RDV sur la période` : "Tous statuts"}
          footLabel="Taux de présence effectif"
          footValue={presence != null ? `${presence.toLocaleString("fr-MA")} %` : "—"}
        />
        <MacroCard
          label="Clientes Accueillies"
          icon={<Users className="h-5 w-5" />}
          iconClass="text-primary"
          value={vm.customers ? String(vm.customers.kpis.active) : ov ? String(ov.customers.value) : "—"}
          unit="Actives"
          delta={null}
          tone={null}
          hint={vm.customers ? `${vm.customers.kpis.total} au fichier` : "Fenêtre 90 j"}
          footLabel="Nouvelles adhésions"
          footValue={
            vm.customers
              ? `+${vm.customers.kpis.newInPeriod} · ${vm.customers.kpis.vip} VIP`
              : "Base CRM"
          }
          footAccent
        />
        <MacroCard
          label="Ventes & Prestations"
          icon={<Bath className="h-5 w-5" />}
          iconClass="text-secondary"
          value={vm.services.length ? String(vm.services.reduce((s, r) => s + r.appointments, 0)) : "—"}
          unit="Actes"
          delta={null}
          tone={null}
          hint={marginPct != null ? `Marge estimée ${marginPct.toLocaleString("fr-MA")} %` : undefined}
          footLabel="Valeur stock magasin"
          footValue={vm.inventory ? formatMad(vm.inventory.stockValue) : "—"}
        />
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-[22px] font-bold text-on-surface">Rapports Opérationnels &amp; Comptables Spécialisés</h2>
            <p className="text-[13px] text-on-surface-variant">
              Modules prêts pour consultation détaillée et extraction — selon votre rôle
            </p>
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">
            {vm.modules.length} Modules Disponibles
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {vm.modules.map((m) => (
            <button
              key={m.type}
              type="button"
              onClick={() => vm.onSelectType(m.type)}
              className={cn(
                "group flex flex-col justify-between gap-4 rounded-xl bg-white p-6 text-left shadow-sm transition-all hover:shadow-md",
                vm.activeType === m.type && "ring-1 ring-primary-container",
              )}
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", m.iconTone)}>
                    <ModuleIcon name={m.icon} />
                  </div>
                  <span className={cn("text-[11px] font-bold uppercase tracking-widest", m.badgeTone)}>
                    {m.badge}
                  </span>
                </div>
                <h3 className="mt-1 text-lg font-bold text-on-surface transition-colors group-hover:text-primary-container">
                  {m.title}
                </h3>
                <p className="text-[13px] text-on-surface-variant">{m.description}</p>
              </div>
              <div className="flex flex-col gap-1 rounded-lg bg-surface-container-low p-3 text-sm">
                {moduleLines(m.type, vm).map((line) => (
                  <div
                    key={line.label}
                    className={cn("flex justify-between gap-2", line.strong && "border-t border-surface-container pt-1")}
                  >
                    <span className="truncate text-on-surface-variant">{line.label}</span>
                    <span className={cn("shrink-0 font-semibold", line.strong && "font-bold text-primary-container")}>
                      {line.value}
                    </span>
                  </div>
                ))}
              </div>
              <span className="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-surface-container text-sm font-bold transition-colors group-hover:bg-primary-container group-hover:text-white">
                {m.cta} <ArrowRight className="h-4 w-4" />
              </span>
            </button>
          ))}
        </div>
      </section>

      <section id="rapport-detail" className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="flex flex-col gap-8 lg:col-span-8">
          <div className="flex flex-col gap-4 rounded-xl bg-white p-8 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
              <div>
                <h3 className="text-[22px] font-bold text-on-surface">Ventilation du Compte de Résultat Simplifié</h3>
                <p className="text-[13px] text-on-surface-variant">Synthèse comptable — période filtrée, chiffres réels</p>
              </div>
              <span className="rounded-full bg-secondary-fixed px-3 py-1 text-[11px] font-bold text-on-secondary-fixed">
                {PRESET_OPTIONS.find((o) => o.value === vm.preset)?.label}
              </span>
            </div>
            <div className="flex flex-col gap-1 text-[15px]">
              <div className="flex items-center justify-between rounded-lg bg-surface-container-low p-3 transition-colors hover:bg-surface-container">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-high text-[11px] font-bold text-primary">
                    01
                  </span>
                  <div>
                    <p className="font-bold text-on-surface">Chiffre d&apos;Affaires Brut Encaissé</p>
                    <p className="text-[13px] text-on-surface-variant">Prestations, hammam, coiffure et ventes boutique</p>
                  </div>
                </div>
                <span className="text-[22px] font-extrabold tracking-tight text-on-surface">
                  {vm.pnl.gross != null ? formatMad(vm.pnl.gross) : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg px-4 py-2 transition-colors hover:bg-surface-container-low/60">
                <div className="flex items-center gap-3 pl-8">
                  <span className="font-bold text-error">−</span>
                  <span className="text-on-surface-variant">Avoirs accordés &amp; remboursements exceptionnels</span>
                </div>
                <span className="text-sm font-bold text-error">− {formatMad(vm.pnl.refunds)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-surface-container p-3">
                <div className="flex items-center gap-3">
                  <ArrowRight className="h-5 w-5 text-secondary" />
                  <span className="text-lg font-bold">Chiffre d&apos;Affaires Net Réalisé</span>
                </div>
                <span className="text-[22px] font-extrabold tracking-tight text-secondary">{formatMad(vm.pnl.net)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg px-4 py-2 transition-colors hover:bg-surface-container-low/60">
                <div className="flex items-center gap-3 pl-8">
                  <span className="font-bold text-outline">−</span>
                  <span className="text-on-surface-variant">Dépenses d&apos;exploitation directes</span>
                </div>
                <span className="text-sm font-bold text-on-surface">− {formatMad(vm.pnl.expenses)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg px-4 py-2 transition-colors hover:bg-surface-container-low/60">
                <div className="flex items-center gap-3 pl-8">
                  <span className="font-bold text-outline">−</span>
                  <span className="text-on-surface-variant">Rémunération variable &amp; commissions praticiennes</span>
                </div>
                <span className="text-sm font-bold text-on-surface">− {formatMad(vm.pnl.commissions)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between rounded-xl bg-primary-container p-4 text-white shadow-md">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
                    <BadgeCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-primary-fixed">
                      Excédent Brut d&apos;Exploitation
                    </p>
                    <p className="text-[22px] font-bold">Marge d&apos;Exploitation Nette</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[40px] font-extrabold leading-none tracking-tight">{formatMad(vm.pnl.margin)}</p>
                  <p className="text-sm font-bold text-primary-fixed">
                    {vm.pnl.marginRate != null
                      ? `Taux de marge : ${vm.pnl.marginRate.toLocaleString("fr-MA")} %`
                      : "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6 rounded-xl bg-white p-8 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-[22px] font-bold text-on-surface">Évolution Mensuelle du Chiffre d&apos;Affaires</h3>
                <p className="text-[13px] text-on-surface-variant">
                  Progression de l&apos;activité sur la période filtrée
                  {occ != null ? ` · occupation cabines ${occ} %` : ""}
                </p>
              </div>
              <div className="flex items-center gap-4 text-[11px] font-semibold">
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-primary-container" />
                  CA Réalisé (DH)
                </span>
              </div>
            </div>
            {vm.bars.length === 0 ? (
              <p className="text-sm text-on-surface-variant">Pas de CA journalier sur cette période.</p>
            ) : (
              <div className="flex h-64 items-end justify-between gap-3 border-b border-surface-container pb-4 pt-8">
                {vm.bars.map((b, i) => {
                  const isLast = i === vm.bars.length - 1;
                  return (
                    <div key={b.key} className="group flex flex-1 flex-col items-center gap-2">
                      <span
                        className={cn(
                          "text-[11px] font-bold transition-colors group-hover:text-primary",
                          isLast ? "text-primary" : "text-on-surface-variant",
                        )}
                      >
                        {formatMad(b.value)}
                      </span>
                      <div
                        className={cn(
                          "relative w-full max-w-[48px] rounded-t-lg transition-all",
                          isLast ? "bg-secondary-fixed" : "bg-surface-container-high group-hover:bg-primary/40",
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
                      <span className={cn("text-sm font-bold", isLast && "font-extrabold text-primary-container")}>
                        {b.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {vm.staffRows.length > 0 ? (
            <div className="flex flex-col gap-4 rounded-xl bg-white p-8 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[22px] font-bold">Performance nominative de l&apos;équipe</h3>
                  <p className="text-[13px] text-on-surface-variant">RDV terminés, CA encaissé, commissions dues — sans notes inventées</p>
                </div>
                {vm.canCommissions ? (
                  <Link href="/commissions/" className="flex items-center gap-1 rounded-lg bg-surface-container px-3 py-1.5 text-sm font-semibold">
                    Module commissions
                  </Link>
                ) : null}
              </div>
              <div className="w-full overflow-x-auto">
                <table className="w-full border-collapse text-left text-[15px]">
                  <thead>
                    <tr className="border-b border-surface-container text-[11px] uppercase tracking-wider text-on-surface-variant">
                      <th className="px-2 py-3">Praticienne</th>
                      <th className="px-2 py-3 text-center">RDV réalisés</th>
                      <th className="px-2 py-3 text-right">CA généré</th>
                      <th className="px-2 py-3 text-right">Commission due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vm.staffRows.map((s) => (
                      <tr key={s.staffId} className="border-b border-surface-container-low">
                        <td className="px-2 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-container text-xs font-bold text-white">
                              {initials(s.staffName)}
                            </div>
                            <span className="font-bold">{s.staffName}</span>
                          </div>
                        </td>
                        <td className="px-2 py-3 text-center font-bold">{s.appointments} RDV</td>
                        <td className="px-2 py-3 text-right font-extrabold">{formatMad(s.revenue)}</td>
                        <td className="px-2 py-3 text-right font-bold text-primary">{formatMad(s.commission)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-surface-container font-bold">
                      <td className="px-2 py-3">Total consolidé</td>
                      <td className="px-2 py-3 text-center">{staffRdv} RDV</td>
                      <td className="px-2 py-3 text-right text-primary-container">{formatMad(staffRev)}</td>
                      <td className="px-2 py-3 text-right text-primary">{formatMad(staffComm)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : null}

          <ModuleDetail
            type={vm.activeType}
            vm={vm}
            customerRows={customerRows}
            ledger={ledger}
            cancelled={cancelled}
            stockOk={stockOk}
            serviceTotal={serviceTotal}
            loyalty={loyalty}
          />
        </div>

        <div className="flex flex-col gap-8 lg:col-span-4">
          <div className="flex flex-col gap-4 rounded-xl bg-white p-8 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-[22px] font-bold text-on-surface">Audit Caisse &amp; Règlements</h3>
              <Wallet className="h-5 w-5 text-secondary" />
            </div>
            <p className="text-[13px] text-on-surface-variant">Traçabilité des encaissements de la période</p>
            {vm.payments.length === 0 ? (
              <p className="text-sm text-on-surface-variant">Aucun paiement.</p>
            ) : (
              <div className="flex flex-col gap-3 pt-1">
                {vm.payments.map((p) => (
                  <div key={p.method} className="flex flex-col gap-1">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-1.5 font-semibold text-on-surface">
                        <span className={cn("h-3 w-3 rounded-full", paymentDotColor(p.method))} />
                        {p.label} ({p.percent.toLocaleString("fr-MA")} %)
                      </span>
                      <span className="font-bold text-on-surface">{formatMad(p.amount)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-container">
                      <div
                        className={cn("h-full rounded-full", paymentBarColor(p.method))}
                        style={{ width: `${Math.min(100, p.percent)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 rounded-xl bg-white p-8 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-[22px] font-bold">Top soins &amp; ventes</h3>
              <Star className="h-5 w-5 text-primary" />
            </div>
            {vm.top.length === 0 ? (
              <p className="text-sm text-on-surface-variant">Pas encore de ventes classées.</p>
            ) : (
              vm.top.map((item, i) => (
                <div key={item.key} className="flex items-center justify-between rounded-lg p-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary-fixed text-[11px] font-bold text-on-secondary-fixed">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-bold">{item.name}</p>
                      <p className="text-xs text-on-surface-variant">{item.subtitle}</p>
                    </div>
                  </div>
                  <p className="font-bold">{formatMad(item.revenue)}</p>
                </div>
              ))
            )}
          </div>

          <div className="flex flex-col gap-2 rounded-xl bg-white p-8 shadow-sm">
            <h3 className="text-[22px] font-bold">Modules liés</h3>
            {vm.canMarketing ? (
              <Shortcut
                href="/marketing/"
                title="Campagnes & marketing"
                hint={roi != null ? `CA attribué / destinataire : ${roi.toLocaleString("fr-MA")} MAD` : `${vm.marketing.length} campagne(s)`}
              />
            ) : null}
            {vm.canGiftCards ? (
              <Shortcut href="/gift-cards/" title="Cartes cadeaux" hint={vm.giftBalance != null ? `En-cours ${formatMad(vm.giftBalance)}` : "Soldes réels"} />
            ) : null}
            {vm.canReviews ? <Shortcut href="/reviews/" title="Avis & réputation" hint={reviewScoreLabel(vm.reviews)} /> : null}
            {vm.canLoyalty ? (
              <Shortcut
                href="/loyalty/"
                title="Fidélité"
                hint={
                  loyalty
                    ? `${loyalty.pointsEarned.toLocaleString("fr-MA")} pts gagnés · ${loyalty.vipCustomers} VIP`
                    : "Points & récompenses"
                }
              />
            ) : null}
            {canReactivation ? <Shortcut href="/reactivation/" title="Relance clientes" hint="Segment inactif 90 j" /> : null}
          </div>
        </div>
      </section>

      <footer className="flex flex-col gap-6 rounded-xl bg-white p-8 shadow-sm print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-surface-container pb-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" />
              <h3 className="text-[22px] font-bold text-on-surface">Automatisation des Livrables &amp; Exports</h3>
            </div>
            <p className="text-[13px] text-on-surface-variant">
              Téléchargez à la demande le module sélectionné ({vm.activeType}). Les envois planifiés vers un
              expert-comptable ne sont pas encore disponibles.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-lg bg-surface-container-low px-3 py-1.5 text-sm font-semibold text-on-surface">
              <span className="h-2 w-2 rounded-full bg-secondary" />
              À la demande
            </span>
            <span className="flex items-center gap-1.5 rounded-lg bg-secondary-fixed px-3 py-1.5 text-sm font-bold text-on-secondary-fixed">
              <BadgeCheck className="h-4 w-4" />
              Module : {vm.activeType}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => vm.onExport("pdf")}
            className="flex items-start gap-3 rounded-lg bg-surface-container-low p-4 text-left transition-colors hover:bg-surface-container"
          >
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary-container" />
            <span className="flex flex-col">
              <span className="text-sm font-bold">PDF / Grand Livre</span>
              <span className="text-[12px] text-on-surface-variant">Synthèse imprimable de la période</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => vm.onExport("xlsx")}
            className="flex items-start gap-3 rounded-lg bg-surface-container-low p-4 text-left transition-colors hover:bg-surface-container"
          >
            <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
            <span className="flex flex-col">
              <span className="text-sm font-bold">Excel Analytique</span>
              <span className="text-[12px] text-on-surface-variant">Tableaux pour retraitement</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => vm.onExport("csv")}
            className="flex items-start gap-3 rounded-lg bg-surface-container-low p-4 text-left transition-colors hover:bg-surface-container"
          >
            <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0 text-on-surface-variant" />
            <span className="flex flex-col">
              <span className="text-sm font-bold">CSV Transactions</span>
              <span className="text-[12px] text-on-surface-variant">Export brut du module actif</span>
            </span>
          </button>
          <button
            type="button"
            onClick={vm.onAuto}
            className="flex items-start gap-3 rounded-lg bg-surface-container-low p-4 text-left transition-colors hover:bg-surface-container"
          >
            <Settings2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span className="flex flex-col">
              <span className="text-sm font-bold">Options d&apos;automatisation</span>
              <span className="text-[12px] text-on-surface-variant">Paramètres et limites actuelles</span>
            </span>
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 text-[11px] text-on-surface-variant">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-secondary" />
            <span>
              Exports générés à la demande — conformité CNDP (consentements réels). Aucune empreinte cryptographique
              inventée.
            </span>
          </div>
          <span className="text-outline">Horodatage Casablanca : {vm.generatedAt}</span>
        </div>
      </footer>
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
    <button type="button" onClick={onClick} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-surface-container-low">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container text-primary">{icon}</span>
      <span className="flex flex-col">
        <span className="text-sm font-bold">{title}</span>
        <span className="text-[10px] text-on-surface-variant">{hint}</span>
      </span>
    </button>
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
    <div className="flex flex-col justify-between gap-4 rounded-xl bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">{label}</span>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-low", iconClass)}>
          {icon}
        </div>
      </div>
      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-[40px] font-bold leading-none tracking-tight text-on-surface">{value}</span>
          {unit ? <span className="text-lg font-bold text-secondary">{unit}</span> : null}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {delta ? <span className={cn("inline-flex items-center text-[11px] font-bold", deltaClass(tone))}>{delta}</span> : null}
          {hint ? <span className="text-[13px] text-on-surface-variant">{hint}</span> : null}
        </div>
      </div>
      <div className="flex items-center justify-between pt-1 text-[13px] text-on-surface-variant">
        <span>{footLabel}</span>
        <span className={cn("font-bold", footAccent ? "text-primary-container" : "text-on-surface")}>{footValue}</span>
      </div>
    </div>
  );
}

function ModuleIcon({ name }: { name: ModuleCardDef["icon"] }) {
  const cls = "h-5 w-5";
  if (name === "finance") return <Landmark className={cls} />;
  if (name === "agenda") return <CalendarDays className={cls} />;
  if (name === "customers") return <Users className={cls} />;
  if (name === "staff") return <IdCard className={cls} />;
  if (name === "services") return <Sparkles className={cls} />;
  return <Package className={cls} />;
}

function Shortcut({ href, title, hint }: { href: string; title: string; hint: string }) {
  return (
    <Link href={href} className="flex items-center justify-between rounded-lg bg-surface-container-low p-3 hover:bg-surface-container">
      <div>
        <p className="text-sm font-bold">{title}</p>
        <p className="text-[11px] text-on-surface-variant">{hint}</p>
      </div>
      <ArrowUpRight className="h-4 w-4 text-on-surface-variant" />
    </Link>
  );
}

function moduleLines(type: ReportType, vm: ReportsViewModel): { label: string; value: string; strong?: boolean }[] {
  if (type === "finance") {
    return [
      { label: "CA brut", value: vm.pnl.gross != null ? formatMad(vm.pnl.gross) : "—" },
      { label: "Remboursements", value: `− ${formatMad(vm.pnl.refunds)}` },
      { label: "Charges", value: `− ${formatMad(vm.pnl.expenses)}` },
      { label: "Marge", value: formatMad(vm.pnl.margin), strong: true },
    ];
  }
  if (type === "agenda") {
    const done = statusCount(vm.agenda, "COMPLETED");
    const cancel = statusCount(vm.agenda, "CANCELLED");
    return [
      { label: "Réservations", value: vm.agenda ? `${vm.agenda.total}` : "—" },
      { label: "Terminés", value: String(done) },
      { label: "Annulations", value: String(cancel) },
      {
        label: "No-show",
        value:
          vm.agenda?.noShow.rate != null
            ? `${vm.agenda.noShow.count} (${vm.agenda.noShow.rate.toLocaleString("fr-MA")} %)`
            : String(vm.agenda?.noShow.count ?? "—"),
        strong: true,
      },
    ];
  }
  if (type === "customers" && vm.customers) {
    const k = vm.customers.kpis;
    return [
      { label: "Fichier", value: String(k.total) },
      { label: "Actives (90 j)", value: String(k.active) },
      { label: "VIP", value: String(k.vip) },
      {
        label: "Rétention",
        value: vm.customers.retention.retentionRate != null ? `${vm.customers.retention.retentionRate} %` : "—",
        strong: true,
      },
    ];
  }
  if (type === "staff") {
    const top = vm.staffRows[0];
    return [
      { label: "Praticiennes", value: String(vm.staffRows.length) },
      { label: "Top CA", value: top ? formatMad(top.revenue) : "—" },
      { label: "Top nom", value: top?.staffName ?? "—" },
      { label: "Commissions", value: formatMad(vm.staffRows.reduce((s, r) => s + r.commission, 0)), strong: true },
    ];
  }
  if (type === "services") {
    const total = vm.services.reduce((s, r) => s + r.revenue, 0);
    const rows = vm.services.slice(0, 3).map((s, i) => ({
      label: s.serviceName,
      value: `${formatMad(s.revenue)}${serviceShare(s, total) != null ? ` (${serviceShare(s, total)} %)` : ""}`,
      strong: i === 0,
    }));
    const avg = avgServiceMargin(vm.services);
    rows.push({
      label: "Marge estimée moy.",
      value: avg != null ? `${avg.toLocaleString("fr-MA")} %` : "—",
      strong: true,
    });
    return rows;
  }
  if (type === "inventory" && vm.inventory) {
    return [
      { label: "Valeur stock", value: formatMad(vm.inventory.stockValue) },
      { label: "Alertes seuil", value: String(vm.inventory.lowStockCount) },
      { label: "Ruptures", value: String(vm.inventory.outOfStockCount) },
      { label: "Pertes", value: formatMad(vm.inventory.lossesValue), strong: true },
    ];
  }
  return [{ label: "Module", value: "Ouvrir" }];
}

function ModuleDetail({
  type,
  vm,
  customerRows,
  ledger,
  stockOk,
  serviceTotal,
  loyalty,
}: {
  type: ReportType;
  vm: ReportsViewModel;
  customerRows: CustomerReportRow[];
  ledger: StockLedgerReportRow[];
  cancelled: number;
  stockOk: number | null;
  serviceTotal: number;
  loyalty: LoyaltyAnalytics | null;
}) {
  if (type === "customers") {
    return (
      <div className="rounded-xl bg-white p-8 shadow-sm">
        <h3 className="mb-4 text-[22px] font-bold">Cohortes clientes</h3>
        {customerRows.length === 0 ? (
          <p className="text-sm text-on-surface-variant">Aucune cliente sur la période.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-[11px] uppercase text-on-surface-variant">
                  <th className="py-2">Cliente</th>
                  <th className="py-2">Visites</th>
                  <th className="py-2 text-right">CA net</th>
                  <th className="py-2">Segment</th>
                </tr>
              </thead>
              <tbody>
                {customerRows.slice(0, 12).map((c) => (
                  <tr key={c.customerId} className="border-b border-surface-container-low">
                    <td className="py-2 font-semibold">{c.customerName}</td>
                    <td className="py-2">{c.visits}</td>
                    <td className="py-2 text-right">{formatMad(c.netRevenue)}</td>
                    <td className="py-2">{c.segment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }
  if (type === "services") {
    return (
      <div className="rounded-xl bg-white p-8 shadow-sm">
        <h3 className="mb-4 text-[22px] font-bold">Matrice soins ({formatMad(serviceTotal)})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-[11px] uppercase text-on-surface-variant">
                <th className="py-2">Service</th>
                <th className="py-2 text-center">Actes</th>
                <th className="py-2 text-right">CA</th>
                <th className="py-2 text-right">Marge estimée</th>
              </tr>
            </thead>
            <tbody>
              {vm.services.map((s) => (
                <tr key={s.serviceId} className="border-b border-surface-container-low">
                  <td className="py-2 font-semibold">{s.serviceName}</td>
                  <td className="py-2 text-center">{s.appointments}</td>
                  <td className="py-2 text-right">{formatMad(s.revenue)}</td>
                  <td className="py-2 text-right">{formatMad(s.estimatedMargin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
  if (type === "inventory") {
    return (
      <div className="rounded-xl bg-white p-8 shadow-sm">
        <h3 className="mb-2 text-[22px] font-bold">Grand inventaire</h3>
        <p className="mb-4 text-sm text-on-surface-variant">
          {stockOk != null ? `${stockOk} lignes hors alerte · ` : ""}
          {vm.inventory ? `Pertes ${formatMad(vm.inventory.lossesValue)}` : ""}
        </p>
        {ledger.length === 0 ? (
          <p className="text-sm text-on-surface-variant">Pas de mouvements de stock sur la période.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-[11px] uppercase text-on-surface-variant">
                  <th className="py-2">Produit</th>
                  <th className="py-2 text-right">Achats</th>
                  <th className="py-2 text-right">Conso</th>
                  <th className="py-2 text-right">Ventes</th>
                  <th className="py-2 text-right">Pertes</th>
                  <th className="py-2 text-right">Solde</th>
                </tr>
              </thead>
              <tbody>
                {ledger.slice(0, 20).map((p) => (
                  <tr key={p.productId} className="border-b border-surface-container-low">
                    <td className="py-2 font-semibold">{p.productName}</td>
                    <td className="py-2 text-right">{p.purchases}</td>
                    <td className="py-2 text-right">{p.consumption}</td>
                    <td className="py-2 text-right">{p.sales}</td>
                    <td className="py-2 text-right">{p.losses}</td>
                    <td className="py-2 text-right">{p.ledgerBalance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }
  if (type === "agenda" && vm.agenda) {
    return (
      <div className="rounded-xl bg-white p-8 shadow-sm">
        <h3 className="mb-4 text-[22px] font-bold">Flux cabines</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {vm.agenda.occupationByWeekday.map((d) => (
            <div key={d.weekday} className="rounded-lg bg-surface-container-low p-3">
              <p className="text-xs text-on-surface-variant">{d.label}</p>
              <p className="text-lg font-bold">{d.rate != null ? `${Math.round(d.rate)} %` : "—"}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (type === "marketing") {
    return (
      <div className="rounded-xl bg-white p-8 shadow-sm">
        <h3 className="mb-4 text-[22px] font-bold">Campagnes de la période</h3>
        {vm.marketing.length === 0 ? (
          <p className="text-sm text-on-surface-variant">Aucune campagne.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {vm.marketing.map((m) => (
              <li key={m.campaignId} className="flex justify-between rounded-lg bg-surface-container-low p-3">
                <span className="font-semibold">{m.campaignName}</span>
                <span>
                  {m.sent}/{m.targeted} · {formatMad(m.associatedRevenue)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
  if (type === "reviews" && vm.reviews) {
    return (
      <div className="rounded-xl bg-white p-8 shadow-sm">
        <h3 className="mb-2 text-[22px] font-bold">Satisfaction interne</h3>
        <p className="text-sm text-on-surface-variant">{reviewScoreLabel(vm.reviews)}</p>
      </div>
    );
  }
  if (type === "loyalty" && loyalty) {
    return (
      <div className="rounded-xl bg-white p-8 shadow-sm">
        <h3 className="mb-2 text-[22px] font-bold">Fidélité</h3>
        <p className="text-sm">
          {loyalty.pointsEarned.toLocaleString("fr-MA")} pts gagnés · {loyalty.pointsRedeemed.toLocaleString("fr-MA")}{" "}
          utilisés · {loyalty.vipCustomers} VIP
        </p>
      </div>
    );
  }
  return null;
}
