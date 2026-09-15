"use client";

import Link from "next/link";
import type { ReactNode, RefObject } from "react";
import {
  CalendarDays,
  Diamond,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Store,
  Tags,
  TrendingUp,
} from "lucide-react";
import {
  categoryIcon,
  hourlyRate,
  staffInitials,
} from "@/components/services/services-helpers";
import { cn } from "@/lib/utils";
import { formatMad, formatPct } from "@/modules/analytics/service";
import { formatDuration } from "@/modules/services/service";
import type { AnalyticsOverview, ServiceAnalyticsRow } from "@/types/analytics";
import type { ServiceListItem } from "@/types/service";

type ActiveFilter = "all" | "active" | "inactive";

type ServicesMobileProps = {
  orgName: string;
  catalogCount: number;
  activeCount: number;
  canWrite: boolean;
  financeHidden: boolean;
  overview: AnalyticsOverview | null;
  insight: string;
  searchInput: string;
  onSearchChange: (value: string) => void;
  searchRef: RefObject<HTMLInputElement>;
  category: string;
  activeFilter: ActiveFilter;
  onCategoryChange: (category: string) => void;
  onActiveFilterChange: (filter: ActiveFilter) => void;
  categoryCounts: [string, number][];
  filtered: ServiceListItem[];
  statsById: Map<string, ServiceAnalyticsRow>;
  loading: boolean;
  topByAppointments: ServiceAnalyticsRow | null;
  topHourlyId: string | null;
  topHourlyRate: number | null;
  menuId: string | null;
  onMenu: (id: string | null) => void;
  onCreate: () => void;
  onCategories: () => void;
  onEdit: (id: string) => void;
  onToggle: (service: ServiceListItem) => void;
};

