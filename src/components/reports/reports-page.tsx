"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppPageHeader, Kpi, ListRow, Tabs } from "@/components/app/AppUi";
import { ResponsiveTable } from "@/components/app/ResponsiveTable";
import { useCurrentUser } from "@/components/auth/session-provider";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import type { AnalyticsPeriodPreset } from "@/lib/analytics/period";
import { resolvePreset } from "@/lib/analytics/period";
import { getAnalyticsScope } from "@/lib/rbac";
import { formatMad } from "@/modules/analytics/service";
import { getReport, openReportExport } from "@/modules/reports/service";
import { listServices } from "@/modules/services/service";
import { listStaff } from "@/modules/staff/service";
import type {
  AnalyticsOverview,
  AppointmentAnalytics,
  CustomerAnalytics,
  InventoryAnalytics,
  MarketingAnalyticsRow,
  RevenueAnalytics,
  ReviewAnalytics,
  ServiceAnalyticsRow,
  StaffAnalyticsRow,
} from "@/types/analytics";
import type { ReportMeta, ReportType } from "@/types/reports";
import type { CustomerReportRow, FinanceReport, StockLedgerReportRow } from "@/types/reports";

const PRESET_OPTIONS: { value: AnalyticsPeriodPreset; label: string }[] = [
  { value: "today", label: "Aujourd'hui" },
  { value: "week", label: "Cette semaine" },
  { value: "month", label: "Ce mois" },
  { value: "prev_month", label: "Mois précédent" },
  { value: "year", label: "Cette année" },
];

function statusCount(data: AppointmentAnalytics | undefined, status: string): number {
  return data?.byStatus.find((s) => s.status === status)?.count ?? 0;
}

function avgOccupation(data: AppointmentAnalytics | undefined): string {
  if (!data?.occupationByWeekday.length) return "—";
  const rates = data.occupationByWeekday.map((d) => d.rate).filter((r): r is number => r != null);
  if (!rates.length) return "—";
  const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
  return `${Math.round(avg)} %`;
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <ResponsiveTable
      headers={headers}
      cards={rows.map((cells, i) => (
        <div key={i} className="surface p-3 text-sm">
          <p className="font-medium">{cells[0]}</p>
          <p className="text-ink/55">{cells.slice(1).join(" · ")}</p>
        </div>
      ))}
    >
      {rows.map((cells, i) => (
        <tr key={i}>
          {cells.map((cell, j) => (
            <td key={j} className="px-4 py-3 text-sm">
              {cell}
            </td>
          ))}
        </tr>
      ))}
    </ResponsiveTable>
  );
}

const TAB_CONFIG: { label: string; type: ReportType; icon: string }[] = [
  { label: "Vue globale", type: "global", icon: "📊" },
  { label: "Finance", type: "finance", icon: "💰" },
  { label: "Agenda", type: "agenda", icon: "📅" },
  { label: "Clientes", type: "customers", icon: "👩" },
  { label: "Services", type: "services", icon: "💆" },
  { label: "Employées", type: "staff", icon: "👩‍💼" },
  { label: "Stock", type: "inventory", icon: "📦" },
  { label: "Marketing", type: "marketing", icon: "📣" },
  { label: "Avis", type: "reviews", icon: "⭐" },
];

function formatPeriodLabel(preset: AnalyticsPeriodPreset): string {
  const p = resolvePreset(preset);
  const fmt = (d: string) => {
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };
  return `${fmt(p.from)} → ${fmt(p.to)}`;
}

