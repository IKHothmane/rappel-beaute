"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  CalendarDays,
  Download,
  LayoutGrid,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
  Star,
  Store,
  Table2,
  Timer,
  Users,
  Wallet,
} from "lucide-react";
import { ROLE_LABEL, useCurrentUser } from "@/components/auth/session-provider";
import { whatsappHref } from "@/components/customers/customers-helpers";
import { StaffFocusPanel } from "@/components/staff/staff-focus-panel";
import { StaffForm } from "@/components/staff/staff-form";
import {
  shortStaffRef,
  staffInitials,
  statusChipClass,
  statusDotClass,
} from "@/components/staff/staff-helpers";
import { StaffMobile } from "@/components/staff/staff-mobile";
import { Drawer } from "@/components/ui/drawer";
import { useToast } from "@/components/ui/toast";
import {
  canReadAnalytics,
  canViewStaffCommissions,
  canViewStaffPerformanceFull,
  canWriteStaff,
} from "@/lib/rbac";
import { cn } from "@/lib/utils";
import {
  formatMad,
  formatPct,
  getAnalyticsOverview,
  getAnalyticsReviews,
  getAnalyticsStaff,
} from "@/modules/analytics/service";
import { openReportExport } from "@/modules/reports/service";
import { createStaff, getStaff, listStaff, updateStaff } from "@/modules/staff/service";
import type { AnalyticsOverview, ReviewAnalytics, StaffAnalyticsRow } from "@/types/analytics";
import type { StaffDetail, StaffListItem, StaffStatus } from "@/types/staff";
import { STAFF_STATUS_LABEL } from "@/types/staff";

type StaffFilter = "all" | "active" | "leave" | "top";
type ViewMode = "grid" | "table";

