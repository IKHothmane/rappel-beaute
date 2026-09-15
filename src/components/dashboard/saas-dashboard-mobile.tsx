"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Headphones,
  MessageCircle,
  Package,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { formatMad, formatPct } from "@/modules/analytics/service";
import { APPOINTMENT_STATUS_LABEL } from "@/modules/appointments/constants";
import { cn } from "@/lib/utils";
import type { AnalyticsPeriodPreset } from "@/lib/analytics/period";
import type { Appointment } from "@/types/appointment";
import type {
  AnalyticsOverview,
  AppointmentAnalytics,
  CustomerAnalytics,
  StaffAnalyticsRow,
} from "@/types/analytics";
import type { CashRegisterState } from "@/types/finance";
import type { StockKpis } from "@/types/inventory";

export type DashboardPeriodKey = Extract<AnalyticsPeriodPreset, "today" | "week" | "month" | "year">;

const PERIODS: { key: DashboardPeriodKey; label: string }[] = [
  { key: "today", label: "Aujourd'hui" },
  { key: "week", label: "Cette semaine" },
  { key: "month", label: "Ce mois" },
  { key: "year", label: `Année ${new Date().getFullYear()}` },
];

function aptPhase(apt: Appointment, imminentIds: Set<string>) {
  if (apt.status === "COMPLETED") return { time: "Terminé", badge: APPOINTMENT_STATUS_LABEL[apt.status] };
  if (apt.status === "IN_PROGRESS") return { time: "En cours", badge: "Confirmé" };
  if (imminentIds.has(apt.id)) return { time: "Bientôt", badge: "Arrivée imminente" };
  return { time: "Prévu", badge: APPOINTMENT_STATUS_LABEL[apt.status] };
}

export type SaasDashboardMobileProps = {
  firstName: string;
  orgName: string;
  todayLabel: string;
  period: DashboardPeriodKey;
  onPeriodChange: (p: DashboardPeriodKey) => void;
  loading: boolean;
  error: string | null;
  activeStaff: number;
  resourceCount: number;
  todayCount: number;
  imminent: Appointment[];
  billable: { remaining: number; count: number };
  stockAlerts: number;
  openTickets: number;
  platformReplyTickets: number;
  overview: AnalyticsOverview | null;
  customers: CustomerAnalytics | null;
  cash: CashRegisterState | null;
  appointments: Appointment[];
  staffRows: StaffAnalyticsRow[];
  stock: StockKpis | null;
  appointmentsAnalytics: AppointmentAnalytics | null;
};

