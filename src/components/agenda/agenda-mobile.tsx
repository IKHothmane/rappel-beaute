"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  Cloud,
  Lock,
  MessageCircle,
  Phone,
  PieChart,
  Plus,
  Sparkles,
  Star,
  Wallet,
} from "lucide-react";
import type { AgendaView, Appointment, AppointmentStatus } from "@/types/appointment";
import type { CustomerDetail } from "@/types/customer";
import type { StaffAgendaContext } from "@/types/staff";
import type { OrganizationClosureItem } from "@/types/planning";
import {
  AGENDA_OPEN_HOUR,
  APPOINTMENT_STATUS_LABEL,
  STATUS_TRANSITIONS,
} from "@/modules/appointments/constants";
import { getAvailableSlots, getWeekDates } from "@/modules/appointments/availability";
import { formatMad } from "@/modules/analytics/service";
import { getCustomer } from "@/modules/customers/service";
import { listWaitingList } from "@/modules/waiting-list/service";
import { staffColor } from "@/components/agenda/staff-colors";
import { cn } from "@/lib/utils";
import type { AgendaKpis } from "@/components/agenda/agenda-toolbar";

type StaffOption = { id: string; name: string; role?: string | null };

type AgendaMobileProps = {
  date: Date;
  view: AgendaView;
  onViewChange: (v: AgendaView) => void;
  onSelectDate: (d: Date) => void;
  staffFilter: string;
  onStaffFilter: (id: string) => void;
  staffOptions: StaffOption[];
  staffContexts: StaffAgendaContext[];
  appointments: Appointment[];
  allAppointments: Appointment[];
  closures: OrganizationClosureItem[];
  kpis: AgendaKpis;
  whatsappConnected: boolean | null;
  onAppointmentClick: (id: string) => void;
  onCreate: (seed?: { startAt: string; endAt: string; staffId?: string }) => void;
  onBlockSlot: () => void;
  onStatusChange: (id: string, status: AppointmentStatus) => void;
};

const MOBILE_VIEWS: { id: AgendaView; label: string }[] = [
  { id: "day", label: "Jour" },
  { id: "3days", label: "3 jours" },
  { id: "week", label: "Semaine" },
];

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function atHour(day: Date, h: number, m = 0) {
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d;
}

function overlaps(a0: Date, a1: Date, b0: Date, b1: Date) {
  return a0 < b1 && a1 > b0;
}

function waDigits(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.startsWith("212")) return d;
  if (d.startsWith("0") && d.length >= 9) return `212${d.slice(1)}`;
  return d;
}

function statusTone(apt: Appointment) {
  const start = new Date(apt.startAt);
  const soon = start.getTime() - Date.now() < 2 * 60 * 60 * 1000 && start.getTime() > Date.now();
  if (apt.status === "IN_PROGRESS") return { label: "En cours", className: "text-gold", pulse: false };
  if (apt.status === "PENDING") return { label: "En attente", className: "text-gold", pulse: true };
  if (soon && (apt.status === "CONFIRMED" || apt.status === "ARRIVED")) {
    return { label: "Arrivée imminente", className: "text-gold", pulse: true };
  }
  if (apt.status === "CONFIRMED" || apt.status === "ARRIVED" || apt.status === "COMPLETED") {
    return { label: APPOINTMENT_STATUS_LABEL[apt.status], className: "text-emerald-700", pulse: false };
  }
  return { label: APPOINTMENT_STATUS_LABEL[apt.status], className: "text-ink/45", pulse: false };
}

