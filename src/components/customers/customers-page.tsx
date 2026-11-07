"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ROLE_LABEL, useCurrentUser } from "@/components/auth/session-provider";
import CustomersDashboard, {
  type Customer,
  type CustomerFilter,
} from "@/components/customers/CustomersDashboard";
import NouvelleClienteModal from "@/components/customers/nouvelle-cliente-modal";
import { CustomersMobile } from "@/components/customers/customers-mobile";
import {
  APPOINTMENT_STATUS_UI,
  customerWhatsappMessage,
  whatsappHref,
} from "@/components/customers/customers-helpers";
import { useToast } from "@/components/ui/toast";
import { canEditCustomerMarketing, canReadAnalytics, canWriteFeatureLimited } from "@/lib/rbac";
import { getAnalyticsOverview } from "@/modules/analytics/service";
import {
  createCustomer,
  getCustomer,
  getCustomerStats,
  listCustomerNotes,
  listCustomers,
  updateCustomer,
} from "@/modules/customers/service";
import { getCustomerLoyalty } from "@/modules/loyalty/service";
import { getReactivationDashboard } from "@/modules/reactivation/service";
import { openReportExport } from "@/modules/reports/service";
import type { AnalyticsOverview } from "@/types/analytics";
import type {
  CustomerDetail,
  CustomerKpis,
  CustomerListItem,
  CustomerSegment,
} from "@/types/customer";

const PAGE_SIZE = 10;

const EMPTY_KPIS: CustomerKpis = {
  total: 0,
  newCount: 0,
  vipCount: 0,
  inactiveCount: 0,
  activeCount: 0,
  atRiskCount: 0,
};

function segmentToFilter(segment: CustomerSegment): CustomerFilter {
  switch (segment) {
    case "ACTIVE":
      return "active";
    case "AT_RISK":
      return "followup";
    case "VIP":
      return "vip";
    case "NEW":
      return "new";
    default:
      return "all";
  }
}

function filterToSegment(filter: CustomerFilter): CustomerSegment {
  switch (filter) {
    case "active":
      return "ACTIVE";
    case "followup":
      return "AT_RISK";
    case "vip":
      return "VIP";
    case "new":
      return "NEW";
    default:
      return "ALL";
  }
}

function mapCustomerStatus(item: CustomerListItem): Customer["status"] {
  if (item.segment === "VIP") return "vip";
  if (item.segment === "NEW") return "new";
  if (item.segment === "AT_RISK") return "followup";
  if (item.segment === "INACTIVE" || item.status === "INACTIVE" || item.status === "ARCHIVED") {
    return "inactive";
  }
  return "active";
}

function mapListItem(item: CustomerListItem, extras?: Partial<Customer>): Customer {
  const visitsFromList = Number(item.visits);
  const revenueFromList = Number(item.revenue);

  return {
    id: item.id,
    name: `${item.firstName ?? ""} ${item.lastName ?? ""}`.trim() || "Cliente",
    phone: item.phone || null,
    email: item.email || null,
    status: mapCustomerStatus(item),
    lastVisit: item.lastVisitAt ?? null,
    createdAt: item.createdAt ?? null,
    visits: Number.isFinite(visitsFromList) ? visitsFromList : 0,
    totalSpent: Number.isFinite(revenueFromList) ? revenueFromList : 0,
    loyaltyPoints: typeof extras?.loyaltyPoints === "number" ? extras.loyaltyPoints : 0,
    appointments: extras?.appointments,
    notes: extras?.notes,
  };
}

