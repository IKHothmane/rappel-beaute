"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Download,
  LayoutGrid,
  MoreHorizontal,
  Plus,
  Search,
  Table2,
  Timer,
  Wallet,
  Wrench,
} from "lucide-react";
import { useCurrentUser } from "@/components/auth/session-provider";
import { ResourceFocusPanel } from "@/components/resources/resource-focus-panel";
import { ResourceForm } from "@/components/resources/resource-form";
import {
  exportResourcesCsv,
  formatTime,
  liveChipClass,
  liveDotClass,
  liveStatus,
  LIVE_STATUS_LABEL,
  nextAppointment,
  overlappingNow,
  remainingMinutes,
  resourceTypeIcon,
  todayAppointments,
} from "@/components/resources/resource-helpers";
import { ResourcesMobile } from "@/components/resources/resources-mobile";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { canReadAnalytics, canReadFeature, canWriteResources } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { formatMad, formatPct, getAnalyticsOverview } from "@/modules/analytics/service";
import { listAppointments } from "@/modules/appointments/service";
import {
  createResource,
  createResourceMaintenance,
  deleteResource,
  getResource,
  listResources,
  updateResource,
} from "@/modules/resources/service";
import { listServices } from "@/modules/services/service";
import type { AnalyticsOverview } from "@/types/analytics";
import type { Appointment } from "@/types/appointment";
import type {
  MaintenanceType,
  ResourceDetail,
  ResourceListItem,
  ResourceType,
} from "@/types/resource";
import { MAINTENANCE_TYPE_LABEL, RESOURCE_TYPE_LABEL, RESOURCE_TYPES } from "@/types/resource";

type StatusFilter = "all" | "available" | "occupied" | "soon" | "maintenance" | "inactive";
type ViewMode = "grid" | "table";

