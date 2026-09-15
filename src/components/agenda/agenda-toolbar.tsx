"use client";

import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Filter,
  Lock,
  Maximize2,
  Plus,
  Search,
  SlidersHorizontal,
  Wallet,
} from "lucide-react";
import type { AgendaView, AppointmentStatus } from "@/types/appointment";
import { APPOINTMENT_STATUS_LABEL } from "@/modules/appointments/constants";
import { formatMad } from "@/modules/analytics/service";
import { staffColor } from "@/components/agenda/staff-colors";
import { cn } from "@/lib/utils";
import type { ServiceAgendaOption } from "@/types/service";
import type { ServiceFormOptions } from "@/types/service";

export type AgendaKpis = {
  todayCount: number;
  confirmed: number;
  pending: number;
  cancelled: number;
  forecast: number;
  secured: number;
  occupancy: number | null;
  starLabel: string | null;
};

type ChromeProps = {
  view: AgendaView;
  onViewChange: (v: AgendaView) => void;
  rangeLabel: string;
  todayChip: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onCreate: () => void;
  onBlockSlot: () => void;
  onFullscreen?: () => void;
  kpis: AgendaKpis;
  staffFilter: string;
  serviceFilter: string;
  resourceFilter: string;
  statusFilter: AppointmentStatus | "ALL";
  search: string;
  services: ServiceAgendaOption[];
  staffOptions: ServiceFormOptions["staff"];
  resourceOptions: ServiceFormOptions["resources"];
  staffCounts: Record<string, number>;
  whatsappConnected: boolean | null;
  onStaffFilter: (v: string) => void;
  onServiceFilter: (v: string) => void;
  onResourceFilter: (v: string) => void;
  onStatusFilter: (v: AppointmentStatus | "ALL") => void;
  onSearch: (v: string) => void;
};

const VIEWS: { id: AgendaView; label: string }[] = [
  { id: "day", label: "Jour" },
  { id: "3days", label: "3 jours" },
  { id: "week", label: "Semaine" },
  { id: "month", label: "Mois" },
];