export function AgendaMobile({
  date,
  view,
  onViewChange,
  onSelectDate,
  staffFilter,
  onStaffFilter,
  staffOptions,
  staffContexts,
  appointments,
  allAppointments,
  closures,
  kpis,
  whatsappConnected,
  onAppointmentClick,
  onCreate,
  onBlockSlot,
  onStatusChange,
}: AgendaMobileProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [waitingCount, setWaitingCount] = useState(0);

  const ribbonDates = useMemo(() => {
    if (view === "3days") {
      return [0, 1, 2].map((i) => {
        const d = new Date(date);
        d.setDate(date.getDate() + i);
        return d;
      });
    }
    return getWeekDates(date);
  }, [view, date]);

  const dayAppts = useMemo(
    () =>
      [...appointments]
        .filter((a) => sameDay(new Date(a.startAt), date) && a.status !== "CANCELLED")
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
    [appointments, date],
  );

  const dayStaffCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const apt of allAppointments) {
      if (apt.status === "CANCELLED" || !sameDay(new Date(apt.startAt), date)) continue;
      map[apt.staffId] = (map[apt.staffId] ?? 0) + 1;
    }
    return map;
  }, [allAppointments, date]);

  const countsByDay = useMemo(() => {
    const map: Record<string, number> = {};
    for (const apt of allAppointments) {
      if (apt.status === "CANCELLED") continue;
      const key = new Date(apt.startAt).toDateString();
      map[key] = (map[key] ?? 0) + 1;
    }
    return map;
  }, [allAppointments]);

  const starKey = useMemo(() => {
    let max = 0;
    let key: string | null = null;
    for (const d of getWeekDates(date)) {
      const k = d.toDateString();
      const n = countsByDay[k] ?? 0;
      if (n > max) {
        max = n;
        key = k;
      }
    }
    return max > 0 ? key : null;
  }, [date, countsByDay]);

  useEffect(() => {
    if (!expandedId) {
      setCustomer(null);
      return;
    }
    const apt = dayAppts.find((a) => a.id === expandedId);
    if (!apt) return;
    let cancelled = false;
    getCustomer(apt.customerId)
      .then((res) => {
        if (!cancelled) setCustomer(res.customer);
      })
      .catch(() => {
        if (!cancelled) setCustomer(null);
      });
    return () => {
      cancelled = true;
    };
  }, [expandedId, dayAppts]);

  useEffect(() => {
    listWaitingList({ status: "WAITING" })
      .then((res) => setWaitingCount(res.items.length))
      .catch(() => setWaitingCount(0));
  }, []);

  const lunchStart = atHour(date, 13);
  const lunchEnd = atHour(date, 14);
  const lunchFree = !dayAppts.some((a) =>
    overlaps(new Date(a.startAt), new Date(a.endAt), lunchStart, lunchEnd),
  );

  const firstStaff = staffOptions[0];
  const firstCtx = staffContexts.find((c) => c.id === firstStaff?.id);
  const lateSlot = useMemo(() => {
    if (!firstStaff) return null;
    const slots = getAvailableSlots(allAppointments, {
      date,
      staffId: firstStaff.id,
      durationMinutes: 60,
      staffContext: firstCtx,
    }).filter((s) => s.available && s.time >= "17:00");
    return slots[0]?.time ?? null;
  }, [allAppointments, date, firstStaff, firstCtx]);

  function seedAt(h: number, m: number) {
    const start = atHour(date, h, m);
    const end = new Date(start.getTime() + 60 * 60_000);
    onCreate({ startAt: start.toISOString(), endAt: end.toISOString() });
  }

  const dateLine = date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const occ = kpis.occupancy ?? 0;

  return (
    <div className="flex flex-col gap-4 md:hidden">
      <section className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[22px] font-semibold tracking-tight text-ink">Agenda institut</h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#F0DDE9] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                Direct cabines
              </span>
            </div>
            <p className="mt-1 flex items-center gap-1 text-[13px] capitalize text-ink/50">
              <CalendarDays size={14} className="text-gold" />
              {dateLine}
            </p>
          </div>
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F6E3EF] text-primary shadow-sm"
            title={whatsappConnected ? "WhatsApp connecté" : "Synchronisation"}
          >
            <Cloud size={18} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col justify-between rounded-xl bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between text-ink/45">
              <span className="text-[11px] font-bold uppercase tracking-wider">RDV du jour</span>
              <CalendarDays size={16} className="text-primary" />
            </div>
            <div className="mt-1">
              <p className="flex items-baseline gap-1">
                <span className="text-[22px] font-extrabold text-ink">{kpis.todayCount}</span>
                <span className="text-[11px] text-ink/45">soins</span>
              </p>
              <p className="mt-0.5 text-[11px] text-ink/50">
                <span className="font-semibold text-primary">{kpis.confirmed} conf.</span>
                {" · "}
                <span className="font-semibold text-gold">{kpis.pending} att.</span>
                {" · "}
                <span>{kpis.cancelled} ann.</span>
              </p>
            </div>
          </div>
          <div className="flex flex-col justify-between rounded-xl bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between text-ink/45">
              <span className="text-[11px] font-bold uppercase tracking-wider">CA prévisionnel</span>
              <span className="text-[11px] font-bold text-gold">MAD</span>
            </div>
            <div className="mt-1">
              <p className="text-[22px] font-extrabold text-primary">{kpis.forecast.toLocaleString("fr-MA")}</p>
              <p className="truncate text-[11px] text-ink/50">
                Sécurisé : <span className="font-semibold text-ink">{formatMad(kpis.secured)}</span>
              </p>
            </div>
          </div>
          <div className="col-span-2 flex items-center justify-between rounded-xl bg-white p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FBF4F6] text-primary">
                <PieChart size={14} />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink/45">
                  Taux d&apos;occupation
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-ink">{kpis.occupancy != null ? `${kpis.occupancy} %` : "—"}</span>
                  {kpis.starLabel ? (
                    <span className="flex items-center gap-0.5 text-[11px] font-semibold text-gold">
                      <Star size={12} className="fill-gold" />
                      {kpis.starLabel}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="h-2 w-24 overflow-hidden rounded-full bg-[#F0DDE9]">
              <div className="h-full rounded-full bg-primary" style={{ width: `${occ}%` }} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-2">
          <button
            type="button"
            onClick={() => onCreate()}
            className="col-span-3 flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-white shadow-[0_4px_16px_rgba(227,28,95,0.25)] active:scale-[0.98]"
          >
            <Plus size={18} />
            Nouveau RDV
          </button>
          <button
            type="button"
            onClick={onBlockSlot}
            className="col-span-2 flex h-12 items-center justify-center gap-1.5 rounded-xl bg-white text-sm font-semibold text-ink shadow-sm active:scale-[0.98]"
          >
            <Lock size={16} className="text-ink/45" />
            Bloquer
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex rounded-xl bg-[#F6E3EF] p-1 text-[11px] font-bold">
          {MOBILE_VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => onViewChange(v.id)}
              className={cn(
                "flex-1 rounded-lg py-1.5 text-center transition",
                view === v.id || (view === "month" && v.id === "day")
                  ? "bg-white font-bold text-primary shadow-sm"
                  : "text-ink/45",
              )}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {ribbonDates.map((d) => {
            const selected = sameDay(d, date);
            const today = sameDay(d, new Date());
            const count = countsByDay[d.toDateString()] ?? 0;
            const dow = d.getDay();
            const anyoneWorks = staffContexts.some((s) => s.schedules.some((sch) => sch.dayOfWeek === dow && sch.active));
            const orgClosed = closures.some((c) => {
              const s = new Date(c.startAt);
              const e = new Date(c.endAt);
              return overlaps(s, e, atHour(d, 8), atHour(d, 20));
            });
            const closed = orgClosed || (!anyoneWorks && count === 0 && staffContexts.length > 0);
            const star = d.toDateString() === starKey && !today;
            return (
              <button
                key={d.toISOString()}
                type="button"
                onClick={() => onSelectDate(d)}
                className={cn(
                  "flex h-[68px] w-[52px] shrink-0 flex-col items-center justify-center rounded-xl shadow-sm",
                  selected && "h-[72px] w-[56px] bg-primary text-white shadow-md",
                  !selected && star && "bg-[#FCCA66] text-ink",
                  !selected && !star && "bg-white text-ink/55",
                )}
              >
                <span className="text-[11px] font-bold uppercase">
                  {d.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "")}
                </span>
                <span className={cn("text-lg font-bold leading-tight", selected && "text-[22px] font-extrabold")}>
                  {d.getDate()}
                </span>
                <span className={cn("mt-0.5 text-[10px]", selected ? "font-semibold text-[#FCCA66]" : "text-ink/40")}>
                  {today && selected
                    ? "Aujourd."
                    : closed
                      ? "Fermé"
                      : star
                        ? "★ Star"
                        : count > 0
                          ? `${count} RDV`
                          : "—"}
                </span>
              </button>
            );
          })}
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => onStaffFilter("ALL")}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-bold shadow-sm",
              staffFilter === "ALL" ? "bg-ink text-white" : "bg-white text-ink",
            )}
          >
            Toutes ({staffOptions.length})
          </button>
          {staffOptions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onStaffFilter(staffFilter === s.id ? "ALL" : s.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-ink shadow-sm",
                staffFilter === s.id && "ring-2 ring-primary",
              )}
            >
              <span className={cn("h-2 w-2 rounded-full", staffColor(s.id).bar)} />
              {s.name.split(" ")[0]}
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#F6E3EF] text-[10px] font-bold text-primary">
                {dayStaffCounts[s.id] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        {dayAppts.length === 0 ? (
          <button
            type="button"
            onClick={() => seedAt(AGENDA_OPEN_HOUR, 30)}
            className="flex items-center justify-between rounded-xl bg-[#FFF1F6] px-3 py-3 text-left"
          >
            <span className="text-[13px] italic text-ink/45">Journée libre — aucun rendez-vous</span>
            <span className="flex items-center gap-0.5 text-[11px] font-bold text-primary">
              <Plus size={14} /> Créer
            </span>
          </button>
        ) : null}

        {dayAppts.length > 0 && new Date(dayAppts[0].startAt).getHours() * 60 + new Date(dayAppts[0].startAt).getMinutes() > AGENDA_OPEN_HOUR * 60 + 30 ? (
          <GapRow time="08:30" onCreate={() => seedAt(8, 30)} />
        ) : null}

        {dayAppts.map((apt, i) => {
          const start = new Date(apt.startAt);
          const showLunch =
            lunchFree &&
            start.getHours() >= 14 &&
            (i === 0 || new Date(dayAppts[i - 1].startAt).getHours() < 13);
          return (
            <div key={apt.id}>
              {showLunch ? <LunchBand /> : null}
              <MobileAptRow
                apt={apt}
                expanded={expandedId === apt.id}
                customer={expandedId === apt.id ? customer : null}
                onToggle={() => setExpandedId((id) => (id === apt.id ? null : apt.id))}
                onOpenDetail={() => onAppointmentClick(apt.id)}
                onStatusChange={onStatusChange}
              />
            </div>
          );
        })}

        {lunchFree && (dayAppts.length === 0 || new Date(dayAppts[dayAppts.length - 1].startAt).getHours() < 13) ? (
          <LunchBand />
        ) : null}

        {lateSlot && firstStaff ? (
          <div className="flex items-start gap-2">
            <div className="w-12 shrink-0 pt-1 text-right text-[11px] font-bold text-ink/35">{lateSlot}</div>
            <div className="flex flex-1 flex-col gap-1.5 rounded-xl bg-[#FFF1F6] p-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-[11px] font-bold text-gold">
                  <Sparkles size={14} />
                  Créneau libre
                </span>
                {waitingCount > 0 ? (
                  <span className="text-[10px] font-bold uppercase text-primary">Liste d&apos;attente</span>
                ) : null}
              </div>
              <p className="text-[13px] text-ink">
                {lateSlot} disponible pour <strong>{firstStaff.name.split(" ")[0]}</strong>.
                {waitingCount > 0 ? ` ${waitingCount} demande${waitingCount > 1 ? "s" : ""} en liste d'attente.` : ""}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-lg bg-primary px-3 py-1 text-[11px] font-semibold text-white"
                  onClick={() => {
                    const [h, m] = lateSlot.split(":").map(Number);
                    const start = atHour(date, h, m);
                    onCreate({
                      startAt: start.toISOString(),
                      endAt: new Date(start.getTime() + 60 * 60_000).toISOString(),
                      staffId: firstStaff.id,
                    });
                  }}
                >
                  Proposer ce créneau
                </button>
                {waitingCount > 0 ? (
                  <Link href="/waiting-list/" className="rounded-lg bg-white px-3 py-1 text-[11px] font-semibold text-ink">
                    Voir la liste
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function GapRow({ time, onCreate }: { time: string; onCreate: () => void }) {
  return (
    <div className="flex items-start gap-2">
      <div className="w-12 shrink-0 pt-1 text-right text-[11px] font-bold text-ink/35">{time}</div>
      <button
        type="button"
        onClick={onCreate}
        className="flex flex-1 items-center justify-between rounded-xl bg-[#FFF1F6] px-3 py-2"
      >
        <span className="text-[13px] italic text-ink/45">Créneau libre</span>
        <span className="flex items-center gap-0.5 text-[11px] font-bold text-primary">
          <Plus size={14} /> Créer
        </span>
      </button>
    </div>
  );
}

function LunchBand() {
  return (
    <div className="flex items-center justify-between rounded-xl bg-[#FBF4F6] px-3 py-2.5 text-ink/55">
      <div className="flex items-center gap-2">
        <Cloud size={16} className="text-gold" />
        <div>
          <p className="text-[11px] font-bold tracking-wide text-ink">Pause 13:00 – 14:00</p>
          <p className="text-[11px] text-ink/45">Créneau déjeuner</p>
        </div>
      </div>
    </div>
  );
}

function MobileAptRow({
  apt,
  expanded,
  customer,
  onToggle,
  onOpenDetail,
  onStatusChange,
}: {
  apt: Appointment;
  expanded: boolean;
  customer: CustomerDetail | null;
  onToggle: () => void;
  onOpenDetail: () => void;
  onStatusChange: (id: string, status: AppointmentStatus) => void;
}) {
  const tone = statusTone(apt);
  const phone = customer?.phone?.trim() || "";
  const noShows = customer?.noShowCount ?? 0;
  const vip = customer?.segment === "VIP";
  const visits = customer?.visits ?? 0;
  const isNew = customer?.status === "NEW" || visits <= 1;
  const transitions = STATUS_TRANSITIONS[apt.status] ?? [];
  const waHref = phone
    ? `https://wa.me/${waDigits(phone)}?text=${encodeURIComponent(
        `Bonjour ${apt.customerName.split(" ")[0]}, votre rendez-vous ${apt.serviceName} est prévu à ${timeLabel(apt.startAt)}.`,
      )}`
    : "/whatsapp/";

  return (
    <div className="flex items-start gap-2">
      <div className="flex w-12 shrink-0 flex-col items-end pt-2">
        <span className={cn("text-[11px] font-bold", expanded ? "text-primary" : "text-ink")}>
          {timeLabel(apt.startAt)}
        </span>
        <span className="text-[11px] text-ink/35">{timeLabel(apt.endAt)}</span>
      </div>
      <div
        className={cn(
          "flex flex-1 flex-col gap-2 rounded-xl bg-white p-3 shadow-sm",
          expanded && "ring-2 ring-primary/20 shadow-md",
        )}
      >
        <button type="button" className="flex items-start justify-between gap-2 text-left" onClick={onToggle}>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[18px] font-bold leading-6 text-ink">
                {apt.customerName.trim() || "Cliente"}
              </span>
              {vip ? (
                <span className="rounded-full bg-[#FFF1D6] px-2 py-0.5 text-[10px] font-bold text-gold">VIP</span>
              ) : visits >= 8 ? (
                <span className="rounded-full bg-[#FFF1F6] px-2 py-0.5 text-[10px] font-bold text-primary">
                  Fidèle ({visits}v)
                </span>
              ) : isNew && customer ? (
                <span className="rounded-full bg-[#FFF1D6] px-2 py-0.5 text-[10px] font-bold text-gold">Nouveau</span>
              ) : null}
            </div>
            <p className="text-[13px] text-ink/50">{apt.serviceName}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-extrabold text-primary">{apt.price.toLocaleString("fr-MA")} MAD</p>
            <p className={cn("mt-0.5 flex items-center justify-end gap-1 text-[11px] font-semibold", tone.className)}>
              <span className={cn("h-1.5 w-1.5 rounded-full bg-current", tone.pulse && "animate-pulse")} />
              {tone.label}
            </p>
          </div>
        </button>
        <div className="flex items-center justify-between text-[11px] text-ink/45">
          <span className="flex items-center gap-1 text-ink">
            <span className={cn("h-2 w-2 rounded-full", staffColor(apt.staffId).bar)} />
            {apt.staffName.split(" ")[0]}
            {apt.resourceName ? ` · ${apt.resourceName}` : ""}
          </span>
          {transitions.includes("ARRIVED") ? (
            <button
              type="button"
              className="font-bold text-primary"
              onClick={() => onStatusChange(apt.id, "ARRIVED")}
            >
              Notifier arrivée
            </button>
          ) : null}
        </div>

        {expanded ? (
          <div className="flex flex-col gap-2 rounded-lg bg-[#F6E3EF] p-2">
            {noShows >= 2 ? (
              <div>
                <p className="flex items-center gap-1.5 text-[11px] font-bold text-red-600">
                  <AlertTriangle size={14} />
                  Risque no-show
                </p>
                <p className="text-[12px] text-ink/60">
                  {noShows} absence{noShows > 1 ? "s" : ""} recensée{noShows > 1 ? "s" : ""}
                  {customer?.noShowRisk === "REQUIRE_DEPOSIT" ? " — un acompte est recommandé." : "."}
                </p>
              </div>
            ) : null}
            {phone ? (
              <a href={`tel:${phone}`} className="flex items-center gap-1 text-[11px] text-ink">
                <Phone size={13} className="text-ink/40" />
                {phone}
              </a>
            ) : null}
            <div className="grid grid-cols-2 gap-1.5">
              <a
                href={waHref}
                target={phone ? "_blank" : undefined}
                rel={phone ? "noreferrer" : undefined}
                className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#25D366] text-[11px] font-bold text-white"
              >
                <MessageCircle size={16} />
                WhatsApp
              </a>
              <Link
                href={`/cash-register/?appointmentId=${apt.id}`}
                className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary text-[11px] font-bold text-white"
              >
                <Wallet size={16} />
                Encaisser
              </Link>
            </div>
            <button type="button" className="text-center text-[11px] font-semibold text-primary" onClick={onOpenDetail}>
              Fiche complète
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