export function SaasDashboardMobile(props: SaasDashboardMobileProps) {
  const {
    firstName,
    orgName,
    todayLabel,
    period,
    onPeriodChange,
    loading,
    error,
    activeStaff,
    resourceCount,
    todayCount,
    imminent,
    billable,
    stockAlerts,
    openTickets,
    platformReplyTickets,
    overview,
    customers,
    cash,
    appointments,
    staffRows,
    stock,
    appointmentsAnalytics,
  } = props;

  const actionCount = [
    todayCount > 0,
    imminent.length > 0,
    billable.count > 0,
    stockAlerts > 0,
    openTickets > 0,
  ].filter(Boolean).length;
  const session = cash?.session;
  const payments = session?.paymentsToday;
  const maxStaffRev = Math.max(1, ...staffRows.map((s) => s.revenue));
  const normalStock = stock
    ? Math.max(0, stock.activeCount - stock.lowStockCount - stock.outOfStockCount)
    : 0;
  const totalStock = Math.max(1, stock?.activeCount ?? 1);
  const imminentIds = new Set(imminent.map((a) => a.id));
  const peak = peakWeekday(appointmentsAnalytics);
  const pct = overview?.revenue.changePercent;
  const stockWarn = (stock?.outOfStockCount ?? 0) + (stock?.lowStockCount ?? 0);

  return (
    <div className="flex flex-col gap-5 lg:hidden">
      <section className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-[28px] font-bold leading-9 tracking-tight text-ink">
              Bonjour {firstName} 👋
            </h1>
            <p className="mt-1 flex items-center gap-1.5 text-[13px] capitalize text-ink/50">
              <CalendarDays size={14} />
              {todayLabel}
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#FBF4F6] px-2.5 py-1 text-[11px] font-bold text-gold shadow-sm">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
            Direct
          </span>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-[#FFF1F6] p-3 shadow-sm">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-primary">
              <Store size={14} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">
                {resourceCount > 0
                  ? `${resourceCount} ressource${resourceCount > 1 ? "s" : ""} active${resourceCount > 1 ? "s" : ""}`
                  : orgName}
              </p>
              <p className="truncate text-[11px] text-ink/50">
                {activeStaff} praticienne{activeStaff > 1 ? "s" : ""} active{activeStaff > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <Star size={14} className="shrink-0 fill-gold text-gold" />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => onPeriodChange(p.key)}
              className={cn(
                "whitespace-nowrap rounded-full px-4 py-2 text-sm shadow-sm transition",
                period === p.key
                  ? "bg-primary font-semibold text-white"
                  : "bg-white text-ink/55 hover:text-primary",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">À faire aujourd&apos;hui</h2>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
            {loading ? "…" : `${actionCount} action${actionCount > 1 ? "s" : ""}`}
          </span>
        </div>
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <MobileActionCard
            href="/agenda/"
            kicker="Planning"
            title={loading ? "…" : `${todayCount} RDV`}
            subtitle="Prévus pour la journée"
            cta="Voir planning"
            icon={CalendarCheck}
          />
          <MobileActionCard
            href="/agenda/"
            kicker="< 2h"
            kickerAccent
            title={loading ? "…" : `${imminent.length} soin${imminent.length > 1 ? "s" : ""}`}
            subtitle="Cabines à préparer"
            cta="Préparer"
            icon={Clock3}
          />
          <MobileActionCard
            href="/cash-register/"
            kicker={`${billable.count} solde${billable.count > 1 ? "s" : ""}`}
            title={loading ? "…" : formatMad(billable.remaining)}
            subtitle="En attente paiement"
            cta="Encaisser"
            icon={Wallet}
            primaryCta
          />
          <MobileActionCard
            href="/inventory/"
            kicker={stockAlerts > 0 ? "Urgent" : "Stock"}
            kickerDanger={stockAlerts > 0}
            title={loading ? "…" : `${stockAlerts} produit${stockAlerts > 1 ? "s" : ""}`}
            subtitle="Stock sous seuil min."
            cta="Commander"
            icon={Package}
          />
          <MobileActionCard
            href={platformReplyTickets > 0 ? "/whatsapp/" : "/support/"}
            kicker="VIP"
            dark
            title={loading ? "…" : `${openTickets} message${openTickets > 1 ? "s" : ""}`}
            subtitle={platformReplyTickets > 0 ? "Réponse reçue" : "Support"}
            cta={platformReplyTickets > 0 ? "Répondre" : "Ouvrir"}
            icon={Headphones}
          />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Indicateurs clés</h2>
          <span className="text-[11px] text-ink/45">
            {period === "today"
              ? "Aujourd'hui"
              : period === "week"
                ? "Cette semaine"
                : period === "year"
                  ? "Année"
                  : "Mois en cours"}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <MobileKpi
            label="CA"
            value={loading ? "…" : (overview?.revenue.value ?? 0).toLocaleString("fr-MA")}
            unit="MAD"
            change={formatPct(overview?.revenue.changePercent ?? null)}
          />
          <MobileKpi
            label="Soins réalisés"
            value={loading ? "…" : String(overview?.appointments.value ?? 0)}
            unit="soins"
            change={formatPct(overview?.appointments.changePercent ?? null)}
          />
          <MobileKpi
            label="Clientes actives"
            value={loading ? "…" : String(customers?.kpis.active ?? overview?.customers.value ?? 0)}
            unit="profils"
            change={
              customers ? `+${customers.kpis.newInPeriod} nouv.` : formatPct(overview?.customers.changePercent ?? null)
            }
          />
          <MobileKpi
            label="Panier moyen"
            value={loading ? "…" : Math.round(overview?.averageTicket.value ?? 0).toLocaleString("fr-MA")}
            unit="MAD"
            change={formatPct(overview?.averageTicket.changePercent ?? null)}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-xl bg-[#FFF1F6] p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-primary shadow-sm">
              <Wallet size={16} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-ink">Caisse du jour</h2>
              <p className="text-[11px] text-ink/45">
                {session?.status === "OPEN" ? "Session ouverte" : "Aucune session ouverte"}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-primary">{formatMad(payments?.total ?? 0)}</p>
            <p className="text-[11px] text-ink/45">Total encaissé</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <PayChip label="Espèces" value={formatMad(payments?.cash ?? 0)} />
          <PayChip label="Carte" value={formatMad(payments?.card ?? 0)} />
          <PayChip label="Virement" value={formatMad(payments?.transfer ?? 0)} />
        </div>
        <div className="flex items-center justify-between rounded-lg bg-white/80 px-2.5 py-2 text-[13px]">
          <span className="text-red-600">Dépenses : −{formatMad(session?.cashOut ?? 0)}</span>
          <span className="font-semibold text-ink">
            Tiroir : <span className="font-bold text-primary">{formatMad(session?.theoreticalBalance ?? 0)}</span>
          </span>
        </div>
        <Link
          href="/cash-register/"
          className="flex items-center justify-center rounded-lg bg-white py-2.5 text-sm font-semibold text-ink"
        >
          Gérer la caisse / Clôture
        </Link>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">Rendez-vous du jour</h2>
            <p className="text-[11px] text-ink/45">Séquence chronologique</p>
          </div>
          <Link href="/agenda/" className="flex items-center text-xs font-semibold text-primary">
            Agenda complet
            <ArrowRight size={12} />
          </Link>
        </div>
        {loading ? (
          <p className="text-sm text-ink/45">Chargement…</p>
        ) : appointments.length === 0 ? (
          <p className="rounded-xl bg-white p-4 text-sm text-ink/45 shadow-sm">
            Aucun rendez-vous aujourd&apos;hui.
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {appointments.map((apt) => {
              const phase = aptPhase(apt, imminentIds);
              const soon = imminentIds.has(apt.id);
              const time = new Date(apt.startAt).toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Africa/Casablanca",
              });
              return (
                <div
                  key={apt.id}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-xl bg-white p-3.5 shadow-sm",
                    soon && "border-l-4 border-l-primary",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={cn(
                        "flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg",
                        soon ? "bg-primary/10 text-primary" : "bg-[#FBF4F6] text-primary",
                      )}
                    >
                      <span className="text-sm font-bold">{time}</span>
                      <span className={cn("text-[10px]", soon ? "font-bold text-primary" : "text-ink/45")}>
                        {phase.time}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">
                        {apt.customerName.trim() || "Cliente"}
                      </p>
                      <p className="truncate text-[13px] text-ink/50">
                        {apt.serviceName || "Prestation"} • {apt.staffName || "Équipe"}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px]",
                            soon ? "bg-primary font-semibold text-white" : "bg-[#FBF4F6] text-ink/55",
                          )}
                        >
                          {phase.badge}
                        </span>
                        <span className="text-[11px] font-bold text-gold">
                          {apt.price.toLocaleString("fr-MA")} MAD
                        </span>
                      </div>
                    </div>
                  </div>
                  <Link
                    href="/agenda/"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFF1F6] text-ink/50"
                    aria-label="Ouvrir l'agenda"
                  >
                    <MessageCircle size={14} />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <Sparkles size={16} className="text-gold" />
          <h2 className="text-lg font-semibold text-ink">Intelligence &amp; conseils</h2>
        </div>
        <div className="flex flex-col gap-2.5">
          {pct != null ? (
            <InsightCard
              label="Croissance"
              text={
                pct > 0
                  ? `Votre CA a augmenté de ${pct.toFixed(1)} % par rapport à la période précédente.`
                  : pct < 0
                    ? `Votre CA est en baisse de ${Math.abs(pct).toFixed(1)} % par rapport à la période précédente.`
                    : "Votre CA est stable par rapport à la période précédente."
              }
            />
          ) : (
            <InsightCard label="Pilotage" text="Suivez l’activité de votre institut en temps réel." />
          )}
          {peak ? (
            <InsightCard
              label="Journée star"
              gold
              text={`Le ${peak.label} est votre créneau le plus chargé (${peak.count} RDV sur la semaine).`}
            />
          ) : null}
          {stockWarn > 0 ? (
            <InsightCard
              label="Alerte stock"
              danger
              text={`${stockWarn} produit${stockWarn > 1 ? "s" : ""} sous seuil ou en rupture.`}
            />
          ) : null}
          {customers?.retention.retentionRate != null ? (
            <InsightCard
              label="Fidélité"
              text={`${customers.retention.returning} clientes récurrentes (${customers.retention.retentionRate} % de rétention).`}
            />
          ) : null}
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-ink">Performance de l&apos;équipe</h2>
          <p className="text-[11px] text-ink/45">Chiffre généré et commissions</p>
        </div>
        {staffRows.length === 0 ? (
          <p className="text-sm text-ink/45">Pas encore de performance sur la période.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {staffRows.map((row, i) => (
              <div key={row.staffId} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold",
                        i === 0 ? "bg-primary/10 text-primary" : "bg-[#FBF4F6] text-ink/60",
                      )}
                    >
                      {row.staffName.charAt(0)}
                    </span>
                    <span className="text-sm font-semibold text-ink">{row.staffName}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-ink">{formatMad(row.revenue)}</p>
                    <p className="text-[11px] text-gold">Com. {formatMad(row.commission)}</p>
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#FBF4F6]">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.round((row.revenue / maxStaffRev) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">Santé du stock</h2>
            <span className="text-[11px] text-ink/45">{stock ? `${stock.productCount} références` : "—"}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-[#FBF4F6] p-2">
              <p className="text-xl font-bold text-ink">{normalStock}</p>
              <p className="mt-0.5 text-[11px] text-ink/50">Normaux</p>
            </div>
            <div className="rounded-lg bg-[#FFF1D6]/70 p-2">
              <p className="text-xl font-bold text-gold">{stock?.lowStockCount ?? 0}</p>
              <p className="mt-0.5 text-[11px] text-gold">Faibles</p>
            </div>
            <div className="rounded-lg bg-red-50 p-2">
              <p className="text-xl font-bold text-red-600">{stock?.outOfStockCount ?? 0}</p>
              <p className="mt-0.5 text-[11px] text-red-600">Critiques</p>
            </div>
          </div>
          <div className="flex h-2 overflow-hidden rounded-full bg-[#FBF4F6]">
            <div className="h-full bg-[#E4BDC2]" style={{ width: `${(normalStock / totalStock) * 100}%` }} />
            <div className="h-full bg-gold" style={{ width: `${((stock?.lowStockCount ?? 0) / totalStock) * 100}%` }} />
            <div className="h-full bg-primary" style={{ width: `${((stock?.outOfStockCount ?? 0) / totalStock) * 100}%` }} />
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-xl bg-[#FFF1F6] p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink">Rétention &amp; no-show</h2>
              <p className="text-[11px] text-ink/45">Rappels WhatsApp</p>
            </div>
            <span className="text-sm font-bold text-primary">
              {appointmentsAnalytics?.noShow.rate != null ? `${appointmentsAnalytics.noShow.rate} %` : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg bg-white p-3 shadow-sm">
            <div>
              <p className="text-[11px] text-ink/45">Clientes actives</p>
              <p className="text-xl font-bold text-primary">{customers?.kpis.active ?? 0}</p>
            </div>
            <div className="h-8 w-px bg-line" />
            <div className="text-right">
              <p className="text-[11px] text-ink/45">Absences recensées</p>
              <p className="text-xl font-semibold text-ink">{appointmentsAnalytics?.noShow.count ?? 0}</p>
            </div>
          </div>
          <p className="flex items-center gap-1.5 text-[13px] text-ink/55">
            <CheckCircle2 size={14} className="text-gold" />
            {customers?.retention.retentionRate != null
              ? `Taux de rétention ${customers.retention.retentionRate} %.`
              : "Les rappels WhatsApp réduisent les absences."}
          </p>
        </div>
      </section>
    </div>
  );
}

function peakWeekday(analytics: AppointmentAnalytics | null) {
  if (!analytics?.heatmap.length) return null;
  const days = [
    { dow: 1, label: "lundi" },
    { dow: 2, label: "mardi" },
    { dow: 3, label: "mercredi" },
    { dow: 4, label: "jeudi" },
    { dow: 5, label: "vendredi" },
    { dow: 6, label: "samedi" },
  ];
  const totals = days.map((d) => ({
    ...d,
    count: analytics.heatmap.filter((c) => c.weekday === d.dow).reduce((s, c) => s + c.count, 0),
  }));
  const best = totals.reduce((a, b) => (b.count > a.count ? b : a));
  return best.count > 0 ? best : null;
}

function MobileActionCard({
  href,
  kicker,
  title,
  subtitle,
  cta,
  icon: Icon,
  kickerAccent,
  kickerDanger,
  primaryCta,
  dark,
}: {
  href: string;
  kicker: string;
  title: string;
  subtitle: string;
  cta: string;
  icon: typeof CalendarCheck;
  kickerAccent?: boolean;
  kickerDanger?: boolean;
  primaryCta?: boolean;
  dark?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex w-48 shrink-0 flex-col justify-between gap-3 rounded-xl p-3.5 shadow-sm",
        dark ? "bg-institut text-white" : "bg-white",
      )}
    >
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            dark ? "bg-gold text-institut" : "bg-[#FBF4F6] text-primary",
          )}
        >
          <Icon size={16} />
        </div>
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[11px] font-semibold",
            dark
              ? "text-gold"
              : kickerDanger
                ? "bg-red-50 text-red-600"
                : kickerAccent
                  ? "bg-[#FFF1D6] text-gold"
                  : "text-ink/45",
          )}
        >
          {kicker}
        </span>
      </div>
      <div>
        <p className={cn("text-[22px] font-semibold leading-7", dark ? "text-white" : "text-ink")}>{title}</p>
        <p className={cn("text-[13px]", dark ? "text-white/60" : "text-ink/50")}>{subtitle}</p>
      </div>
      <Link
        href={href}
        className={cn(
          "flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-semibold",
          dark ? "bg-gold text-institut" : primaryCta ? "bg-primary text-white" : "bg-[#FBF4F6] text-primary",
        )}
      >
        {cta}
        <ArrowRight size={12} />
      </Link>
    </div>
  );
}

function MobileKpi({ label, value, unit, change }: { label: string; value: string; unit: string; change: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-white p-3.5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-ink/45">{label}</span>
        <ShoppingBag size={14} className="text-primary" />
      </div>
      <p className="text-[22px] font-semibold leading-7 text-ink">
        {value} <span className="text-[11px] font-medium text-ink/45">{unit}</span>
      </p>
      <p className="flex items-center gap-1 text-[11px] font-semibold text-primary">
        <TrendingUp size={12} />
        {change}
      </p>
    </div>
  );
}

function PayChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-2.5 text-center shadow-sm">
      <span className="block text-[11px] text-ink/45">{label}</span>
      <span className="text-sm font-semibold text-ink">{value}</span>
    </div>
  );
}

function InsightCard({
  label,
  text,
  gold,
  danger,
}: {
  label: string;
  text: string;
  gold?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-white p-3.5 shadow-sm">
      <div
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          danger ? "bg-red-50 text-red-600" : gold ? "bg-[#FFF1D6] text-gold" : "bg-[#FBF4F6] text-primary",
        )}
      >
        {danger ? <Package size={14} /> : gold ? <Star size={14} /> : <TrendingUp size={14} />}
      </div>
      <div className="min-w-0 flex-1">
        <span
          className={cn(
            "inline-block rounded px-2 py-0.5 text-[11px] font-bold",
            danger ? "bg-red-50 text-red-600" : gold ? "bg-[#FFF1D6] text-gold" : "bg-primary/10 text-primary",
          )}
        >
          {label}
        </span>
        <p className="mt-1 text-[13px] leading-5 text-ink">{text}</p>
      </div>
    </div>
  );
}