export function CustomersPageView() {
  const router = useRouter();
  const { toast } = useToast();
  const user = useCurrentUser();
  const canWrite = canWriteFeatureLimited(user.role, "customers");
  const canMarketing = canEditCustomerMarketing(user.role);
  const financeHidden = user.role === "STAFF" || user.role === "CASHIER";
  const canExport = canReadAnalytics(user.role) && !financeHidden;

  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState<CustomerSegment>("ALL");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<CustomerListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [kpis, setKpis] = useState<CustomerKpis>(EMPTY_KPIS);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [reactivationPotential, setReactivationPotential] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [profileExtras, setProfileExtras] = useState<Record<string, Partial<Customer>>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerDetail | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const refresh = useCallback(async () => {
    try {
      const res = await listCustomers({ search, segment, page, limit: PAGE_SIZE });
      setRows(res.data);
      setKpis({ ...EMPTY_KPIS, ...res.kpis });
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
      setSelectedId((current) => {
        if (current && res.data.some((row) => row.id === current)) return current;
        return res.data[0]?.id ?? null;
      });
    } catch {
      toast("Impossible de charger les clientes.", "error");
    }
  }, [search, segment, page, toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    if (financeHidden) return;
    getAnalyticsOverview({ preset: "month", compare: true })
      .then(setOverview)
      .catch(() => setOverview(null));
    getReactivationDashboard({ relanceOnly: false })
      .then((d) => setReactivationPotential(d.kpis.estimatedRevenue))
      .catch(() => setReactivationPotential(null));
  }, [financeHidden]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;

    void (async () => {
      const [detail, stats, notes, loyalty] = await Promise.allSettled([
        getCustomer(selectedId, true),
        getCustomerStats(selectedId),
        listCustomerNotes(selectedId),
        getCustomerLoyalty(selectedId),
      ]);
      if (cancelled) return;

      const appointments =
        detail.status === "fulfilled"
          ? (detail.value.history ?? []).map((item) => ({
              id: item.id,
              service: item.serviceName,
              date: item.startAt,
              amount: item.price,
              status: APPOINTMENT_STATUS_UI[item.status]?.label ?? item.status,
            }))
          : [];

      const noteTexts =
        notes.status === "fulfilled"
          ? notes.value.map((note) => note.content)
          : detail.status === "fulfilled" && detail.value.customer.notes
            ? [detail.value.customer.notes]
            : [];

      const loyaltyPoints =
        stats.status === "fulfilled"
          ? stats.value.loyaltyPoints
          : loyalty.status === "fulfilled"
            ? (loyalty.value.account?.balance ?? 0)
            : 0;

      setProfileExtras((prev) => ({
        ...prev,
        [selectedId]: {
          appointments,
          notes: noteTexts,
          loyaltyPoints,
        },
      }));
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const selected = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId]);

  const mappedCustomers = useMemo(
    () => rows.map((row) => mapListItem(row, profileExtras[row.id])),
    [rows, profileExtras],
  );

  function segmentCount(s: CustomerSegment): number {
    if (s === "ALL") return kpis.total;
    if (s === "ACTIVE") return kpis.activeCount;
    if (s === "AT_RISK") return kpis.atRiskCount;
    if (s === "VIP") return kpis.vipCount;
    if (s === "NEW") return kpis.newCount;
    return 0;
  }

  async function handleCreate(data: Parameters<typeof createCustomer>[0]) {
    setSubmitting(true);
    const result = await createCustomer(data);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setDrawerOpen(false);
    toast("Cliente créée.", "success");
    void refresh();
  }

  async function handleUpdate(data: Parameters<typeof updateCustomer>[1]) {
    if (!editing) return;
    setSubmitting(true);
    const result = await updateCustomer(editing.id, data);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setEditing(null);
    toast("Profil mis à jour.", "success");
    void refresh();
  }

  function openCreate() {
    setEditing(null);
    setDrawerOpen(true);
  }

  function openEdit(id: string) {
    void getCustomer(id)
      .then((res) => setEditing(res.customer))
      .catch(() => toast("Impossible d’ouvrir le profil.", "error"));
  }

  function openCustomerWhatsApp(customer: Customer) {
    if (!customer.phone) {
      toast("Aucun téléphone pour cette cliente.", "error");
      return;
    }
    const firstName = customer.name.split(/\s+/)[0] || customer.name;
    window.open(
      whatsappHref(customer.phone, firstName, customerWhatsappMessage(firstName, user.orgName)),
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-8">
      <CustomersMobile
        orgName={user.orgName}
        roleLabel={ROLE_LABEL[user.role] ?? user.role}
        kpis={kpis}
        overview={overview}
        reactivationPotential={reactivationPotential}
        financeHidden={financeHidden}
        canWrite={canWrite}
        canExport={canExport}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        segment={segment}
        onSegmentChange={(s) => {
          setSegment(s);
          setPage(1);
        }}
        segmentCount={segmentCount}
        rows={rows}
        loading={loading}
        total={total}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onSelect={setSelectedId}
        selected={selected}
        onNewCustomer={openCreate}
        onEdit={openEdit}
        onExport={() => openReportExport("customers", "csv", { preset: "year" })}
      />

      <div className="hidden lg:block">
        <CustomersDashboard
          customers={mappedCustomers}
          monthlyRevenue={financeHidden ? undefined : overview?.revenue.value}
          averageBasket={financeHidden ? undefined : overview?.averageTicket.value}
          newCustomersCount={kpis.newCount}
          filterCounts={{
            all: kpis.total,
            active: kpis.activeCount,
            followup: kpis.atRiskCount,
            vip: kpis.vipCount,
            new: kpis.newCount,
          }}
          searchValue={searchInput}
          onSearchChange={setSearchInput}
          filterValue={segmentToFilter(segment)}
          onFilterChange={(next) => {
            setSegment(filterToSegment(next));
            setPage(1);
          }}
          selectedId={selectedId}
          onSelectCustomer={(customer) => setSelectedId(customer?.id ?? null)}
          page={page}
          pageSize={PAGE_SIZE}
          totalPages={totalPages}
          totalResults={total}
          onPageChange={setPage}
          serverControlled
          loading={loading}
          canCreate={canWrite}
          onCreateCustomer={canWrite ? openCreate : undefined}
          onEditCustomer={canWrite ? (customer) => openEdit(customer.id) : undefined}
          onNewAppointment={(customer) => router.push(`/agenda/?customerId=${customer.id}`)}
          onPayment={(customer) => router.push(`/cash-register/?customerId=${customer.id}`)}
          onWhatsApp={openCustomerWhatsApp}
          onRefresh={refresh}
        />
      </div>

      <NouvelleClienteModal
        key={editing?.id ?? "new"}
        open={drawerOpen || Boolean(editing)}
        onClose={() => {
          setDrawerOpen(false);
          setEditing(null);
        }}
        initial={editing ?? undefined}
        submitting={submitting}
        onSubmit={editing ? handleUpdate : handleCreate}
      />
    </div>
  );
}