export function StaffPageView() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canWrite = canWriteStaff(user.role);
  const canPerf = canViewStaffPerformanceFull(user.role);
  const canCommissions = canViewStaffCommissions(user.role);
  const financeHidden = user.role === "STAFF" || user.role === "CASHIER";
  const canExport = canReadAnalytics(user.role) && !financeHidden;

  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StaffFilter>("all");
  const [position, setPosition] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [catalog, setCatalog] = useState<StaffListItem[]>([]);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [staffStats, setStaffStats] = useState<StaffAnalyticsRow[]>([]);
  const [statsReady, setStatsReady] = useState(false);
  const [reviews, setReviews] = useState<ReviewAnalytics | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<StaffDetail | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await listStaff({ limit: 100 });
      setCatalog(res.data);
      setSelectedId((current) => {
        if (current && res.data.some((row) => row.id === current)) return current;
        return res.data[0]?.id ?? null;
      });
    } catch {
      toast("Impossible de charger les employées.", "error");
    }
  }, [toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    getAnalyticsOverview({ preset: "month", compare: true })
      .then(setOverview)
      .catch(() => setOverview(null));
    getAnalyticsStaff({ preset: "month" })
      .then((res) => setStaffStats(res.items))
      .catch(() => setStaffStats([]))
      .finally(() => setStatsReady(true));
    getAnalyticsReviews({ preset: "month" })
      .then(setReviews)
      .catch(() => setReviews(null));
  }, []);

  const monthlyById = useMemo(() => {
    const map = new Map<string, StaffAnalyticsRow>();
    for (const row of staffStats) map.set(row.staffId, row);
    return map;
  }, [staffStats]);

  const monthCatalog = useMemo(() => {
    if (!statsReady) return catalog;
    const hasMonthly = staffStats.some((r) => r.appointments > 0 || r.revenue > 0);
    if (!hasMonthly) return catalog;
    return catalog.map((s) => {
      const st = monthlyById.get(s.id);
      return {
        ...s,
        appointmentCount: st?.appointments ?? 0,
        revenue: st?.revenue ?? 0,
      };
    });
  }, [catalog, monthlyById, staffStats, statsReady]);

  const activeCount = catalog.filter((s) => s.status === "ACTIVE").length;
  const leaveCount = catalog.filter((s) => s.status === "ON_LEAVE").length;
  const usingMonthly = statsReady && staffStats.some((r) => r.appointments > 0 || r.revenue > 0);
  const teamRevenue = monthCatalog.reduce((sum, s) => sum + s.revenue, 0);
  const commissionTotal = canCommissions
    ? staffStats.reduce((sum, row) => sum + row.commission, 0)
    : null;

  const topSellerIds = useMemo(() => {
    const ranked = [...monthCatalog].filter((s) => s.revenue > 0).sort((a, b) => b.revenue - a.revenue);
    return new Set(ranked.slice(0, 3).map((s) => s.id));
  }, [monthCatalog]);

  const positions = useMemo(() => {
    const set = new Set<string>();
    for (const s of catalog) {
      if (s.position?.trim()) set.add(s.position.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b, "fr"));
  }, [catalog]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return monthCatalog.filter((s) => {
      if (filter === "active" && s.status !== "ACTIVE") return false;
      if (filter === "leave" && s.status !== "ON_LEAVE") return false;
      if (filter === "top" && !topSellerIds.has(s.id)) return false;
      if (position && (s.position ?? "") !== position) return false;
      if (!q) return true;
      return (
        s.displayName.toLowerCase().includes(q) ||
        (s.position ?? "").toLowerCase().includes(q) ||
        (s.phone ?? "").toLowerCase().includes(q) ||
        (s.email ?? "").toLowerCase().includes(q) ||
        s.serviceNames.some((n) => n.toLowerCase().includes(q))
      );
    });
  }, [monthCatalog, search, filter, position, topSellerIds]);

  useEffect(() => {
    setSelectedId((current) => {
      if (current && filtered.some((row) => row.id === current)) return current;
      return filtered[0]?.id ?? null;
    });
  }, [filtered]);

  const selected = filtered.find((s) => s.id === selectedId) ?? filtered[0] ?? null;
  const topSeller = monthCatalog
    .filter((s) => s.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)[0];

  const insight =
    topSeller && topSeller.revenue > 0 && canPerf && !financeHidden
      ? `${topSeller.displayName} génère le plus de CA${usingMonthly ? " ce mois" : ""} (${formatMad(topSeller.revenue)}, ${topSeller.appointmentCount} RDV).`
      : topSeller && topSeller.appointmentCount > 0
        ? `${topSeller.displayName} a le plus de rendez-vous${usingMonthly ? " ce mois" : ""} (${topSeller.appointmentCount} RDV).`
        : overview && overview.appointments.value > 0
          ? "Des rendez-vous sont prévus ce mois — le classement s’affiche après réalisation."
          : "Pas encore assez de rendez-vous ce mois pour un classement.";

  async function openCreate() {
    setEditing(null);
    setDrawerOpen(true);
    setMenuId(null);
  }

  async function openEdit(id: string) {
    try {
      const detail = await getStaff(id);
      setEditing(detail);
      setDrawerOpen(true);
      setMenuId(null);
    } catch {
      toast("Impossible de charger la fiche.", "error");
    }
  }

  async function handleSubmit(data: Parameters<typeof createStaff>[0]) {
    setSubmitting(true);
    const result = editing ? await updateStaff(editing.id, data) : await createStaff(data);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setDrawerOpen(false);
    setEditing(null);
    toast(editing ? "Fiche mise à jour." : "Collaboratrice créée.", "success");
    refresh();
  }

  async function handleStatus(id: string, status: StaffStatus) {
    if (!canWrite) return;
    const result = await updateStaff(id, { status });
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast(
      status === "ACTIVE" ? "Collaboratrice réactivée." : status === "ON_LEAVE" ? "Mise en congé." : "Statut mis à jour.",
      "success",
    );
    setMenuId(null);
    refresh();
  }

  function handleExport() {
    openReportExport("staff", "csv", { preset: "month" });
  }

  const apptChange = overview?.appointments.changePercent;
  const revChange = overview?.revenue.changePercent;

  const focusInsight =
    selected && canPerf && !financeHidden && selected.revenue > 0 && teamRevenue > 0
      ? `${selected.displayName} a réalisé ${formatMad(selected.revenue)}${usingMonthly ? " ce mois" : ""} (${selected.appointmentCount} RDV, ${Math.round((selected.revenue / teamRevenue) * 100)} % du CA équipe).`
      : selected && selected.appointmentCount > 0
        ? `${selected.displayName} a ${selected.appointmentCount} rendez-vous${usingMonthly ? " ce mois" : ""}.`
        : insight;

  return (
    <div className="flex flex-col gap-5 pb-8">
      <StaffMobile
        orgName={user.orgName}
        catalogCount={catalog.length}
        activeCount={activeCount}
        leaveCount={leaveCount}
        canWrite={canWrite}
        canPerf={canPerf}
        canCommissions={canCommissions}
        canExport={canExport}
        financeHidden={financeHidden}
        overview={overview}
        reviews={reviews}
        commissionTotal={commissionTotal}
        insight={focusInsight}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchRef={searchRef}
        filter={filter}
        onFilterChange={setFilter}
        position={position}
        onPositionChange={setPosition}
        positions={positions}
        filtered={filtered}
        loading={loading}
        selectedId={selectedId}
        onSelect={setSelectedId}
        selected={selected}
        topSellerIds={topSellerIds}
        teamRevenue={teamRevenue}
        menuId={menuId}
        onMenu={setMenuId}
        onCreate={() => void openCreate()}
        onEdit={(id) => void openEdit(id)}
        onStatus={(id, status) => void handleStatus(id, status)}
        onExport={handleExport}
      />

      <div className="hidden flex-col gap-5 lg:flex">
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="flex items-center gap-2 font-display text-[28px] font-bold leading-9 tracking-tight text-ink lg:text-[32px]">
                <Users size={26} className="text-primary" />
                Gestion de l’équipe & staff
              </h1>
              <p className="mt-1 max-w-3xl text-[15px] text-ink/50">
                Praticiennes, habilitations, commissions et performances — {user.orgName || "votre institut"}.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canWrite ? (
                <button
                  type="button"
                  onClick={() => void openCreate()}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-[13px] font-semibold text-white shadow-md"
                >
                  <Plus size={18} />
                  Ajouter un employé
                </button>
              ) : null}
              <Link
                href="/planning/"
                className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-white px-3.5 text-[13px] font-semibold text-ink shadow-sm"
              >
                <CalendarDays size={16} className="text-[#7B5900]" />
                Planning général
              </Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          <KpiCard
            label="Équipe totale"
            value={String(catalog.length)}
            hint={`${activeCount} actives · ${leaveCount} congé`}
            icon={Users}
          />
          <KpiCard
            label="Actives"
            value={String(activeCount)}
            hint={leaveCount ? `${leaveCount} en congé` : "Toute l’équipe dispo"}
            icon={Sparkles}
            tone="emerald"
          />
          <KpiCard
            label="En congé"
            value={String(leaveCount)}
            hint="Congé en cours"
            icon={Timer}
            tone="gold"
          />
          <KpiCard
            label="Soins honorés"
            value={overview ? String(overview.appointments.value) : "—"}
            hint={
              apptChange != null ? (
                <span className={apptChange >= 0 ? "text-emerald-700" : "text-red-700"}>
                  {formatPct(apptChange)} vs m-1
                </span>
              ) : (
                "Mois en cours"
              )
            }
            icon={CalendarDays}
          />
          <KpiCard
            label="CA praticiennes"
            value={financeHidden || !canPerf ? "—" : formatMad(teamRevenue)}
            hint={
              financeHidden || !canPerf
                ? "Accès limité"
                : revChange != null
                  ? `${formatPct(revChange)} vs m-1`
                  : usingMonthly
                    ? "CA attribué ce mois"
                    : "CA attribué (cumul)"
            }
            icon={Wallet}
            tone="primary"
          />
          <KpiCard
            label="Satisfaction"
            value={reviews?.averageInternalScore != null ? `${reviews.averageInternalScore}` : "—"}
            hint={
              reviews?.recordedSatisfaction
                ? `${reviews.recordedSatisfaction} avis /5`
                : "Score interne /5"
            }
            icon={Star}
          />
        </section>

        <div className="flex flex-col gap-3 rounded-xl bg-[#FFEFF8] p-2 lg:flex-row lg:items-center">
          <div className="relative min-w-[240px] flex-1">
            <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35" />
            <input
              ref={searchRef}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Rechercher une praticienne, un poste, un service… (⌘K)"
              className="h-11 w-full rounded-lg bg-white pl-11 pr-14 text-sm text-ink shadow-sm outline-none placeholder:text-ink/35 focus:ring-2 focus:ring-primary/20"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded bg-[#F6E3EF] px-1.5 py-0.5 font-mono text-[10px] text-ink/45">
              ⌘K
            </span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <FilterPill active={filter === "all"} onClick={() => setFilter("all")}>
              Toutes ({catalog.length})
            </FilterPill>
            <FilterPill active={filter === "active"} onClick={() => setFilter("active")}>
              Actives ({activeCount})
            </FilterPill>
            <FilterPill active={filter === "leave"} onClick={() => setFilter("leave")}>
              En congé ({leaveCount})
            </FilterPill>
            <FilterPill active={filter === "top"} onClick={() => setFilter("top")} gold>
              <Star size={12} />
              Top vendeuses
            </FilterPill>
          </div>
          <div className="flex items-center gap-2 self-end lg:self-auto">
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="h-11 rounded-lg bg-white px-3 text-sm text-ink shadow-sm outline-none"
            >
              <option value="">Tous les postes</option>
              {positions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <div className="flex rounded-lg bg-white p-1 shadow-sm">
              <button
                type="button"
                title="Cartes détaillées"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "rounded-md p-1.5",
                  viewMode === "grid" ? "bg-[#F6E3EF] text-primary" : "text-ink/40",
                )}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                type="button"
                title="Vue tableau"
                onClick={() => setViewMode("table")}
                className={cn(
                  "rounded-md p-1.5",
                  viewMode === "table" ? "bg-[#F6E3EF] text-primary" : "text-ink/40",
                )}
              >
                <Table2 size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
          <div className="flex flex-col gap-4 lg:col-span-7">
            <div className="flex items-center justify-between px-1 text-[11px] font-semibold uppercase tracking-wider text-ink/40">
              <span>
                {filtered.length} praticienne{filtered.length !== 1 ? "s" : ""} répertoriée
                {filtered.length !== 1 ? "s" : ""}
              </span>
            </div>

            {loading ? (
              <p className="py-12 text-center text-sm text-ink/40">Chargement…</p>
            ) : filtered.length === 0 ? (
              <p className="py-12 text-center text-sm text-ink/45">Aucune collaboratrice trouvée.</p>
            ) : viewMode === "table" ? (
              <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#E4BDC2]/40 text-[11px] uppercase tracking-wider text-ink/40">
                      <th className="px-4 py-3 font-semibold">Employée</th>
                      <th className="px-4 py-3 font-semibold">Statut</th>
                      <th className="px-4 py-3 font-semibold">RDV</th>
                      <th className="px-4 py-3 font-semibold">CA</th>
                      <th className="px-4 py-3 font-semibold">Services</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => (
                      <tr
                        key={s.id}
                        onClick={() => setSelectedId(s.id)}
                        className={cn(
                          "cursor-pointer border-b border-[#E4BDC2]/20 hover:bg-[#FFEFF8]/60",
                          s.id === selectedId && "bg-[#FFEFF8]",
                        )}
                      >
                        <td className="px-4 py-3">
                          <p className="font-semibold text-ink">{s.displayName}</p>
                          <p className="text-[12px] text-ink/45">{s.position || "—"}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", statusChipClass(s.status))}>
                            {STAFF_STATUS_LABEL[s.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3">{s.appointmentCount}</td>
                        <td className="px-4 py-3 font-medium">
                          {canPerf && !financeHidden ? formatMad(s.revenue) : "—"}
                        </td>
                        <td className="max-w-[180px] truncate px-4 py-3 text-[12px] text-ink/55">
                          {s.serviceNames.slice(0, 3).join(" · ") || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              filtered.map((s) => (
                <StaffMasterCard
                  key={s.id}
                  staff={s}
                  selected={s.id === selectedId}
                  isTop={topSellerIds.has(s.id)}
                  canPerf={canPerf}
                  financeHidden={financeHidden}
                  teamRevenue={teamRevenue}
                  menuOpen={menuId === s.id}
                  canWrite={canWrite}
                  onSelect={() => {
                    setSelectedId(s.id);
                    setMenuId(null);
                  }}
                  onMenu={() => setMenuId(menuId === s.id ? null : s.id)}
                  onEdit={() => void openEdit(s.id)}
                  onStatus={(status) => void handleStatus(s.id, status)}
                />
              ))
            )}
          </div>

          <div className="lg:sticky lg:top-20 lg:col-span-5">
            {selected ? (
              <StaffFocusPanel
                staffId={selected.id}
                fallback={selected}
                canWrite={canWrite}
                canPerf={canPerf}
                canCommissions={canCommissions}
                financeHidden={financeHidden}
                isTopSeller={topSellerIds.has(selected.id)}
                teamRevenue={teamRevenue}
                insight={focusInsight}
                onEdit={() => void openEdit(selected.id)}
                onStatus={(status) => void handleStatus(selected.id, status)}
              />
            ) : (
              <div className="rounded-2xl bg-white p-8 text-center text-sm text-ink/45 shadow-sm">
                Sélectionnez une collaboratrice pour afficher sa fiche 360°.
              </div>
            )}
          </div>
        </div>
      </div>

      <Drawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditing(null);
        }}
        title={editing ? "Modifier la fiche" : "Nouveau collaborateur"}
      >
        <StaffForm
          key={editing?.id ?? "new"}
          initial={editing ?? undefined}
          submitting={submitting}
          onSubmit={handleSubmit}
          onCancel={() => {
            setDrawerOpen(false);
            setEditing(null);
          }}
        />
      </Drawer>
    </div>
  );
}

