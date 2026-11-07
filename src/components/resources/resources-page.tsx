"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Pencil,
  Search,
  Wrench,
} from "lucide-react";
import { useCurrentUser } from "@/components/auth/session-provider";
import { ResourceFocusPanel } from "@/components/resources/resource-focus-panel";
import { ResourceForm } from "@/components/resources/resource-form";
import { ResourcePremiumCard } from "@/components/resources/resource-premium-card";
import {
  liveStatus,
  nextAppointment,
  overlappingNow,
  todayAppointments,
} from "@/components/resources/resource-helpers";
import { ResourcesMobile } from "@/components/resources/resources-mobile";
import { ResourcesPremiumHeader } from "@/components/resources/resources-premium-header";
import { PremiumSidePanel } from "@/components/ui/premium-side-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { canReadFeature, canWriteResources } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { getAnalyticsOverview } from "@/modules/analytics/service";
import { listAppointments } from "@/modules/appointments/service";
import {
  createResource,
  createResourceMaintenance,
  deleteResource,
  getResource,
  listResources,
  updateResource,
  updateResourceMaintenance,
} from "@/modules/resources/service";
import { listServices } from "@/modules/services/service";
import type { AnalyticsOverview } from "@/types/analytics";
import type { Appointment } from "@/types/appointment";
import type {
  MaintenanceType,
  ResourceDetail,
  ResourceListItem,
  ResourceMaintenanceItem,
  ResourceType,
} from "@/types/resource";
import { MAINTENANCE_STATUS_LABEL, MAINTENANCE_TYPE_LABEL, RESOURCE_TYPE_LABEL, RESOURCE_TYPES } from "@/types/resource";

type StatusFilter = "all" | "available" | "occupied" | "soon" | "maintenance" | "inactive";

