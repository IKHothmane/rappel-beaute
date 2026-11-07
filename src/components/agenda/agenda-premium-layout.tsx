"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coins,
  Expand,
  Hourglass,
  Plus,
  TrendingUp,
  Users,
} from "lucide-react";

import { GoogleCalendarConnect } from "@/components/agenda/google-calendar-connect";
import type { Appointment, AppointmentStatus, AgendaView } from "@/types/appointment";

type Option = {
  id: string;
  name: string;
};

type AgendaPremiumLayoutProps = {
  date: Date;
  view: AgendaView;
  appointments: Appointment[];
  todayCount: number;
  todayDeltaPct: number | null;
  confirmed: number;
  confirmedPct: number | null;
  pending: number;
  clientesToday: number;
  newClientesToday: number;
  forecast: number;
  forecastCount: number;
  occupancy: number | null;
  occupancyDelta: number | null;
  rangeLabel: string;
  weekNumber: number | null;
  staff: Option[];
  services: Option[];
  resources: Option[];
  staffFilter: string;
  serviceFilter: string;
  resourceFilter: string;
  statusFilter: AppointmentStatus | "ALL";
  onStaffFilter: (value: string) => void;
  onServiceFilter: (value: string) => void;
  onResourceFilter: (value: string) => void;
  onStatusFilter: (value: AppointmentStatus | "ALL") => void;
  onViewChange: (view: AgendaView) => void;
  onDateChange: (date: Date) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onCreate: () => void;
  onAppointmentClick: (id: string) => void;
  onFullscreen?: () => void;
  children: ReactNode;
};

const money = (value: number) =>
  new Intl.NumberFormat("fr-MA", {
    maximumFractionDigits: 0,
  }).format(value) + " MAD";

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function statusBadge(status: AppointmentStatus) {
  switch (status) {
    case "CONFIRMED":
    case "ARRIVED":
      return { label: "Confirmé", className: "bg-[#E3F7E9] text-[#16834B]" };
    case "PENDING":
      return { label: "En attente", className: "bg-[#FFF0D8] text-[#B77612]" };
    case "IN_PROGRESS":
      return { label: "En cours", className: "bg-[#E3F0FF] text-[#2F5FBF]" };
    case "COMPLETED":
      return { label: "Terminé", className: "bg-[#F0E7FF] text-[#7434B4]" };
    case "CANCELLED":
    case "NO_SHOW":
      return { label: "Annulé", className: "bg-[#FCE5EA] text-[#C42B4A]" };
    default:
      return { label: status, className: "bg-[#FFF0F6] text-[#AC0E4C]" };
  }
}

