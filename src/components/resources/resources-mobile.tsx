"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode, type RefObject } from "react";
import {
  LayoutList,
  Plus,
  Search,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Wrench,
} from "lucide-react";
import { ResourceFocusPanel } from "@/components/resources/resource-focus-panel";
import {
  formatTime,
  liveChipClass,
  liveDotClass,
  liveStatus,
  LIVE_STATUS_LABEL,
  remainingMinutes,
  resourceTypeIcon,
} from "@/components/resources/resource-helpers";
import { cn } from "@/lib/utils";
import { formatMad } from "@/modules/analytics/service";
import type { AnalyticsOverview } from "@/types/analytics";
import type { Appointment } from "@/types/appointment";
import type { ResourceListItem, ResourceType } from "@/types/resource";
import { RESOURCE_TYPE_LABEL } from "@/types/resource";

type StatusFilter = "all" | "available" | "occupied" | "soon" | "maintenance" | "inactive";
type MobileView = "list" | "focus";

type ResourcesMobileProps = {
  orgName: string;
  catalogCount: number;
  activeCount: number;
  availableCount: number;
  occupiedCount: number;
  maintenanceCount: number;
  canWrite: boolean;
  financeHidden: boolean;
  overview: AnalyticsOverview | null;
  insight: string;
  searchInput: string;
  onSearchChange: (value: string) => void;
  searchRef: RefObject<HTMLInputElement | null>;
  typeFilter: ResourceType | "";
  onTypeFilter: (type: ResourceType | "") => void;
  statusFilter: StatusFilter;
  onStatusFilter: (status: StatusFilter) => void;
  location: string;
  onLocation: (value: string) => void;
  locations: string[];
  typeCounts: [ResourceType, number][];
  filtered: ResourceListItem[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  selected: ResourceListItem | null;
  currentOf: (id: string) => Appointment | undefined;
  nextOf: (id: string) => Appointment | undefined;
  todayCountOf: (id: string) => number;
  menuId: string | null;
  onMenu: (id: string | null) => void;
  onCreate: () => void;
  onEdit: (id: string) => void;
  onToggle: (row: ResourceListItem) => void;
  onMaintenance: () => void;
};

export function ResourcesMobile({
  orgName,
  catalogCount,
  activeCount,
  availableCount,
  occupiedCount,
  maintenanceCount,
  canWrite,
  financeHidden,
  overview,
  insight,
  searchInput,
  onSearchChange,
  searchRef,
  typeFilter,
  onTypeFilter,
  statusFilter,
  onStatusFilter,
  location,
  onLocation,
  locations,
  typeCounts,
  filtered,
  loading,
  selectedId,
  onSelect,
  selected,
  currentOf,
  nextOf,
  todayCountOf,
  menuId,
  onMenu,
  onCreate,
  onEdit,
  onToggle,
  onMaintenance,
}: ResourcesMobileProps) {
  const [view, setView] = useState<MobileView>("list");
  const focusName = selected?.name ?? "360°";

  function openFocus(id: string) {
    onSelect(id);
    setView("focus");
  }

  useEffect(() => {
    if (view === "focus" && !selected) setView("list");
  }, [view, selected]);

  return (
    <div className="flex flex-col gap-4 lg:hidden">
      <section className="flex flex-col gap-3">
        <div>
          <h1 className="font-display text-[28px] font-bold leading-9 tracking-tight text-ink">
            Ressources & cabines
          </h1>
          <p className="mt-0.5 text-[13px] text-ink/50">
            {catalogCount} {catalogCount > 1 ? "ressources" : "ressource"} · {orgName || "Votre institut"}
          </p>
        </div>
        <div className={cn("grid gap-2", canWrite ? "grid-cols-2" : "grid-cols-1")}>
          {canWrite ? (
            <button
              type="button"
              onClick={onCreate}
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl bg-primary text-[13px] font-semibold text-white shadow-md active:scale-[0.98]"
            >
              <Plus size={18} />
              Ajouter
            </button>
          ) : null}
          {canWrite ? (
            <button
              type="button"
              onClick={onMaintenance}
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl bg-[#F0DDE9] text-[13px] font-semibold text-ink"
            >
              <Wrench size={18} className="text-[#7B5900]" />
              Maintenance
            </button>
          ) : (
            <Link
              href="/planning/"
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl bg-[#F0DDE9] text-[13px] font-semibold text-ink"
            >
              Planning
            </Link>
          )}
        </div>
      </section>

      <div className="rounded-xl bg-white p-3.5 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <Shield size={16} />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-ink">Anti-collision agenda</p>
            <p className="text-[12px] text-ink/50">Doubles réservations et maintenances bloquées.</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-[#FFEFF8] p-3.5">
        <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-primary">
          <Sparkles size={14} />
          Insight espaces
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-ink">{insight}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Kpi label="Total" value={String(catalogCount)} hint={`${activeCount} actives`} />
        <Kpi label="Libres" value={String(availableCount)} hint="Non occupées maintenant" tone="emerald" />
        <Kpi label="En soin" value={String(occupiedCount)} hint="Créneau en cours" />
        <Kpi
          label="CA du mois"
          value={financeHidden ? "—" : overview ? formatMad(overview.revenue.value) : "—"}
          hint={maintenanceCount ? `${maintenanceCount} en maintenance` : "Institut"}
        />
      </div>

      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35" />
        <input
          ref={searchRef}
          value={searchInput}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Rechercher cabine, équipement…"
          className="h-12 w-full rounded-xl bg-white pl-11 pr-11 text-sm text-ink shadow-sm outline-none placeholder:text-ink/35 focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="button"
          aria-label="Filtrer"
          onClick={() => searchRef.current?.focus()}
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-ink/45"
        >
          <SlidersHorizontal size={16} />
        </button>
      </div>

      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
        <Pill active={typeFilter === ""} onClick={() => onTypeFilter("")}>
          Tous ({catalogCount})
        </Pill>
        {typeCounts.map(([t, n]) => (
          <Pill key={t} active={typeFilter === t} onClick={() => onTypeFilter(t)}>
            {RESOURCE_TYPE_LABEL[t]} ({n})
          </Pill>
        ))}
      </div>

      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
        <Pill active={statusFilter === "all"} onClick={() => onStatusFilter("all")}>
          Tous statuts
        </Pill>
        <Pill active={statusFilter === "available"} onClick={() => onStatusFilter("available")}>
          Libres ({availableCount})
        </Pill>
        <Pill active={statusFilter === "occupied"} onClick={() => onStatusFilter("occupied")}>
          En soin ({occupiedCount})
        </Pill>
        <Pill active={statusFilter === "soon"} onClick={() => onStatusFilter("soon")}>
          Bientôt
        </Pill>
        <Pill active={statusFilter === "maintenance"} onClick={() => onStatusFilter("maintenance")}>
          Maintenance ({maintenanceCount})
        </Pill>
      </div>

      {locations.length > 1 ? (
        <select
          value={location}
          onChange={(e) => onLocation(e.target.value)}
          className="h-11 rounded-xl bg-white px-3 text-sm text-ink shadow-sm outline-none"
        >
          <option value="">Tous les emplacements</option>
          {locations.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>
      ) : null}

      <div className="flex items-center rounded-xl bg-[#F6E3EF] p-1">
        <button
          type="button"
          onClick={() => setView("list")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-semibold",
            view === "list" ? "bg-white text-ink shadow-sm" : "text-ink/45",
          )}
        >
          <LayoutList size={16} className="text-primary" />
          Liste ({filtered.length})
        </button>
        <button
          type="button"
          disabled={!selected}
          onClick={() => selected && setView("focus")}
          className={cn(
            "flex flex-1 items-center justify-center rounded-lg py-2 text-[13px] font-semibold disabled:opacity-40",
            view === "focus" ? "bg-white text-ink shadow-sm" : "text-ink/45",
          )}
        >
          Fiche : {focusName}
        </button>
      </div>

      {view === "list" ? (
        <div className="flex flex-col gap-2">
          {loading ? (
            <p className="py-10 text-center text-sm text-ink/40">Chargement…</p>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink/45">Aucune ressource trouvée.</p>
          ) : (
            filtered.map((r) => (
              <ResourceCard
                key={r.id}
                resource={r}
                current={currentOf(r.id)}
                next={nextOf(r.id)}
                todayCount={todayCountOf(r.id)}
                selected={r.id === selectedId}
                menuOpen={menuId === r.id}
                canWrite={canWrite}
                onOpen={() => openFocus(r.id)}
                onMenu={() => onMenu(menuId === r.id ? null : r.id)}
                onEdit={() => onEdit(r.id)}
                onToggle={() => onToggle(r)}
              />
            ))
          )}
        </div>
      ) : selected ? (
        <ResourceFocusPanel
          resourceId={selected.id}
          fallback={selected}
          current={currentOf(selected.id)}
          next={nextOf(selected.id)}
          todayCount={todayCountOf(selected.id)}
          insight={insight}
          canWrite={canWrite}
          onEdit={() => onEdit(selected.id)}
          onToggle={() => onToggle(selected)}
          onMaintenance={onMaintenance}
        />
      ) : null}
    </div>
  );
}

function ResourceCard({
  resource: r,
  current,
  next,
  todayCount,
  selected,
  menuOpen,
  canWrite,
  onOpen,
  onMenu,
  onEdit,
  onToggle,
}: {
  resource: ResourceListItem;
  current?: Appointment;
  next?: Appointment;
  todayCount: number;
  selected: boolean;
  menuOpen: boolean;
  canWrite: boolean;
  onOpen: () => void;
  onMenu: () => void;
  onEdit: () => void;
  onToggle: () => void;
}) {
  const status = liveStatus(r, current, next);
  const Icon = resourceTypeIcon(r.type);
  const left = current ? remainingMinutes(current.endAt) : null;

  return (
    <article className={cn("relative rounded-xl bg-white p-3.5 shadow-sm", selected && "ring-1 ring-primary/25")}>
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={onOpen} className="flex min-w-0 items-start gap-2 text-left">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFD9DE] text-primary">
            <Icon size={18} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[16px] font-bold text-ink">{r.name}</p>
            <p className="truncate text-[12px] text-ink/50">
              {RESOURCE_TYPE_LABEL[r.type]}
              {r.location ? ` · ${r.location}` : ""}
            </p>
          </div>
        </button>
        <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold", liveChipClass(status))}>
          <span className={cn("h-1.5 w-1.5 rounded-full", liveDotClass(status))} />
          {LIVE_STATUS_LABEL[status]}
        </span>
      </div>

      {current ? (
        <div className="mt-3 rounded-lg bg-[#FFEFF8] p-2.5 text-[12px]">
          <p className="font-semibold text-ink">{current.serviceName}</p>
          <p className="text-ink/55">
            {current.staffName} · {current.customerName}
            {left != null ? ` · fin ${formatTime(current.endAt)} (${left} min)` : ""}
          </p>
        </div>
      ) : next ? (
        <p className="mt-3 rounded-lg bg-[#FFEFF8] p-2.5 text-[12px] text-ink/60">
          Prochain : {next.serviceName} à {formatTime(next.startAt)}
        </p>
      ) : null}

      <div className="mt-3 flex items-center justify-between text-[11px] text-ink/45">
        <span>{todayCount} RDV aujourd’hui · cap. {r.capacity}</span>
        {canWrite ? (
          <button type="button" aria-label="Actions" onClick={onMenu} className="font-semibold text-ink/50">
            ⋯
          </button>
        ) : null}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex h-9 items-center justify-center rounded-lg bg-[#F0DDE9] text-[13px] font-semibold text-primary"
        >
          Voir la fiche
        </button>
        <Link
          href="/planning/"
          className="inline-flex h-9 items-center justify-center rounded-lg bg-[#FCE9F4] text-[13px] font-semibold text-ink"
        >
          Planning
        </Link>
      </div>

      {menuOpen && canWrite ? (
        <div className="absolute right-3 top-12 z-10 min-w-[160px] rounded-xl bg-white py-1 shadow-lg ring-1 ring-black/5">
          <button type="button" onClick={onEdit} className="block w-full px-3 py-2 text-left text-[13px] hover:bg-[#FFEFF8]">
            Modifier
          </button>
          <button type="button" onClick={onToggle} className="block w-full px-3 py-2 text-left text-[13px] hover:bg-[#FFEFF8]">
            {r.active ? "Désactiver" : "Réactiver"}
          </button>
        </div>
      ) : null}
    </article>
  );
}

function Kpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: ReactNode;
  tone?: "emerald";
}) {
  return (
    <div className="rounded-xl bg-white p-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/40">{label}</p>
      <p className={cn("mt-1 font-display text-[22px] font-bold", tone === "emerald" ? "text-emerald-700" : "text-ink")}>
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-ink/45">{hint}</p>
    </div>
  );
}

function Pill({
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
        "inline-flex shrink-0 items-center rounded-full px-3.5 py-1.5 text-[12px] font-semibold shadow-sm",
        active ? "bg-primary text-white" : "bg-white text-ink/55",
      )}
    >
      {children}
    </button>
  );
}