function StaffMasterCard({
  staff: s,
  selected,
  isTop,
  canPerf,
  financeHidden,
  teamRevenue,
  menuOpen,
  canWrite,
  onSelect,
  onMenu,
  onEdit,
  onStatus,
}: {
  staff: StaffListItem;
  selected: boolean;
  isTop: boolean;
  canPerf: boolean;
  financeHidden: boolean;
  teamRevenue: number;
  menuOpen: boolean;
  canWrite: boolean;
  onSelect: () => void;
  onMenu: () => void;
  onEdit: () => void;
  onStatus: (status: StaffStatus) => void;
}) {
  const showFinance = canPerf && !financeHidden;
  const share = showFinance && teamRevenue > 0 && s.revenue > 0 ? Math.round((s.revenue / teamRevenue) * 100) : null;

  return (
    <article
      onClick={onSelect}
      className={cn(
        "relative cursor-pointer rounded-2xl bg-white p-4 shadow-sm transition-all",
        selected && "bg-gradient-to-r from-primary/5 via-transparent to-transparent shadow-md ring-1 ring-primary/10",
      )}
    >
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
        <div className="flex items-start gap-3.5">
          <div className="relative">
            <div
              className={cn(
                "flex items-center justify-center rounded-xl bg-[#FFD9DE] font-bold text-primary",
                selected ? "h-16 w-16 text-[18px]" : "h-14 w-14 text-[15px]",
              )}
            >
              {staffInitials(s.firstName, s.lastName)}
            </div>
            <span
              className={cn(
                "absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full",
                statusDotClass(s.status),
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
            </span>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[18px] font-bold text-ink">{s.displayName}</h3>
              {isTop ? (
                <span className="rounded-full bg-[#FCCA66] px-2 py-0.5 text-[11px] font-bold text-[#755400]">
                  TOP VENDEUSE
                </span>
              ) : null}
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", statusChipClass(s.status))}>
                {STAFF_STATUS_LABEL[s.status]}
              </span>
            </div>
            <p className={cn("mt-0.5 text-[13px]", selected ? "font-medium text-primary" : "text-ink/50")}>
              {s.position || "Collaboratrice"}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[12px] text-ink/50">
              {s.phone ? (
                <a
                  href={whatsappHref(s.phone, s.firstName)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="hover:text-primary"
                >
                  {s.phone}
                </a>
              ) : null}
              {s.rating != null ? (
                <span className="inline-flex items-center gap-0.5 font-semibold text-[#7B5900]">
                  <Star size={13} className="fill-[#FCCA66] text-[#FCCA66]" />
                  {s.rating}/10
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:flex-col sm:items-end">
          {selected ? (
            <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
              Fiche active 360°
            </span>
          ) : null}
          <span className="text-[11px] text-ink/40">{shortStaffRef(s.id)}</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-[#FFEFF8] p-3">
        <div>
          <span className="text-[11px] font-semibold uppercase text-ink/40">Activité</span>
          <p className="mt-0.5 text-[16px] font-bold text-ink">
            {s.appointmentCount} <span className="text-[12px] font-normal text-ink/45">RDV</span>
          </p>
        </div>
        <div>
          <span className="text-[11px] font-semibold uppercase text-ink/40">CA généré</span>
          <p className="mt-0.5 text-[16px] font-bold text-primary">
            {showFinance ? formatMad(s.revenue) : "—"}
          </p>
          {share != null ? (
            <span className="text-[10px] font-semibold text-[#7B5900]">{share} % du CA équipe</span>
          ) : null}
        </div>
        <div>
          <span className="text-[11px] font-semibold uppercase text-ink/40">Score interne</span>
          <p className="mt-0.5 text-[16px] font-bold text-ink">
            {s.rating != null ? s.rating : "—"}
            {s.rating != null ? <span className="text-[12px] font-normal text-ink/45"> /10</span> : null}
          </p>
        </div>
      </div>

      {s.serviceNames.length ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] font-semibold text-ink/40">Habilitations :</span>
          {s.serviceNames.slice(0, 3).map((name) => (
            <span key={name} className="rounded-md bg-[#F6E3EF] px-2 py-0.5 text-[11px] text-ink">
              {name}
            </span>
          ))}
          {s.serviceNames.length > 3 ? (
            <span className="rounded-md bg-[#FCE9F4] px-1.5 py-0.5 text-[10px] text-ink/45">
              +{s.serviceNames.length - 3} autres
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between border-t border-[#E4BDC2]/30 pt-3 text-[12px]">
        <span className="text-ink/45">{STAFF_STATUS_LABEL[s.status]}</span>
        <div className="flex items-center gap-1.5">
          <Link
            href="/planning/"
            onClick={(e) => e.stopPropagation()}
            className="rounded-lg bg-[#FCE9F4] px-3 py-1.5 text-[12px] font-semibold text-ink hover:bg-[#F0DDE9]"
          >
            Planning
          </Link>
          {canWrite ? (
            <button
              type="button"
              aria-label="Actions"
              onClick={(e) => {
                e.stopPropagation();
                onMenu();
              }}
              className="rounded-lg bg-[#FCE9F4] p-1.5 text-ink/50 hover:text-ink"
            >
              <MoreHorizontal size={16} />
            </button>
          ) : null}
        </div>
      </div>

      {menuOpen && canWrite ? (
        <div
          className="absolute right-4 bottom-14 z-10 min-w-[170px] rounded-xl bg-white py-1 shadow-lg ring-1 ring-black/5"
          onClick={(e) => e.stopPropagation()}
        >
          <button type="button" onClick={onEdit} className="block w-full px-3 py-2 text-left text-[13px] hover:bg-[#FFEFF8]">
            Modifier
          </button>
          <Link href={`/staff/${s.id}/`} className="block px-3 py-2 text-[13px] hover:bg-[#FFEFF8]">
            Fiche complète
          </Link>
          {s.status === "ACTIVE" ? (
            <button
              type="button"
              onClick={() => onStatus("ON_LEAVE")}
              className="block w-full px-3 py-2 text-left text-[13px] hover:bg-[#FFEFF8]"
            >
              Mettre en congé
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onStatus("ACTIVE")}
              className="block w-full px-3 py-2 text-left text-[13px] hover:bg-[#FFEFF8]"
            >
              Réactiver
            </button>
          )}
        </div>
      ) : null}
    </article>
  );
}

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "ink",
}: {
  label: string;
  value: string;
  hint: ReactNode;
  icon: typeof Users;
  tone?: "ink" | "emerald" | "gold" | "primary";
}) {
  const box = {
    ink: "bg-[#FCE9F4] text-primary",
    emerald: "bg-emerald-50 text-emerald-700",
    gold: "bg-[#FFDEA4]/50 text-[#7B5900]",
    primary: "bg-[#FFD9DE] text-primary",
  };
  return (
    <div className="flex flex-col justify-between overflow-hidden rounded-xl bg-white p-3.5 shadow-sm">
      <div className="flex items-center justify-between text-ink/45">
        <span className="text-[11px] font-semibold uppercase tracking-wider">{label}</span>
        <span className={cn("flex h-7 w-7 items-center justify-center rounded-full", box[tone])}>
          <Icon size={16} />
        </span>
      </div>
      <div className="mt-2">
        <p
          className={cn(
            "truncate font-display text-[22px] font-bold leading-7",
            tone === "primary" ? "text-primary" : "text-ink",
          )}
        >
          {value}
        </p>
        <p className="mt-0.5 text-[11px] text-ink/45">{hint}</p>
      </div>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
  gold,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  gold?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-3.5 py-2 text-[12px] font-semibold shadow-sm",
        active
          ? gold
            ? "bg-[#FCCA66] text-[#755400]"
            : "bg-primary text-white"
          : gold
            ? "bg-white text-[#7B5900]"
            : "bg-white text-ink hover:bg-[#FCE9F4]",
      )}
    >
      {children}
    </button>
  );
}
