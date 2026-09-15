"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnalyticsDesktop } from "@/components/analytics/analytics-desktop";
import { AnalyticsMobile } from "@/components/analytics/analytics-mobile";
import {
  avgOccupation,
  avgServiceMargin,
  buildAnalyticsInsight,
  buildHealthScore,
  buildPnlExpress,
  comparePeriodLabel,
  formatGeneratedAt,
  formatPeriodRange,
  marketingAttributed,
  peakWeekday,
  presenceRate,
  retentionFunnel,
  weeklyRevenueBars,
  type AnalyticsViewModel,
} from "@/components/analytics/analytics-helpers";
import { ROLE_LABEL, useCurrentUser } from "@/components/auth/session-provider";
import { useToast } from "@/components/ui/toast";
import type { AnalyticsPeriodPreset } from "@/lib/analytics/period";
import { canAccessNav, getAnalyticsScope } from "@/lib/rbac";
import {
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
import type {
  AnalyticsOverview,
  AppointmentAnalytics,
  CustomerAnalytics,
  InventoryAnalytics,
  LoyaltyAnalytics,
  MarketingAnalyticsRow,
  ReviewAnalytics,
  RevenueAnalytics,
  ServiceAnalyticsRow,
  StaffAnalyticsRow,
} from "@/types/analytics";

export function AnalyticsPageView() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const scope = getAnalyticsScope(user.role);
  const canMarketing = canAccessNav(user.role, "marketing");
  const canReactivation = canAccessNav(user.role, "reactivation");
  const canStock = canAccessNav(user.role, "stock") || canAccessNav(user.role, "products");
  const canGiftCards = canAccessNav(user.role, "gift-cards");
  const canReviews = canAccessNav(user.role, "reviews");
  const canLoyalty = canAccessNav(user.role, "loyalty");

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
      if (scope === "cash_only") {
        const [ov, rev] = await Promise.all([
          getAnalyticsOverview(filters),
          getAnalyticsRevenue(filters),
        ]);
        setOverview(ov);
        setRevenue(rev);
        setAppointments(null);
        setCustomers(null);
        setServices([]);
        setStaff([]);
        setInventory(null);
        setMarketing([]);
        setLoyalty(null);
        setReviews(null);
        return;
      }

      const tasks: Promise<void>[] = [
        getAnalyticsOverview(filters).then(setOverview),
        getAnalyticsRevenue(filters).then(setRevenue),
        getAnalyticsAppointments(filters).then(setAppointments),
        getAnalyticsServices(filters).then((r) => setServices(r.items)),
        getAnalyticsStaff(filters).then((r) => setStaff(r.items)),
      ];

      if (scope === "full") {
        tasks.push(
          getAnalyticsCustomers(filters).then(setCustomers),
          getAnalyticsInventory(filters).then(setInventory),
        );
        if (canMarketing) {
          tasks.push(getAnalyticsMarketing(filters).then((m) => setMarketing(m.items)));
        }
        if (canReviews) {
          tasks.push(getAnalyticsReviews(filters).then(setReviews));
        }
        if (canLoyalty) {
          tasks.push(getAnalyticsLoyalty(filters).then(setLoyalty));
        }
      }

      await Promise.all(tasks);
    } catch {
      toast("Impossible de charger les analytics.", "error");
    }
  }, [canLoyalty, canMarketing, canReviews, filters, scope, toast]);

  useEffect(() => {
    if (!scope) return;
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh, scope]);

  function exportFile(format: "csv" | "xlsx" | "pdf") {
    openReportExport("global", format, filters);
    toast(`Export ${format.toUpperCase()} lancé.`, "success");
  }

  const firstName = user.firstName?.trim() || "là";
  const insight = useMemo(
    () =>
      buildAnalyticsInsight({
        firstName,
        overview,
        services,
        customers,
        inventory,
        appointments,
        canReactivation,
        canMarketing,
      }),
    [appointments, canMarketing, canReactivation, customers, firstName, inventory, overview, services],
  );

  const health = useMemo(
    () =>
      buildHealthScore({
        overview,
        appointments,
        customers,
        inventory,
        reviews,
        marketing,
        staff,
      }),
    [appointments, customers, inventory, marketing, overview, reviews, staff],
  );

  const vm: AnalyticsViewModel = {
    orgName: user.orgName,
    roleLabel: ROLE_LABEL[user.role],
    firstName,
    loading,
    scopeNote:
      scope === "staff_self"
        ? "Vue limitée à vos prestations."
        : scope === "cash_only"
          ? "Vue caisse : indicateurs financiers uniquement."
          : null,
    periodLabel: formatPeriodRange(preset),
    compareLabel: comparePeriodLabel(overview, compare),
    compare,
    onCompare: () => setCompare((v) => !v),
    generatedAt: formatGeneratedAt(),
    preset,
    onPreset: setPreset,
    overview,
    revenue,
    appointments,
    customers,
    services,
    staff,
    inventory,
    marketing,
    reviews,
    loyalty,
    payments: revenue?.byPaymentMethod ?? [],
    insight,
    health,
    funnel: retentionFunnel(customers),
    weekly: weeklyRevenueBars(revenue?.daily),
    pnl: buildPnlExpress(overview, staff),
    presence: presenceRate(appointments),
    occupation: avgOccupation(appointments),
    avgMargin: avgServiceMargin(services),
    marketingRevenue: marketingAttributed(marketing),
    peakDay: peakWeekday(appointments),
    onExport: exportFile,
    onRefresh: () => {
      setLoading(true);
      refresh().finally(() => setLoading(false));
    },
    canReactivation,
    canMarketing,
    canStock,
    canGiftCards,
  };

  if (!scope) {
    return (
      <div className="rounded-2xl bg-surface-container-lowest p-8 text-center text-sm text-on-surface-variant shadow-sm">
        Vous n&apos;avez pas accès aux analytics.
      </div>
    );
  }

  return (
    <>
      <AnalyticsMobile {...vm} />
      <AnalyticsDesktop vm={vm} />
    </>
  );
}
