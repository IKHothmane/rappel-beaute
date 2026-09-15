"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Download } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AnalyticsOverviewDashboard } from "@/components/analytics/analytics-overview-dashboard";
import { AppPageHeader, Kpi, ListRow, Tabs } from "@/components/app/AppUi";
import { useCurrentUser } from "@/components/auth/session-provider";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { getAnalyticsScope } from "@/lib/rbac";
import type { AnalyticsPeriodPreset } from "@/lib/analytics/period";
import { cn } from "@/lib/utils";
import {
  formatMad,
  getAnalyticsAppointments,
  getAnalyticsCustomers,
  getAnalyticsInventory,
  getAnalyticsLoyalty,
  getAnalyticsMarketing,
  getAnalyticsOverview,
  getAnalyticsRevenue,
  getAnalyticsReviews,
  getAnalyticsServices,
  getAnalyticsStaff,
} from "@/modules/analytics/service";
import { openReportExport } from "@/modules/reports/service";
import type { ExportFormat } from "@/types/reports";
import type {
  AnalyticsOverview,
  AppointmentAnalytics,
  CustomerAnalytics,
  InventoryAnalytics,
  LoyaltyAnalytics,
  AIMarketingAnalyticsSummary,
  MarketingAnalyticsRow,
  PostVisitAnalyticsSummary,
  RevenueAnalytics,
  ReviewAnalytics,
  ServiceAnalyticsRow,
  StaffAnalyticsRow,
} from "@/types/analytics";

const PRESET_OPTIONS: { value: AnalyticsPeriodPreset; label: string }[] = [
  { value: "today", label: "Aujourd'hui" },
  { value: "week", label: "Cette semaine" },
  { value: "month", label: "Ce mois" },
  { value: "prev_month", label: "Mois précédent" },
  { value: "year", label: "Cette année" },
];

const ALL_TABS = [
  "Vue d'ensemble",
  "Revenus",
  "Clientes",
  "Agenda",
  "Services",
  "Employées",
  "Stock",
  "Marketing",
  "Fidélité",
  "Avis",
] as const;

function occupationClass(level: "high" | "medium" | "low"): string {
  if (level === "high") return "text-green-700";
  if (level === "medium") return "text-amber-600";
  return "text-red-600";
}

