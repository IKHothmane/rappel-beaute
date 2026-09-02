"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppPageHeader, Kpi, ListRow, Tabs } from "@/components/app/AppUi";
import { useCurrentUser } from "@/components/auth/session-provider";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { getAnalyticsScope } from "@/lib/rbac";
import type { AnalyticsPeriodPreset } from "@/lib/analytics/period";
import {
  formatCompareHint,
  formatMad,
  formatPct,
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
import type {
  AnalyticsOverview,
  AppointmentAnalytics,
  CustomerAnalytics,
  InventoryAnalytics,
  LoyaltyAnalytics,
  MarketingAnalyticsRow,
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

  const tabs = useMemo(() => {
    if (scope === "cash_only") return ["Revenus"];
    if (scope === "staff_self") return ["Vue d'ensemble", "Revenus", "Agenda", "Employées"];
    return [...ALL_TABS];
  }, [scope]);

  const [tab, setTab] = useState(tabs[0]);
  const [preset, setPreset] = useState<AnalyticsPeriodPreset>("month");
  const [compare, setCompare] = useState(true);
  const [loading, setLoading] = useState(true);

  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [revenue, setRevenue] = useState<RevenueAnalytics | null>(null);
  const [customers, setCustomers] = useState<CustomerAnalytics | null>(null);
  const [appointments, setAppointments] = useState<AppointmentAnalytics | null>(null);
  const [services, setServices] = useState<ServiceAnalyticsRow[]>([]);
  const [staff, setStaff] = useState<StaffAnalyticsRow[]>([]);
  const [inventory, setInventory] = useState<InventoryAnalytics | null>(null);
  const [marketing, setMarketing] = useState<MarketingAnalyticsRow[]>([]);
  const [loyalty, setLoyalty] = useState<LoyaltyAnalytics | null>(null);
  const [reviews, setReviews] = useState<ReviewAnalytics | null>(null);

  const filters = useMemo(() => ({ preset, compare }), [preset, compare]);

  const refresh = useCallback(async () => {
    if (!scope) return;
    try {
      if (tab === "Vue d'ensemble") {
        setOverview(await getAnalyticsOverview(filters));
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
        setMarketing((await getAnalyticsMarketing(filters)).items);
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

  if (!scope) {
    return (
      <div className="surface p-8 text-center text-sm text-ink/50">
        Vous n&apos;avez pas accès aux analytics.
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <AppPageHeader
        title="Analytics"
        description="KPI calculés côté serveur — définitions officielles partagées avec Rapports."
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-sm">
          <span className="text-ink/50">Période</span>
          <Select
            value={preset}
            onChange={(e) => setPreset(e.target.value as AnalyticsPeriodPreset)}
          >
            {PRESET_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={compare}
            onChange={(e) => setCompare(e.target.checked)}
            className="size-4 rounded border-line"
          />
          Comparer à la période précédente
        </label>
        {scope === "staff_self" ? (
          <p className="pb-2 text-xs text-ink/45">Vue limitée à vos performances.</p>
        ) : null}
      </div>

      <Tabs tabs={[...tabs]} value={tab} onChange={setTab} />

      {loading ? (
        <p className="text-sm text-ink/50">Chargement…</p>
      ) : tab === "Vue d'ensemble" && overview ? (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi
              label="CA net"
              value={formatMad(overview.revenue.value)}
              hint={`${formatPct(overview.revenue.changePercent)} ${formatCompareHint(overview.revenue.value, overview.revenue.previous) ?? ""}`.trim()}
            />
            <Kpi
              label="Dépenses"
              value={formatMad(overview.expenses.value)}
              hint={formatPct(overview.expenses.changePercent)}
            />
            <Kpi
              label="Marge"
              value={formatMad(overview.margin.value)}
              hint={formatPct(overview.margin.changePercent)}
            />
            <Kpi
              label="Panier moyen"
              value={formatMad(overview.averageTicket.value)}
              hint={formatPct(overview.averageTicket.changePercent)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Kpi label="RDV" value={String(overview.appointments.value)} />
            <Kpi label="Clientes actives (90j)" value={String(overview.customers.value)} />
          </div>
        </>
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
                  <Bar dataKey="revenue" fill="var(--color-primary, #7c3aed)" radius={[4, 4, 0, 0]} />
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
          </div>
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