export function ReportsPageView() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const scope = getAnalyticsScope(user.role);

  const visibleTabs = useMemo(() => {
    if (scope === "cash_only") return TAB_CONFIG.filter((t) => t.type === "finance" || t.type === "global");
    if (scope === "staff_self") {
      return TAB_CONFIG.filter((t) =>
        ["global", "finance", "agenda", "staff"].includes(t.type),
      );
    }
    return TAB_CONFIG;
  }, [scope]);

  const [tab, setTab] = useState(visibleTabs[0]?.label ?? "Vue globale");
  const activeType = visibleTabs.find((t) => t.label === tab)?.type ?? "global";

  const [preset, setPreset] = useState<AnalyticsPeriodPreset>("month");
  const [staffId, setStaffId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [staffOpts, setStaffOpts] = useState<{ id: string; name: string }[]>([]);
  const [serviceOpts, setServiceOpts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<ReportMeta | null>(null);

  const [globalData, setGlobalData] = useState<{
    overview: AnalyticsOverview;
    revenue?: RevenueAnalytics;
    customers?: CustomerAnalytics;
    appointments?: AppointmentAnalytics;
  } | null>(null);
  const [financeData, setFinanceData] = useState<FinanceReport | null>(null);
  const [agendaData, setAgendaData] = useState<AppointmentAnalytics | null>(null);
  const [customerKpis, setCustomerKpis] = useState<CustomerAnalytics | null>(null);
  const [customerRows, setCustomerRows] = useState<CustomerReportRow[]>([]);
  const [services, setServices] = useState<ServiceAnalyticsRow[]>([]);
  const [staffRows, setStaffRows] = useState<StaffAnalyticsRow[]>([]);
  const [inventorySummary, setInventorySummary] = useState<InventoryAnalytics | null>(null);
  const [ledger, setLedger] = useState<StockLedgerReportRow[]>([]);
  const [marketing, setMarketing] = useState<MarketingAnalyticsRow[]>([]);
  const [reviews, setReviews] = useState<ReviewAnalytics | null>(null);

  const filters = useMemo(
    () => ({
      preset,
      staffId: staffId || undefined,
      serviceId: serviceId || undefined,
    }),
    [preset, staffId, serviceId],
  );

  const refresh = useCallback(async () => {
    if (!scope) return;
    try {
      const res = await getReport<Record<string, unknown>>(activeType, filters);
      setMeta((res.meta as ReportMeta) ?? null);

      if (activeType === "global") {
        setGlobalData({
          overview: res.overview as AnalyticsOverview,
          revenue: res.revenue as RevenueAnalytics | undefined,
          customers: res.customers as CustomerAnalytics | undefined,
          appointments: res.appointments as AppointmentAnalytics | undefined,
        });
      } else if (activeType === "finance") {
        setFinanceData(res as unknown as FinanceReport);
      } else if (activeType === "agenda") {
        setAgendaData(res.data as AppointmentAnalytics);
      } else if (activeType === "customers") {
        setCustomerKpis(res.kpis as CustomerAnalytics);
        setCustomerRows((res.rows as CustomerReportRow[]) ?? []);
      } else if (activeType === "services") {
        setServices((res.items as ServiceAnalyticsRow[]) ?? []);
      } else if (activeType === "staff") {
        setStaffRows((res.items as StaffAnalyticsRow[]) ?? []);
      } else if (activeType === "inventory") {
        setInventorySummary(res.summary as InventoryAnalytics);
        setLedger((res.ledger as StockLedgerReportRow[]) ?? []);
      } else if (activeType === "marketing") {
        setMarketing((res.items as MarketingAnalyticsRow[]) ?? []);
      } else if (activeType === "reviews") {
        setReviews(res.data as ReviewAnalytics);
      }
    } catch {
      toast("Impossible de charger le rapport.", "error");
    }
  }, [activeType, filters, scope, toast]);

  useEffect(() => {
    if (!scope) return;
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh, scope]);

  useEffect(() => {
    if (!visibleTabs.some((t) => t.label === tab)) {
      setTab(visibleTabs[0]?.label ?? "Vue globale");
    }
  }, [visibleTabs, tab]);

  useEffect(() => {
    if (scope === "staff_self") return;
    listStaff({ limit: 100 })
      .then((r) => setStaffOpts(r.data.map((s) => ({ id: s.id, name: s.displayName }))))
      .catch(() => undefined);
    listServices({ limit: 100, active: true })
      .then((r) => setServiceOpts(r.data.map((s) => ({ id: s.id, name: s.name }))))
      .catch(() => undefined);
  }, [scope]);

  function exportFile(format: "csv" | "xlsx" | "pdf") {
    openReportExport(activeType, format, filters);
  }

  if (!scope) {
    return (
      <div className="surface p-8 text-center text-sm text-ink/50">
        Vous n&apos;avez pas accès aux rapports.
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="print:text-black">
      <AppPageHeader
        title="Rapports"
        description="Mêmes KPI qu'Analytics — exports CSV, Excel et PDF côté serveur."
        action={
          <div className="flex flex-wrap gap-2 print:hidden">
            <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={() => exportFile("csv")}>
              Exporter CSV
            </button>
            <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={() => exportFile("xlsx")}>
              Exporter Excel
            </button>
            <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={() => exportFile("pdf")}>
              Exporter PDF
            </button>
            <button type="button" className="btn-primary px-3 py-1.5 text-xs print:hidden" onClick={() => window.print()}>
              Imprimer
            </button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3 print:hidden">
        <label className="space-y-1 text-sm">
          <span className="text-ink/50">Période</span>
          <Select value={preset} onChange={(e) => setPreset(e.target.value as AnalyticsPeriodPreset)}>
            {PRESET_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </label>
        <p className="pb-2 text-sm text-ink/60">{formatPeriodLabel(preset)}</p>
        {scope !== "staff_self" && scope !== "cash_only" ? (
          <>
            <label className="space-y-1 text-sm">
              <span className="text-ink/50">Employée</span>
              <Select value={staffId} onChange={(e) => setStaffId(e.target.value)}>
                <option value="">Toutes</option>
                {staffOpts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-ink/50">Service</span>
              <Select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                <option value="">Tous</option>
                {serviceOpts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </label>
          </>
        ) : null}
        {scope === "staff_self" ? (
          <p className="pb-2 text-xs text-ink/45">Vue limitée à vos données.</p>
        ) : null}
      </div>

      {meta ? (
        <div className="surface mb-4 p-4 text-sm">
          <p className="font-medium">{meta.organizationName}</p>
          <p className="text-ink/60">
            {meta.reportType} · {meta.periodFrom} → {meta.periodTo}
          </p>
        </div>
      ) : null}

      <Tabs tabs={visibleTabs.map((t) => t.label)} value={tab} onChange={setTab} />

      <div className="mb-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
        {visibleTabs.map((t) => (
          <ListRow
            key={t.type}
            left={
              <span>
                {t.icon} {t.label}
              </span>
            }
            right={
              <button
                type="button"
                className="btn-ghost px-2 py-1 text-xs"
                onClick={() => setTab(t.label)}
              >
                Voir
              </button>
            }
          />
        ))}
        <ListRow
          left="💼 Commissions (module dédié)"
          right={
            <Link href="/reports/commissions/" className="btn-ghost px-2 py-1 text-xs">
              Ouvrir
            </Link>
          }
        />
      </div>

      {loading ? (
        <p className="text-sm text-ink/50">Chargement…</p>
      ) : activeType === "global" && globalData ? (
        <>
          <h2 className="mb-3 text-lg font-semibold">RAPPORT GLOBAL</h2>
          <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi label="CA net" value={formatMad(globalData.overview.revenue.value)} />
            <Kpi label="Dépenses" value={formatMad(globalData.overview.expenses.value)} />
            <Kpi label="Marge" value={formatMad(globalData.overview.margin.value)} />
            <Kpi label="Panier moyen" value={formatMad(globalData.overview.averageTicket.value)} />
          </div>
          {globalData.appointments ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <Kpi label="RDV" value={String(globalData.appointments.total)} />
              <Kpi label="Terminés" value={String(statusCount(globalData.appointments, "COMPLETED"))} />
              <Kpi label="No-show" value={String(globalData.appointments.noShow.count)} />
            </div>
          ) : null}
        </>
      ) : null}

      {!loading && activeType === "finance" && financeData ? (
        <>
          <h2 className="mb-3 text-lg font-semibold">RAPPORT FINANCIER</h2>
          <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi label="CA net" value={formatMad(financeData.overview.revenue.value)} />
            <Kpi label="Dépenses" value={formatMad(financeData.overview.expenses.value)} />
            <Kpi label="Marge" value={formatMad(financeData.overview.margin.value)} />
            <Kpi label="Panier moyen" value={formatMad(financeData.overview.averageTicket.value)} />
          </div>
          <h3 className="mb-2 font-medium">PAIEMENTS</h3>
          <ul className="surface mb-6 divide-y divide-line text-sm">
            {financeData.revenue.byPaymentMethod.map((m) => (
              <ListRow
                key={m.method}
                left={m.label}
                right={`${formatMad(m.amount)} (${m.count})`}
              />
            ))}
          </ul>
          <h3 className="mb-2 font-medium">REMBOURSEMENTS</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Kpi label="Nombre" value={String(financeData.refunds.count)} />
            <Kpi label="Montant" value={formatMad(financeData.refunds.amount)} />
          </div>
        </>
      ) : null}

      {!loading && activeType === "agenda" && agendaData ? (
        <>
          <h2 className="mb-3 text-lg font-semibold">RAPPORT AGENDA</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Rendez-vous" value={String(agendaData.total)} />
            <Kpi label="Terminés" value={String(statusCount(agendaData, "COMPLETED"))} />
            <Kpi label="Annulations" value={String(statusCount(agendaData, "CANCELLED"))} />
            <Kpi label="No-show" value={String(agendaData.noShow.count)} />
            <Kpi label="Occupation" value={avgOccupation(agendaData)} />
          </div>
        </>
      ) : null}

      {!loading && activeType === "customers" ? (
        <>
          <h2 className="mb-3 text-lg font-semibold">RAPPORT CLIENTES</h2>
          {customerKpis ? (
            <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Kpi label="Nouvelles" value={String(customerKpis.kpis.newInPeriod)} />
              <Kpi label="Actives" value={String(customerKpis.kpis.active)} />
              <Kpi label="Inactives" value={String(customerKpis.kpis.inactive)} />
              <Kpi label="VIP" value={String(customerKpis.kpis.vip)} />
              <Kpi
                label="Rétention"
                value={
                  customerKpis.retention.retentionRate != null
                    ? `${customerKpis.retention.retentionRate} %`
                    : "—"
                }
              />
            </div>
          ) : null}
          <SimpleTable
            headers={["Cliente", "Téléphone", "Visites", "CA net", "Panier moyen", "Dernière visite", "Segment"]}
            rows={customerRows.map((c) => [
              c.customerName,
              c.phone,
              String(c.visits),
              formatMad(c.netRevenue),
              formatMad(c.averageTicket),
              c.lastVisitAt ? c.lastVisitAt.slice(0, 10) : "—",
              c.segment,
            ])}
          />
        </>
      ) : null}

      {!loading && activeType === "services" ? (
        <>
          <h2 className="mb-3 text-lg font-semibold">RAPPORT SERVICES</h2>
          <SimpleTable
            headers={["Service", "Prestations", "CA", "Coût consommables", "Marge estimée"]}
            rows={services.map((s) => [
              s.serviceName,
              String(s.appointments),
              formatMad(s.revenue),
              formatMad(s.consumableCost),
              formatMad(s.estimatedMargin),
            ])}
          />
        </>
      ) : null}

      {!loading && activeType === "staff" ? (
        <>
          <h2 className="mb-3 text-lg font-semibold">RAPPORT EMPLOYÉES</h2>
          <SimpleTable
            headers={["Employée", "RDV", "CA", "Commission"]}
            rows={staffRows.map((s) => [
              s.staffName,
              String(s.appointments),
              formatMad(s.revenue),
              formatMad(s.commission),
            ])}
          />
        </>
      ) : null}

      {!loading && activeType === "inventory" ? (
        <>
          <h2 className="mb-3 text-lg font-semibold">RAPPORT STOCK (ledger)</h2>
          {inventorySummary ? (
            <div className="mb-6 grid gap-3 sm:grid-cols-3">
              <Kpi label="Achats" value={formatMad(inventorySummary.purchasesValue)} />
              <Kpi label="Consommations" value={formatMad(inventorySummary.consumptionValue)} />
              <Kpi label="Pertes" value={formatMad(inventorySummary.lossesValue)} />
            </div>
          ) : null}
          <SimpleTable
            headers={["Produit", "Achats", "Consommation", "Ventes", "Pertes", "Ajustements", "Stock théorique"]}
            rows={ledger.map((p) => [
              p.productName,
              String(p.purchases),
              String(p.consumption),
              String(p.sales),
              String(p.losses),
              String(p.adjustments),
              String(p.ledgerBalance),
            ])}
          />
        </>
      ) : null}

      {!loading && activeType === "marketing" ? (
        <>
          <h2 className="mb-3 text-lg font-semibold">RAPPORT MARKETING</h2>
          <SimpleTable
            headers={["Campagne", "Destinataires", "Envoyés", "RDV post-campagne", "CA traçable"]}
            rows={marketing.map((m) => [
              m.campaignName,
              String(m.targeted),
              String(m.sent),
              String(m.associatedAppointments),
              formatMad(m.associatedRevenue),
            ])}
          />
        </>
      ) : null}

      {!loading && activeType === "reviews" && reviews ? (
        <>
          <h2 className="mb-3 text-lg font-semibold">RAPPORT AVIS</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Envoyées" value={String(reviews.sentInPeriod)} />
            <Kpi label="Réponses" value={String(reviews.recordedSatisfaction)} />
            <Kpi
              label="Satisfactions"
              value={String(
                reviews.bySatisfaction
                  .filter((s) => s.satisfaction === "POSITIVE" || s.satisfaction === "VERY_POSITIVE")
                  .reduce((a, s) => a + s.count, 0),
              )}
            />
            <Kpi
              label="Insatisfactions"
              value={String(
                reviews.bySatisfaction
                  .filter((s) => s.satisfaction === "NEGATIVE" || s.satisfaction === "VERY_NEGATIVE")
                  .reduce((a, s) => a + s.count, 0),
              )}
            />
          </div>
        </>
      ) : null}
    </motion.div>
  );
}
