"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Ban,
  Brain,
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock3,
  Gauge,
  Hourglass,
  Lock,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Umbrella,
  Users,
} from "lucide-react";
import { BlockSlotDialog } from "@/components/agenda/block-slot-dialog";
import { staffColor } from "@/components/agenda/staff-colors";
import { AgendaSkeleton } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Label, Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import {
  getMonthGrid,
  getWeekDates,
} from "@/modules/appointments/availability";
import { listAppointments } from "@/modules/appointments/service";
import {
  createClosureApi,
  createOvertimeApi,
  createReplacementApi,
  deletePlanningItemApi,
  loadPlanningApi,
} from "@/modules/planning/service";
import {
  createStaffLeave,
  listStaff,
  listStaffForAgenda,
  updateStaffSchedule,
} from "@/modules/staff/service";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/types/appointment";
import type {
  OrganizationClosureItem,
  StaffOvertimeItem,
  StaffReplacementItem,
} from "@/types/planning";
import type { LeaveType, StaffAgendaContext, StaffScheduleSlot } from "@/types/staff";
import { DAY_LABELS, LEAVE_TYPE_LABEL } from "@/types/staff";
import {
  appointmentsInRange,
  breaksForEditor,
  buildAiSuggestion,
  cellForStaffDay,
  detectConflicts,
  formatDayHead,
  formatLeaveSpan,
  formatShiftBadge,
  formatWeekTitle,
  hourWindow,
  initialForDay,
  isOnDutyToday,
  isThisWeek,
  openingHoursFromStaff,
  schedulesForEditor,
  staffAtHour,
  startOfDay,
  templateWeekHours,
  toHHMM,
  weekHours,
  type DayCell,
  type PlanningView,
} from "@/components/planning/planning-helpers";

function Card({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("rounded-2xl border border-line bg-white p-5 shadow-soft", className)}>
      {children}
    </section>
  );
}

function OffBadge({ children = "OFF" }: { children?: string }) {
  return (
    <span className="inline-flex rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-400">
      {children}
    </span>
  );
}

function ShiftChip({
  staffId,
  cell,
}: {
  staffId: string;
  cell: Extract<DayCell, { kind: "work" | "overtime" }>;
}) {
  const color = staffColor(staffId);
  return (
    <span
      className={cn(
        "inline-flex rounded-lg border px-2 py-1 text-[11px] font-bold",
        color.soft,
        color.text,
        cell.kind === "overtime" ? "border-amber-200" : "border-transparent",
      )}
    >
      {formatShiftBadge(cell.start, cell.end)}
    </span>
  );
}