export function ResourcesPageView() {
  const { toast } = useToast();
  const user = useCurrentUser();
  const canWrite = canWriteResources(user.role);
  const canAgenda = canReadFeature(user.role, "agenda");
  const financeHidden = user.role === "STAFF" || user.role === "CASHIER";

  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ResourceType | "">("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [location, setLocation] = useState("");
  const [catalog, setCatalog] = useState<ResourceListItem[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [serviceOptions, setServiceOptions] = useState<{ id: string; name: string }[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const [openMaintenances, setOpenMaintenances] = useState<ResourceMaintenanceItem[]>([]);
  const [editingMaintenance, setEditingMaintenance] = useState<ResourceMaintenanceItem | null>(null);
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
    setEditingMaintenance(null);
    setMaintenanceOpen(true);
    void loadOpenMaintenances(selected.id);
  }

  async function loadOpenMaintenances(resourceId: string) {
    try {
      const detail = await getResource(resourceId);
      setOpenMaintenances(
        detail.maintenances.filter((item) => item.status === "SCHEDULED" || item.status === "IN_PROGRESS"),
      );
    } catch {
      setOpenMaintenances([]);
    }
  }

  async function finishMaintenance(item: ResourceMaintenanceItem) {
    if (!selected) return;
    setSubmitting(true);
    const result = await updateResourceMaintenance(selected.id, item.id, {
      status: "COMPLETED",
      endAt: new Date().toISOString(),
    });
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast("Maintenance terminée.", "success");
    if (editingMaintenance?.id === item.id) setEditingMaintenance(null);
    await loadOpenMaintenances(selected.id);
    refresh();
    setMaintenanceOpen(true);
  }

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
        <ResourcesPremiumHeader
          total={catalog.length}
          available={availableCount}
          occupied={occupiedCount}
          maintenance={maintenanceCount}
          canWrite={canWrite}
          onCreate={() => void openCreate()}
        />

        <div className="flex flex-col gap-3 rounded-xl border border-[#EFDCE4] bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-[240px] flex-1">
              <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35" />
              <input
                ref={searchRef}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Rechercher une ressource… (⌘K)"
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
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <FilterPill active={typeFilter === ""} onClick={() => setTypeFilter("")}>
              Toutes ({catalog.length})
            </FilterPill>
            {typeCounts.map(([t, n]) => (
              <FilterPill key={t} active={typeFilter === t} onClick={() => setTypeFilter(t)}>
                {RESOURCE_TYPE_LABEL[t]} ({n})
              </FilterPill>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
          <div className="flex flex-col gap-4 xl:col-span-8">
            <div className="flex items-center justify-between px-1 text-[11px] font-semibold uppercase tracking-wider text-ink/40">
              <span>
                {filtered.length} ressource{filtered.length !== 1 ? "s" : ""}
              </span>
              <Link href="/staff/?tab=planning" className="inline-flex items-center gap-1 text-primary">
                <CalendarDays size={12} />
                Planning
              </Link>
            </div>

            {loading ? (
              <p className="py-12 text-center text-sm text-ink/40">Chargement…</p>
            ) : filtered.length === 0 ? (
              <p className="py-12 text-center text-sm text-ink/45">Aucune ressource trouvée.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((resource) => (
                  <ResourcePremiumCard
                    key={resource.id}
                    resource={resource}
                    status={statusOf(resource)}
                    selected={selected?.id === resource.id}
                    canWrite={canWrite}
                    onSelect={() => {
                      setSelectedId(resource.id);
                      setMenuId(null);
                    }}
                    onEdit={() => void openEdit(resource.id)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="xl:sticky xl:top-20 xl:col-span-4">
            {selected ? (
              <ResourceFocusPanel
                resourceId={selected.id}
                fallback={selected}
                current={currentOf(selected.id)}
                next={nextOf(selected.id)}
                todayCount={todayCountOf(selected.id)}
                canWrite={canWrite}
                onEdit={() => void openEdit(selected.id)}
                onMaintenance={openMaintenance}
              />
            ) : (
              <div className="rounded-[22px] border border-[#EFDCE4] bg-white p-8 text-center text-sm text-ink/45 shadow-lg">
                Sélectionnez une ressource pour afficher sa fiche.
              </div>
            )}
          </div>
        </div>
      </div>

      <PremiumSidePanel
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditing(null);
        }}
        title={editing ? "Modifier la ressource" : "Ajouter une ressource"}
        description={
          editing
            ? "Mettez à jour la cabine ou l’équipement."
            : "Ajoutez une cabine ou un équipement à l’institut."
        }
      >
        <ResourceForm
          key={editing?.id ?? "new"}
          initial={editing ?? undefined}
          services={serviceOptions}
          submitting={submitting}
          onSubmit={(data) => void handleSubmit(data)}
          onCancel={() => {
            setDrawerOpen(false);
            setEditing(null);
          }}
        />
      </PremiumSidePanel>

      <PremiumSidePanel
        open={maintenanceOpen}
        onClose={() => {
          setMaintenanceOpen(false);
          setEditingMaintenance(null);
        }}
        title={editingMaintenance ? "Modifier la maintenance" : "Maintenance"}
        description={
          selected
            ? `${selected.name} · bloquez le créneau pendant l’intervention.`
            : "Planifiez une intervention sur une ressource."
        }
        size="md"
      >
        {selected ? (
          <div className="space-y-5">
            <div className="flex items-center gap-3 rounded-xl bg-[#FFEFF8] px-3 py-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary shadow-sm">
                <Wrench size={18} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/45">
                  Ressource
                </p>
                <p className="truncate text-[15px] font-semibold text-ink">{selected.name}</p>
                <p className="text-[12px] text-ink/50">
                  {RESOURCE_TYPE_LABEL[selected.type]}
                  {selected.location ? ` · ${selected.location}` : ""}
                </p>
              </div>
            </div>

            <section className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[13px] font-bold text-ink">En cours / planifiées</h3>
                <span className="rounded-full bg-[#FCE9F4] px-2 py-0.5 text-[11px] font-bold text-primary">
                  {openMaintenances.length}
                </span>
              </div>
              {openMaintenances.length ? (
                <ul className="space-y-2">
                  {openMaintenances.map((item) => {
                    const active = editingMaintenance?.id === item.id;
                    return (
                      <li
                        key={item.id}
                        className={cn(
                          "rounded-xl bg-[#FFF8FA] p-3 text-sm ring-1 ring-[#F0DDE6] transition",
                          active && "ring-2 ring-primary/40",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-ink">
                              {MAINTENANCE_TYPE_LABEL[item.type]}
                            </p>
                            <p className="mt-0.5 text-[12px] text-ink/55">
                              {formatMaintenanceRange(item.startAt, item.endAt)}
                            </p>
                            {item.reason ? (
                              <p className="mt-1 text-[12px] text-ink/45">{item.reason}</p>
                            ) : null}
                          </div>
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                              item.status === "IN_PROGRESS"
                                ? "bg-[#E3F0FF] text-[#2F5FBF]"
                                : "bg-[#FFF0D8] text-[#B77612]",
                            )}
                          >
                            {MAINTENANCE_STATUS_LABEL[item.status]}
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            className="inline-flex items-center justify-center gap-1 rounded-lg bg-white py-2 text-[12px] font-semibold text-ink ring-1 ring-[#F0DDE6] hover:bg-[#FBF4F6]"
                            onClick={() => setEditingMaintenance(item)}
                          >
                            <Pencil size={13} aria-hidden />
                            Modifier
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 py-2 text-[12px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                            disabled={submitting}
                            onClick={() => void finishMaintenance(item)}
                          >
                            <CheckCircle2 size={13} aria-hidden />
                            Terminer
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="rounded-xl border border-dashed border-[#EAD5E0] bg-[#FFF9FB] px-4 py-6 text-center">
                  <p className="text-sm font-semibold text-ink">Aucune maintenance en cours</p>
                  <p className="mt-1 text-[12px] text-ink/50">
                    Planifiez une intervention ci-dessous.
                  </p>
                </div>
              )}
            </section>

            <div className="border-t border-[#F0DDE6] pt-4">
              <h3 className="mb-3 text-[13px] font-bold text-ink">
                {editingMaintenance ? "Modifier l’intervention" : "Nouvelle intervention"}
              </h3>
              <MaintenanceForm
                key={editingMaintenance?.id ?? "new"}
                resourceName={selected.name}
                initial={editingMaintenance}
                submitting={submitting}
                onCancel={() => {
                  if (editingMaintenance) setEditingMaintenance(null);
                  else {
                    setMaintenanceOpen(false);
                    setEditingMaintenance(null);
                  }
                }}
                onSubmit={async (input) => {
                  setSubmitting(true);
                  const result = editingMaintenance
                    ? await updateResourceMaintenance(selected.id, editingMaintenance.id, input)
                    : await createResourceMaintenance(selected.id, input);
                  setSubmitting(false);
                  if (!result.ok) {
                    toast(result.error, "error");
                    return;
                  }
                  toast(
                    editingMaintenance ? "Maintenance modifiée." : "Maintenance planifiée.",
                    "success",
                  );
                  setEditingMaintenance(null);
                  await loadOpenMaintenances(selected.id);
                  refresh();
                }}
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-ink/50">Sélectionnez une ressource.</p>
        )}
      </PremiumSidePanel>
    </div>
  );
}

function toDatetimeLocal(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatMaintenanceRange(startAt: string, endAt: string) {
  const opts: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  };
  return `${new Date(startAt).toLocaleString("fr-FR", opts)} → ${new Date(endAt).toLocaleString("fr-FR", opts)}`;
}

const MAINTENANCE_TYPES = Object.keys(MAINTENANCE_TYPE_LABEL) as MaintenanceType[];

function MaintenanceForm({
  initial,
  submitting,
  onSubmit,
  onCancel,
}: {
  resourceName: string;
  initial?: ResourceMaintenanceItem | null;
  submitting: boolean;
  onSubmit: (input: { startAt: string; endAt: string; type: MaintenanceType; reason?: string }) => void;
  onCancel: () => void;
}) {
  const [startAt, setStartAt] = useState(initial ? toDatetimeLocal(initial.startAt) : "");
  const [endAt, setEndAt] = useState(initial ? toDatetimeLocal(initial.endAt) : "");
  const [type, setType] = useState<MaintenanceType>(initial?.type ?? "PREVENTIVE");
  const [reason, setReason] = useState(initial?.reason ?? "");

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
      <div>
        <span className="mb-1.5 block text-sm font-medium">Type</span>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#FFEFF8] p-1">
          {MAINTENANCE_TYPES.map((item) => {
            const active = type === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setType(item)}
                className={cn(
                  "rounded-lg px-2 py-2.5 text-[12px] font-semibold transition-colors",
                  active ? "bg-white text-ink shadow-sm" : "text-ink/55 hover:text-ink/80",
                )}
              >
                {MAINTENANCE_TYPE_LABEL[item]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Début</span>
          <Input
            type="datetime-local"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Fin</span>
          <Input
            type="datetime-local"
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
            required
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Motif</span>
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex. révision annuelle, panne…"
        />
      </label>

      <div className="grid grid-cols-2 gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {initial ? "Annuler la modif." : "Fermer"}
        </Button>
        <Button type="submit" variant="primary" disabled={submitting || !startAt || !endAt}>
          {submitting ? "Enregistrement…" : initial ? "Enregistrer" : "Planifier"}
        </Button>
      </div>
    </form>
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
