"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  MoreVertical,
  RefreshCw,
  Search,
  UserPlus,
  Users,
} from "lucide-react";
import { ROLE_LABEL, useCurrentUser } from "@/components/auth/session-provider";
import { CustomerForm } from "@/components/customers/customer-form";
import { CustomerKpisRow } from "@/components/customers/customer-kpis";
import { CustomersMobile } from "@/components/customers/customers-mobile";
import { CustomerPreviewPane } from "@/components/customers/customer-preview-pane";
import {
  customerInitials,
  formatRelativeVisit,
  segmentBadge,
} from "@/components/customers/customers-helpers";
import { Drawer } from "@/components/ui/drawer";
import { useToast } from "@/components/ui/toast";
import { canEditCustomerMarketing, canReadAnalytics, canWriteFeatureLimited } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { formatMad, getAnalyticsOverview } from "@/modules/analytics/service";
import {
  createCustomer,
  formatLastVisit,
  formatSegmentLabel,
  getCustomer,
  listCustomers,
  updateCustomer,
} from "@/modules/customers/service";
import { getReactivationDashboard } from "@/modules/reactivation/service";
import { openReportExport } from "@/modules/reports/service";
import type { AnalyticsOverview } from "@/types/analytics";
import type { CustomerDetail, CustomerKpis, CustomerListItem, CustomerSegment } from "@/types/customer";

const SEGMENTS: CustomerSegment[] = ["ALL", "ACTIVE", "AT_RISK", "VIP", "NEW"];
const PAGE_SIZE = 10;

const EMPTY_KPIS: CustomerKpis = {
  total: 0,
  newCount: 0,
  vipCount: 0,
  inactiveCount: 0,
  activeCount: 0,
  atRiskCount: 0,
};