export function PlanningPageView() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<StaffAgendaContext[]>([]);
  const [positions, setPositions] = useState<Record<string, string>>({});
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [closures, setClosures] = useState<OrganizationClosureItem[]>([]);
  const [overtimes, setOvertimes] = useState<StaffOvertimeItem[]>([]);
  const [replacements, setReplacements] = useState<StaffReplacementItem[]>([]);
  const [anchor, setAnchor] = useState(() => new Date());
  const [view, setView] = useState<PlanningView>("week");
  const [staffFilter, setStaffFilter] = useState("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editDay, setEditDay] = useState(() => new Date().getDay());
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [hoursOpen, setHoursOpen] = useState(false);
  const [weekDraft, setWeekDraft] = useState<StaffScheduleSlot[]>([]);
  const [hoursDraft, setHoursDraft] = useState<
    { day: number; open: boolean; start: string; end: string }[]
  >([]);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [extraOpen, setExtraOpen] = useState<"overtime" | "replacement" | null>(null);
  const [leaveStaff, setLeaveStaff] = useState("");
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveType, setLeaveType] = useState<LeaveType>("CONGE");
  const [leaveReason, setLeaveReason] = useState("");
  const [otStaff, setOtStaff] = useState("");
  const [otStart, setOtStart] = useState("");
  const [otEnd, setOtEnd] = useState("");
  const [otReason, setOtReason] = useState("");
  const [repAbsent, setRepAbsent] = useState("");
  const [repSub, setRepSub] = useState("");
  const [repStart, setRepStart] = useState("");
  const [repEnd, setRepEnd] = useState("");
  const [repReason, setRepReason] = useState("");

  const weekDates = useMemo(() => getWeekDates(anchor), [anchor]);
  const monthCells = useMemo(() => getMonthGrid(anchor), [anchor]);

  const refresh = useCallback(async () => {
    const [plan, staffList, apts, roster] = await Promise.all([
      loadPlanningApi(),
      listStaffForAgenda(),
      listAppointments(),
      listStaff({ limit: 100 }),
    ]);
    setClosures(plan.closures);
    setOvertimes(plan.overtimes);
    setReplacements(plan.replacements);
    setStaff(staffList);
    setAppointments(apts);
    const nextPositions: Record<string, string> = {};
    for (const row of roster.data) {
      if (row.position) nextPositions[row.id] = row.position;
    }
    setPositions(nextPositions);
    setSelectedId((prev) => prev ?? staffList[0]?.id ?? null);
    setLeaveStaff((prev) => prev || staffList[0]?.id || "");
    setOtStaff((prev) => prev || staffList[0]?.id || "");
    setRepAbsent((prev) => prev || staffList[0]?.id || "");
    setRepSub((prev) => prev || staffList[1]?.id || staffList[0]?.id || "");
  }, []);

  useEffect(() => {
    refresh()
      .catch(() => toast("Impossible de charger le planning.", "error"))
      .finally(() => setLoading(false));
  }, [refresh, toast]);

  const visibleStaff = useMemo(
    () => (staffFilter === "ALL" ? staff : staff.filter((item) => item.id === staffFilter)),
    [staff, staffFilter],
  );
  const selected = staff.find((item) => item.id === selectedId) ?? staff[0] ?? null;
  const activeCount = staff.filter((item) => item.status === "ACTIVE").length;
  const onDutyToday = staff.filter((item) => isOnDutyToday(item)).length;
  const totalHours = Math.round(staff.reduce((sum, item) => sum + weekHours(item, weekDates), 0));
  const weekApts = appointmentsInRange(appointments, weekDates[0], weekDates[6]);
  const plannedHours = staff.reduce((sum, item) => sum + templateWeekHours(item), 0);
  const availability = plannedHours > 0 ? Math.round((totalHours / plannedHours) * 100) : 100;
  const conflicts = useMemo(
    () => detectConflicts(staff, appointments, closures, weekDates),
    [staff, appointments, closures, weekDates],
  );
  const openingHours = useMemo(() => openingHoursFromStaff(staff), [staff]);
  const aiHint = useMemo(
    () => buildAiSuggestion(staff, appointments, weekDates),
    [staff, appointments, weekDates],
  );
  const hours = hourWindow(staff);
  const hourRows = Array.from({ length: Math.max(1, hours.endHour - hours.startHour) }, (_, i) => hours.startHour + i);
  const peakDayIndex = weekDates.reduce((best, date, index) => {
    const count = appointmentsInRange(appointments, date, date).length;
    const bestCount = appointmentsInRange(appointments, weekDates[best], weekDates[best]).length;
    return count > bestCount ? index : best;
  }, 0);
  const upcomingLeaves = staff.flatMap((person) =>
    person.leaves
      .filter((leave) => new Date(leave.endAt) >= startOfDay(weekDates[0]))
      .map((leave) => ({ ...leave, staff: person })),
  );
  const gridDates = view === "day" ? [anchor] : weekDates;

  function openScheduleEditor() {
    if (!selected) return;
    setWeekDraft(schedulesForEditor(selected));
    setScheduleOpen(true);
  }

  function openHoursEditor() {
    setHoursDraft(
      [1, 2, 3, 4, 5, 6, 0].map((day) => {
        const row = openingHours.find((item) => item.day === day);
        const match = row?.hours.match(/(\d{2}:\d{2})\s*→\s*(\d{2}:\d{2})/);
        return {
          day,
          open: Boolean(match),
          start: match?.[1] ?? "09:00",
          end: match?.[2] ?? "18:00",
        };
      }),
    );
    setHoursOpen(true);
  }

  function shift(step: number) {
    const next = new Date(anchor);
    if (view === "month") next.setMonth(next.getMonth() + step);
    else if (view === "day") next.setDate(next.getDate() + step);
    else next.setDate(next.getDate() + step * 7);
    setAnchor(next);
  }

  function selectStaffDay(id: string, date: Date) {
    setSelectedId(id);
    setEditDay(date.getDay());
    if (view === "day") setAnchor(date);
  }

  async function saveSchedule() {
    if (!selected) return;
    if (weekDraft.some((d) => d.active && d.startTime >= d.endTime)) {
      toast("L’heure de fin doit être après l’heure de début.", "error");
      return;
    }
    setSavingSchedule(true);
    const result = await updateStaffSchedule(selected.id, {
      schedules: weekDraft
        .filter((item) => item.active)
        .map((item) => ({
          dayOfWeek: item.dayOfWeek,
          startTime: toHHMM(item.startTime),
          endTime: toHHMM(item.endTime),
          active: true,
        })),
      breaks: breaksForEditor(selected),
    });
    setSavingSchedule(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast("Horaires enregistrés.", "success");
    setScheduleOpen(false);
    await refresh();
  }

  async function saveOpeningHours() {
    if (hoursDraft.some((d) => d.open && d.start >= d.end)) {
      toast("L’heure de fin doit être après l’heure de début.", "error");
      return;
    }
    const activeStaff = staff.filter((person) => person.status === "ACTIVE");
    if (!activeStaff.length) {
      toast("Aucune employée active.", "error");
      return;
    }
    setSavingSchedule(true);
    for (const person of activeStaff) {
      const result = await updateStaffSchedule(person.id, {
        schedules: hoursDraft
          .filter((item) => item.open)
          .map((item) => ({
            dayOfWeek: item.day,
            startTime: toHHMM(item.start),
            endTime: toHHMM(item.end),
            active: true,
          })),
        breaks: breaksForEditor(person),
      });
      if (!result.ok) {
        setSavingSchedule(false);
        toast(result.error, "error");
        return;
      }
    }
    setSavingSchedule(false);
    toast("Horaires d’ouverture enregistrés.", "success");
    setHoursOpen(false);
    await refresh();
  }

  async function addLeave() {
    try {
      const result = await createStaffLeave(leaveStaff, {
        startAt: new Date(`${leaveStart}T00:00:00`).toISOString(),
        endAt: new Date(`${leaveEnd}T23:59:59`).toISOString(),
        type: leaveType,
        reason: leaveReason || undefined,
        status: "APPROVED",
      });
      if (!result.ok) {
        toast(result.error, "error");
        return;
      }
      toast("Absence enregistrée. L’agenda ne proposera plus ce créneau.", "success");
      setLeaveOpen(false);
      setLeaveReason("");
      await refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erreur", "error");
    }
  }

  async function addOt() {
    try {
      await createOvertimeApi({
        staffId: otStaff,
        startAt: new Date(otStart).toISOString(),
        endAt: new Date(otEnd).toISOString(),
        reason: otReason || null,
      });
      toast("Heures supplémentaires enregistrées.", "success");
      setExtraOpen(null);
      await refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erreur", "error");
    }
  }

  async function addRep() {
    try {
      await createReplacementApi({
        absentStaffId: repAbsent,
        substituteStaffId: repSub,
        startAt: new Date(repStart).toISOString(),
        endAt: new Date(repEnd).toISOString(),
        reason: repReason || null,
      });
      toast("Remplacement enregistré.", "success");
      setExtraOpen(null);
      await refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erreur", "error");
    }
  }

  if (loading) return <AgendaSkeleton />;

  return (
    <div className="space-y-6 pb-8">
      <Card className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-primary/20 bg-primary-light px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              Gestion des ressources humaines
            </span>
            <span className="text-xs text-ink/40">Planning équipe · distinct de l’Agenda clientes</span>
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
            Planning & horaires de l’équipe
          </h1>
          <p className="mt-1 max-w-xl text-xs text-ink/55">
            Définissez les shifts, congés et ouvertures. Les créneaux travaillés alimentent directement les
            réservations de l’Agenda.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setBlockOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2 text-xs font-bold text-ink hover:bg-[#FBF5F7]"
          >
            <Ban size={14} className="text-amber-600" />
            Bloquer un créneau
          </button>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard
          icon={<Users size={16} />}
          label="Équipe active"
          value={`${activeCount}`}
          suffix="praticiennes"
          hint={`${onDutyToday} en service aujourd’hui`}
          hintClass="text-emerald-600"
        />
        <KpiCard
          icon={<Hourglass size={16} className="text-amber-600" />}
          label="Heures totales"
          value={`${totalHours} h`}
          hint={`Semaine du ${weekDates[0].getDate()} au ${weekDates[6].getDate()} ${weekDates[6].toLocaleDateString("fr-FR", { month: "short" }).replace(/\.$/, "")}`}
          tone="amber"
        />
        <KpiCard
          icon={<CalendarCheck size={16} className="text-indigo-600" />}
          label="RDV planning"
          value={`${weekApts.length}`}
          suffix={weekApts.length > 1 ? "soins" : "soin"}
          hint="Synchronisé avec l’Agenda"
          hintClass="text-emerald-600"
          tone="indigo"
        />
        <KpiCard
          icon={<Gauge size={16} className="text-emerald-600" />}
          label="Disponibilité"
          value={`${availability} %`}
          hint={`${Math.max(0, 100 - availability)} % repos, pauses et absences`}
          hintClass="text-primary"
          tone="emerald"
        />
      </div>

      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-line bg-white px-5 py-3.5 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => shift(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink/70 hover:bg-primary-light"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={() => setAnchor(new Date())}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-extrabold",
              isThisWeek(anchor)
                ? "border-primary/20 bg-primary-light text-primary"
                : "border-line bg-white text-ink",
            )}
          >
            Cette semaine
          </button>
          <button
            type="button"
            onClick={() => shift(1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink/70 hover:bg-primary-light"
          >
            <ChevronRight size={14} />
          </button>
          <span className="ml-1 text-sm font-black tracking-tight text-ink">
            {view === "month"
              ? anchor.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }).toUpperCase()
              : view === "day"
                ? anchor.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }).toUpperCase()
                : formatWeekTitle(weekDates)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex rounded-xl bg-[#F7EDF1] p-1 text-xs font-bold text-ink/60">
            {(["day", "week", "month"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setView(key)}
                className={cn(
                  "rounded-lg px-3 py-1",
                  view === key ? "bg-white font-extrabold text-primary shadow-sm" : "hover:text-ink",
                )}
              >
                {key === "day" ? "Jour" : key === "week" ? "Semaine" : "Mois"}
              </button>
            ))}
          </div>
          <label className="relative">
            <span className="sr-only">Filtrer les employées</span>
            <select
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              className="appearance-none rounded-xl border border-line bg-[#FBF5F7] py-1.5 pl-3 pr-8 text-xs font-bold text-ink"
            >
              <option value="ALL">Toutes les employées ({staff.length})</option>
              {staff.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.displayName}
                </option>
              ))}
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink/40" />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          {view !== "month" ? (
            <Card className="overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-line bg-[#FFFCFD] p-4">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-extrabold text-ink">
                    <CalendarDays size={16} className="text-primary" />
                    Synthèse hebdomadaire des shifts
                  </h2>
                  <p className="text-[11px] text-ink/50">Horaires programmés pour chaque employée</p>
                </div>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-bold",
                    conflicts.length
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700",
                  )}
                >
                  {conflicts.length ? `${conflicts.length} conflit${conflicts.length > 1 ? "s" : ""}` : "0 conflit détecté"}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-line bg-[#FCF7F9] text-[11px] font-extrabold text-ink/70">
                      <th className="w-40 px-4 py-3">Praticienne</th>
                      {weekDates.map((date, index) => (
                        <th
                          key={date.toISOString()}
                          className={cn(
                            "px-3 py-3 text-center",
                            index === peakDayIndex && "bg-rose-50/50 text-primary",
                            date.getDay() === 0 && "text-slate-400",
                          )}
                        >
                          {formatDayHead(date)}
                          {index === peakDayIndex ? " ★" : ""}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/80">
                    {visibleStaff.map((person) => (
                      <tr
                        key={person.id}
                        className="cursor-pointer transition-colors hover:bg-[#FFF9FB]"
                        onClick={() => selectStaffDay(person.id, weekDates[0])}
                      >
                        <td className="px-4 py-3">
                          <StaffIdentity person={person} position={positions[person.id]} />
                        </td>
                        {weekDates.map((date, index) => {
                          const cell = cellForStaffDay(person, date);
                          return (
                            <td
                              key={date.toISOString()}
                              className={cn("px-3 py-3 text-center", index === peakDayIndex && "bg-rose-50/30")}
                              onClick={(e) => {
                                e.stopPropagation();
                                selectStaffDay(person.id, date);
                              }}
                            >
                              <DayCellBadge staffId={person.id} cell={cell} />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!visibleStaff.length ? (
                  <p className="px-4 py-8 text-center text-sm text-ink/45">Aucune employée à afficher.</p>
                ) : null}
              </div>
            </Card>
          ) : null}

          {view === "month" ? (
            <Card>
              <h2 className="mb-4 text-sm font-extrabold text-ink">Mois — congés et fermetures</h2>
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-ink/45">
                {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
                  <div key={d} className="py-1">{d}</div>
                ))}
                {monthCells.map((date) => {
                  const inMonth = date.getMonth() === anchor.getMonth();
                  const leaveCount = staff.filter((person) => cellForStaffDay(person, date).kind === "leave").length;
                  const closed = closures.some((item) => {
                    const start = new Date(item.startAt);
                    const end = new Date(item.endAt);
                    return date >= start && date <= end;
                  });
                  return (
                    <button
                      key={date.toISOString()}
                      type="button"
                      onClick={() => {
                        setAnchor(date);
                        setView("day");
                      }}
                      className={cn(
                        "min-h-[64px] rounded-xl border p-1.5 text-left",
                        inMonth ? "border-line bg-white" : "border-transparent bg-[#FBF5F7] text-ink/30",
                        sameCalendarDay(date, new Date()) && "ring-1 ring-primary",
                      )}
                    >
                      <span className="text-xs font-bold">{date.getDate()}</span>
                      {closed ? <p className="mt-1 text-[9px] font-bold text-slate-500">Fermé</p> : null}
                      {leaveCount ? (
                        <p className="mt-0.5 text-[9px] font-bold text-primary">{leaveCount} abs.</p>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </Card>
          ) : (
            <Card>
              <div className="mb-3 flex flex-col gap-2 border-b border-line pb-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-extrabold text-ink">
                    <Clock3 size={16} className="text-primary" />
                    Grille horaire détaillée
                  </h2>
                  <p className="text-[11px] text-ink/50">Qui est en salon à chaque heure</p>
                </div>
                <div className="flex flex-wrap gap-3 text-xs">
                  {visibleStaff.slice(0, 6).map((person) => {
                    const color = staffColor(person.id);
                    return (
                      <span key={person.id} className="flex items-center gap-1.5">
                        <span className={cn("h-3 w-3 rounded", color.bar)} />
                        {person.firstName}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-line bg-[#FCF7F9] text-[11px] font-extrabold text-ink/70">
                      <th className="w-16 px-3 py-2.5 text-center">Heure</th>
                      {gridDates.map((date) => (
                        <th key={date.toISOString()} className="border-l border-line px-3 py-2.5 text-center">
                          {view === "day" ? "Présentes" : formatDayHead(date)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/70">
                    {hourRows.map((hour) => {
                      const cells = gridDates.map((date) =>
                        visibleStaff
                          .map((person) => ({ person, occ: staffAtHour(person, date, hour) }))
                          .filter((row) => row.occ.present || row.occ.onBreak),
                      );
                      const allBreak = cells.every(
                        (col) => col.length > 0 && col.every((row) => row.occ.onBreak),
                      );
                      return (
                        <tr key={hour} className={allBreak ? "bg-rose-50/60" : undefined}>
                          <td className="bg-[#FDF9FB] px-2 py-2 text-center font-bold text-ink/50">
                            {String(hour).padStart(2, "0")}:00
                          </td>
                          {cells.map((col, colIndex) => (
                            <td key={gridDates[colIndex].toISOString()} className="border-l border-line px-3 py-2">
                              {allBreak ? (
                                <p className="text-center text-[11px] font-bold text-primary">Pause / désinfection</p>
                              ) : col.length ? (
                                <div className="space-y-1">
                                  {col.map(({ person, occ }) => {
                                    const color = staffColor(person.id);
                                    return (
                                      <div
                                        key={person.id}
                                        className={cn(
                                          "flex items-center justify-between rounded-lg border px-1.5 py-1 text-[11px] font-extrabold",
                                          occ.onBreak
                                            ? "border-dashed border-line bg-white text-ink/40"
                                            : cn(color.soft, color.text, "border-transparent"),
                                        )}
                                      >
                                        <span>{occ.onBreak ? `Pause ${person.firstName}` : person.firstName}</span>
                                        {!occ.onBreak && occ.startedThisHour ? (
                                          <span className="rounded bg-white px-1.5 py-0.5 text-[9px] font-bold shadow-sm">
                                            {occ.label}
                                          </span>
                                        ) : null}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-center font-bold text-slate-300">—</p>
                              )}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card className="space-y-3">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-primary">
                    <Umbrella size={14} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-ink">Congés & absences</h3>
                    <p className="text-[10px] text-ink/45">Bloque automatiquement les RDV de l’Agenda</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLeaveOpen(true)}
                  className="rounded-lg border border-primary/20 bg-primary-light px-2 py-1 text-[11px] font-bold text-primary"
                >
                  + Ajouter absence
                </button>
              </div>
              <div className="divide-y divide-line/80 text-xs">
                {upcomingLeaves.length ? (
                  upcomingLeaves.map((leave) => (
                    <div key={leave.id} className="flex items-center justify-between gap-2 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className={cn("h-2 w-2 rounded-full", staffColor(leave.staff.id).bar)} />
                        <span className="font-bold text-ink">{leave.staff.firstName}</span>
                      </div>
                      <span className="text-ink/60">{formatLeaveSpan(leave.startAt, leave.endAt)}</span>
                      <span className="rounded border border-primary/20 bg-primary-light px-2 py-0.5 text-[10px] font-extrabold text-primary">
                        {LEAVE_TYPE_LABEL[leave.type]}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="py-4 text-ink/45">Aucun congé à venir sur les fiches employées.</p>
                )}
              </div>
            </Card>

            <Card className="space-y-3">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                    <Lock size={14} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-ink">Créneaux bloqués</h3>
                    <p className="text-[10px] text-ink/45">Fermetures institut, formations, indisponibilités</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBlockOpen(true)}
                  className="rounded-lg border border-line px-2 py-1 text-[11px] font-bold text-ink hover:bg-[#FBF5F7]"
                >
                  + Bloquer
                </button>
              </div>
              {closures.length ? (
                closures.map((item) => (
                  <div key={item.id} className="space-y-1 rounded-xl border border-line bg-[#FFF9FA] p-3">
                    <p className="text-xs font-bold text-ink">
                      {new Date(item.startAt).toLocaleString("fr-FR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      → {new Date(item.endAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-ink/55">
                      <span>Motif : <strong className="text-ink">{item.reason || "Fermeture institut"}</strong></span>
                      <button
                        type="button"
                        className="font-bold text-primary hover:underline"
                  onClick={() =>
                          deletePlanningItemApi("closure", item.id)
                      .then(refresh)
                            .catch((e) => toast(e instanceof Error ? e.message : "Erreur", "error"))
                        }
                      >
                        Débloquer
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-ink/45">Aucune fermeture institut enregistrée.</p>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <button type="button" className="text-[11px] font-bold text-ink/50 hover:text-primary" onClick={() => setExtraOpen("overtime")}>
                  + Heures supp.
                </button>
                <button type="button" className="text-[11px] font-bold text-ink/50 hover:text-primary" onClick={() => setExtraOpen("replacement")}>
                  + Remplacement
                </button>
              </div>
              {overtimes.slice(0, 3).map((item) => (
                <p key={item.id} className="text-[11px] text-ink/55">
                  HS {staff.find((s) => s.id === item.staffId)?.firstName ?? ""} ·{" "}
                  {new Date(item.startAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              ))}
              {replacements.filter((r) => r.active).slice(0, 3).map((item) => (
                <p key={item.id} className="text-[11px] text-ink/55">
                  Remplacement {item.absentName} → {item.substituteName}
                </p>
              ))}
            </Card>
          </div>

          {conflicts.length ? (
            <div className="rounded-2xl border border-rose-200 bg-gradient-to-r from-white to-rose-50/40 p-4 shadow-soft">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                  <TriangleAlert size={16} />
                </div>
                <div className="flex-1">
                  <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-rose-900">
                    Chevauchements détectés
                    <span className="rounded bg-rose-600 px-1.5 py-0.5 text-[9px] font-bold text-white">TEMPS RÉEL</span>
                  </h3>
                  <p className="mt-1 text-xs text-ink/55">
                    Des rendez-vous existent sur des plages où l’employée n’est pas disponible.
                  </p>
                  <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {conflicts.slice(0, 4).map((conflict) => (
                      <div key={conflict.detail} className="rounded-xl border border-rose-200 bg-white p-2.5 text-xs">
                        <p className="font-bold text-ink">{conflict.title}</p>
                        <p className="mt-0.5 text-[11px] text-slate-600">{conflict.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-6 xl:col-span-4">
          {selected ? (
            <>
              <Card className="space-y-4">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-[#ff7fa7] text-lg font-bold text-white">
                      {initialForDay(selected)}
                      {selected.lastName?.[0]?.toUpperCase() ?? ""}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-ink">{selected.displayName}</h3>
                      <p className="text-xs text-ink/50">
                        Poste : <strong className="text-primary">{positions[selected.id] || "—"}</strong>
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "h-3 w-3 rounded-full border-2 border-white",
                      isOnDutyToday(selected) ? "bg-emerald-500" : "bg-slate-300",
                    )}
                    title={isOnDutyToday(selected) ? "En service" : "Hors service"}
                  />
                </div>
                <div className="space-y-1 text-xs">
                  {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                    const label = DAY_LABELS[day];
                    const date = weekDates.find((d) => d.getDay() === day) ?? weekDates[0];
                    const cell = cellForStaffDay(selected, date);
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => {
                          setEditDay(day);
                          openScheduleEditor();
                        }}
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg py-1",
                          editDay === day && "bg-primary-light/60 px-2",
                        )}
                      >
                        <span className="font-bold text-ink/70">{label}</span>
                        {cell.kind === "work" || cell.kind === "overtime" ? (
                          <span className="rounded bg-primary-light px-2 py-0.5 text-[11px] font-extrabold text-primary">
                            {cell.start} → {cell.end}
                          </span>
                        ) : cell.kind === "leave" ? (
                          <span className="rounded bg-rose-50 px-2 py-0.5 text-[11px] font-extrabold text-rose-600">
                            {cell.label}
                          </span>
                        ) : (
                          <span className="rounded bg-rose-50 px-2 py-0.5 text-[11px] font-extrabold text-rose-600">
                            Repos
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center justify-end border-t border-line pt-3">
                  <button
                    type="button"
                    onClick={openScheduleEditor}
                    className="rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-white"
                  >
                    Modifier
                  </button>
                </div>
              </Card>
            </>
          ) : null}

          {aiHint ? (
            <div className="space-y-4 rounded-2xl border border-[#3a2b38] bg-gradient-to-br from-[#241a22] to-institut p-5 text-white shadow-lg">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/30 text-pink-200">
                    <Brain size={14} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider">Charge observée</h3>
                    <p className="text-[10px] text-white/60">Affluence Agenda vs staff planifié</p>
                  </div>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-white/80">
                <Sparkles size={12} className="mr-1 inline text-gold" />
                <strong className="text-white">{aiHint.dayLabel}</strong> : {aiHint.appointmentCount} RDV
                pour {aiHint.staffOnDuty} employée{aiHint.staffOnDuty > 1 ? "s" : ""} planifiée
                {aiHint.staffOnDuty > 1 ? "s" : ""}.
              </p>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-[11px] text-white/75">
                Suggestion : ajouter <strong className="text-white">{aiHint.suggestName}</strong> ce jour-là
                (actuellement en repos) pour absorber la charge.
              </div>
              <p className="text-[10px] text-white/45">
                Aucun chiffre de CA n’est inventé : utilisez Modifier pour ajuster l’horaire.
              </p>
            </div>
          ) : null}

          <Card className="space-y-3">
            <div className="flex items-center justify-between border-b border-line pb-2">
              <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-ink">
                <Clock3 size={14} className="text-gold" />
                Horaires d’ouverture (dérivés des shifts)
              </h3>
              <button
                type="button"
                onClick={openHoursEditor}
                className="text-[11px] font-bold text-primary hover:underline"
              >
                Paramètres
              </button>
            </div>
            <div className="space-y-1.5 text-xs">
              {openingHours.map((row) => (
                <div
                  key={row.day}
                  className={cn(
                    "flex justify-between py-0.5",
                    row.hours.includes("Fermé") ? "font-bold text-rose-600" : "text-ink/70",
                  )}
                >
                  <span>{row.label}</span>
                  <span className={row.hours.includes("Fermé") ? undefined : "font-extrabold text-ink"}>
                    {row.hours}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <BlockSlotDialog
        open={blockOpen}
        date={anchor}
        onClose={() => setBlockOpen(false)}
        onConfirm={async ({ startAt, endAt, reason }) => {
          try {
            await createClosureApi({ startAt, endAt, reason });
            toast("Créneau bloqué pour l’institut.", "success");
            setBlockOpen(false);
            await refresh();
          } catch (e) {
            toast(e instanceof Error ? e.message : "Erreur", "error");
          }
        }}
      />

      <Modal open={leaveOpen} onClose={() => setLeaveOpen(false)} title="Ajouter une absence">
        <div className="space-y-3">
          <Label>Employée</Label>
          <Select value={leaveStaff} onChange={(e) => setLeaveStaff(e.target.value)}>
            {staff.map((person) => (
              <option key={person.id} value={person.id}>
                {person.displayName}
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Début</Label>
              <Input type="date" value={leaveStart} onChange={(e) => setLeaveStart(e.target.value)} />
            </div>
            <div>
              <Label>Fin</Label>
              <Input type="date" value={leaveEnd} onChange={(e) => setLeaveEnd(e.target.value)} />
            </div>
          </div>
          <Label>Type</Label>
          <Select value={leaveType} onChange={(e) => setLeaveType(e.target.value as LeaveType)}>
            {(Object.keys(LEAVE_TYPE_LABEL) as LeaveType[]).map((key) => (
              <option key={key} value={key}>
                {LEAVE_TYPE_LABEL[key]}
              </option>
            ))}
          </Select>
          <Input placeholder="Motif (optionnel)" value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setLeaveOpen(false)}>
              Annuler
            </Button>
            <Button type="button" variant="brand" disabled={!leaveStaff || !leaveStart || !leaveEnd} onClick={addLeave}>
              Enregistrer
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={extraOpen === "overtime"}
        onClose={() => setExtraOpen(null)}
        title="Heures supplémentaires"
      >
        <div className="space-y-3">
          <Select value={otStaff} onChange={(e) => setOtStaff(e.target.value)}>
            {staff.map((person) => (
              <option key={person.id} value={person.id}>
                {person.displayName}
              </option>
            ))}
          </Select>
          <Input type="datetime-local" value={otStart} onChange={(e) => setOtStart(e.target.value)} />
          <Input type="datetime-local" value={otEnd} onChange={(e) => setOtEnd(e.target.value)} />
          <Input placeholder="Motif" value={otReason} onChange={(e) => setOtReason(e.target.value)} />
          <Button type="button" variant="brand" disabled={!otStaff || !otStart || !otEnd} onClick={addOt}>
            Ajouter
          </Button>
        </div>
      </Modal>

      <Modal open={extraOpen === "replacement"} onClose={() => setExtraOpen(null)} title="Remplacement">
        <div className="space-y-3">
          <Label>Absente</Label>
          <Select value={repAbsent} onChange={(e) => setRepAbsent(e.target.value)}>
            {staff.map((person) => (
              <option key={person.id} value={person.id}>
                {person.displayName}
              </option>
            ))}
          </Select>
          <Label>Remplaçante</Label>
          <Select value={repSub} onChange={(e) => setRepSub(e.target.value)}>
            {staff.map((person) => (
              <option key={person.id} value={person.id}>
                {person.displayName}
              </option>
            ))}
          </Select>
          <Input type="datetime-local" value={repStart} onChange={(e) => setRepStart(e.target.value)} />
          <Input type="datetime-local" value={repEnd} onChange={(e) => setRepEnd(e.target.value)} />
          <Input placeholder="Motif" value={repReason} onChange={(e) => setRepReason(e.target.value)} />
          <Button type="button" variant="brand" disabled={!repAbsent || !repSub || !repStart || !repEnd} onClick={addRep}>
            Ajouter
          </Button>
        </div>
      </Modal>

      <Drawer
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        title={selected ? `Modifier le planning de ${selected.firstName}` : "Modifier le planning"}
        side="right"
      >
        <div className="flex flex-col gap-3">
          {weekDraft
            .slice()
            .sort((a, b) => ((a.dayOfWeek + 6) % 7) - ((b.dayOfWeek + 6) % 7))
            .map((day) => (
              <div key={day.dayOfWeek} className="rounded-xl border border-line bg-[#FFEFF8]/50 p-3">
                <label className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <input
                    type="checkbox"
                    checked={day.active}
                    onChange={(e) =>
                      setWeekDraft((prev) =>
                        prev.map((item) =>
                          item.dayOfWeek === day.dayOfWeek ? { ...item, active: e.target.checked } : item,
                        ),
                      )
                    }
                    className="rounded text-primary"
                  />
                  {DAY_LABELS[day.dayOfWeek]}
                </label>
                {day.active ? (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div>
                      <p className="mb-1 text-[10px] font-bold text-ink/45">Début</p>
                      <Input
                        type="time"
                        value={day.startTime}
                        onChange={(e) =>
                          setWeekDraft((prev) =>
                            prev.map((item) =>
                              item.dayOfWeek === day.dayOfWeek ? { ...item, startTime: e.target.value } : item,
                            ),
                          )
                        }
                        className="h-9 font-bold"
                      />
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] font-bold text-ink/45">Fin</p>
                      <Input
                        type="time"
                        value={day.endTime}
                        onChange={(e) =>
                          setWeekDraft((prev) =>
                            prev.map((item) =>
                              item.dayOfWeek === day.dayOfWeek ? { ...item, endTime: e.target.value } : item,
                            ),
                          )
                        }
                        className="h-9 font-bold"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 text-[12px] text-ink/45">Repos</p>
                )}
              </div>
            ))}
          <Button type="button" variant="brand" disabled={savingSchedule} onClick={() => void saveSchedule()}>
            {savingSchedule ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </Drawer>

      <Drawer
        open={hoursOpen}
        onClose={() => setHoursOpen(false)}
        title="Horaires d’ouverture"
        side="right"
      >
        <div className="flex flex-col gap-3">
          <p className="text-[12px] text-ink/50">
            Ces horaires s’appliquent à toutes les employées actives.
          </p>
          {hoursDraft.map((row) => (
            <div key={row.day} className="rounded-xl border border-line bg-[#FFEFF8]/50 p-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-ink">
                <input
                  type="checkbox"
                  checked={row.open}
                  onChange={(e) =>
                    setHoursDraft((prev) =>
                      prev.map((item) => (item.day === row.day ? { ...item, open: e.target.checked } : item)),
                    )
                  }
                  className="rounded text-primary"
                />
                {DAY_LABELS[row.day]}
              </label>
              {row.open ? (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div>
                    <p className="mb-1 text-[10px] font-bold text-ink/45">Ouverture</p>
                    <Input
                      type="time"
                      value={row.start}
                      onChange={(e) =>
                        setHoursDraft((prev) =>
                          prev.map((item) => (item.day === row.day ? { ...item, start: e.target.value } : item)),
                        )
                      }
                      className="h-9 font-bold"
                    />
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] font-bold text-ink/45">Fermeture</p>
                    <Input
                      type="time"
                      value={row.end}
                      onChange={(e) =>
                        setHoursDraft((prev) =>
                          prev.map((item) => (item.day === row.day ? { ...item, end: e.target.value } : item)),
                        )
                      }
                      className="h-9 font-bold"
                    />
                  </div>
                </div>
              ) : (
                <p className="mt-1 text-[12px] text-ink/45">Fermé</p>
              )}
            </div>
          ))}
          <Button type="button" variant="brand" disabled={savingSchedule} onClick={() => void saveOpeningHours()}>
            {savingSchedule ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </Drawer>
    </div>
  );
}

function sameCalendarDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function KpiCard({
  icon,
  label,
  value,
  suffix,
  hint,
  hintClass,
  tone = "pink",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  suffix?: string;
  hint: string;
  hintClass?: string;
  tone?: "pink" | "amber" | "indigo" | "emerald";
}) {
  const tones = {
    pink: "bg-primary-light text-primary",
    amber: "bg-amber-50 text-amber-600",
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };
  return (
    <div className="flex items-center justify-between rounded-2xl border border-line bg-white p-4 shadow-soft">
      <div>
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink/45">
          {icon} {label}
        </p>
        <p className="mt-1 text-2xl font-extrabold text-ink">
          {value}
          {suffix ? <span className="text-xs font-normal text-slate-500"> {suffix}</span> : null}
        </p>
        <p className={cn("mt-0.5 text-[10px] font-semibold text-ink/45", hintClass)}>{hint}</p>
      </div>
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl font-bold", tones[tone])}>
        {tone === "pink" ? <Users size={16} /> : tone === "amber" ? <Hourglass size={16} /> : tone === "indigo" ? <CalendarCheck size={16} /> : <CircleCheck size={16} />}
      </div>
    </div>
  );
}

function StaffIdentity({ person, position }: { person: StaffAgendaContext; position?: string }) {
  const color = staffColor(person.id);
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-lg border text-xs font-extrabold",
          color.soft,
          color.text,
        )}
      >
        {initialForDay(person)}
      </div>
      <div>
        <p className="font-extrabold text-ink">{person.firstName}</p>
        <p className="text-[10px] text-ink/45">{position || person.lastName}</p>
      </div>
    </div>
  );
}

function DayCellBadge({ staffId, cell }: { staffId: string; cell: DayCell }) {
  if (cell.kind === "work" || cell.kind === "overtime") {
    return <ShiftChip staffId={staffId} cell={cell} />;
  }
  if (cell.kind === "leave") {
    return (
      <span className="inline-flex rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-600">
        {cell.label}
      </span>
    );
  }
  if (cell.kind === "replaced") {
    return <OffBadge>{cell.substituteName}</OffBadge>;
  }
  return <OffBadge />;
}