function MiniCalendar({ date, onSelect }: { date: Date; onSelect: (date: Date) => void }) {
  const [month, setMonth] = useState(() => new Date(date.getFullYear(), date.getMonth(), 1));

  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    return Array.from({ length: 42 }, (_, i) => {
      return new Date(month.getFullYear(), month.getMonth(), i - offset + 1);
    });
  }, [month]);

  return (
    <div className="rounded-[22px] border border-[#F0DFE6] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          aria-label="Mois précédent"
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          className="rounded-lg border border-[#F0DFE6] p-1.5 text-[#8C214D] hover:bg-[#FFF0F5]"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="text-sm font-bold capitalize text-[#54112F]">
          {month.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
        </span>
        <button
          type="button"
          aria-label="Mois suivant"
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          className="rounded-lg border border-[#F0DFE6] p-1.5 text-[#8C214D] hover:bg-[#FFF0F5]"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <span key={i} className="py-1.5 text-[10px] font-bold text-[#9B7B8B]">
            {d}
          </span>
        ))}
        {days.map((day) => {
          const selected = sameDay(day, date);
          const currentMonth = day.getMonth() === month.getMonth();
          return (
            <button
              type="button"
              key={day.toISOString()}
              onClick={() => onSelect(day)}
              className={[
                "flex aspect-square items-center justify-center rounded-full text-xs transition",
                selected
                  ? "bg-[#AF0E4E] font-bold text-white"
                  : currentMonth
                    ? "text-[#54112F] hover:bg-[#FCE5ED]"
                    : "text-[#C8B3BF] hover:bg-[#FFF3F7]",
              ].join(" ")}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
  trendUp,
}: {
  label: string;
  value: string;
  detail?: string;
  icon: typeof CalendarDays;
  tone: "pink" | "green" | "orange" | "purple" | "red";
  trendUp?: boolean;
}) {
  const tones = {
    pink: "bg-[#FCE1EB] text-[#B01251]",
    green: "bg-[#E4F7EB] text-[#14874D]",
    orange: "bg-[#FFF0D9] text-[#B57B15]",
    purple: "bg-[#F0E7FF] text-[#7436BE]",
    red: "bg-[#FFE8EE] text-[#C42B4A]",
  };

  return (
    <div className="flex min-h-[104px] items-center gap-3 rounded-[20px] border border-[#F0DDE5] border-l-4 border-l-[#AD1451]/40 bg-white p-3.5 shadow-[0_5px_18px_rgba(70,20,40,0.04)]">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tones[tone]}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-[#795467]">{label}</p>
        <p className="mt-0.5 text-xl font-extrabold text-[#48162E]">{value}</p>
        {detail ? (
          <p
            className={`mt-0.5 flex items-center gap-1 text-[10px] font-medium ${
              trendUp ? "text-[#16834B]" : "text-[#A08392]"
            }`}
          >
            {trendUp ? <TrendingUp size={11} /> : null}
            {detail}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="min-w-0">
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-xl border border-[#EEDCE4] bg-[#FFF8FA] px-3 text-xs font-semibold text-[#63334A] outline-none focus:border-[#B11051]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function AgendaPremiumLayout({
  date,
  view,
  appointments,
  todayCount,
  todayDeltaPct,
  confirmed,
  confirmedPct,
  pending,
  clientesToday,
  newClientesToday,
  forecast,
  forecastCount,
  occupancy,
  occupancyDelta,
  rangeLabel,
  weekNumber,
  staff,
  services,
  resources,
  staffFilter,
  serviceFilter,
  resourceFilter,
  statusFilter,
  onStaffFilter,
  onServiceFilter,
  onResourceFilter,
  onStatusFilter,
  onViewChange,
  onDateChange,
  onPrev,
  onNext,
  onToday,
  onCreate,
  onAppointmentClick,
  onFullscreen,
  children,
}: AgendaPremiumLayoutProps) {
  const upcoming = useMemo(() => {
    const now = Date.now();
    return appointments
      .filter(
        (a) =>
          new Date(a.startAt).getTime() >= now &&
          a.status !== "CANCELLED" &&
          a.status !== "NO_SHOW",
      )
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      .slice(0, 5);
  }, [appointments]);

  return (
    <div className="min-w-0 space-y-4 pb-8">
      {/* 1. Bannière */}
      <header
        className="relative flex min-h-[96px] items-center overflow-hidden rounded-[20px] border border-[#EFD9E1] bg-[#F9E8E7] px-5 py-4 shadow-sm sm:min-h-[108px] sm:px-7"
        style={{
          backgroundImage:
            'linear-gradient(90deg,rgba(255,247,247,.92) 0%,rgba(255,239,239,.55) 42%,rgba(255,239,239,.15) 100%),url("/marketing/hero-background.png")',
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="relative z-10 flex w-full flex-wrap items-center justify-between gap-4">
          <div className="min-w-0 max-w-xl">
            <h1 className="font-serif text-2xl font-bold tracking-tight text-[#58152F] sm:text-3xl">
              Agenda de l&apos;institut
            </h1>
            <p className="mt-1 max-w-lg text-sm leading-5 text-[#654254]">
              Organisez vos rendez-vous, gérez vos praticiennes et optimisez l&apos;occupation de vos
              cabines.
            </p>
          </div>
          <div className="relative z-10 flex shrink-0 flex-wrap items-center gap-2">
            <GoogleCalendarConnect className="h-11 max-w-[260px] rounded-xl border border-[#F0D9E3] bg-white/90 px-3 shadow-sm backdrop-blur-sm hover:bg-white" />
            <button
              type="button"
              onClick={onCreate}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#AC0E4C] px-5 text-sm font-bold text-white shadow-lg shadow-[#AC0E4C]/20 transition hover:bg-[#820D39]"
            >
              <Plus size={18} />
              Nouveau rendez-vous
            </button>
          </div>
        </div>
      </header>

      {/* 2. KPI — 6 cartes */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="RDV aujourd'hui"
          value={String(todayCount)}
          detail={
            todayDeltaPct == null
              ? undefined
              : `${todayDeltaPct >= 0 ? "+" : ""}${todayDeltaPct} % vs hier`
          }
          icon={CalendarDays}
          tone="pink"
          trendUp={todayDeltaPct != null && todayDeltaPct >= 0}
        />
        <StatCard
          label="Confirmés"
          value={String(confirmed)}
          detail={confirmedPct == null ? undefined : `${confirmedPct} % des RDV`}
          icon={CheckCircle2}
          tone="green"
        />
        <StatCard
          label="En attente"
          value={String(pending)}
          detail="À confirmer"
          icon={Hourglass}
          tone="orange"
        />
        <StatCard
          label="Clientes du jour"
          value={String(clientesToday)}
          detail={newClientesToday > 0 ? `Dont ${newClientesToday} nouvelle${newClientesToday > 1 ? "s" : ""}` : "Clientes uniques"}
          icon={Users}
          tone="purple"
        />
        <StatCard
          label="Taux d'occupation"
          value={occupancy === null ? "—" : `${occupancy} %`}
          detail={
            occupancyDelta == null
              ? undefined
              : `${occupancyDelta >= 0 ? "+" : ""}${occupancyDelta} points`
          }
          icon={BarChart3}
          tone="red"
          trendUp={occupancyDelta != null && occupancyDelta >= 0}
        />
        <StatCard
          label="CA prévisionnel"
          value={money(forecast)}
          detail={`${forecastCount} prestation${forecastCount > 1 ? "s" : ""}`}
          icon={Coins}
          tone="purple"
        />
      </div>

      {/* 3. Calendrier + panneau droit */}
      <div className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-12">
        <main className="min-w-0 space-y-3 xl:col-span-9">
          <section className="overflow-hidden rounded-[22px] border border-[#F0DDE5] bg-white shadow-[0_8px_30px_rgba(70,20,40,0.05)]">
            {/* Toolbar période */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0DDE5] px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onPrev}
                  aria-label="Période précédente"
                  className="rounded-xl border border-[#F0DDE5] p-2 text-[#9C2453] hover:bg-[#FFF1F6]"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={onNext}
                  aria-label="Période suivante"
                  className="rounded-xl border border-[#F0DDE5] p-2 text-[#9C2453] hover:bg-[#FFF1F6]"
                >
                  <ChevronRight size={16} />
                </button>
                <h2 className="text-sm font-bold text-[#54112F] sm:text-[15px]">{rangeLabel}</h2>
                {weekNumber != null && view === "week" ? (
                  <span className="rounded-full bg-[#FFF0F6] px-2.5 py-1 text-[11px] font-bold text-[#AC0E4C]">
                    Semaine {weekNumber}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={onToday}
                  className="rounded-xl border border-[#EEDCE4] px-2.5 py-1.5 text-[11px] font-bold text-[#7D3152] hover:bg-[#FFF1F6]"
                >
                  Aujourd&apos;hui
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex rounded-xl bg-[#FFF0F6] p-1">
                  {(
                    [
                      { value: "day", label: "Jour" },
                      { value: "week", label: "Semaine" },
                      { value: "month", label: "Mois" },
                    ] as const
                  ).map((item) => (
                    <button
                      type="button"
                      key={item.value}
                      onClick={() => onViewChange(item.value)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        view === item.value || (item.value === "week" && view === "3days")
                          ? "bg-[#AC0E4C] text-white shadow-sm"
                          : "text-[#86566D] hover:bg-white"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                {onFullscreen ? (
                  <button
                    type="button"
                    onClick={onFullscreen}
                    aria-label="Plein écran"
                    className="rounded-xl border border-[#F0DDE5] p-2 text-[#9C2453] hover:bg-[#FFF1F6]"
                  >
                    <Expand size={16} />
                  </button>
                ) : null}
              </div>
            </div>

            {/* Filtres + légende */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0DDE5] px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <FilterSelect
                  label="Praticienne"
                  value={staffFilter}
                  onChange={onStaffFilter}
                  options={[
                    { value: "ALL", label: "Praticienne" },
                    ...staff.map((s) => ({ value: s.id, label: s.name })),
                  ]}
                />
                <FilterSelect
                  label="Service"
                  value={serviceFilter}
                  onChange={onServiceFilter}
                  options={[
                    { value: "ALL", label: "Service" },
                    ...services.map((s) => ({ value: s.id, label: s.name })),
                  ]}
                />
                <FilterSelect
                  label="Cabine"
                  value={resourceFilter}
                  onChange={onResourceFilter}
                  options={[
                    { value: "ALL", label: "Cabine" },
                    ...resources.map((r) => ({ value: r.id, label: r.name })),
                  ]}
                />
                <FilterSelect
                  label="Statut"
                  value={statusFilter}
                  onChange={(value) => onStatusFilter(value as AppointmentStatus | "ALL")}
                  options={[
                    { value: "ALL", label: "Statut" },
                    { value: "PENDING", label: "En attente" },
                    { value: "CONFIRMED", label: "Confirmé" },
                    { value: "ARRIVED", label: "Arrivé" },
                    { value: "IN_PROGRESS", label: "En cours" },
                    { value: "COMPLETED", label: "Terminé" },
                    { value: "CANCELLED", label: "Annulé" },
                    { value: "NO_SHOW", label: "Absent" },
                  ]}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-[#765164]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#16834B]" />
                  Confirmé
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#B77612]" />
                  En attente
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#7434B4]" />
                  Terminé
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#C42B4A]" />
                  Annulé
                </span>
              </div>
            </div>

            <div className="min-w-0">{children}</div>
          </section>
        </main>

        {/* 4. Panneau droit */}
        <aside className="space-y-4 xl:sticky xl:top-20 xl:col-span-3">
          <MiniCalendar date={date} onSelect={onDateChange} />

          <div className="rounded-[22px] border border-[#F0DDE5] bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 font-serif text-base font-bold text-[#54112F]">
                <Clock3 size={16} className="text-[#AF0E4E]" />
                Prochaines prestations
              </h3>
              <button
                type="button"
                onClick={onToday}
                className="text-[11px] font-bold text-[#AC0E4C] hover:underline"
              >
                Voir tout
              </button>
            </div>

            {upcoming.length === 0 ? (
              <div className="rounded-xl bg-[#FFF6F9] p-4 text-center">
                <CalendarDays size={22} className="mx-auto text-[#D99AB5]" />
                <p className="mt-2 text-xs text-[#876879]">Aucune prestation à venir.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcoming.map((apt) => {
                  const badge = statusBadge(apt.status);
                  return (
                    <button
                      type="button"
                      key={apt.id}
                      onClick={() => onAppointmentClick(apt.id)}
                      className="w-full rounded-xl border border-[#F2E1E8] bg-[#FFF8FA] p-3 text-left transition hover:border-[#DFA3BC] hover:bg-[#FFF0F6]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#9E1548]">
                            {new Date(apt.startAt).toLocaleTimeString("fr-FR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            · {apt.customerName}
                          </p>
                          <p className="mt-1 truncate text-[11px] text-[#926E80]">
                            {apt.serviceName} · {apt.staffName}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