export function AnalyticsPageView() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const scope = getAnalyticsScope(user.role);
  const exportRef = useRef<HTMLDivElement>(null);

  const tabs = useMemo(() => {
    if (scope === "cash_only") return ["Revenus"];
    if (scope === "staff_self") return ["Vue d'ensemble", "Revenus", "Agenda", "Employées"];
    return [...ALL_TABS];
  }, [scope]);

  const [tab, setTab] = useState(tabs[0]);
  const [preset, setPreset] = useState<AnalyticsPeriodPreset>("month");
  const [compare, setCompare] = useState(true);
  const [loading, setLoading] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);

  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [revenue, setRevenue] = useState<RevenueAnalytics | null>(null);
  const [customers, setCustomers] = useState<CustomerAnalytics | null>(null);
  const [appointments, setAppointments] = useState<AppointmentAnalytics | null>(null);
  const [services, setServices] = useState<ServiceAnalyticsRow[]>([]);
  const [staff, setStaff] = useState<StaffAnalyticsRow[]>([]);
  const [inventory, setInventory] = useState<InventoryAnalytics | null>(null);
  const [marketing, setMarketing] = useState<MarketingAnalyticsRow[]>([]);
  const [postVisit, setPostVisit] = useState<PostVisitAnalyticsSummary | null>(null);
  const [aiMarketing, setAiMarketing] = useState<AIMarketingAnalyticsSummary | null>(null);
  const [loyalty, setLoyalty] = useState<LoyaltyAnalytics | null>(null);
  const [reviews, setReviews] = useState<ReviewAnalytics | null>(null);

  const filters = useMemo(() => ({ preset, compare }), [preset, compare]);
  const periodLabel = PRESET_OPTIONS.find((o) => o.value === preset)?.label ?? "Cette période";

  const refresh = useCallback(async () => {
    if (!scope) return;
    try {
      if (tab === "Vue d'ensemble") {
        const [ov, rev, appt, cust, svc, stf, inv, mkt] = await Promise.all([
          getAnalyticsOverview(filters),
          getAnalyticsRevenue(filters),
          getAnalyticsAppointments(filters),
          getAnalyticsCustomers(filters),
          getAnalyticsServices(filters),
          getAnalyticsStaff(filters),
          getAnalyticsInventory(filters),
          getAnalyticsMarketing(filters),
        ]);
        setOverview(ov);
        setRevenue(rev);
        setAppointments(appt);
        setCustomers(cust);
        setServices(svc.items);
        setStaff(stf.items);
        setInventory(inv);
        setMarketing(mkt.items);
        setPostVisit(mkt.postVisit ?? null);
        setAiMarketing(mkt.aiMarketing ?? null);
      } else if (tab === "Revenus") {
        setRevenue(await getAnalyticsRevenue(filters));
      } else if (tab === "Clientes") {
        setCustomers(await getAnalyticsCustomers(filters));
      } else if (tab === "Agenda") {
        setAppointments(await getAnalyticsAppointments(filters));
      } else if (tab === "Services") {
        setServices((await getAnalyticsServices(filters)).items);
      } else if (tab === "Employées") {
        setStaff((await getAnalyticsStaff(filters)).items);
      } else if (tab === "Stock") {
        setInventory(await getAnalyticsInventory(filters));
      } else if (tab === "Marketing") {
        const m = await getAnalyticsMarketing(filters);
        setMarketing(m.items);
        setPostVisit(m.postVisit ?? null);
        setAiMarketing(m.aiMarketing ?? null);
      } else if (tab === "Fidélité") {
        setLoyalty(await getAnalyticsLoyalty(filters));
      } else if (tab === "Avis") {
        setReviews(await getAnalyticsReviews(filters));
      }
    } catch {
      toast("Impossible de charger les analytics.", "error");
    }
  }, [tab, filters, scope, toast]);

  useEffect(() => {
    if (!scope) return;
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh, scope]);

  useEffect(() => {
    if (!tabs.includes(tab as (typeof tabs)[number])) {
      setTab(tabs[0]);
    }
  }, [tabs, tab]);

  useEffect(() => {
    if (!exportOpen) return;
    function onDoc(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [exportOpen]);

  function handleExport(format: ExportFormat) {
    openReportExport("global", format, filters);
    setExportOpen(false);
    toast(`Export ${format.toUpperCase()} lancé.`, "success");
  }

  if (!scope) {
    return (
      <div className="surface p-8 text-center text-sm text-ink/50">
        Vous n&apos;avez pas accès aux analytics.
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <AppPageHeader
          title="Analytics"
          description="Analysez les performances de votre institut."
        />
        <div className="relative" ref={exportRef}>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setExportOpen((o) => !o)}
          >
            <Download size={16} />
            Exporter
          </Button>
          {exportOpen ? (
            <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-soft">
              {(
                [
                  ["pdf", "PDF"],
                  ["xlsx", "Excel"],
                  ["csv", "CSV"],
                ] as const
              ).map(([fmt, label]) => (
                <button
                  key={fmt}
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-primary-light/40"
                  onClick={() => handleExport(fmt)}
                >
                  {label}
                </button>
              ))}
              <Link
                href="/reports/"
                className="block border-t border-line px-3 py-2 text-sm text-primary hover:bg-primary-light/40"
                onClick={() => setExportOpen(false)}
              >
                Rapports détaillés
              </Link>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-2">
        {PRESET_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => setPreset(o.value)}
            className={cn(
              "rounded-xl px-3 py-2 text-sm font-medium transition",
              preset === o.value
                ? "bg-ink text-white"
                : "border border-line bg-white text-ink/70 hover:border-primary/30",
            )}
          >
            {o.label}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 pb-1 text-sm">
          <input
            type="checkbox"
            checked={compare}
            onChange={(e) => setCompare(e.target.checked)}
            className="size-4 rounded border-line"
          />
          Comparer à la période précédente
        </label>
        {scope === "staff_self" ? (
          <p className="w-full text-xs text-ink/45">Vue limitée à vos performances.</p>
        ) : null}
      </div>

      <Tabs tabs={[...tabs]} value={tab} onChange={setTab} />

      {loading ? (
        <p className="py-12 text-center text-sm text-ink/50">Chargement des analytics…</p>
      ) : tab === "Vue d'ensemble" && overview ? (
        <AnalyticsOverviewDashboard
          overview={overview}
          revenue={revenue}
          appointments={appointments}
          customers={customers}
          services={services}
          staff={staff}
          inventory={inventory}
          marketing={marketing}
          postVisit={postVisit}
          aiMarketing={aiMarketing}
          periodLabel={periodLabel}
        />
      ) : null}

      {!loading && tab === "Revenus" && revenue ? (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Kpi label="Aujourd'hui" value={formatMad(revenue.totals.today)} />
            <Kpi label="Cette semaine" value={formatMad(revenue.totals.week)} />
            <Kpi label="Ce mois" value={formatMad(revenue.totals.month)} />
            <Kpi label="Mois précédent" value={formatMad(revenue.totals.prevMonth)} />
            <Kpi label="Cette année" value={formatMad(revenue.totals.year)} />
          </div>
          {revenue.daily.length > 0 ? (
            <div className="surface mb-6 h-64 p-4">
              <p className="mb-2 text-sm font-medium">CA par jour</p>
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={revenue.daily}>
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => formatMad(Number(v ?? 0))} />
                  <Bar dataKey="revenue" fill="#E31C5F" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : null}
          <h3 className="mb-2 font-medium">Par moyen de paiement</h3>
          <ul className="surface divide-y divide-line text-sm">
            {revenue.byPaymentMethod.map((m) => (
              <ListRow
                key={m.method}
                left={
                  <span>
                    {m.label}{" "}
                    <span className="text-ink/45">({m.count} paiements)</span>
                  </span>
                }
                right={
                  <span className="font-mono">
                    {formatMad(m.amount)} · {m.percent} %
                  </span>
                }
              />
            ))}
          </ul>
        </>
      ) : null}

      {!loading && tab === "Clientes" && customers ? (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Total" value={String(customers.kpis.total)} />
            <Kpi label="Nouvelles (période)" value={String(customers.kpis.newInPeriod)} />
            <Kpi label="Actives" value={String(customers.kpis.active)} />
            <Kpi label="VIP" value={String(customers.kpis.vip)} />
            <Kpi label="Inactives" value={String(customers.kpis.inactive)} />
            <Kpi label="À risque" value={String(customers.kpis.atRisk)} />
            <Kpi label="Réactivées" value={String(customers.kpis.reactivated)} />
          </div>
          <div className="surface mb-6 p-4 text-sm">
            <p className="font-medium">Rétention période</p>
            <p className="mt-2 text-ink/60">
              Retour : {customers.retention.returning} · Nouvelles :{" "}
              {customers.retention.newCustomers} · Taux :{" "}
              {customers.retention.retentionRate != null
                ? `${customers.retention.retentionRate} %`
                : "—"}
            </p>
          </div>
          <h3 className="mb-2 font-medium">Top clientes (LTV = CA net lifetime)</h3>
          <ul className="surface divide-y divide-line text-sm">
            {customers.topCustomers.map((c) => (
              <ListRow
                key={c.customerId}
                left={
                  <Link href={`/customers/${c.customerId}/`} className="hover:text-primary">
                    {c.customerName}
                  </Link>
                }
                right={
                  <span className="font-mono">
                    {formatMad(c.ltv)} · {c.visits} visites · panier{" "}
                    {formatMad(c.averageTicket)}
                  </span>
                }
              />
            ))}
          </ul>
        </>
      ) : null}

      {!loading && tab === "Agenda" && appointments ? (
        <>
          <Kpi label="RDV total" value={String(appointments.total)} />
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <ul className="surface divide-y divide-line p-4 text-sm">
              {appointments.byStatus.map((s) => (
                <ListRow key={s.status} left={s.status} right={String(s.count)} />
              ))}
            </ul>
            <div className="surface p-4 text-sm">
              <p className="font-medium">No-show</p>
              <p className="mt-2">
                {appointments.noShow.count} / {appointments.noShow.concerned} RDV concernés
                {appointments.noShow.rate != null ? ` (${appointments.noShow.rate} %)` : ""}
              </p>
            </div>
          </div>
          {(appointments.byHour?.length ?? 0) > 0 ? (
            <div className="surface mt-6 h-56 p-4">
              <p className="mb-2 text-sm font-medium">Fréquentation par heure</p>
              <ResponsiveContainer width="100%" height="85%">
                <BarChart data={appointments.byHour}>
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={28} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#E31C5F" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : null}
          <h3 className="mb-2 mt-6 font-medium">Occupation par jour</h3>
          <ul className="surface divide-y divide-line text-sm">
            {appointments.occupationByWeekday.map((d) => (
              <ListRow
                key={d.weekday}
                left={d.label}
                right={
                  <span className={`font-mono ${occupationClass(d.level)}`}>
                    {d.rate != null ? `${d.rate} %` : "—"}
                  </span>
                }
              />
            ))}
          </ul>
        </>
      ) : null}

      {!loading && tab === "Services" ? (
        <ul className="surface divide-y divide-line text-sm">
          {services.map((s) => (
            <li key={s.serviceId} className="p-4">
              <p className="font-medium">{s.serviceName}</p>
              <p className="mt-1 text-ink/60">
                {s.appointments} prestations · CA {formatMad(s.revenue)} · panier{" "}
                {formatMad(s.averageTicket)}
              </p>
              <p className="mt-1 text-xs text-ink/45">
                Consommables {formatMad(s.consumableCost)} · Marge estimée{" "}
                {formatMad(s.estimatedMargin)}
              </p>
            </li>
          ))}
        </ul>
      ) : null}

      {!loading && tab === "Employées" ? (
        <ul className="surface divide-y divide-line text-sm">
          {staff.map((s) => (
            <ListRow
              key={s.staffId}
              left={
                <span>
                  {s.staffName}{" "}
                  <span className="text-ink/45">{s.appointments} RDV</span>
                </span>
              }
              right={
                <span className="font-mono">
                  {formatMad(s.revenue)} · comm. {formatMad(s.commission)}
                </span>
              }
            />
          ))}
        </ul>
      ) : null}

      {!loading && tab === "Stock" && inventory ? (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Valeur stock" value={formatMad(inventory.stockValue)} />
            <Kpi label="Consommation" value={formatMad(inventory.consumptionValue)} />
            <Kpi label="Achats" value={formatMad(inventory.purchasesValue)} />
            <Kpi label="Pertes" value={formatMad(inventory.lossesValue)} />
            <Kpi label="CA produits POS" value={formatMad(inventory.posRevenue ?? 0)} />
            <Kpi
              label="Marge POS"
              value={inventory.posMargin != null ? formatMad(inventory.posMargin) : "—"}
            />
            <Kpi label="Stock vendu (qty)" value={String(inventory.posStockConsumed ?? 0)} />
          </div>
          {(inventory.topPosProducts?.length ?? 0) > 0 ? (
            <>
              <h3 className="mb-2 font-medium">Top ventes POS</h3>
              <ul className="surface mb-6 divide-y divide-line text-sm">
                {inventory.topPosProducts.map((p) => (
                  <ListRow
                    key={p.productId}
                    left={p.productName}
                    right={`${p.quantity} · ${formatMad(p.revenue)}`}
                  />
                ))}
              </ul>
            </>
          ) : null}
          <h3 className="mb-2 font-medium">Top consommation</h3>
          <ul className="surface divide-y divide-line text-sm">
            {inventory.topConsumption.map((p) => (
              <ListRow
                key={p.productId}
                left={p.productName}
                right={`${p.quantity} ${p.unit}`}
              />
            ))}
          </ul>
        </>
      ) : null}

      {!loading && tab === "Marketing" ? (
        <>
          {aiMarketing ? (
            <div className="mb-6">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink/40">
                IA Marketing (attribution ai_marketing)
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Kpi label="Messages générés" value={String(aiMarketing.generated)} hint="Tâches validées" />
                <Kpi label="Messages envoyés" value={String(aiMarketing.sent)} hint="Marqués envoyés" />
                <Kpi label="Réservations" value={String(aiMarketing.bookings)} />
                <Kpi label="COMPLETED" value={String(aiMarketing.completed)} />
              </div>
            </div>
          ) : null}
          {postVisit ? (
            <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Kpi label="Post-visite éligibles" value={String(postVisit.eligible)} />
              <Kpi label="Préparées" value={String(postVisit.prepared)} />
              <Kpi label="Envoyées" value={String(postVisit.sent)} />
              <Kpi label="Réservations après" value={String(postVisit.bookingsAfter)} />
              <Kpi label="COMPLETED après" value={String(postVisit.completedAfter)} />
            </div>
          ) : null}
          <ul className="surface divide-y divide-line text-sm">
            {marketing.map((c) => (
              <li key={c.campaignId} className="p-4">
                <p className="font-medium">{c.campaignName}</p>
                <p className="mt-1 text-ink/60">
                  Ciblées {c.targeted} · Envoyées {c.sent} · RDV associés {c.associatedAppointments}{" "}
                  · CA associé {formatMad(c.associatedRevenue)}
                </p>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {!loading && tab === "Fidélité" && loyalty ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Kpi label="Points distribués" value={String(loyalty.pointsEarned)} />
          <Kpi label="Points utilisés" value={String(loyalty.pointsRedeemed)} />
          <Kpi label="Clientes VIP" value={String(loyalty.vipCustomers)} />
          <Kpi label="Forfaits actifs" value={String(loyalty.activePackages)} />
          <Kpi label="Séances utilisées" value={String(loyalty.sessionsUsed)} />
        </div>
      ) : null}

      {!loading && tab === "Avis" && reviews ? (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            <Kpi label="Demandes envoyées" value={String(reviews.sentInPeriod)} />
            <Kpi label="Satisfactions enregistrées" value={String(reviews.recordedSatisfaction)} />
            <Kpi
              label="Score interne"
              value={reviews.averageInternalScore != null ? `${reviews.averageInternalScore} / 5` : "—"}
            />
          </div>
          <ul className="surface divide-y divide-line text-sm">
            {reviews.bySatisfaction.map((s) => (
              <ListRow key={s.satisfaction} left={s.label} right={String(s.count)} />
            ))}
          </ul>
        </>
      ) : null}
    </motion.div>
  );
}
