"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  Download,
  Landmark,
  RefreshCw,
  Sparkles,
  Star,
  Wallet,
} from "lucide-react";
import {
  PRESET_OPTIONS,
  avgOccupation,
  avgServiceMargin,
  deltaClass,
  initials,
  paymentBarColor,
  presenceRate,
  reviewScoreLabel,
  serviceShare,
  statusCount,
  type ReportsViewModel,
} from "@/components/reports/reports-helpers";
import { cn } from "@/lib/utils";
import { formatMad, formatPct } from "@/modules/analytics/service";

export function ReportsMobile(vm: ReportsViewModel) {
  const ov = vm.overview;
  const completed = statusCount(vm.agenda, "COMPLETED");
  const presence = presenceRate(vm.agenda);
  const occ = avgOccupation(vm.agenda);

  return (
    <div className="space-y-4 pb-4 print:hidden lg:hidden">
      <section className="space-y-2">
        <div className="flex flex-wrap items-center gap-1">
          <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
            {vm.roleLabel}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary-container px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-secondary-container">
            CNDP — consentements réels
          </span>
        </div>
        <h1 className="font-headline-sm text-[22px] font-semibold tracking-tight text-on-surface">
          Rapports &amp; audit financier
        </h1>
        <p className="text-sm text-on-surface-variant">
          Indicateurs consolidés en MAD, calculés sur la période sélectionnée.
        </p>
        <button
          type="button"
          onClick={() => vm.onExport("pdf")}
          className="flex h-12 w-full items-center justify-between rounded-lg bg-primary-container px-4 text-on-primary-container shadow-sm"
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Download className="h-4 w-4" />
            Exporter le rapport
          </span>
          <span className="flex gap-1 text-[10px] font-bold">
            <span className="rounded bg-white/20 px-1.5 py-0.5">PDF</span>
            <span className="rounded bg-white/20 px-1.5 py-0.5">XLSX</span>
            <span className="rounded bg-white/20 px-1.5 py-0.5">CSV</span>
          </span>
        </button>
      </section>

      <section className="space-y-2 rounded-xl bg-surface-container-low p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate text-sm font-semibold">{vm.periodLabel}</span>
          </div>
          <button
            type="button"
            onClick={vm.onCompare}
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
              vm.compare ? "bg-surface-container text-secondary" : "bg-white text-on-surface-variant",
            )}
          >
            {vm.compare ? vm.compareLabel : "Comparer"}
          </button>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {PRESET_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => vm.onPreset(o.value)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold",
                vm.preset === o.value
                  ? "bg-primary-container text-on-primary-container"
                  : "bg-white text-on-surface shadow-sm",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
        {vm.showStaffServiceFilters ? (
          <div className="flex gap-1.5 overflow-x-auto">
            <select
              aria-label="Praticienne"
              value={vm.staffId}
              onChange={(e) => vm.onStaff(e.target.value)}
              className="h-9 shrink-0 rounded-full bg-white px-3 text-[11px] font-semibold text-on-surface shadow-sm"
            >
              <option value="">Toutes praticiennes</option>
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
              className="h-9 shrink-0 rounded-full bg-white px-3 text-[11px] font-semibold text-on-surface shadow-sm"
            >
              <option value="">Toutes prestations</option>
              {vm.serviceOpts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="flex items-center justify-between text-[11px] text-on-surface-variant">
          <span>Actualisé à {vm.generatedAt} — Casablanca</span>
          <button type="button" onClick={vm.onRefresh} className="font-semibold text-primary">
            Rafraîchir
          </button>
        </div>
        {vm.scopeNote ? <p className="text-[11px] text-on-surface-variant">{vm.scopeNote}</p> : null}
      </section>

      <section className="relative overflow-hidden rounded-xl bg-ink p-4 text-[#FEECF7] shadow-md">
        <div className="mb-2 flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-[#FFDEA4]" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#FFDEA4]">
            Copilote — lecture des KPI
          </span>
        </div>
        {vm.loading ? (
          <p className="text-sm text-white/70">Analyse en cours…</p>
        ) : (
          <div className="space-y-2 text-sm">
            <p className="rounded-lg bg-white/5 p-2">{vm.insight.performance}</p>
            <div className="flex gap-2 rounded-lg bg-error/20 p-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#FFDAD6]" />
              <p>{vm.insight.vigilance}</p>
            </div>
          </div>
        )}
        <div className="mt-3 grid grid-cols-1 gap-2">
          {vm.insight.href.startsWith("/") ? (
            <Link
              href={vm.insight.href}
              className="flex h-10 items-center justify-center gap-1 rounded-lg bg-[#FFDEA4] text-sm font-bold text-[#261900]"
            >
              {vm.insight.cta}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => vm.onSelectType("finance")}
              className="flex h-10 items-center justify-center gap-1 rounded-lg bg-[#FFDEA4] text-sm font-bold text-[#261900]"
            >
              {vm.insight.cta}
            </button>
          )}
          <button
            type="button"
            onClick={() => vm.onExport("pdf")}
            className="flex h-10 items-center justify-center gap-1 rounded-lg bg-white/10 text-sm font-semibold"
          >
            Télécharger le PDF
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2">
        <KpiTile
          label="CA net"
          value={ov ? formatMad(ov.revenue.value) : "—"}
          delta={ov ? formatPct(ov.revenue.changePercent) : null}
          tone={ov?.revenue.changePercent ?? null}
          foot={ov ? `Panier ${formatMad(ov.averageTicket.value)}` : "—"}
        />
        <KpiTile
          label="RDV honorés"
          value={vm.agenda ? String(completed) : ov ? String(ov.appointments.value) : "—"}
          delta={ov ? formatPct(ov.appointments.changePercent) : null}
          tone={ov?.appointments.changePercent ?? null}
          foot={presence != null ? `Présence ${presence.toLocaleString("fr-MA")} %` : "Tous statuts hors filtre"}
        />
        <KpiTile
          label="Clientes"
          value={
            vm.customers
              ? String(vm.customers.kpis.active)
              : ov
                ? String(ov.customers.value)
                : "—"
          }
          delta={null}
          tone={null}
          foot={
            vm.customers
              ? `${vm.customers.kpis.newInPeriod} nouvelles · ${vm.customers.kpis.vip} VIP`
              : "Actives (90 j)"
          }
        />
        <KpiTile
          label="Prestations"
          value={vm.services.length ? String(vm.services.reduce((s, r) => s + r.appointments, 0)) : "—"}
          delta={null}
          tone={null}
          foot={vm.inventory ? `Stock ${formatMad(vm.inventory.stockValue)}` : "Actes réalisés"}
        />
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-bold">Rapports opérationnels</h2>
          <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
            {vm.modules.length} modules
          </span>
        </div>
        {vm.loading ? <p className="text-sm text-on-surface-variant">Chargement…</p> : null}
        {vm.modules.map((m) => {
          const active = vm.activeType === m.type;
          return (
            <button
              key={m.type}
              type="button"
              onClick={() => vm.onSelectType(m.type)}
              className={cn(
                "flex w-full flex-col gap-1.5 rounded-xl bg-white p-3 text-left shadow-sm",
                active && "ring-1 ring-primary-container",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-on-surface">{m.title}</p>
                  <p className="text-xs text-on-surface-variant">{moduleFoot(m.type, vm)}</p>
                </div>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-primary" />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-on-surface-variant">{m.badge}</span>
                <span className="font-bold text-primary">{moduleHighlight(m.type, vm)}</span>
              </div>
            </button>
          );
        })}
      </section>

      <section className="space-y-2 rounded-xl bg-surface-container-low p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-primary" />
            <h2 className="text-base font-bold">Compte de résultat</h2>
          </div>
          <span className="text-[10px] font-bold uppercase text-secondary">Période filtrée</span>
        </div>
        <Row label="CA brut encaissé" value={vm.pnl.gross != null ? formatMad(vm.pnl.gross) : "—"} />
        <Row label="Avoirs & remboursements" value={`− ${formatMad(vm.pnl.refunds)}`} muted />
        <div className="flex justify-between rounded-md bg-surface-container-high px-2 py-1.5 text-sm font-bold">
          <span>CA net réalisé</span>
          <span>{formatMad(vm.pnl.net)}</span>
        </div>
        <Row label="Dépenses d'exploitation" value={`− ${formatMad(vm.pnl.expenses)}`} muted />
        <Row label="Commissions praticiennes" value={`− ${formatMad(vm.pnl.commissions)}`} muted />
        <div className="flex items-center justify-between rounded-lg bg-primary-container p-3 text-on-primary-container">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary-fixed">Marge d&apos;exploitation</p>
            <p className="text-xl font-extrabold">{formatMad(vm.pnl.margin)}</p>
          </div>
          <span className="rounded bg-white/20 px-2 py-1 text-sm font-bold">
            {vm.pnl.marginRate != null ? `${vm.pnl.marginRate.toLocaleString("fr-MA")} %` : "—"}
          </span>
        </div>
        <p className="text-[11px] text-on-surface-variant">
          La marge = CA net − dépenses. Les commissions sont affichées à part si elles ne sont pas dans les charges.
        </p>
      </section>

      <section className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            <h2 className="text-base font-bold">Audit caisse</h2>
          </div>
        </div>
        {vm.payments.length === 0 ? (
          <p className="text-sm text-on-surface-variant">Aucun encaissement sur la période.</p>
        ) : (
          vm.payments.map((p) => (
            <div key={p.method} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="font-medium">
                  {p.label} ({p.percent.toLocaleString("fr-MA")} %)
                </span>
                <span className="font-bold">{formatMad(p.amount)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-container">
                <div className={cn("h-full rounded-full", paymentBarColor(p.method))} style={{ width: `${Math.min(100, p.percent)}%` }} />
              </div>
            </div>
          ))
        )}
      </section>

      <section className="space-y-3 rounded-xl bg-surface-container-low p-4">
        <div>
          <h2 className="text-base font-bold">Trajectoire &amp; top ventes</h2>
          <p className="text-xs font-semibold text-secondary">
            {occ != null ? `Occupation cabines ${occ} %` : "Évolution du CA net"}
          </p>
        </div>
        {vm.bars.length === 0 ? (
          <p className="text-sm text-on-surface-variant">Pas encore de points journaliers.</p>
        ) : (
          <div className="flex h-28 items-end justify-between gap-1 rounded-lg bg-white px-2 pb-1 pt-4">
            {vm.bars.map((b) => (
              <div key={b.key} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <div
                  className="w-5 rounded-t-sm bg-primary-container"
                  style={{ height: `${Math.round((b.heightPct / 100) * 72)}px` }}
                />
                <span className="max-w-full truncate text-[9px] font-semibold text-on-surface-variant">{b.label}</span>
              </div>
            ))}
          </div>
        )}
        <div className="space-y-1.5">
          {vm.top.slice(0, 3).map((item, i) => (
            <div key={item.key} className="flex items-center justify-between rounded-lg bg-white p-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary-fixed text-[10px] font-extrabold text-on-secondary-fixed">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{item.name}</p>
                  <p className="text-xs text-on-surface-variant">{item.subtitle}</p>
                </div>
              </div>
              <span className="shrink-0 text-sm font-bold text-primary">{formatMad(item.revenue)}</span>
            </div>
          ))}
        </div>
      </section>

      {vm.staffRows.length > 0 ? (
        <section className="space-y-2 rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold">Performances &amp; commissions</h2>
            <span className="text-[11px] font-semibold text-on-surface-variant">
              {vm.staffRows.length} praticienne{vm.staffRows.length > 1 ? "s" : ""}
            </span>
          </div>
          {vm.staffRows.map((s) => (
            <div key={s.staffId} className="flex items-center justify-between gap-2 rounded-lg bg-surface-container-low p-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container text-xs font-bold text-on-primary-container">
                  {initials(s.staffName)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{s.staffName}</p>
                  <p className="text-xs text-on-surface-variant">
                    {s.appointments} RDV · {formatMad(s.revenue)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-on-surface-variant">Commission</p>
                <p className="text-sm font-bold text-primary">{formatMad(s.commission)}</p>
              </div>
            </div>
          ))}
          {vm.canCommissions ? (
            <Link href="/commissions/" className="block text-center text-sm font-semibold text-primary">
              Ouvrir le module commissions
            </Link>
          ) : null}
        </section>
      ) : null}

      <section className="space-y-3 rounded-xl bg-surface-container-low p-4">
        <h2 className="text-base font-bold">Transmission des livrables</h2>
        <p className="text-xs text-on-surface-variant">
          Pas d&apos;envoi automatique vers un expert-comptable. L&apos;export télécharge le module actuellement sélectionné (
          {vm.activeType}).
        </p>
        <div className="grid grid-cols-3 gap-1">
          <button type="button" onClick={() => vm.onExport("pdf")} className="h-10 rounded-lg bg-primary-container text-xs font-bold text-on-primary-container">
            PDF
          </button>
          <button type="button" onClick={() => vm.onExport("xlsx")} className="h-10 rounded-lg bg-white text-xs font-bold">
            Excel
          </button>
          <button type="button" onClick={() => vm.onExport("csv")} className="h-10 rounded-lg bg-white text-xs font-bold">
            CSV
          </button>
        </div>
        <button
          type="button"
          onClick={vm.onAuto}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-ink text-sm font-bold text-white"
        >
          <RefreshCw className="h-4 w-4" />
          Options d&apos;automatisation
        </button>
        <div className="space-y-1 text-center text-[11px] text-on-surface-variant">
          <p>Exports générés à la demande — aucune empreinte SHA-256 inventée.</p>
          {vm.giftBalance != null ? <p>En-cours cartes cadeaux : {formatMad(vm.giftBalance)}</p> : null}
          {vm.reviews ? (
            <p className="flex items-center justify-center gap-1 font-semibold text-secondary">
              <Star className="h-3 w-3" /> {reviewScoreLabel(vm.reviews)}
            </p>
          ) : null}
        </div>
      </section>

    </div>
  );
}

function KpiTile({
  label,
  value,
  delta,
  tone,
  foot,
}: {
  label: string;
  value: string;
  delta: string | null;
  tone: number | null;
  foot: string;
}) {
  return (
    <div className="flex flex-col justify-between rounded-xl bg-surface-container-low p-3 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{label}</p>
      <p className="mt-1 text-lg font-extrabold leading-tight text-on-surface">{value}</p>
      {delta ? <p className={cn("text-[11px] font-bold", deltaClass(tone))}>{delta}</p> : null}
      <p className="mt-1 text-xs text-on-surface-variant">{foot}</p>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={cn("flex justify-between py-1 text-sm", muted && "text-on-surface-variant")}>
      <span>{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function moduleFoot(type: ReportTypeLike, vm: ReportsViewModel): string {
  if (type === "finance") {
    return `CA brut ${vm.pnl.gross != null ? formatMad(vm.pnl.gross) : "—"} · charges ${formatMad(vm.pnl.expenses)}`;
  }
  if (type === "agenda") {
    const done = statusCount(vm.agenda, "COMPLETED");
    const cancel = statusCount(vm.agenda, "CANCELLED");
    return vm.agenda ? `${vm.agenda.total} RDV · ${done} terminés · ${cancel} annulations` : "Flux cabines";
  }
  if (type === "customers" && vm.customers) {
    return `${vm.customers.kpis.total} inscrites · ${vm.customers.kpis.active} actives`;
  }
  if (type === "staff" && vm.staffRows[0]) {
    return `Top ${vm.staffRows[0].staffName} · ${formatMad(vm.staffRows[0].revenue)}`;
  }
  if (type === "services" && vm.services[0]) {
    const share = serviceShare(vm.services[0], vm.services.reduce((s, r) => s + r.revenue, 0));
    return `${vm.services[0].serviceName}${share != null ? ` · ${share} %` : ""}`;
  }
  if (type === "inventory" && vm.inventory) {
    return `Valeur ${formatMad(vm.inventory.stockValue)} · ${vm.inventory.lowStockCount} alertes`;
  }
  return "";
}

function moduleHighlight(type: ReportTypeLike, vm: ReportsViewModel): string {
  if (type === "finance") return formatMad(vm.pnl.margin);
  if (type === "agenda" && vm.agenda?.noShow.rate != null) {
    return `No-show ${vm.agenda.noShow.rate.toLocaleString("fr-MA")} %`;
  }
  if (type === "customers" && vm.customers) return `${vm.customers.kpis.vip} VIP`;
  if (type === "staff") {
    const c = vm.staffRows.reduce((s, r) => s + r.commission, 0);
    return formatMad(c);
  }
  if (type === "services") {
    const m = avgServiceMargin(vm.services);
    return m != null ? `Marge ${m.toLocaleString("fr-MA")} %` : "—";
  }
  if (type === "inventory" && vm.inventory) {
    return `Pertes ${formatMad(vm.inventory.lossesValue)}`;
  }
  return "Ouvrir";
}

type ReportTypeLike = ReportsViewModel["activeType"];