export function AgendaChrome({
  view,
  onViewChange,
  rangeLabel,
  todayChip,
  onPrev,
  onNext,
  onToday,
  onCreate,
  onBlockSlot,
  onFullscreen,
  kpis,
  staffFilter,
  serviceFilter,
  resourceFilter,
  statusFilter,
  search,
  services,
  staffOptions,
  resourceOptions,
  staffCounts,
  whatsappConnected,
  onStaffFilter,
  onServiceFilter,
  onResourceFilter,
  onStatusFilter,
  onSearch,
}: ChromeProps) {
  return (
    <div className="mb-6 flex flex-col gap-4">
      <section className="flex flex-col gap-5 rounded-xl bg-white p-5 shadow-soft xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FBF4F6] text-primary">
            <CalendarDays size={22} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                Agenda de l&apos;institut
              </h1>
              <span className="rounded-full bg-primary-light px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary">
                Direct cabines
              </span>
            </div>
            <p className="mt-0.5 text-sm text-ink/50">
              Planning multi-praticiennes — anti double-réservation vérifié côté serveur
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 md:min-w-[260px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" />
            <input
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Rechercher cliente, soin…"
              className="h-10 w-full rounded-lg bg-[#FBF4F6] pl-9 pr-3 text-sm outline-none placeholder:text-ink/35 focus:bg-white focus:ring-1 focus:ring-primary/30"
            />
          </div>
          <button
            type="button"
            onClick={onBlockSlot}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#FBF4F6] px-3 text-sm font-semibold text-ink hover:bg-[#F0DDE9]"
          >
            <Lock size={16} />
            Bloquer créneau
          </button>
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark"
          >
            <Plus size={18} />
            Nouveau rendez-vous
          </button>
          <Link
            href="/planning/"
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FBF4F6] text-ink/45 hover:text-ink"
            aria-label="Planning & fermetures"
          >
            <SlidersHorizontal size={18} />
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 rounded-xl bg-[#FBF4F6] p-3 md:grid-cols-4">
        <KpiTile
          icon={CalendarDays}
          label="RDV aujourd'hui"
          value={String(kpis.todayCount)}
          hint={`${kpis.confirmed} conf. • ${kpis.pending} att. • ${kpis.cancelled} ann.`}
          tint="bg-primary-light text-primary"
        />
        <KpiTile
          icon={Wallet}
          label="CA prévisionnel"
          value={formatMad(kpis.forecast)}
          tint="bg-[#FFF1D6] text-gold"
        />
        <KpiTile
          icon={CheckCircle2}
          label="CA confirmé"
          value={formatMad(kpis.secured)}
          tint="bg-[#FBF4F6] text-primary"
        />
        <KpiTile
          icon={Cloud}
          label="Taux d'occupation"
          value={kpis.occupancy != null ? `${kpis.occupancy} %` : "—"}
          hint={kpis.starLabel}
          tint="bg-white text-ink"
        />
      </section>

      <section className="flex flex-col gap-4 rounded-xl bg-white p-4 shadow-soft lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg bg-[#FBF4F6] p-1">
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-white"
              onClick={onPrev}
              aria-label="Période précédente"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              className="h-8 rounded-md px-3 text-sm font-semibold hover:bg-white"
              onClick={onToday}
            >
              Aujourd&apos;hui
            </button>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-white"
              onClick={onNext}
              aria-label="Période suivante"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays size={18} className="text-primary" />
            <span className="text-base font-bold text-ink">{rangeLabel}</span>
            <span className="hidden rounded bg-primary-light px-2 py-0.5 text-[11px] font-semibold text-primary md:inline">
              {todayChip}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-[#FBF4F6] p-1 text-sm">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => onViewChange(v.id)}
                className={cn(
                  "rounded-md px-3 py-1.5 transition",
                  view === v.id ? "bg-white font-bold text-primary shadow-sm" : "text-ink/50 hover:text-ink",
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
          {onFullscreen ? (
            <button
              type="button"
              onClick={onFullscreen}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FBF4F6] text-ink/45 hover:text-ink"
              aria-label="Plein écran"
            >
              <Maximize2 size={16} />
            </button>
          ) : null}
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-xl bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-ink/45">
              <Filter size={14} /> Filtres
            </span>
            <select
              value={staffFilter}
              onChange={(e) => onStaffFilter(e.target.value)}
              className="h-9 appearance-none rounded-lg bg-[#FBF4F6] px-3 pr-7 text-sm font-medium outline-none"
            >
              <option value="ALL">Praticienne : toutes ({staffOptions.length})</option>
              {staffOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              value={serviceFilter}
              onChange={(e) => onServiceFilter(e.target.value)}
              className="h-9 appearance-none rounded-lg bg-[#FBF4F6] px-3 pr-7 text-sm font-medium outline-none"
            >
              <option value="ALL">Service : tous</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilter(e.target.value as AppointmentStatus | "ALL")}
              className="h-9 appearance-none rounded-lg bg-[#FBF4F6] px-3 pr-7 text-sm font-medium outline-none"
            >
              <option value="ALL">Statut : tous</option>
              {(Object.keys(APPOINTMENT_STATUS_LABEL) as AppointmentStatus[]).map((k) => (
                <option key={k} value={k}>
                  {APPOINTMENT_STATUS_LABEL[k]}
                </option>
              ))}
            </select>
            <select
              value={resourceFilter}
              onChange={(e) => onResourceFilter(e.target.value)}
              className="h-9 appearance-none rounded-lg bg-[#FBF4F6] px-3 pr-7 text-sm font-medium outline-none"
            >
              <option value="ALL">Espace : tous</option>
              {resourceOptions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 text-xs text-ink/45">
            <span>WhatsApp</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#FBF4F6] px-2 py-0.5 font-semibold text-ink">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  whatsappConnected ? "bg-emerald-500" : "bg-ink/25",
                )}
              />
              {whatsappConnected ? "Connecté" : whatsappConnected === false ? "Indisponible" : "…"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-[#FBF4F6]/80 p-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink/45">
            Praticiennes
          </span>
          {staffOptions.map((s) => {
            const color = staffColor(s.id);
            const active = staffFilter === "ALL" || staffFilter === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onStaffFilter(staffFilter === s.id ? "ALL" : s.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-sm transition",
                  active ? "opacity-100" : "opacity-40",
                )}
              >
                <span className={cn("h-3 w-3 rounded-full ring-2", color.bar, color.ring)} />
                <span className="text-sm font-bold text-ink">{s.name}</span>
                {s.role ? <span className="text-[11px] text-ink/45">{s.role}</span> : null}
                <span className="rounded bg-[#FBF4F6] px-1.5 text-[11px] font-semibold">
                  {staffCounts[s.id] ?? 0} RDV
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function KpiTile({
  icon: Icon,
  label,
  value,
  hint,
  tint,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
  hint?: string | null;
  tint: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-white p-3">
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", tint)}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-ink/45">{label}</span>
        <p className="truncate text-xl font-bold text-ink">{value}</p>
        {hint ? <p className="truncate text-[11px] text-ink/45">{hint}</p> : null}
      </div>
    </div>
  );
}
