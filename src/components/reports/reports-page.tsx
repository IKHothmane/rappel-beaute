"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ROLE_LABEL, useCurrentUser } from "@/components/auth/session-provider";
import {
  buildPnl,
  chartBars,
  comparePeriodLabel,
  formatGeneratedAt,
  formatPeriodRange,
  reportsInsight,
  serviceShare,
  statusCount,
  topSales,
  visibleModules,
  visibleReportTypes,
  type ReportsViewModel,
} from "@/components/reports/reports-helpers";
import { ReportsDesktop } from "@/components/reports/reports-desktop";
import { ReportsMobile } from "@/components/reports/reports-mobile";
import { Drawer } from "@/components/ui/drawer";
import { useToast } from "@/components/ui/toast";
import type { AnalyticsPeriodPreset } from "@/lib/analytics/period";
import { canAccessNav, getAnalyticsScope } from "@/lib/rbac";
import { listGiftCards } from "@/modules/promo/service";
import { getReport, openReportExport } from "@/modules/reports/service";
import { listServices } from "@/modules/services/service";
import { listStaff } from "@/modules/staff/service";
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
import type {
  CustomerReportRow,
  FinanceReport,
  ReportMeta,
  ReportType,
  StockLedgerReportRow,
} from "@/types/reports";

export function ReportsPageView() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const scope = getAnalyticsScope(user.role);
  const canMarketing = canAccessNav(user.role, "marketing");
  const canGiftCards = canAccessNav(user.role, "gift-cards");
  const canReviews = canAccessNav(user.role, "reviews");
  const canCommissions = canAccessNav(user.role, "commissions");
  const canLoyalty = canAccessNav(user.role, "loyalty");
  const canReactivation = canAccessNav(user.role, "reactivation");

  const types = useMemo(() => (scope ? visibleReportTypes(scope) : []), [scope]);
  const modules = useMemo(() => (scope ? visibleModules(scope) : []), [scope]);

  const [activeType, setActiveType] = useState<ReportType>("finance");
  const [preset, setPreset] = useState<AnalyticsPeriodPreset>("month");
  const [compare, setCompare] = useState(true);
  const [staffId, setStaffId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [staffOpts, setStaffOpts] = useState<{ id: string; name: string }[]>([]);
  const [serviceOpts, setServiceOpts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<ReportMeta | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [autoOpen, setAutoOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [revenue, setRevenue] = useState<RevenueAnalytics | null>(null);
  const [refunds, setRefunds] = useState(0);
  const [agenda, setAgenda] = useState<AppointmentAnalytics | null>(null);
  const [customers, setCustomers] = useState<CustomerAnalytics | null>(null);
  const [customerRows, setCustomerRows] = useState<CustomerReportRow[]>([]);
  const [services, setServices] = useState<ServiceAnalyticsRow[]>([]);
  const [staffRows, setStaffRows] = useState<StaffAnalyticsRow[]>([]);
  const [inventory, setInventory] = useState<InventoryAnalytics | null>(null);
  const [ledger, setLedger] = useState<StockLedgerReportRow[]>([]);
  const [marketing, setMarketing] = useState<MarketingAnalyticsRow[]>([]);
  const [reviews, setReviews] = useState<ReviewAnalytics | null>(null);
  const [loyalty, setLoyalty] = useState<LoyaltyAnalytics | null>(null);
  const [giftBalance, setGiftBalance] = useState<number | null>(null);

  const filters = useMemo(
    () => ({
      preset,
      compare,
      staffId: staffId || undefined,
      serviceId: serviceId || undefined,
    }),
    [preset, compare, staffId, serviceId],
  );

  const refresh = useCallback(async () => {
    if (!scope) return;
    const settled = await Promise.allSettled(
      types.map(async (type) => {
        const res = await getReport<Record<string, unknown>>(type, filters);
        return { type, res };
      }),
    );

    let anyOk = false;
    for (const item of settled) {
      if (item.status !== "fulfilled") continue;
      anyOk = true;
      const { type, res } = item.value;
      if (res.meta) setMeta(res.meta as ReportMeta);

      if (type === "global") {
        const ov = res.overview as AnalyticsOverview | undefined;
        if (ov) setOverview(ov);
        if (res.revenue) setRevenue(res.revenue as RevenueAnalytics);
        if (res.customers) setCustomers(res.customers as CustomerAnalytics);
        if (res.appointments) setAgenda(res.appointments as AppointmentAnalytics);
      } else if (type === "finance") {
        const fin = res as unknown as FinanceReport;
        setOverview(fin.overview);
        setRevenue(fin.revenue);
        setRefunds(fin.refunds?.amount ?? 0);
      } else if (type === "agenda") {
        setAgenda(res.data as AppointmentAnalytics);
      } else if (type === "customers") {
        setCustomers(res.kpis as CustomerAnalytics);
        setCustomerRows((res.rows as CustomerReportRow[]) ?? []);
      } else if (type === "services") {
        setServices((res.items as ServiceAnalyticsRow[]) ?? []);
      } else if (type === "staff") {
        setStaffRows((res.items as StaffAnalyticsRow[]) ?? []);
      } else if (type === "inventory") {
        setInventory(res.summary as InventoryAnalytics);
        setLedger((res.ledger as StockLedgerReportRow[]) ?? []);
      } else if (type === "marketing") {
        setMarketing((res.items as MarketingAnalyticsRow[]) ?? []);
      } else if (type === "reviews") {
        setReviews(res.data as ReviewAnalytics);
      } else if (type === "loyalty") {
        setLoyalty(res.data as LoyaltyAnalytics);
      }
    }

    if (!anyOk) toast("Impossible de charger les rapports.", "error");
  }, [filters, scope, toast, types]);

  useEffect(() => {
    if (!scope) return;
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh, scope]);

  useEffect(() => {
    if (!modules.some((m) => m.type === activeType)) {
      setActiveType(modules[0]?.type ?? "global");
    }
  }, [modules, activeType]);

  useEffect(() => {
    if (!scope || scope === "staff_self" || scope === "cash_only") return;
    listStaff({ limit: 100 })
      .then((r) => setStaffOpts(r.data.map((s) => ({ id: s.id, name: s.displayName }))))
      .catch(() => undefined);
    listServices({ limit: 100, active: true })
      .then((r) => setServiceOpts(r.data.map((s) => ({ id: s.id, name: s.name }))))
      .catch(() => undefined);
  }, [scope]);

  useEffect(() => {
    if (!canGiftCards) return;
    listGiftCards({ limit: 1 })
      .then((r) => setGiftBalance(r.kpis.remainingBalance))
      .catch(() => undefined);
  }, [canGiftCards]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!exportRef.current?.contains(e.target as Node)) setExportOpen(false);
    }
    if (exportOpen) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [exportOpen]);

  function exportFile(format: "csv" | "xlsx" | "pdf") {
    const type = types.includes(activeType) ? activeType : types[0] ?? "global";
    openReportExport(type, format, filters);
    setExportOpen(false);
  }

  const commissionsTotal = staffRows.reduce((s, r) => s + r.commission, 0);
  const pnl = useMemo(
    () =>
      buildPnl({
        overview,
        periodGross: revenue?.totals.periodGross ?? null,
        refunds,
        commissions: commissionsTotal,
      }),
    [overview, revenue, refunds, commissionsTotal],
  );
  const bars = useMemo(() => chartBars(revenue?.daily), [revenue]);
  const top = useMemo(() => topSales(services, inventory), [services, inventory]);
  const insight = useMemo(
    () =>
      reportsInsight({
        revenue: overview?.revenue ?? null,
        topService: services[0] ?? null,
        serviceShare: services[0] ? serviceShare(services[0], services.reduce((s, r) => s + r.revenue, 0)) : null,
        inactive: customers?.kpis.inactive ?? null,
        cancelled: agenda ? statusCount(agenda, "CANCELLED") : null,
        noShowRate: agenda?.noShow.rate ?? null,
        canMarketing,
        canReactivation,
      }),
    [agenda, canMarketing, canReactivation, customers, overview, services],
  );

  const vm: ReportsViewModel = {
    orgName: user.orgName,
    roleLabel: ROLE_LABEL[user.role],
    loading,
    scopeNote:
      scope === "staff_self"
        ? "Vue limitée à vos prestations."
        : scope === "cash_only"
          ? "Vue caisse : finance uniquement."
          : null,
    periodLabel: formatPeriodRange(preset),
    compareLabel: comparePeriodLabel(overview, compare),
    compare,
    onCompare: () => setCompare((v) => !v),
    generatedAt: formatGeneratedAt(meta?.generatedAt ?? null),
    preset,
    onPreset: setPreset,
    showStaffServiceFilters: scope === "full",
    staffId,
    serviceId,
    staffOpts,
    serviceOpts,
    onStaff: setStaffId,
    onService: setServiceId,
    overview,
    agenda,
    customers,
    services,
    staffRows,
    inventory,
    ledgerLen: ledger.length,
    marketing,
    reviews,
    giftBalance,
    modules,
    activeType,
    onSelectType: setActiveType,
    insight,
    pnl,
    bars,
    payments: revenue?.byPaymentMethod ?? [],
    top,
    onExport: exportFile,
    onPrint: () => window.print(),
    onAuto: () => setAutoOpen(true),
    onRefresh: () => {
      setLoading(true);
      refresh().finally(() => setLoading(false));
    },
    canMarketing,
    canGiftCards,
    canReviews,
    canCommissions,
    canLoyalty,
  };

  if (!scope) {
    return (
      <div className="rounded-xl bg-white p-8 text-center text-sm text-ink/50">
        Vous n&apos;avez pas accès aux rapports.
      </div>
    );
  }

  return (
    <>
      <ReportsMobile {...vm} />
      <ReportsDesktop
        vm={vm}
        exportOpen={exportOpen}
        setExportOpen={setExportOpen}
        exportRef={exportRef}
        customerRows={customerRows}
        ledger={ledger}
        loyalty={loyalty}
        canReactivation={canReactivation}
      />
      <Drawer open={autoOpen} onClose={() => setAutoOpen(false)} title="Rapports automatisés">
        <div className="space-y-3 text-sm text-on-surface">
          <p>
            Les envois planifiés vers un expert-comptable, un hashing SHA-256 ou un fichier FEC Sage/Cegid ne sont pas
            disponibles dans cette version.
          </p>
          <p className="text-on-surface-variant">
            Exportez à la demande le module actuellement affiché ({activeType}) en PDF, Excel ou CSV. L&apos;impression
            utilise la vue navigateur.
          </p>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              className="h-10 rounded-lg bg-primary-container text-sm font-bold text-on-primary-container"
              onClick={() => {
                exportFile("pdf");
                setAutoOpen(false);
              }}
            >
              PDF
            </button>
            <button
              type="button"
              className="h-10 rounded-lg bg-surface-container text-sm font-bold"
              onClick={() => {
                exportFile("xlsx");
                setAutoOpen(false);
              }}
            >
              Excel
            </button>
          </div>
        </div>
      </Drawer>
    </>
  );
}
