"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode, type RefObject } from "react";
import {
  BadgeCheck,
  CalendarDays,
  LayoutList,
  MapPin,
  MessageCircle,
  MoreVertical,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Timer,
  Users,
  Wallet,
} from "lucide-react";
import { whatsappHref } from "@/components/customers/customers-helpers";
import { StaffFocusPanel } from "@/components/staff/staff-focus-panel";
import {
  shortStaffRef,
  staffInitials,
  statusChipClass,
  statusDotClass,
} from "@/components/staff/staff-helpers";
import { cn } from "@/lib/utils";
import { formatMad, formatPct } from "@/modules/analytics/service";
import type { AnalyticsOverview, ReviewAnalytics } from "@/types/analytics";
import type { StaffListItem, StaffStatus } from "@/types/staff";
import { STAFF_STATUS_LABEL } from "@/types/staff";

type StaffFilter = "all" | "active" | "leave" | "top";
type MobileView = "list" | "focus";

type StaffMobileProps = {
  orgName: string;
  catalogCount: number;
  activeCount: number;
  leaveCount: number;
  canWrite: boolean;
  canPerf: boolean;
  canCommissions: boolean;
  canExport: boolean;
  financeHidden: boolean;
  overview: AnalyticsOverview | null;
  reviews: ReviewAnalytics | null;
  commissionTotal: number | null;
  insight: string;
  searchInput: string;
  onSearchChange: (value: string) => void;
  searchRef: RefObject<HTMLInputElement>;
  filter: StaffFilter;
  onFilterChange: (filter: StaffFilter) => void;
  position: string;
  onPositionChange: (value: string) => void;
  positions: string[];
  filtered: StaffListItem[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  selected: StaffListItem | null;
  topSellerIds: Set<string>;
  teamRevenue: number;
  menuId: string | null;
  onMenu: (id: string | null) => void;
  onCreate: () => void;
  onEdit: (id: string) => void;
  onStatus: (id: string, status: StaffStatus) => void;
  onExport: () => void;
};

export function StaffMobile({
  orgName,
  catalogCount,
  activeCount,
  leaveCount,
  canWrite,
  canPerf,
  canCommissions,
  canExport,
  financeHidden,
  overview,
  reviews,
  commissionTotal,
  insight,
  searchInput,
  onSearchChange,
  searchRef,
  filter,
  onFilterChange,
  position,
  onPositionChange,
  positions,
  filtered,
  loading,
  selectedId,
  onSelect,
  selected,
  topSellerIds,
  teamRevenue,
  menuId,
  onMenu,
  onCreate,
  onEdit,
  onStatus,
  onExport,
}: StaffMobileProps) {
  const [view, setView] = useState<MobileView>("list");
  const focusName = selected?.firstName ?? "360°";
  const apptChange = overview?.appointments.changePercent;

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
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#7B5900]/10 px-2 py-0.5 text-[11px] font-bold text-[#7B5900]">
              <BadgeCheck size={12} />
              {orgName || "Votre institut"}
            </span>
          </div>
        </div>
        <div>
          <h1 className="font-display text-[28px] font-bold leading-9 tracking-tight text-ink">
            Gestion de l’équipe
          </h1>
          <p className="mt-0.5 text-[13px] text-ink/50">
            {catalogCount} {catalogCount > 1 ? "praticiennes" : "praticienne"} · {orgName || "Votre institut"}
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
          <Link
            href="/planning/"
            className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl bg-[#F0DDE9] text-[13px] font-semibold text-ink"
          >
            <Timer size={18} className="text-[#7B5900]" />
            Planning
          </Link>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2">
        <KpiCard
          label="Équipe totale"
          value={String(catalogCount)}
          hint={`${activeCount} active${activeCount !== 1 ? "s" : ""} · ${leaveCount} congé`}
          icon={<Users size={14} />}
        />
        <KpiCard
          label="Actives"
          value={String(activeCount)}
          hint={leaveCount ? `${leaveCount} en congé` : "Aucune en congé"}
          icon={<BadgeCheck size={14} />}
          tone="emerald"
        />
        <KpiCard
          label="CA praticiennes"
          value={financeHidden || !canPerf ? "—" : overview ? formatMad(overview.revenue.value) : "—"}
          hint={
            financeHidden || !canPerf
              ? "Accès limité"
              : overview?.revenue.changePercent != null
                ? `${formatPct(overview.revenue.changePercent)} vs m-1`
                : "Mois en cours"
          }
          icon={<Wallet size={14} />}
          tone="gold"
        />
        <KpiCard
          label="Satisfaction"
          value={reviews?.averageInternalScore != null ? String(reviews.averageInternalScore) : "—"}
          hint={
            reviews?.recordedSatisfaction
              ? `${reviews.recordedSatisfaction} avis ce mois`
              : "Score interne /5"
          }
          icon={<Star size={14} />}
        />
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <StripChip
          icon={<Timer size={16} className="text-primary" />}
          label="Soins du mois"
          value={overview ? String(overview.appointments.value) : "—"}
          hint={
            apptChange != null ? (
              <span className={apptChange >= 0 ? "text-emerald-700" : "text-red-700"}>
                {formatPct(apptChange)}
              </span>
            ) : (
              "Honorés"
            )
          }
        />
        {canCommissions ? (
          <StripChip
            icon={<Wallet size={16} className="text-[#7B5900]" />}
            label="Commissions"
            value={commissionTotal != null ? formatMad(commissionTotal) : "—"}
            hint="Mois en cours"
          />
        ) : null}
        {canExport ? (
          <button
            type="button"
            onClick={onExport}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-[#F6E3EF]/80 px-3.5 py-2 whitespace-nowrap text-[12px] font-semibold text-ink"
          >
            Exporter l’équipe
          </button>
        ) : null}
      </div>

      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35" />
        <input
          ref={searchRef}
          value={searchInput}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Rechercher une praticienne, un poste…"
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
        <Pill active={filter === "all"} onClick={() => onFilterChange("all")}>
          Toutes ({catalogCount})
        </Pill>
        <Pill active={filter === "active"} onClick={() => onFilterChange("active")}>
          Actives ({activeCount})
        </Pill>
        <Pill active={filter === "leave"} onClick={() => onFilterChange("leave")}>
          En congé ({leaveCount})
        </Pill>
        <Pill active={filter === "top"} onClick={() => onFilterChange("top")} gold>
          <Star size={12} />
          Top vendeuses
        </Pill>
      </div>

      {positions.length > 1 ? (
        <select
          value={position}
          onChange={(e) => onPositionChange(e.target.value)}
          className="h-11 rounded-xl bg-white px-3 text-sm text-ink shadow-sm outline-none"
        >
          <option value="">Tous les postes</option>
          {positions.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      ) : null}

      <div className="flex items-center rounded-xl bg-[#F6E3EF] p-1">
        <button
          type="button"
          onClick={() => setView("list")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-semibold transition-all",
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
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-semibold transition-all disabled:opacity-40",
            view === "focus" ? "bg-white text-ink shadow-sm" : "text-ink/45",
          )}
        >
          Fiche 360° : {focusName}
        </button>
      </div>

      {view === "list" ? (
        <div className="flex flex-col gap-2">
          {loading ? (
            <p className="py-10 text-center text-sm text-ink/40">Chargement…</p>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink/45">Aucune collaboratrice trouvée.</p>
          ) : (
            filtered.map((s) => (
              <StaffListCard
                key={s.id}
                staff={s}
                canPerf={canPerf}
                financeHidden={financeHidden}
                isTop={topSellerIds.has(s.id)}
                selected={s.id === selectedId}
                menuOpen={menuId === s.id}
                onOpen={() => openFocus(s.id)}
                onMenu={() => onMenu(menuId === s.id ? null : s.id)}
                onEdit={() => onEdit(s.id)}
                onStatus={(status) => onStatus(s.id, status)}
                canWrite={canWrite}
              />
            ))
          )}
        </div>
      ) : selected ? (
        <StaffFocusPanel
          staffId={selected.id}
          fallback={selected}
          canWrite={canWrite}
          canPerf={canPerf}
          canCommissions={canCommissions}
          financeHidden={financeHidden}
          isTopSeller={topSellerIds.has(selected.id)}
          teamRevenue={teamRevenue}
          insight={insight}
          onEdit={() => onEdit(selected.id)}
          onStatus={(status) => onStatus(selected.id, status)}
        />
      ) : null}
    </div>
  );
}

function StaffListCard({
  staff: s,
  canPerf,
  financeHidden,
  isTop,
  selected,
  menuOpen,
  onOpen,
  onMenu,
  onEdit,
  onStatus,
  canWrite,
}: {
  staff: StaffListItem;
  canPerf: boolean;
  financeHidden: boolean;
  isTop: boolean;
  selected: boolean;
  menuOpen: boolean;
  onOpen: () => void;
  onMenu: () => void;
  onEdit: () => void;
  onStatus: (status: StaffStatus) => void;
  canWrite: boolean;
}) {
  const showFinance = canPerf && !financeHidden;
  return (
    <article
      className={cn(
        "relative flex flex-col gap-2 rounded-xl bg-white p-3 shadow-sm",
        selected && "ring-1 ring-primary/25",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={onOpen} className="flex min-w-0 items-center gap-2 text-left">
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FFD9DE] text-[13px] font-bold text-primary">
              {staffInitials(s.firstName, s.lastName)}
            </div>
            <span
              className={cn(
                "absolute bottom-0 right-0 h-3 w-3 rounded-full ring-2 ring-white",
                statusDotClass(s.status),
              )}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-[16px] font-bold text-ink">{s.displayName}</span>
              {isTop ? <Sparkles size={14} className="shrink-0 text-[#7B5900]" /> : null}
            </div>
            <p className="truncate text-[13px] text-primary">
              {s.position || "Collaboratrice"}
              {isTop ? " · Top vendeuse" : ""}
            </p>
            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-ink/45">
              <span>{shortStaffRef(s.id)}</span>
              {s.rating != null ? (
                <span className="inline-flex items-center gap-0.5 font-bold text-amber-600">
                  <Star size={12} className="fill-amber-500" />
                  {s.rating}
                  <span className="font-normal text-ink/40">/10</span>
                </span>
              ) : null}
            </div>
          </div>
        </button>
        <div className="flex items-center gap-1">
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", statusChipClass(s.status))}>
            {STAFF_STATUS_LABEL[s.status]}
          </span>
          {canWrite ? (
            <button
              type="button"
              aria-label="Actions"
              onClick={onMenu}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FCE9F4] text-ink/45"
            >
              <MoreVertical size={16} />
            </button>
          ) : null}
        </div>
      </div>

      {s.phone ? (
        <div className="flex items-center justify-between rounded-lg bg-[#F6E3EF]/40 px-2.5 py-2 text-[11px] text-ink/60">
          <span className="inline-flex items-center gap-1.5 truncate">
            <MapPin size={14} className="text-emerald-600" />
            {s.phone}
          </span>
          <a
            href={whatsappHref(s.phone, s.firstName)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-primary"
          >
            <MessageCircle size={14} />
            WhatsApp
          </a>
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-[#FCE9F4]/50 p-1.5">
          <span className="block text-[10px] uppercase text-ink/40">RDV</span>
          <span className="text-[13px] font-bold text-ink">{s.appointmentCount}</span>
        </div>
        <div className="rounded-lg bg-[#FCE9F4]/50 p-1.5">
          <span className="block text-[10px] uppercase text-ink/40">CA</span>
          <span className="text-[13px] font-bold text-primary">
            {showFinance ? formatMad(s.revenue) : "—"}
          </span>
        </div>
        <div className="rounded-lg bg-[#FCE9F4]/50 p-1.5">
          <span className="block text-[10px] uppercase text-ink/40">Statut</span>
          <span className="text-[13px] font-semibold text-ink">{STAFF_STATUS_LABEL[s.status]}</span>
        </div>
      </div>

      {s.serviceNames.length ? (
        <div className="flex flex-wrap gap-1">
          {s.serviceNames.slice(0, 3).map((name) => (
            <span key={name} className="rounded-md bg-[#FCE9F4] px-2 py-0.5 text-[10px] text-ink/55">
              {name}
            </span>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex h-10 items-center justify-center gap-1 rounded-lg bg-[#F0DDE9] text-[13px] font-semibold text-primary"
        >
          Voir fiche 360°
        </button>
        <Link
          href="/planning/"
          className="inline-flex h-10 items-center justify-center gap-1 rounded-lg bg-[#FCE9F4] text-[13px] font-semibold text-ink"
        >
          <CalendarDays size={14} />
          Planning
        </Link>
      </div>

      {menuOpen && canWrite ? (
        <div className="absolute right-3 top-12 z-10 min-w-[160px] rounded-xl bg-white py-1 shadow-lg ring-1 ring-black/5">
          <button
            type="button"
            onClick={onEdit}
            className="block w-full px-3 py-2 text-left text-[13px] hover:bg-[#FFEFF8]"
          >
            Modifier
          </button>
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
  icon,
  tone,
}: {
  label: string;
  value: string;
  hint: ReactNode;
  icon: ReactNode;
  tone?: "emerald" | "gold";
}) {
  return (
    <div className="flex flex-col justify-between rounded-xl bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-ink/45">{label}</span>
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full",
            tone === "emerald" ? "bg-emerald-50 text-emerald-700" : tone === "gold" ? "bg-[#FCCA66]/40 text-[#7B5900]" : "bg-[#FCE9F4] text-primary",
          )}
        >
          {icon}
        </span>
      </div>
      <div className="mt-2">
        <p className="font-display text-[22px] font-bold leading-7 text-ink">{value}</p>
        <p className="mt-0.5 text-[11px] text-ink/45">{hint}</p>
      </div>
    </div>
  );
}

function StripChip({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint: ReactNode;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2.5 rounded-lg bg-[#F6E3EF]/80 px-3.5 py-2 whitespace-nowrap">
      {icon}
      <div className="flex flex-col">
        <span className="text-[10px] font-semibold uppercase text-ink/40">{label}</span>
        <span className="text-[13px] font-semibold text-ink">
          {value} <span className="text-[11px] font-normal text-ink/50">{hint}</span>
        </span>
      </div>
    </div>
  );
}

function Pill({
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
        "inline-flex shrink-0 items-center gap-1 rounded-full px-3.5 py-1.5 text-[12px] font-semibold shadow-sm",
        active
          ? gold
            ? "bg-[#FCCA66] text-[#755400]"
            : "bg-primary text-white"
          : gold
            ? "bg-white text-[#7B5900]"
            : "bg-white text-ink/55",
      )}
    >
      {children}
    </button>
  );
}