export function ServicesMobile({
  orgName,
  catalogCount,
  activeCount,
  canWrite,
  financeHidden,
  overview,
  insight,
  searchInput,
  onSearchChange,
  searchRef,
  category,
  activeFilter,
  onCategoryChange,
  onActiveFilterChange,
  categoryCounts,
  filtered,
  statsById,
  loading,
  topByAppointments,
  topHourlyId,
  topHourlyRate,
  menuId,
  onMenu,
  onCreate,
  onCategories,
  onEdit,
  onToggle,
}: ServicesMobileProps) {
  function cycleStatusFilter() {
    const next: ActiveFilter = activeFilter === "all" ? "active" : activeFilter === "active" ? "inactive" : "all";
    onActiveFilterChange(next);
    onCategoryChange("");
  }

  const filterHint =
    activeFilter === "active" ? "Actifs" : activeFilter === "inactive" ? "Inactifs" : "Tous";

  return (
    <div className="flex flex-col gap-3 lg:hidden">
      <section className="flex flex-col gap-2">
        <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#FFEFF8] px-2 py-0.5 text-[#7B5900]">
          <Store size={12} />
          <span className="text-[11px] font-bold uppercase tracking-wider">
            {orgName || "Votre institut"}
          </span>
        </div>
        <div>
          <h1 className="font-display text-[22px] font-bold leading-7 tracking-tight text-ink">
            Services & Prestations
          </h1>
          <p className="mt-0.5 text-[13px] text-ink/50">
            Catalogue & synchronisation agenda • {catalogCount}{" "}
            {catalogCount !== 1 ? "prestations" : "prestation"}
          </p>
        </div>
        {canWrite ? (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={onCreate}
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl bg-primary text-[13px] font-semibold text-white shadow-md active:scale-[0.98]"
            >
              <Plus size={18} />
              Nouveau service
            </button>
            <button
              type="button"
              onClick={onCategories}
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl bg-[#F0DDE9] text-[13px] font-semibold text-ink active:bg-[#E4BDC2]/40"
            >
              <Tags size={18} className="text-ink/50" />
              Catégories
            </button>
          </div>
        ) : null}
      </section>

      <section className="relative overflow-hidden rounded-xl bg-[#FFEFF8] p-3 shadow-sm">
        <div className="flex items-start gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-sm">
            <Sparkles size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary">À partir du catalogue</p>
            <p className="mt-1 text-[13px] leading-5 text-ink">{insight}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Link
                href="/ai/"
                className="inline-flex h-8 items-center gap-1 rounded-lg bg-white px-3 text-[12px] font-semibold text-primary shadow-sm"
              >
                Ouvrir le copilote
              </Link>
              <Link href="/agenda/" className="inline-flex h-8 items-center px-2.5 text-[12px] font-medium text-ink/50">
                Agenda
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2">
        <KpiTile
          label="Catalogue"
          value={String(catalogCount)}
          hint={
            <>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-600" />
              {activeCount} en ligne
            </>
          }
        />
        <KpiTile
          label="Réservations"
          value={overview ? String(overview.appointments.value) : "—"}
          hint={
            overview?.appointments.changePercent != null ? (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 font-bold",
                  overview.appointments.changePercent >= 0 ? "text-emerald-700" : "text-red-700",
                )}
              >
                <TrendingUp
                  size={12}
                  className={overview.appointments.changePercent < 0 ? "rotate-180" : undefined}
                />
                {formatPct(overview.appointments.changePercent)} ce mois
              </span>
            ) : (
              "Mois en cours"
            )
          }
        />
        <KpiTile
          label="CA prestations"
          value={financeHidden ? "—" : overview ? formatMad(overview.revenue.value) : "—"}
          hint={financeHidden ? "Accès limité" : "Mois en cours"}
        />
        <KpiTile
          label="Panier moyen"
          value={financeHidden ? "—" : overview ? formatMad(overview.averageTicket.value) : "—"}
          hint={
            topByAppointments && topByAppointments.appointments > 0
              ? `Phare : ${topByAppointments.serviceName} (${topByAppointments.appointments})`
              : "Mois en cours"
          }
        />
      </section>

      <section className="flex flex-col gap-2">
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
          <input
            ref={searchRef}
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher un soin, une praticienne…"
            className="h-11 w-full rounded-xl bg-white pl-10 pr-11 text-[13px] text-ink shadow-sm outline-none placeholder:text-ink/35 focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="button"
            aria-label={`Filtrer le statut (${filterHint})`}
            onClick={cycleStatusFilter}
            className={cn(
              "absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg",
              activeFilter === "all" ? "text-ink/40" : "bg-[#FCE9F4] text-primary",
            )}
          >
            <SlidersHorizontal size={16} />
          </button>
        </div>
        <div className="-mx-4 flex items-center gap-1.5 overflow-x-auto px-4 py-0.5">
          <Pill
            active={!category && activeFilter === "all"}
            onClick={() => {
              onCategoryChange("");
              onActiveFilterChange("all");
            }}
            label="Tous"
            count={catalogCount}
          />
          {categoryCounts.map(([name, count]) => (
            <Pill
              key={name}
              active={category === name}
              onClick={() => {
                onCategoryChange(name);
                onActiveFilterChange("all");
              }}
              label={name}
              count={count}
            />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        {loading ? (
          <p className="rounded-2xl bg-white py-10 text-center text-sm text-ink/40 shadow-sm">Chargement…</p>
        ) : filtered.length === 0 ? (
          <p className="rounded-2xl bg-white py-10 text-center text-sm text-ink/45 shadow-sm">
            Aucun service trouvé.
          </p>
        ) : (
          filtered.map((s) => (
            <MobileServiceCard
              key={s.id}
              service={s}
              stats={statsById.get(s.id)}
              financeHidden={financeHidden}
              canWrite={canWrite}
              isBestSeller={topByAppointments?.serviceId === s.id && (topByAppointments?.appointments ?? 0) > 0}
              isTopHourly={topHourlyId === s.id}
              topHourlyRate={topHourlyId === s.id ? topHourlyRate : null}
              menuOpen={menuId === s.id}
              onMenu={() => onMenu(menuId === s.id ? null : s.id)}
              onEdit={() => onEdit(s.id)}
              onToggle={() => onToggle(s)}
            />
          ))
        )}
      </section>
    </div>
  );
}

function KpiTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between rounded-xl bg-white p-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/40">{label}</p>
      <p className="mt-2 font-display text-[22px] font-bold leading-7 text-ink">{value}</p>
      <div className="mt-1 flex items-center gap-1 text-[12px] text-ink/50">{hint}</div>
    </div>
  );
}

function Pill({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-3.5 py-1.5 text-[12px] font-semibold shadow-sm",
        active ? "bg-primary text-white" : "bg-white text-ink",
      )}
    >
      <span>{label}</span>
      <span className={cn("text-[10px]", active ? "text-white/80" : "font-normal text-ink/40")}>{count}</span>
    </button>
  );
}