export function CustomersPageView() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canWrite = canWriteFeatureLimited(user.role, "customers");
  const canMarketing = canEditCustomerMarketing(user.role);
  const financeHidden = user.role === "STAFF" || user.role === "CASHIER";
  const canExport = canReadAnalytics(user.role) && user.role !== "STAFF" && user.role !== "CASHIER";

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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerDetail | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);

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

  const selected = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId]);

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
    refresh();
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
    refresh();
  }

  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  function openCreate() {
    setEditing(null);
    setDrawerOpen(true);
  }

  function openEdit(id: string) {
    void getCustomer(id)
      .then((res) => setEditing(res.customer))
      .catch(() => toast("Impossible d’ouvrir le profil.", "error"));
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

      <div className="hidden flex-col gap-5 lg:flex">
      <section className="rounded-xl bg-white p-4 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/40">
          Gestion de la relation cliente
        </p>
        <div className="mt-1 flex items-center gap-2">
          <Users size={22} className="text-primary" />
          <h1 className="font-display text-[22px] font-bold tracking-tight text-ink">
            Gestion des clientes
          </h1>
        </div>
        <p className="mt-1 text-[13px] text-ink/50">
          Fiches, historique de soins, fidélité et relance — {user.orgName || "votre institut"}.
        </p>
      </section>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Rechercher par nom, téléphone, e-mail…"
            className="h-12 w-full rounded-xl bg-white pl-12 pr-4 text-sm text-ink shadow-sm outline-none placeholder:text-ink/35 focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto">
          {canExport ? (
            <button
              type="button"
              onClick={() => openReportExport("customers", "csv", { preset: "year" })}
              className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-white px-4 text-[13px] font-semibold text-ink shadow-sm"
            >
              <Download size={16} />
              Exporter
            </button>
          ) : null}
          {canWrite ? (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-primary px-5 text-[13px] font-semibold text-white shadow-md"
            >
              <UserPlus size={18} />
              Nouvelle cliente
            </button>
          ) : null}
        </div>
      </div>

      <CustomerKpisRow
        kpis={kpis}
        revenue={overview?.revenue.value}
        revenueChange={overview?.revenue.changePercent}
        averageTicket={overview?.averageTicket.value}
        ticketChange={overview?.averageTicket.changePercent}
        financeHidden={financeHidden}
      />

      <div className="flex flex-col justify-between gap-3 rounded-xl bg-white p-3 shadow-sm lg:flex-row lg:items-center">
        <div className="flex gap-1.5 overflow-x-auto">
          {SEGMENTS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setSegment(s);
                setPage(1);
              }}
              className={cn(
                "whitespace-nowrap rounded-lg px-3.5 py-1.5 text-[13px] font-semibold",
                segment === s
                  ? s === "AT_RISK"
                    ? "bg-amber-500/10 text-amber-800"
                    : s === "VIP"
                      ? "bg-[#FCCA66]/30 text-[#7B5900]"
                      : s === "NEW"
                        ? "bg-primary/10 text-primary"
                        : "bg-[#FCE9F4] text-ink"
                  : "text-ink/50 hover:bg-[#FFEFF8]",
              )}
            >
              {formatSegmentLabel(s)} ({segmentCount(s)})
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
        <div className="flex flex-col gap-2 rounded-2xl bg-white p-3 shadow-sm lg:col-span-7">
          <div className="flex items-center justify-between px-1 py-1">
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-bold text-ink">Base clientes</span>
              <span className="rounded-full bg-[#FCE9F4] px-2 py-0.5 text-[11px] font-semibold text-ink/50">
                {total} résultat{total > 1 ? "s" : ""}
              </span>
            </div>
            <button
              type="button"
              onClick={() => refresh()}
              className="rounded-lg p-1 text-ink/40 hover:bg-[#FFEFF8] hover:text-ink"
              title="Actualiser"
            >
              <RefreshCw size={16} />
            </button>
          </div>

          {loading ? (
            <p className="px-2 py-10 text-center text-sm text-ink/40">Chargement…</p>
          ) : rows.length === 0 ? (
            <p className="px-2 py-10 text-center text-sm text-ink/45">Aucune cliente trouvée.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="bg-[#FFEFF8] text-[11px] font-semibold uppercase tracking-wider text-ink/45">
                      <th className="rounded-l-lg px-3 py-3">Cliente</th>
                      <th className="px-3 py-3">Dernière visite</th>
                      <th className="px-3 py-3">RDV</th>
                      <th className="px-3 py-3">CA</th>
                      <th className="px-3 py-3">Statut</th>
                      <th className="rounded-r-lg px-3 py-3 text-right"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((c) => {
                      const badge = segmentBadge(c.segment);
                      const active = c.id === selectedId;
                      return (
                        <tr
                          key={c.id}
                          onClick={() => setSelectedId(c.id)}
                          className={cn(
                            "cursor-pointer border-b border-transparent transition-colors",
                            active ? "bg-primary/10" : "hover:bg-[#FFEFF8]",
                          )}
                        >
                          <td className="px-3 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="relative">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FCE9F4] text-sm font-bold text-primary shadow-sm">
                                  {customerInitials(c.firstName, c.lastName)}
                                </div>
                                {c.segment === "VIP" ? (
                                  <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#7B5900] text-[9px] text-white">
                                    ★
                                  </span>
                                ) : null}
                              </div>
                              <div className="min-w-0">
                                <p className={cn("truncate font-bold", active ? "text-primary" : "text-ink")}>
                                  {c.firstName} {c.lastName}
                                </p>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-[11px] text-ink/45">{c.phone}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3.5">
                            <p className="text-xs font-medium">{formatLastVisit(c.lastVisitAt)}</p>
                            <p
                              className={cn(
                                "text-[11px]",
                                c.segment === "AT_RISK" ? "font-semibold text-amber-700" : "text-ink/45",
                              )}
                            >
                              {formatRelativeVisit(c.lastVisitAt)}
                            </p>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3.5">
                            <span className="font-bold">{c.visits} RDV</span>
                            <span
                              className={cn(
                                "ml-1 text-[11px] font-semibold",
                                c.noShowCount > 0 ? "text-rose-600" : "text-emerald-600",
                              )}
                            >
                              ({c.noShowCount} no-show)
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3.5 font-bold">{formatMad(c.revenue)}</td>
                          <td className="whitespace-nowrap px-3 py-3.5">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                badge.className,
                              )}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-current" />
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-3 py-3.5" />
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between px-1 pt-3 text-[11px] text-ink/45">
                <span>
                  Affichage {from}-{to} sur {total} cliente{total > 1 ? "s" : ""}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FCE9F4] disabled:opacity-40"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-primary px-2 font-bold text-white">
                    {page}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FCE9F4] disabled:opacity-40"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="hidden lg:col-span-5 lg:block">
          {selected ? (
            <CustomerPreviewPane
              key={selected.id}
              customerId={selected.id}
              fallback={selected}
              canWrite={canWrite}
              onEdit={() => openEdit(selected.id)}
            />
          ) : (
            <div className="rounded-2xl bg-white p-8 text-center text-sm text-ink/45 shadow-sm">
              Sélectionnez une cliente pour afficher sa fiche 360°.
            </div>
          )}
        </div>
      </div>
      <p className="text-center text-[11px] text-ink/35">
        Les fiches clientes restent dans votre institut. Aucun envoi WhatsApp n’est déclenché sans votre clic.
      </p>
      </div>

      <Drawer
        open={drawerOpen || Boolean(editing)}
        onClose={() => {
          setDrawerOpen(false);
          setEditing(null);
        }}
        title={editing ? "Modifier la cliente" : "Nouvelle cliente"}
        side="right"
      >
        <CustomerForm
          key={editing?.id ?? "new"}
          initial={editing ?? undefined}
          canEditMarketing={canMarketing}
          submitting={submitting}
          onSubmit={editing ? handleUpdate : handleCreate}
          onCancel={() => {
            setDrawerOpen(false);
            setEditing(null);
          }}
        />
      </Drawer>
    </div>
  );
}