export function ResourcesPageView() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canWrite = canWriteResources(user.role);
  const canAgenda = canReadFeature(user.role, "agenda");
  const financeHidden = user.role === "STAFF" || user.role === "CASHIER";
  const canExport = canReadAnalytics(user.role) && !financeHidden;

  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ResourceType | "">("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [location, setLocation] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [catalog, setCatalog] = useState<ResourceListItem[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [serviceOptions, setServiceOptions] = useState<{ id: string; name: string }[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const [editing, setEditing] = useState<ResourceDetail | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

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
      const res = await listResources({ limit: 100 });
      setCatalog(res.data);
      setSelectedId((current) => {
        if (current && res.data.some((row) => row.id === current)) return current;
        return res.data[0]?.id ?? null;
      });
    } catch {
      toast("Impossible de charger les ressources.", "error");
    }
  }, [toast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    listServices({ limit: 100, active: true })
      .then((r) => setServiceOptions(r.data.map((s) => ({ id: s.id, name: s.name }))))
      .catch(() => {});
    if (!financeHidden) {
      getAnalyticsOverview({ preset: "month", compare: true })
        .then(setOverview)
        .catch(() => setOverview(null));
    }
    if (canAgenda) {
      listAppointments()
        .then(setAppointments)
        .catch(() => setAppointments([]));
    }
  }, [financeHidden, canAgenda]);

  const currentOf = useCallback(
    (id: string) => overlappingNow(appointments, id, nowTick),
    [appointments, nowTick],
  );
  const nextOf = useCallback(
    (id: string) => nextAppointment(appointments, id, nowTick),
    [appointments, nowTick],
  );
  const todayCountOf = useCallback(
    (id: string) => todayAppointments(appointments, id).length,
    [appointments, nowTick],
  );

  const statusOf = useCallback(
    (r: ResourceListItem) => liveStatus(r, currentOf(r.id), nextOf(r.id), nowTick),
    [currentOf, nextOf, nowTick],
  );

  const activeCount = catalog.filter((r) => r.active).length;
  const occupiedIds = new Set(
    catalog.filter((r) => r.active && currentOf(r.id)).map((r) => r.id),
  );
  const maintenanceCount = catalog.filter((r) => r.upcomingMaintenance).length;
  const occupiedCount = occupiedIds.size;
  const availableCount = catalog.filter(
    (r) => r.active && !r.upcomingMaintenance && !occupiedIds.has(r.id),
  ).length;

  const typeCounts = useMemo(() => {
    const map = new Map<ResourceType, number>();
    for (const r of catalog) map.set(r.type, (map.get(r.type) ?? 0) + 1);
    return RESOURCE_TYPES.filter((t) => map.has(t)).map((t) => [t, map.get(t) ?? 0] as [ResourceType, number]);
  }, [catalog]);

  const locations = useMemo(() => {
    const set = new Set<string>();
    for (const r of catalog) {
      if (r.location?.trim()) set.add(r.location.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b, "fr"));
  }, [catalog]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return catalog.filter((r) => {
      if (typeFilter && r.type !== typeFilter) return false;
      if (location && (r.location ?? "") !== location) return false;
      const st = statusOf(r);
      if (statusFilter === "available" && st !== "available") return false;
      if (statusFilter === "occupied" && st !== "occupied") return false;
      if (statusFilter === "soon" && st !== "soon") return false;
      if (statusFilter === "maintenance" && st !== "maintenance") return false;
      if (statusFilter === "inactive" && st !== "inactive") return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        (r.location ?? "").toLowerCase().includes(q) ||
        (r.notes ?? "").toLowerCase().includes(q) ||
        r.serviceNames.some((n) => n.toLowerCase().includes(q))
      );
    });
  }, [catalog, search, typeFilter, location, statusFilter, statusOf]);

  const selected = filtered.find((r) => r.id === selectedId) ?? filtered[0] ?? null;

  const busiest = useMemo(() => {
    if (!catalog.length) return null;
    return catalog.reduce((best, r) => (todayCountOf(r.id) > todayCountOf(best.id) ? r : best), catalog[0]);
  }, [catalog, todayCountOf]);

  const quietest = useMemo(() => {
    const actives = catalog.filter((r) => r.active);
    if (!actives.length) return null;
    return actives.reduce((best, r) => (todayCountOf(r.id) < todayCountOf(best.id) ? r : best), actives[0]);
  }, [catalog, todayCountOf]);

  const insight =
    busiest && todayCountOf(busiest.id) > 0
      ? `${busiest.name} a le plus de rendez-vous aujourd’hui (${todayCountOf(busiest.id)} RDV)${
          quietest && quietest.id !== busiest.id
            ? ` — ${quietest.name} en a ${todayCountOf(quietest.id)}.`
            : "."
        }`
      : overview && overview.appointments.value > 0
        ? "Des rendez-vous sont prévus aujourd’hui, mais peu sont encore rattachés à une cabine."
        : "Pas encore assez de rendez-vous pour comparer l’occupation des espaces.";

  async function openCreate() {
    setEditing(null);
    setDrawerOpen(true);
    setMenuId(null);
  }

  async function openEdit(id: string) {
    try {
      const detail = await getResource(id);
      setEditing(detail);
      setDrawerOpen(true);
      setMenuId(null);
    } catch {
      toast("Impossible de charger la ressource.", "error");
    }
  }

  async function handleSubmit(data: Parameters<typeof createResource>[0]) {
    setSubmitting(true);
    const result = editing ? await updateResource(editing.id, data) : await createResource(data);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    setDrawerOpen(false);
    setEditing(null);
    toast(editing ? "Ressource mise à jour." : "Ressource créée.", "success");
    refresh();
  }

  async function handleToggle(row: ResourceListItem) {
    if (!canWrite) return;
    const result = await updateResource(row.id, { active: !row.active });
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast(row.active ? "Ressource désactivée." : "Ressource réactivée.", "success");
    setMenuId(null);
    refresh();
  }

  async function handleDelete(row: ResourceListItem) {
    if (!canWrite) return;
    const ok = window.confirm(`Supprimer « ${row.name} » ? Elle disparaîtra du catalogue.`);
    if (!ok) {
      setMenuId(null);
      return;
    }
    const result = await deleteResource(row.id);
    if (!result.ok) {
      toast(result.error, "error");
      setMenuId(null);
      return;
    }
    toast("Ressource supprimée.", "success");
    setMenuId(null);
    if (selectedId === row.id) setSelectedId(null);
    refresh();
  }

  function openMaintenance() {
    if (!selected) {
      toast("Sélectionnez d’abord une ressource.", "info");
      return;
    }
    setMaintenanceOpen(true);
  }

  const apptChange = overview?.appointments.changePercent;

  return (
    <div className="flex flex-col gap-5 pb-8">
      <ResourcesMobile
        orgName={user.orgName}
        catalogCount={catalog.length}
        activeCount={activeCount}
        availableCount={availableCount}
        occupiedCount={occupiedCount}
        maintenanceCount={maintenanceCount}
        canWrite={canWrite}
        financeHidden={financeHidden}
        overview={overview}
        insight={insight}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchRef={searchRef}
        typeFilter={typeFilter}
        onTypeFilter={setTypeFilter}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
        location={location}
        onLocation={setLocation}
        locations={locations}
        typeCounts={typeCounts}
        filtered={filtered}
        loading={loading}
        selectedId={selected?.id ?? null}
        onSelect={setSelectedId}
        selected={selected}
        currentOf={currentOf}
        nextOf={nextOf}
        todayCountOf={todayCountOf}
        menuId={menuId}
        onMenu={setMenuId}
        onCreate={() => void openCreate()}
        onEdit={(id) => void openEdit(id)}
        onToggle={(row) => void handleToggle(row)}
        onDelete={(row) => void handleDelete(row)}
        onMaintenance={openMaintenance}
      />

      <div className="hidden flex-col gap-5 lg:flex">
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="flex items-center gap-2 font-display text-[28px] font-bold leading-9 tracking-tight text-ink lg:text-[32px]">
                <Building2 size={26} className="text-primary" />
                Ressources, cabines & équipements
              </h1>
              <p className="mt-1 max-w-3xl text-[15px] text-ink/50">
                Espaces de soin, postes et appareils — un créneau, une ressource.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => exportResourcesCsv(catalog)}
                className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-white px-3.5 text-[13px] font-semibold text-ink shadow-sm"
              >
                <Download size={16} />
                Exporter
              </button>
              {canWrite ? (
                <button
                  type="button"
                  onClick={openMaintenance}
                  className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-white px-3.5 text-[13px] font-semibold text-ink shadow-sm"
                >
                  <Wrench size={16} className="text-[#7B5900]" />
                  Planifier maintenance
                </button>
              ) : null}
              {canWrite ? (
                <button
                  type="button"
                  onClick={() => void openCreate()}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-[13px] font-semibold text-white shadow-md"
                >
                  <Plus size={18} />
                  Ajouter une ressource
                </button>
              ) : null}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Total espaces"
            value={String(catalog.length)}
            hint={`${activeCount} actives`}
            icon={Building2}
          />
          <KpiCard
            label="Disponibles"
            value={String(availableCount)}
            hint="Libres maintenant"
            icon={CheckCircle2}
            tone="emerald"
          />
          <KpiCard
            label="En soin"
            value={String(occupiedCount)}
            hint={
              apptChange != null ? (
                <span className={apptChange >= 0 ? "text-emerald-700" : "text-red-700"}>
                  {formatPct(apptChange)} RDV vs m-1
                </span>
              ) : (
                "Créneau en cours"
              )
            }
            icon={Timer}
            tone="primary"
          />
          <KpiCard
            label="CA du mois"
            value={financeHidden || !canExport ? "—" : overview ? formatMad(overview.revenue.value) : "—"}
            hint={maintenanceCount ? `${maintenanceCount} en maintenance` : "Institut"}
            icon={Wallet}
            tone="gold"
          />
        </section>

        <div className="flex flex-col gap-3 rounded-xl bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-[240px] flex-1">
              <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35" />
              <input
                ref={searchRef}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Rechercher une cabine, un poste, un équipement… (⌘K)"
                className="h-11 w-full rounded-lg bg-[#FFEFF8] pl-11 pr-14 text-sm text-ink outline-none placeholder:text-ink/35 focus:ring-2 focus:ring-primary/20"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded bg-[#F6E3EF] px-1.5 py-0.5 font-mono text-[10px] text-ink/45">
                ⌘K
              </span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="h-11 rounded-lg bg-[#FFEFF8] px-3 text-sm text-ink outline-none"
            >
              <option value="all">Tous les statuts</option>
              <option value="available">Libre maintenant</option>
              <option value="occupied">Occupée en soin</option>
              <option value="soon">Bientôt libérée</option>
              <option value="maintenance">En maintenance</option>
              <option value="inactive">Inactive</option>
            </select>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="h-11 rounded-lg bg-[#FFEFF8] px-3 text-sm text-ink outline-none"
            >
              <option value="">Tous les emplacements</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
            <div className="flex rounded-lg bg-[#FFEFF8] p-1">
              <button
                type="button"
                title="Vue cartes"
                onClick={() => setViewMode("grid")}
                className={cn("rounded-md p-1.5", viewMode === "grid" ? "bg-white text-primary shadow-sm" : "text-ink/40")}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                type="button"
                title="Vue tableau"
                onClick={() => setViewMode("table")}
                className={cn("rounded-md p-1.5", viewMode === "table" ? "bg-white text-primary shadow-sm" : "text-ink/40")}
              >
                <Table2 size={16} />
              </button>
            </div>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <FilterPill active={typeFilter === ""} onClick={() => setTypeFilter("")}>
              Tous les espaces ({catalog.length})
            </FilterPill>
            {typeCounts.map(([t, n]) => (
              <FilterPill key={t} active={typeFilter === t} onClick={() => setTypeFilter(t)}>
                {RESOURCE_TYPE_LABEL[t]} ({n})
              </FilterPill>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
          <div className="flex flex-col gap-4 lg:col-span-7">
            <div className="flex items-center justify-between px-1 text-[11px] font-semibold uppercase tracking-wider text-ink/40">
              <span>
                {filtered.length} ressource{filtered.length !== 1 ? "s" : ""}
              </span>
              <Link href="/planning/" className="inline-flex items-center gap-1 text-primary">
                <CalendarDays size={12} />
                Planning
              </Link>
            </div>

            {loading ? (
              <p className="py-12 text-center text-sm text-ink/40">Chargement…</p>
            ) : filtered.length === 0 ? (
              <p className="py-12 text-center text-sm text-ink/45">Aucune ressource trouvée.</p>
            ) : viewMode === "table" ? (
              <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#E4BDC2]/40 text-[11px] uppercase tracking-wider text-ink/40">
                      <th className="px-4 py-3 font-semibold">Ressource</th>
                      <th className="px-4 py-3 font-semibold">Type</th>
                      <th className="px-4 py-3 font-semibold">Statut</th>
                      <th className="px-4 py-3 font-semibold">RDV j</th>
                      <th className="px-4 py-3 font-semibold">Services</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => {
                      const st = statusOf(r);
                      return (
                        <tr
                          key={r.id}
                          onClick={() => setSelectedId(r.id)}
                          className={cn(
                            "cursor-pointer border-b border-[#E4BDC2]/20 hover:bg-[#FFEFF8]/60",
                            selected?.id === r.id && "bg-[#FFEFF8]",
                          )}
                        >
                          <td className="px-4 py-3">
                            <p className="font-semibold text-ink">{r.name}</p>
                            <p className="text-[12px] text-ink/45">{r.location || "—"}</p>
                          </td>
                          <td className="px-4 py-3">{RESOURCE_TYPE_LABEL[r.type]}</td>
                          <td className="px-4 py-3">
                            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", liveChipClass(st))}>
                              {LIVE_STATUS_LABEL[st]}
                            </span>
                          </td>
                          <td className="px-4 py-3">{todayCountOf(r.id)}</td>
                          <td className="max-w-[180px] truncate px-4 py-3 text-[12px] text-ink/55">
                            {r.serviceNames.slice(0, 3).join(" · ") || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              filtered.map((r) => (
                <MasterCard
                  key={r.id}
                  resource={r}
                  status={statusOf(r)}
                  current={currentOf(r.id)}
                  next={nextOf(r.id)}
                  todayCount={todayCountOf(r.id)}
                  selected={selected?.id === r.id}
                  canWrite={canWrite}
                  menuOpen={menuId === r.id}
                  onSelect={() => {
                    setSelectedId(r.id);
                    setMenuId(null);
                  }}
                  onMenu={() => setMenuId(menuId === r.id ? null : r.id)}
                  onEdit={() => void openEdit(r.id)}
                  onToggle={() => void handleToggle(r)}
                  onDelete={() => void handleDelete(r)}
                />
              ))
            )}
          </div>

          <div className="lg:sticky lg:top-20 lg:col-span-5">
            {selected ? (
              <ResourceFocusPanel
                resourceId={selected.id}
                fallback={selected}
                current={currentOf(selected.id)}
                next={nextOf(selected.id)}
                todayCount={todayCountOf(selected.id)}
                insight={insight}
                canWrite={canWrite}
                onEdit={() => void openEdit(selected.id)}
                onMaintenance={openMaintenance}
              />
            ) : (
              <div className="rounded-2xl bg-white p-8 text-center text-sm text-ink/45 shadow-sm">
                Sélectionnez une ressource pour afficher sa fiche.
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
        title={editing ? "Modifier la ressource" : "Ajouter une ressource"}
      >
        <ResourceForm
          key={editing?.id ?? "new"}
          initial={editing ?? undefined}
          services={serviceOptions}
          submitting={submitting}
          onSubmit={handleSubmit}
          onCancel={() => {
            setDrawerOpen(false);
            setEditing(null);
          }}
        />
      </Drawer>

      <Drawer open={maintenanceOpen} onClose={() => setMaintenanceOpen(false)} title="Planifier une maintenance">
        {selected ? (
          <MaintenanceForm
            resourceName={selected.name}
            submitting={submitting}
            onCancel={() => setMaintenanceOpen(false)}
            onSubmit={async (input) => {
              setSubmitting(true);
              const result = await createResourceMaintenance(selected.id, input);
              setSubmitting(false);
              if (!result.ok) {
                toast(result.error, "error");
                return;
              }
              setMaintenanceOpen(false);
              toast("Maintenance planifiée.", "success");
              refresh();
            }}
          />
        ) : (
          <p className="text-sm text-ink/50">Sélectionnez une ressource.</p>
        )}
      </Drawer>
    </div>
  );
}

function MasterCard({
  resource: r,
  status,
  current,
  next,
  todayCount,
  selected,
  canWrite,
  menuOpen,
  onSelect,
  onMenu,
  onEdit,
  onToggle,
  onDelete,
}: {
  resource: ResourceListItem;
  status: ReturnType<typeof liveStatus>;
  current?: Appointment;
  next?: Appointment;
  todayCount: number;
  selected: boolean;
  canWrite: boolean;
  menuOpen: boolean;
  onSelect: () => void;
  onMenu: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const Icon = resourceTypeIcon(r.type);
  const left = current ? remainingMinutes(current.endAt) : null;

  return (
    <article
      onClick={onSelect}
      className={cn(
        "relative cursor-pointer rounded-xl bg-white p-4 shadow-sm transition-all",
        selected && "shadow-md ring-1 ring-primary/15",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#FFD9DE] text-primary">
            <Icon size={22} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[18px] font-bold text-ink">{r.name}</h3>
              <span className="rounded-full bg-[#FCE9F4] px-2 py-0.5 text-[11px] font-semibold text-ink/55">
                {RESOURCE_TYPE_LABEL[r.type]}
              </span>
            </div>
            <p className="mt-0.5 text-[13px] text-ink/50">
              {r.location || "Emplacement non renseigné"} · capacité {r.capacity}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold", liveChipClass(status))}>
            <span className={cn("h-2 w-2 rounded-full", liveDotClass(status), status === "occupied" && "animate-pulse")} />
            {LIVE_STATUS_LABEL[status]}
          </span>
          {canWrite ? (
            <button
              type="button"
              aria-label="Actions"
              onClick={(e) => {
                e.stopPropagation();
                onMenu();
              }}
              className="rounded-lg p-1.5 text-ink/40 hover:bg-[#FCE9F4] hover:text-ink"
            >
              <MoreHorizontal size={16} />
            </button>
          ) : null}
        </div>
      </div>

      {current ? (
        <div className="mt-4 flex flex-col justify-between gap-2 rounded-lg bg-[#FFEFF8] p-3 md:flex-row md:items-center">
          <div>
            <p className="text-[11px] uppercase text-ink/40">
              En cours · {formatTime(current.startAt)} → {formatTime(current.endAt)}
              {left != null ? ` · reste ${left} min` : ""}
            </p>
            <p className="mt-0.5 font-bold text-ink">{current.serviceName}</p>
            <p className="text-[13px] text-ink/55">
              {current.customerName} · {current.staffName}
            </p>
          </div>
          <div className="text-right text-[12px] text-ink/45">
            <p>{todayCount} RDV aujourd’hui</p>
            <p>{r.serviceCount} prestation{r.serviceCount !== 1 ? "s" : ""}</p>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-lg bg-[#FFEFF8] p-3 text-[13px] text-ink/60">
          {next ? (
            <>Prochain : {next.serviceName} à {formatTime(next.startAt)} · {next.staffName}</>
          ) : r.upcomingMaintenance ? (
            "Maintenance planifiée — créneaux bloqués à l’agenda."
          ) : (
            "Aucun rendez-vous en cours."
          )}
          <span className="ml-2 text-ink/40">{todayCount} RDV aujourd’hui</span>
        </div>
      )}

      {r.serviceNames.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {r.serviceNames.slice(0, 4).map((name) => (
            <span key={name} className="rounded bg-[#FCE9F4] px-2 py-0.5 text-[11px] text-ink/55">
              {name}
            </span>
          ))}
        </div>
      ) : null}

      {menuOpen && canWrite ? (
        <div
          className="absolute right-4 top-14 z-10 min-w-[160px] rounded-xl bg-white py-1 shadow-lg ring-1 ring-black/5"
          onClick={(e) => e.stopPropagation()}
        >
          <button type="button" onClick={onEdit} className="block w-full px-3 py-2 text-left text-[13px] hover:bg-[#FFEFF8]">
            Modifier
          </button>
          <button type="button" onClick={onToggle} className="block w-full px-3 py-2 text-left text-[13px] hover:bg-[#FFEFF8]">
            {r.active ? "Désactiver" : "Réactiver"}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="block w-full px-3 py-2 text-left text-[13px] text-red-600 hover:bg-red-50"
          >
            Supprimer
          </button>
        </div>
      ) : null}
    </article>
  );
}

function MaintenanceForm({
  resourceName,
  submitting,
  onSubmit,
  onCancel,
}: {
  resourceName: string;
  submitting: boolean;
  onSubmit: (input: { startAt: string; endAt: string; type: MaintenanceType; reason?: string }) => void;
  onCancel: () => void;
}) {
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [type, setType] = useState<MaintenanceType>("PREVENTIVE");
  const [reason, setReason] = useState("");

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!startAt || !endAt) return;
        onSubmit({
          startAt: new Date(startAt).toISOString(),
          endAt: new Date(endAt).toISOString(),
          type,
          reason: reason.trim() || undefined,
        });
      }}
    >
      <p className="text-sm text-ink/55">
        Ressource : <strong className="text-ink">{resourceName}</strong>
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-xs text-ink/50">Début</span>
          <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} required />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs text-ink/50">Fin</span>
          <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} required />
        </label>
      </div>
      <Select value={type} onChange={(e) => setType(e.target.value as MaintenanceType)}>
        {Object.entries(MAINTENANCE_TYPE_LABEL).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </Select>
      <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motif (optionnel)" />
      <div className="flex gap-2">
        <Button type="button" variant="ghost" className="flex-1" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" variant="primary" className="flex-1" disabled={submitting}>
          {submitting ? "Enregistrement…" : "Planifier"}
        </Button>
      </div>
    </form>
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
  icon: typeof Building2;
  tone?: "ink" | "emerald" | "gold" | "primary";
}) {
  const box = {
    ink: "bg-[#FCE9F4] text-primary",
    emerald: "bg-emerald-50 text-emerald-700",
    gold: "bg-[#FFDEA4]/50 text-[#7B5900]",
    primary: "bg-[#FFD9DE] text-primary",
  };
  return (
    <div className="flex flex-col justify-between overflow-hidden rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between text-ink/45">
        <span className="text-[11px] font-semibold uppercase tracking-wider">{label}</span>
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", box[tone])}>
          <Icon size={18} />
        </span>
      </div>
      <div className="mt-3">
        <p className={cn("font-display text-[32px] font-extrabold leading-9", tone === "primary" ? "text-primary" : "text-ink")}>
          {value}
        </p>
        <p className="mt-2 rounded-lg bg-[#FFEFF8] px-2.5 py-1.5 text-[12px] text-ink/50">{hint}</p>
      </div>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] font-semibold",
        active ? "bg-primary text-white shadow-sm" : "bg-[#FFEFF8] text-ink hover:bg-[#FCE9F4]",
      )}
    >
      {children}
    </button>
  );
}