function MobileServiceCard({
  service: s,
  stats,
  financeHidden,
  canWrite,
  isBestSeller,
  isTopHourly,
  topHourlyRate,
  menuOpen,
  onMenu,
  onEdit,
  onToggle,
}: {
  service: ServiceListItem;
  stats?: ServiceAnalyticsRow;
  financeHidden: boolean;
  canWrite: boolean;
  isBestSeller: boolean;
  isTopHourly: boolean;
  topHourlyRate: number | null;
  menuOpen: boolean;
  onMenu: () => void;
  onEdit: () => void;
  onToggle: () => void;
}) {
  const Icon = categoryIcon(s.category);
  const hourly = hourlyRate(s.price, s.durationMin);
  const rdv = stats?.appointments ?? 0;
  const ca = stats?.revenue ?? 0;

  return (
    <article
      className={cn(
        "relative flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm",
        !s.active && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold",
              s.active ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-ink/50",
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", s.active ? "bg-emerald-500" : "bg-ink/30")} />
            {s.active ? "En ligne" : "Hors ligne"}
          </span>
          {isBestSeller ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-[#FCCA66] px-2 py-0.5 text-[11px] font-bold text-[#7B5900]">
              <Star size={12} />
              Top vente
            </span>
          ) : s.category ? (
            <span className="rounded-md bg-[#F6E3EF] px-2 py-0.5 text-[11px] font-semibold text-ink/50">
              {s.category}
            </span>
          ) : null}
          {isTopHourly && !financeHidden && topHourlyRate != null ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-[#7B5900] px-2 py-0.5 text-[11px] font-bold text-white">
              <Diamond size={12} />
              {formatMad(topHourlyRate)} / heure
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {canWrite ? (
            <button
              type="button"
              role="switch"
              aria-checked={s.active}
              aria-label={s.active ? "Désactiver le service" : "Activer le service"}
              onClick={onToggle}
              className={cn(
                "relative h-5 w-9 rounded-full transition-colors",
                s.active ? "bg-primary" : "bg-[#F0DDE9]",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                  s.active ? "translate-x-4" : "translate-x-0.5",
                )}
              />
            </button>
          ) : null}
          {canWrite ? (
            <div className="relative">
              <button
                type="button"
                aria-label="Options du service"
                onClick={onMenu}
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink/40"
              >
                <MoreVertical size={18} />
              </button>
              {menuOpen ? (
                <div className="absolute right-0 z-20 mt-1 w-40 rounded-xl border border-line bg-white py-1 text-left text-xs shadow-lg">
                  <button type="button" className="block w-full px-3 py-2 text-left hover:bg-[#FFEFF8]" onClick={onEdit}>
                    Modifier
                  </button>
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left hover:bg-[#FFEFF8]"
                    onClick={onToggle}
                  >
                    {s.active ? "Désactiver" : "Réactiver"}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#F6E3EF] text-primary">
          <Icon size={26} />
        </div>
        <div className="flex min-w-0 flex-col justify-center">
          <h2 className="truncate text-[16px] font-bold leading-snug text-ink">{s.name}</h2>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-[22px] font-bold leading-7 text-primary">
              {s.price.toLocaleString("fr-MA", { maximumFractionDigits: 0 })}{" "}
              <span className="text-[14px] font-normal">MAD</span>
            </span>
            <span className="text-[12px] text-ink/30">•</span>
            <span className="inline-flex items-center gap-0.5 text-[13px] text-ink/50">
              {formatDuration(s.durationMin)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-[#FFEFF8]/80 p-2 text-[12px] text-ink/55">
        <div className="flex min-w-0 items-center gap-1.5">
          {rdv > 0 ? (
            <>
              <CalendarDays size={14} className="shrink-0 text-primary" />
              <span>
                <strong className="text-ink">{rdv} RDV</strong>
                {!financeHidden ? (
                  <>
                    <span className="text-ink/30"> • </span>
                    <span className="font-semibold text-ink">{formatMad(ca)}</span>
                  </>
                ) : null}
              </span>
            </>
          ) : hourly != null && !financeHidden ? (
            <>
              <TrendingUp size={14} className="shrink-0 text-[#7B5900]" />
              <span>
                Tarif / heure <strong className="text-ink">{formatMad(hourly)}</strong>
              </span>
            </>
          ) : (
            <span>Aucune vente terminée ce mois</span>
          )}
        </div>
        {s.staffNames.length > 0 ? (
          <div className="flex shrink-0 -space-x-1.5">
            {s.staffNames.slice(0, 3).map((name) => (
              <span
                key={name}
                title={name}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FFD9DE] text-[10px] font-bold text-primary ring-1 ring-white"
              >
                {staffInitials(name)}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <Link
          href="/agenda/"
          className="inline-flex h-9 items-center gap-1 rounded-lg bg-[#FCE9F4] px-3 text-[12px] font-semibold text-ink"
        >
          <CalendarDays size={14} />
          Créneaux
        </Link>
        {canWrite ? (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-9 items-center gap-1 rounded-lg bg-[#F6E3EF] px-4 text-[13px] font-semibold text-primary"
          >
            <Pencil size={14} />
            Modifier
          </button>
        ) : null}
      </div>
    </article>
  );
}
