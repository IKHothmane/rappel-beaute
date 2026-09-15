"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Bath,
  CalendarCheck2,
  CalendarDays,
  CircleDollarSign,
  Download,
  IdCard,
  Landmark,
  Lock,
  Package,
  RefreshCw,
  Scale,
  Send,
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
  initials,
  paymentBarColor,
  presenceRate,
  reviewScoreLabel,
  serviceShare,
  statusCount,
  type ModuleCardDef,
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
      <section className="flex flex-col gap-2 pt-1">
        <div className="flex flex-wrap items-center gap-1">
          <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
            <Lock className="h-3 w-3 text-primary" />
            {vm.roleLabel}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
            <BadgeCheck className="h-3 w-3 text-secondary" />
            Données live
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary-container px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-secondary-container">
            <Scale className="h-3 w-3" />
            CNDP Loi 09-08
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="font-headline-sm text-[22px] font-semibold tracking-tight text-on-surface">
            Rapports &amp; Audit Financier
          </h1>
          <p className="text-sm leading-relaxed text-on-surface-variant">
            Générez, analysez et exportez les rapports comptables et opérationnels consolidés en dirhams (MAD).
          </p>
        </div>
        <div className="pt-1">
          <button
            type="button"
            onClick={() => vm.onExport("pdf")}
            className="flex h-12 w-full items-center justify-between rounded-lg bg-primary-container px-4 text-on-primary-container shadow-md transition-all active:scale-[0.99]"
          >
            <span className="flex items-center gap-2 text-sm font-bold">
              <Download className="h-5 w-5" />
              Exporter le Rapport
            </span>
            <span className="flex items-center gap-1 text-[10px] font-bold">
              <span className="rounded bg-white/20 px-1.5 py-0.5">PDF</span>
              <span className="rounded bg-white/20 px-1.5 py-0.5">XLSX</span>
              <span className="rounded bg-white/20 px-1.5 py-0.5">CSV</span>
            </span>
          </button>
        </div>
      </section>

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
              vm.compare ? "bg-surface-container text-secondary" : "bg-white text-on-surface-variant",
            )}
          >
            {vm.compare ? vm.compareLabel : "Comparer"}
          </button>
        </div>
        <div className="flex gap-1.5 overflow-x-auto py-1">
          {PRESET_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => vm.onPreset(o.value)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold shadow-sm",
                vm.preset === o.value
                  ? "bg-primary-container text-on-primary-container"
                  : "bg-white text-on-surface",
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
        <div className="flex items-center justify-between pt-0.5 text-[11px] text-on-surface-variant">
          <span className="flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-secondary" />
            Actualisé à {vm.generatedAt} — Casablanca
          </span>
          <button type="button" onClick={vm.onRefresh} className="font-medium text-primary">
            Rafraîchir
          </button>
        </div>
        {vm.scopeNote ? <p className="text-[11px] text-on-surface-variant">{vm.scopeNote}</p> : null}
      </section>

      <section className="relative overflow-hidden rounded-xl bg-ink p-4 text-[#FEECF7] shadow-lg">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-5 w-5 text-[#FFDEA4]" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#FFDEA4]">
              Audit Live · {PRESET_OPTIONS.find((o) => o.value === vm.preset)?.label}
            </span>
          </div>
        </div>
        {vm.loading ? (
          <p className="text-sm text-white/70">Analyse en cours…</p>
        ) : (
          <div className="space-y-2 text-sm">
            <div className="rounded-lg bg-white/5 p-2">
              <p>{vm.insight.performance}</p>
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-error-container/20 p-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-error" />
              <p>{vm.insight.vigilance}</p>
            </div>
          </div>
        )}
        <div className="mt-3 flex flex-col gap-2">
          {vm.insight.href.startsWith("/") ? (
            <Link
              href={vm.insight.href}
              className="flex h-10 w-full items-center justify-center gap-1 rounded-lg bg-[#FFDEA4] text-sm font-bold text-[#261900] shadow-sm active:scale-[0.98]"
            >
              <Zap className="h-4 w-4" />
              {vm.insight.cta}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => vm.onSelectType("finance")}
              className="flex h-10 w-full items-center justify-center gap-1 rounded-lg bg-[#FFDEA4] text-sm font-bold text-[#261900] shadow-sm active:scale-[0.98]"
            >
              <Zap className="h-4 w-4" />
              {vm.insight.cta}
            </button>
          )}
          <button
            type="button"
            onClick={() => vm.onExport("pdf")}
            className="flex h-10 w-full items-center justify-center gap-1 rounded-lg bg-white/10 text-sm font-semibold active:bg-white/20"
          >
            Télécharger l&apos;Audit IA
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2">
        <KpiTile
          label="CA Net"
          icon={<CircleDollarSign className="h-4 w-4" />}
          iconClass="text-primary-container"
          value={ov ? ov.revenue.value.toLocaleString("fr-MA") : "—"}
          unit="DH"
          delta={ov ? formatPct(ov.revenue.changePercent) : null}
          tone={ov?.revenue.changePercent ?? null}
          foot={ov ? `Panier : ${formatMad(ov.averageTicket.value)}` : "—"}
        />
        <KpiTile
          label="RDV Honorés"
          icon={<CalendarCheck2 className="h-4 w-4" />}
          iconClass="text-secondary"
          value={vm.agenda ? String(completed) : ov ? String(ov.appointments.value) : "—"}
          unit="RDV"
          delta={ov ? formatPct(ov.appointments.changePercent) : null}
          tone={ov?.appointments.changePercent ?? null}
          foot={presence != null ? `Assiduité : ${presence.toLocaleString("fr-MA")} %` : "Tous statuts"}
        />
        <KpiTile
          label="Fréquentation"
          icon={<Users className="h-4 w-4" />}
          iconClass="text-primary"
          value={
            vm.customers
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
              ? `${vm.customers.kpis.newInPeriod} nouvelles · ${vm.customers.kpis.vip} VIP`
              : "Actives (90 j)"
          }
        />
        <KpiTile
          label="Prestations"
          icon={<Bath className="h-4 w-4" />}
          iconClass="text-secondary"
          value={vm.services.length ? String(vm.services.reduce((s, r) => s + r.appointments, 0)) : "—"}
          unit="Actes"
          delta={null}
          tone={null}
          foot={vm.inventory ? `Stock : ${formatMad(vm.inventory.stockValue)}` : "Actes réalisés"}
        />
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-bold text-on-surface">Rapports Opérationnels &amp; Modules</h2>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-secondary">
            {vm.modules.length} disponibles
          </span>
        </div>
        {vm.loading ? <p className="text-sm text-on-surface-variant">Chargement…</p> : null}
        <div className="space-y-2">
          {vm.modules.map((m) => {
            const active = vm.activeType === m.type;
            return (
              <button
                key={m.type}
                type="button"
                onClick={() => vm.onSelectType(m.type)}
                className={cn(
                  "flex w-full flex-col gap-1.5 rounded-xl bg-white p-3 text-left shadow-sm transition-colors active:bg-surface-container-low",
                  active && "ring-1 ring-primary-container",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", m.iconTone)}>
                      <ModuleIcon name={m.icon} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold leading-tight text-on-surface">{m.title}</p>
                      <p className="truncate text-xs text-on-surface-variant">{moduleFoot(m.type, vm)}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
                </div>
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className={cn("font-bold uppercase tracking-wider", m.badgeTone)}>{m.badge}</span>
                  <span className="font-bold text-primary">{moduleHighlight(m.type, vm)}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-2 rounded-xl bg-surface-container-low p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-on-surface">Compte de Résultat Clôture</h2>
          </div>
          <span className="text-[10px] font-bold uppercase text-secondary">Période filtrée</span>
        </div>
        <div className="space-y-1.5 pt-1 text-sm">
          <Row label="CA Brut Encaissé" value={vm.pnl.gross != null ? formatMad(vm.pnl.gross) : "—"} />
          <Row label="Avoirs & remboursements" value={`− ${formatMad(vm.pnl.refunds)}`} muted error />
          <div className="flex justify-between rounded bg-surface-container-high px-2 py-1.5 text-sm font-bold text-on-surface">
            <span>CA Net Réalisé</span>
            <span>{formatMad(vm.pnl.net)}</span>
          </div>
          <Row label="Dépenses d'exploitation" value={`− ${formatMad(vm.pnl.expenses)}`} muted error />
          <Row label="Commissions praticiennes" value={`− ${formatMad(vm.pnl.commissions)}`} muted error />
        </div>
        <div className="mt-2 flex items-center justify-between rounded-lg bg-primary-container p-3 text-on-primary-container shadow-md">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary-fixed">
              Excédent Brut d&apos;Exploitation
            </p>
            <p className="text-xl font-extrabold leading-tight">{formatMad(vm.pnl.margin)}</p>
          </div>
          <span className="rounded bg-white/20 px-2 py-1 text-sm font-extrabold">
            {vm.pnl.marginRate != null ? `${vm.pnl.marginRate.toLocaleString("fr-MA")} %` : "—"}
          </span>
        </div>
      </section>

      <section className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-on-surface">Audit Caisse &amp; Règlements</h2>
          </div>
        </div>
        {vm.payments.length === 0 ? (
          <p className="text-sm text-on-surface-variant">Aucun encaissement sur la période.</p>
        ) : (
          <div className="space-y-2">
            {vm.payments.map((p) => (
              <div key={p.method} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-on-surface">
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
      </section>

      <section className="space-y-3 rounded-xl bg-surface-container-low p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-on-surface">Trajectoire &amp; Top Soins</h2>
            <p className="text-xs font-semibold text-secondary">
              {occ != null ? `Occupation cabines ${occ} %` : "Évolution du CA net"}
            </p>
          </div>
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        {vm.bars.length === 0 ? (
          <p className="text-sm text-on-surface-variant">Pas encore de points journaliers.</p>
        ) : (
          <div className="flex h-28 items-end justify-between gap-1 rounded-lg bg-white px-2 pb-1 pt-4">
            {vm.bars.map((b, i) => {
              const isLast = i === vm.bars.length - 1;
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
                    className={cn("w-5 rounded-t-sm", isLast ? "bg-primary-container shadow-sm" : "bg-surface-variant")}
                    style={{ height: `${Math.round((b.heightPct / 100) * 72)}px` }}
                  />
                  <span
                    className={cn(
                      "max-w-full truncate text-[9px] font-semibold",
                      isLast ? "font-bold text-primary" : "text-on-surface-variant",
                    )}
                  >
                    {b.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <div className="space-y-1.5 pt-1">
          {vm.top.slice(0, 3).map((item, i) => (
            <div key={item.key} className="flex items-center justify-between rounded-lg bg-white p-2">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-extrabold",
                    i === 0 ? "bg-secondary-fixed text-on-secondary-fixed" : "bg-surface-container text-on-surface",
                  )}
                >
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-on-surface">{item.name}</p>
                  <p className="text-xs text-on-surface-variant">{item.subtitle}</p>
                </div>
              </div>
              <span className="shrink-0 whitespace-nowrap text-sm font-bold text-primary">{formatMad(item.revenue)}</span>
            </div>
          ))}
        </div>
      </section>

      {vm.staffRows.length > 0 ? (
        <section className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              <h2 className="text-base font-bold text-on-surface">Performances &amp; Commissions</h2>
            </div>
            <span className="text-[11px] font-semibold text-on-surface-variant">
              {vm.staffRows.length} praticienne{vm.staffRows.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="space-y-2">
            {vm.staffRows.map((s) => (
              <div
                key={s.staffId}
                className="flex items-center justify-between gap-2 rounded-lg bg-surface-container-low p-2.5"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-container text-xs font-bold text-on-primary-container shadow-sm">
                    {initials(s.staffName)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-on-surface">{s.staffName}</p>
                    <p className="text-xs text-on-surface-variant">
                      {s.appointments} RDV · CA {formatMad(s.revenue)}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[10px] text-on-surface-variant">Commission</p>
                  <p className="text-sm font-bold text-primary">{formatMad(s.commission)}</p>
                </div>
              </div>
            ))}
          </div>
          {vm.canCommissions ? (
            <Link href="/commissions/" className="block text-center text-sm font-semibold text-primary">
              Ouvrir le module commissions
            </Link>
          ) : null}
        </section>
      ) : null}

      <section className="mb-2 space-y-3 rounded-xl bg-surface-container-low p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-on-surface">Transmission des Livrables</h2>
          </div>
          <BadgeCheck className="h-5 w-5 text-secondary" />
        </div>
        <p className="text-xs text-on-surface-variant">
          Pas d&apos;envoi automatique vers un expert-comptable. L&apos;export télécharge le module actuellement
          sélectionné ({vm.activeType}).
        </p>
        <div className="grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={() => vm.onExport("pdf")}
            className="h-10 rounded-lg bg-primary-container text-xs font-bold text-on-primary-container"
          >
            PDF
          </button>
          <button
            type="button"
            onClick={() => vm.onExport("xlsx")}
            className="h-10 rounded-lg bg-white text-xs font-bold shadow-sm"
          >
            Excel
          </button>
          <button
            type="button"
            onClick={() => vm.onExport("csv")}
            className="h-10 rounded-lg bg-white text-xs font-bold shadow-sm"
          >
            CSV
          </button>
        </div>
        <button
          type="button"
          onClick={vm.onAuto}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-ink text-sm font-bold text-white shadow-sm active:scale-[0.99]"
        >
          <RefreshCw className="h-4 w-4" />
          Valider les Options d&apos;Export
        </button>
        <div className="space-y-1 border-t-0 pt-1 text-center text-[11px] text-on-surface-variant">
          <p>Exports à la demande — aucune empreinte SHA-256 inventée.</p>
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

function ModuleIcon({ name }: { name: ModuleCardDef["icon"] }) {
  const cls = "h-5 w-5";
  if (name === "finance") return <Landmark className={cls} />;
  if (name === "agenda") return <CalendarDays className={cls} />;
  if (name === "customers") return <Users className={cls} />;
  if (name === "staff") return <IdCard className={cls} />;
  if (name === "services") return <Sparkles className={cls} />;
  return <Package className={cls} />;
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
        <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{label}</span>
        <span className={iconClass}>{icon}</span>
      </div>
      <div className="space-y-0.5">
        <div className="text-[22px] font-extrabold leading-none text-on-surface">
          {value}{" "}
          <span className="text-[11px] font-semibold text-on-surface-variant">{unit}</span>
        </div>
        {delta ? (
          <p className={cn("flex items-center gap-0.5 text-[11px] font-bold", deltaClass(tone))}>{delta}</p>
        ) : null}
      </div>
      <p className="mt-2 pt-1 text-xs text-on-surface-variant">{foot}</p>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  error,
}: {
  label: string;
  value: string;
  muted?: boolean;
  error?: boolean;
}) {
  return (
    <div className={cn("flex justify-between py-1 text-sm", muted && "text-on-surface-variant")}>
      <span>{label}</span>
      <span className={cn("font-semibold", error && "font-medium text-error")}>{value}</span>
    </div>
  );
}

function moduleFoot(type: ReportTypeLike, vm: ReportsViewModel): string {
  if (type === "finance") {
    return `CA Brut ${vm.pnl.gross != null ? formatMad(vm.pnl.gross) : "—"} · Charges ${formatMad(vm.pnl.expenses)}`;
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
    const share = serviceShare(
      vm.services[0],
      vm.services.reduce((s, r) => s + r.revenue, 0),
    );
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
