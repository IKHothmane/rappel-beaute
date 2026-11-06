"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
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
  Pencil,
  ShieldCheck,
  Sparkles,
  Trash2,
  TriangleAlert,
  Users,
} from "lucide-react";
import { staffColor, type StaffColor } from "@/components/agenda/staff-colors";
import { useStaffPalette } from "@/components/agenda/staff-color-provider";
import { AgendaSkeleton } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import {
  getMonthGrid,
  getWeekDates,
} from "@/modules/appointments/availability";
import { listAppointments } from "@/modules/appointments/service";
import {
  createOvertimeApi,
  createReplacementApi,
  deletePlanningItemApi,
  loadPlanningApi,
  loadPlanningHistoryApi,
  updateOvertimeApi,
  updateReplacementApi,
} from "@/modules/planning/service";
import {
  createStaffLeave,
  listStaff,
  listStaffForAgenda,
  updateStaffLeave,
  updateStaffSchedule,
} from "@/modules/staff/service";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/types/appointment";
import type {
  OrganizationClosureItem,
  PlanningLeaveHistoryItem,
  StaffOvertimeItem,
  StaffReplacementItem,
} from "@/types/planning";
import type { LeaveType, StaffAgendaContext, StaffScheduleSlot } from "@/types/staff";
import { DAY_LABELS, LEAVE_STATUS_LABEL, LEAVE_TYPE_LABEL } from "@/types/staff";
import {
  appointmentsInRange,
  breaksForEditor,
  buildAiSuggestion,
  cellForStaffDay,
  detectConflicts,
  formatDayHead,
  formatLeaveSpan,
  formatShiftBadge,
  hourWindow,
  initialForDay,
  isOnDutyToday,
  isThisWeek,
  openingHoursFromStaff,
  overtimeSpanOnDay,
  replacementSpanOnDay,
  coveringSpanOnDay,
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
    <section
      id={id}
      className={cn(
        "rounded-[20px] border border-[#f0dce5] bg-white p-5 shadow-[0_8px_24px_rgba(84,17,47,0.05)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

function PremiumEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#efd7e2] bg-gradient-to-br from-[#fffafb] to-[#fff5f9] px-4 py-6 text-center text-xs text-[#947c89]">
      {children}
    </div>
  );
}

function leaveStatusTone(status: string) {
  if (status === "APPROVED") return "bg-emerald-50 text-emerald-700";
  if (status === "PENDING") return "bg-amber-50 text-amber-700";
  if (status === "CANCELLED") return "bg-slate-100 text-slate-500";
  return "bg-[#fce7f1] text-[#a7084b]";
}

function OffBadge({ children = "OFF" }: { children?: string }) {
  return (
    <span className="inline-flex rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-400">
      {children}
    </span>
  );
}

function ShiftChip({
  color,
  cell,
}: {
  color: StaffColor;
  cell: Extract<DayCell, { kind: "work" | "overtime" }>;
}) {
  if (cell.kind === "work") {
    return <span className={cn("mx-auto inline-block h-2.5 w-2.5 rounded-full", color.bar)} />;
  }
  return (
    <span
      className={cn(
        "inline-flex rounded-lg border border-amber-200 px-2 py-1 text-[11px] font-bold",
        color.soft,
        color.text,
      )}
    >
      HS {formatShiftBadge(cell.start, cell.end)}
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
  const [staffMenuOpen, setStaffMenuOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editDay, setEditDay] = useState(() => new Date().getDay());
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [hoursOpen, setHoursOpen] = useState(false);
  const [weekDraft, setWeekDraft] = useState<StaffScheduleSlot[]>([]);
  const [hoursDraft, setHoursDraft] = useState<
    { day: number; open: boolean; start: string; end: string }[]
  >([]);
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
  const [editingLeaveId, setEditingLeaveId] = useState<string | null>(null);
  const [editingOtId, setEditingOtId] = useState<string | null>(null);
  const [editingRepId, setEditingRepId] = useState<string | null>(null);
  const [historyStaffId, setHistoryStaffId] = useState("ALL");
  const [historyLeaves, setHistoryLeaves] = useState<PlanningLeaveHistoryItem[]>([]);
  const [historyOvertimes, setHistoryOvertimes] = useState<StaffOvertimeItem[]>([]);
  const [historyReplacements, setHistoryReplacements] = useState<StaffReplacementItem[]>([]);

  const weekDates = useMemo(() => getWeekDates(anchor), [anchor]);
  const monthCells = useMemo(() => getMonthGrid(anchor), [anchor]);

  useEffect(() => {
    if (!staffMenuOpen) return;
    function close(event: MouseEvent) {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-staff-filter]")) return;
      setStaffMenuOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [staffMenuOpen]);

  const refresh = useCallback(async () => {
    const [plan, staffList, apts, roster, history] = await Promise.all([
      loadPlanningApi(),
      listStaffForAgenda(),
      listAppointments(),
      listStaff({ limit: 100 }),
      loadPlanningHistoryApi().catch(() => ({
        closures: [],
        overtimes: [],
        replacements: [],
        leaves: [],
      })),
    ]);
    setClosures(plan.closures);
    setOvertimes(plan.overtimes);
    setReplacements(plan.replacements);
    setHistoryLeaves(history.leaves);
    setHistoryOvertimes(history.overtimes);
    setHistoryReplacements(history.replacements);
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

  const calendarStaff = useMemo(
    () =>
      staff.map((person) => {
        const merged = new Map((person.overtimes ?? []).map((item) => [item.id, item]));
        for (const item of overtimes) {
          if (item.staffId !== person.id) continue;
          merged.set(item.id, {
            id: item.id,
            startAt: item.startAt,
            endAt: item.endAt,
            reason: item.reason,
          });
        }
        const absent = new Map((person.replacementsAsAbsent ?? []).map((item) => [item.id, item]));
        const covering = new Map((person.replacementsAsSubstitute ?? []).map((item) => [item.id, item]));
        for (const item of replacements) {
          if (!item.active) continue;
          if (item.absentStaffId === person.id) {
            absent.set(item.id, {
              id: item.id,
              startAt: item.startAt,
              endAt: item.endAt,
              substituteStaffId: item.substituteStaffId,
              substituteName: item.substituteName,
            });
          }
          if (item.substituteStaffId === person.id) {
            covering.set(item.id, {
              id: item.id,
              startAt: item.startAt,
              endAt: item.endAt,
              absentStaffId: item.absentStaffId,
              absentName: item.absentName,
            });
          }
        }
        return {
          ...person,
          overtimes: [...merged.values()],
          replacementsAsAbsent: [...absent.values()],
          replacementsAsSubstitute: [...covering.values()],
        };
      }),
    [staff, overtimes, replacements],
  );
  const visibleStaff = useMemo(
    () => (staffFilter === "ALL" ? calendarStaff : calendarStaff.filter((item) => item.id === staffFilter)),
    [calendarStaff, staffFilter],
  );
  const staffColors = useStaffPalette();
  const selected = calendarStaff.find((item) => item.id === selectedId) ?? calendarStaff[0] ?? null;
  const activeCount = staff.filter((item) => item.status === "ACTIVE").length;
  const onDutyToday = staff.filter((item) => isOnDutyToday(item)).length;
  const totalHours = Math.round(staff.reduce((sum, item) => sum + weekHours(item, weekDates), 0));
  const weekApts = appointmentsInRange(appointments, weekDates[0], weekDates[6]);
  const plannedHours = staff.reduce((sum, item) => sum + templateWeekHours(item), 0);
  const availability = plannedHours > 0 ? Math.round((totalHours / plannedHours) * 100) : 100;
  const conflicts = useMemo(
    () => detectConflicts(calendarStaff, appointments, closures, weekDates),
    [calendarStaff, appointments, closures, weekDates],
  );
  const openingHours = useMemo(() => openingHoursFromStaff(staff), [staff]);
  const aiHint = useMemo(
    () => buildAiSuggestion(staff, appointments, weekDates),
    [staff, appointments, weekDates],
  );
  const gridDates = view === "day" ? [anchor] : weekDates;
  const hours = hourWindow(visibleStaff, gridDates);
  const hourRows = Array.from({ length: Math.max(1, hours.endHour - hours.startHour) }, (_, i) => hours.startHour + i);
  const peakDayIndex = weekDates.reduce((best, date, index) => {
    const count = appointmentsInRange(appointments, date, date).length;
    const bestCount = appointmentsInRange(appointments, weekDates[best], weekDates[best]).length;
    return count > bestCount ? index : best;
  }, 0);
  const today = new Date();
  const periodTitle =
    view === "month"
      ? anchor.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }).replace(/^\w/, (letter) => letter.toUpperCase())
      : view === "day"
        ? anchor
            .toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
            .replace(/^\w/, (letter) => letter.toUpperCase())
        : `Semaine du ${weekDates[0].toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} au ${weekDates[6].toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`;
  const jumpLabel = view === "month" ? "Ce mois" : view === "day" ? "Aujourd’hui" : "Cette semaine";
  const onCurrentPeriod =
    view === "month"
      ? anchor.getFullYear() === today.getFullYear() && anchor.getMonth() === today.getMonth()
      : view === "day"
        ? sameCalendarDay(anchor, today)
        : isThisWeek(anchor);
  const upcomingLeaves = staff.flatMap((person) =>
    person.leaves
      .filter((leave) => new Date(leave.endAt) >= startOfDay(weekDates[0]))
      .map((leave) => ({ ...leave, staff: person })),
  );

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

  function focusHistory(staffId = "ALL") {
    setHistoryStaffId(staffId);
    document.getElementById("planning-history")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function beginEditLeave(leave: {
    id: string;
    staffId?: string;
    staff?: { id: string };
    startAt: string;
    endAt: string;
    type: LeaveType;
    reason: string | null;
  }) {
    setEditingLeaveId(leave.id);
    setLeaveStaff(leave.staffId ?? leave.staff?.id ?? "");
    setLeaveStart(toDateInput(leave.startAt));
    setLeaveEnd(toDateInput(leave.endAt));
    setLeaveType(leave.type);
    setLeaveReason(leave.reason ?? "");
    setLeaveOpen(true);
  }

  function beginEditOvertime(item: StaffOvertimeItem) {
    setEditingOtId(item.id);
    setOtStaff(item.staffId);
    setOtStart(toDatetimeLocal(item.startAt));
    setOtEnd(toDatetimeLocal(item.endAt));
    setOtReason(item.reason ?? "");
    setExtraOpen("overtime");
  }

  function beginEditReplacement(item: StaffReplacementItem) {
    setEditingRepId(item.id);
    setRepAbsent(item.absentStaffId);
    setRepSub(item.substituteStaffId);
    setRepStart(toDatetimeLocal(item.startAt));
    setRepEnd(toDatetimeLocal(item.endAt));
    setRepReason(item.reason ?? "");
    setExtraOpen("replacement");
  }

  async function addLeave() {
    try {
      const payload = {
        startAt: new Date(`${leaveStart}T00:00:00`).toISOString(),
        endAt: new Date(`${leaveEnd}T23:59:59`).toISOString(),
        type: leaveType,
        reason: leaveReason || undefined,
        status: "APPROVED" as const,
      };
      const result = editingLeaveId
        ? await updateStaffLeave(leaveStaff, editingLeaveId, payload)
        : await createStaffLeave(leaveStaff, payload);
      if (!result.ok) {
        toast(result.error, "error");
        return;
      }
      toast(editingLeaveId ? "Absence modifiée." : "Absence enregistrée. L’agenda ne proposera plus ce créneau.", "success");
      setLeaveOpen(false);
      setEditingLeaveId(null);
      setLeaveReason("");
      await refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erreur", "error");
    }
  }

  async function removeLeave(staffId: string, leaveId: string) {
    if (!window.confirm("Supprimer cette absence ?")) return;
    const result = await updateStaffLeave(staffId, leaveId, { status: "CANCELLED" });
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast("Absence supprimée.", "success");
    await refresh();
  }

  async function addOt() {
    try {
      const payload = {
        staffId: otStaff,
        startAt: new Date(otStart).toISOString(),
        endAt: new Date(otEnd).toISOString(),
        reason: otReason || null,
      };
      if (editingOtId) await updateOvertimeApi(editingOtId, payload);
      else await createOvertimeApi(payload);
      toast(editingOtId ? "Heures supplémentaires modifiées." : "Heures supplémentaires enregistrées.", "success");
      setExtraOpen(null);
      setEditingOtId(null);
      setOtReason("");
      await refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erreur", "error");
    }
  }

  async function removeOvertime(id: string) {
    if (!window.confirm("Supprimer ces heures supplémentaires ?")) return;
    try {
      await deletePlanningItemApi("overtime", id);
      toast("Heures supplémentaires supprimées.", "success");
      await refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erreur", "error");
    }
  }

  async function addRep() {
    try {
      const payload = {
        absentStaffId: repAbsent,
        substituteStaffId: repSub,
        startAt: new Date(repStart).toISOString(),
        endAt: new Date(repEnd).toISOString(),
        reason: repReason || null,
      };
      if (editingRepId) await updateReplacementApi(editingRepId, payload);
      else await createReplacementApi(payload);
      toast(editingRepId ? "Remplacement modifié." : "Remplacement enregistré.", "success");
      setExtraOpen(null);
      setEditingRepId(null);
      setRepReason("");
      await refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erreur", "error");
    }
  }

  async function removeReplacement(id: string) {
    if (!window.confirm("Supprimer ce remplacement ?")) return;
    try {
      await deletePlanningItemApi("replacement", id);
      toast("Remplacement supprimé.", "success");
      await refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erreur", "error");
    }
  }

  if (loading) return <AgendaSkeleton />;

  return (
    <div className="space-y-6 pb-8">
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
              onCurrentPeriod
                ? "border-primary/20 bg-primary-light text-primary"
                : "border-line bg-white text-ink",
            )}
          >
            {jumpLabel}
          </button>
          <button
            type="button"
            onClick={() => shift(1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink/70 hover:bg-primary-light"
          >
            <ChevronRight size={14} />
          </button>
          <span className="ml-1 text-base font-black tracking-tight text-ink">{periodTitle}</span>
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
          <div className="relative" data-staff-filter>
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={staffMenuOpen}
              onClick={() => setStaffMenuOpen((open) => !open)}
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-[#FBF5F7] py-1.5 pl-3 pr-2 text-xs font-bold text-ink"
            >
              {staffFilter !== "ALL" ? (
                <span className={cn("h-2.5 w-2.5 rounded-full", staffColor(staffFilter, staffColors).bar)} />
              ) : null}
              {staffFilter === "ALL"
                ? `Toutes les employées (${staff.length})`
                : staff.find((person) => person.id === staffFilter)?.displayName}
              <ChevronDown size={12} className="text-ink/40" />
            </button>
            {staffMenuOpen ? (
              <ul
                role="listbox"
                aria-label="Filtrer les employées"
                className="absolute right-0 z-30 mt-1 min-w-[240px] overflow-hidden rounded-xl border border-line bg-white py-1 shadow-lg"
              >
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setStaffFilter("ALL");
                      setStaffMenuOpen(false);
                    }}
                    className={cn(
                      "flex w-full px-3 py-2 text-left text-xs font-bold",
                      staffFilter === "ALL" ? "bg-[#FBF5F7] text-ink" : "text-ink hover:bg-[#FBF5F7]",
                    )}
                  >
                    Toutes les employées ({staff.length})
                  </button>
                </li>
                {staff.map((person) => {
                  const color = staffColor(person.id, staffColors);
                  const active = staffFilter === person.id;
                  return (
                    <li key={person.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setStaffFilter(person.id);
                          setStaffMenuOpen(false);
                          selectStaffDay(person.id, weekDates[0]);
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold",
                          active ? cn(color.soft, color.text) : cn(color.text, "hover:bg-[#FBF5F7]"),
                        )}
                      >
                        <span className={cn("h-2.5 w-2.5 rounded-full", color.bar)} />
                        {person.displayName}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        </div>
      </div>
      <ul className="flex flex-wrap gap-2">
        {visibleStaff.map((person) => {
          const color = staffColor(person.id, staffColors);
          return (
            <li key={person.id}>
              <button
                type="button"
                onClick={() => selectStaffDay(person.id, weekDates[0])}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-bold",
                  selected?.id === person.id
                    ? cn("border-transparent ring-2", color.soft, color.text, color.ring)
                    : "border-line bg-white text-ink",
                )}
              >
                <span className={cn("h-2.5 w-2.5 rounded-full", color.bar)} />
                {person.displayName}
              </button>
            </li>
          );
        })}
      </ul>


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
                  <p className="text-[11px] font-bold text-ink/70">
                    Semaine du {weekDates[0].toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} au{" "}
                    {weekDates[6].toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
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
                        className={cn(
                          "cursor-pointer transition-colors hover:bg-[#FFF9FB]",
                          selected?.id === person.id && staffColor(person.id, staffColors).soft,
                        )}
                        onClick={() => selectStaffDay(person.id, weekDates[0])}
                      >
                        <td className="px-4 py-3">
                          <StaffIdentity
                            person={person}
                            position={positions[person.id]}
                            color={staffColor(person.id, staffColors)}
                          />
                        </td>
                        {weekDates.map((date, index) => {
                          const cell = cellForStaffDay(person, date);
                          const extraHours = overtimeSpanOnDay(person, date);
                          const replaced = replacementSpanOnDay(person, date);
                          const covering = coveringSpanOnDay(person, date);
                          const notable =
                            cell.kind === "leave" ||
                            cell.kind === "overtime" ||
                            cell.kind === "replaced" ||
                            Boolean(extraHours) ||
                            Boolean(replaced) ||
                            Boolean(covering);
                          return (
                            <td
                              key={date.toISOString()}
                              className={cn("px-3 py-3 text-center", index === peakDayIndex && "bg-rose-50/30")}
                              onClick={(e) => {
                                e.stopPropagation();
                                selectStaffDay(person.id, date);
                                if (notable) void focusHistory(person.id);
                              }}
                            >
                              <DayCellBadge
                                color={staffColor(person.id, staffColors)}
                                cell={cell}
                              />
                              {extraHours && cell.kind !== "overtime" ? (
                                <span className="mt-1 block text-[10px] font-bold text-amber-700">
                                  HS {formatShiftBadge(extraHours.start, extraHours.end)}
                                </span>
                              ) : null}
                              {replaced ? (
                                <span className="mt-1 block text-[10px] font-bold text-violet-700">
                                  Rempl. {replaced.substituteName.split(" ")[0]} {formatShiftBadge(replaced.start, replaced.end)}
                                </span>
                              ) : null}
                              {covering ? (
                                <span className="mt-1 block text-[10px] font-bold text-violet-700">
                                  Remplace {covering.absentName.split(" ")[0]} {formatShiftBadge(covering.start, covering.end)}
                                </span>
                              ) : null}
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
              <h2 className="mb-1 text-sm font-extrabold text-ink">{periodTitle}</h2>
              <p className="mb-4 text-[11px] text-ink/50">Congés, absences et fermetures</p>
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-ink/45">
                {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
                  <div key={d} className="py-1">{d}</div>
                ))}
                {monthCells.map((date) => {
                  const inMonth = date.getMonth() === anchor.getMonth();
                  const cells = calendarStaff.map((person) => cellForStaffDay(person, date));
                  const leaveCount = cells.filter((cell) => cell.kind === "leave").length;
                  const overtimeCount = calendarStaff.filter((person) => overtimeSpanOnDay(person, date)).length;
                  const replacementCount = calendarStaff.filter((person) => replacementSpanOnDay(person, date) || coveringSpanOnDay(person, date)).length;
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
                        if (leaveCount || overtimeCount || replacementCount) void focusHistory("ALL");
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
                      {overtimeCount ? (
                        <p className="mt-0.5 text-[9px] font-bold text-amber-700">{overtimeCount} HS</p>
                      ) : null}
                      {replacementCount ? (
                        <p className="mt-0.5 text-[9px] font-bold text-violet-700">{replacementCount} rempl.</p>
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
                  <p className="text-[11px] font-bold text-ink/70">
                    {view === "day"
                      ? periodTitle
                      : `Semaine du ${weekDates[0].toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} au ${weekDates[6].toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 text-xs">
                  {visibleStaff.map((person) => {
                    const color = staffColor(person.id, staffColors);
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
                      {gridDates.map((date) => {
                        const dayLeaves = visibleStaff.flatMap((person) => {
                          const cell = cellForStaffDay(person, date);
                          return cell.kind === "leave" ? [{ person, label: cell.label }] : [];
                        });
                        return (
                          <th key={date.toISOString()} className="border-l border-line px-3 py-2.5 text-center">
                            {view === "day" ? periodTitle : formatDayHead(date)}
                            {dayLeaves.map(({ person, label }) => (
                              <span key={person.id} className="mt-1 flex items-center justify-center gap-1 text-[10px] font-extrabold text-rose-600">
                                <span className={cn("h-2 w-2 rounded-full", staffColor(person.id, staffColors).bar)} />
                                {label} {person.firstName}
                              </span>
                            ))}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/70">
                    {hourRows.map((hour) => {
                      const cells = gridDates.map((date) => {
                        const present = visibleStaff
                          .map((person) => ({ person, occ: staffAtHour(person, date, hour), leaveLabel: null as string | null }))
                          .filter((row) => row.occ.present || row.occ.onBreak);
                        if (hour !== hours.startHour) return present;
                        for (const person of visibleStaff) {
                          const cell = cellForStaffDay(person, date);
                          if (cell.kind !== "leave") continue;
                          if (present.some((row) => row.person.id === person.id)) continue;
                          present.unshift({
                            person,
                            leaveLabel: cell.label,
                            occ: { present: true, onBreak: false, startedThisHour: false },
                          });
                        }
                        return present;
                      });
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
                                  {col.map(({ person, occ, leaveLabel }) => {
                                    const color = staffColor(person.id, staffColors);
                                    return (
                                      <div
                                        key={person.id}
                                        className={cn(
                                          "flex items-center justify-between rounded-lg border px-1.5 py-1 text-[11px] font-extrabold",
                                          leaveLabel
                                            ? "border-rose-200 bg-rose-50 text-rose-700"
                                            : occ.replacement
                                            ? "border-violet-300 bg-violet-50 text-violet-800"
                                            : occ.overtime
                                            ? "border-amber-300 bg-amber-50 text-amber-900"
                                            : occ.onBreak
                                            ? "border-dashed border-line bg-white text-ink/40"
                                            : cn(color.soft, color.text, "border-transparent"),
                                        )}
                                      >
                                        <span className="flex items-center gap-1">
                                          {leaveLabel ? (
                                            <span className={cn("h-2 w-2 rounded-full", color.bar)} />
                                          ) : null}
                                          {leaveLabel
                                            ? `${leaveLabel} ${person.firstName}`
                                            : occ.onBreak
                                            ? `Pause ${person.firstName}`
                                            : occ.replacement
                                              ? `Rempl. ${person.firstName}`
                                              : occ.overtime
                                                ? `HS ${person.firstName}`
                                                : person.firstName}
                                        </span>
                                        {!occ.onBreak && occ.startedThisHour && (occ.overtime || occ.replacement) ? (
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
                <div className="flex items-center justify-between gap-3 border-b border-[#f0dce5] pb-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={cn(
                        "flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-bold text-white shadow-sm",
                        staffColor(selected.id, staffColors).bar,
                      )}
                    >
                      {initialForDay(selected)}
                      {selected.lastName?.[0]?.toUpperCase() ?? ""}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate font-serif text-lg font-bold text-[#54112f]">
                        {selected.displayName}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-[#a82c62]">
                          {positions[selected.id] || "Collaboratrice"}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-[10px] font-bold",
                            isOnDutyToday(selected)
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500",
                          )}
                        >
                          {isOnDutyToday(selected) ? "Active" : "Hors service"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#947c89]">
                    Planning de la semaine
                  </p>
                  <div className="space-y-1.5 text-xs">
                    {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                      const label = DAY_LABELS[day];
                      const date = weekDates.find((d) => d.getDay() === day) ?? weekDates[0];
                      const cell = cellForStaffDay(selected, date);
                      const extra = cell.kind === "work" ? overtimeSpanOnDay(selected, date) : null;
                      const replaced = replacementSpanOnDay(selected, date);
                      const covering = coveringSpanOnDay(selected, date);
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => {
                            setEditDay(day);
                            openScheduleEditor();
                          }}
                          className={cn(
                            "flex w-full items-center justify-between rounded-xl px-2.5 py-2 transition",
                            editDay === day ? "bg-[#fce7f1]" : "hover:bg-[#fff7fa]",
                          )}
                        >
                          <span className="font-bold text-[#6f5666]">{label}</span>
                          {cell.kind === "work" || cell.kind === "overtime" ? (
                            <span className="flex flex-col items-end gap-1">
                              <span
                                className={cn(
                                  "rounded-lg px-2.5 py-1 text-[11px] font-extrabold",
                                  staffColor(selected.id, staffColors).soft,
                                  staffColor(selected.id, staffColors).text,
                                )}
                              >
                                {cell.kind === "overtime" ? "HS " : ""}
                                {cell.start} → {cell.end}
                              </span>
                              {extra ? (
                                <span className="rounded-lg bg-amber-50 px-2 py-0.5 text-[11px] font-extrabold text-amber-800">
                                  HS {extra.start} → {extra.end}
                                </span>
                              ) : null}
                              {replaced ? (
                                <span className="rounded-lg bg-violet-50 px-2 py-0.5 text-[11px] font-extrabold text-violet-800">
                                  Rempl. {replaced.substituteName.split(" ")[0]} {replaced.start} → {replaced.end}
                                </span>
                              ) : null}
                              {covering ? (
                                <span className="rounded-lg bg-violet-50 px-2 py-0.5 text-[11px] font-extrabold text-violet-800">
                                  Remplace {covering.absentName.split(" ")[0]} {covering.start} → {covering.end}
                                </span>
                              ) : null}
                            </span>
                          ) : cell.kind === "leave" ? (
                            <span className="rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-extrabold text-rose-600">
                              {cell.label}
                            </span>
                          ) : (
                            <span className="rounded-lg bg-[#fff0f5] px-2.5 py-1 text-[11px] font-extrabold text-[#b00052]">
                              Repos
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={openScheduleEditor}
                    className="mt-3 w-full rounded-xl bg-[#a9004e] px-3 py-2.5 text-xs font-bold text-white shadow-sm"
                  >
                    Modifier les horaires
                  </button>
                </div>

                <div className="border-t border-[#f0dce5] pt-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h4 className="font-serif text-sm font-bold text-[#54112f]">Congés &amp; absences</h4>
                    <button
                      type="button"
                      onClick={() => {
                        setLeaveStaff(selected.id);
                        setEditingLeaveId(null);
                        setLeaveReason("");
                        setLeaveOpen(true);
                      }}
                      className="text-[11px] font-bold text-[#a7084b] hover:underline"
                    >
                      + Ajouter
                    </button>
                  </div>
                  <div className="space-y-2">
                    {upcomingLeaves.filter((leave) => leave.staff.id === selected.id).length ? (
                      upcomingLeaves
                        .filter((leave) => leave.staff.id === selected.id)
                        .slice(0, 3)
                        .map((leave) => (
                          <div
                            key={leave.id}
                            className="rounded-2xl border border-[#f0dce5] bg-[#fff5f9] px-3.5 py-3"
                          >
                            <p className="text-sm font-bold text-[#401126]">
                              {leave.reason?.trim() || LEAVE_TYPE_LABEL[leave.type]}
                            </p>
                            <p className="mt-1 text-xs text-[#80596c]">
                              Du {formatLeaveSpan(leave.startAt, leave.endAt)}
                            </p>
                          </div>
                        ))
                    ) : (
                      <PremiumEmpty>Aucun congé à venir.</PremiumEmpty>
                    )}
                  </div>
                </div>

                <div className="border-t border-[#f0dce5] pt-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h4 className="font-serif text-sm font-bold text-[#54112f]">
                      Heures supp. &amp; remplacements
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setOtStaff(selected.id);
                          setEditingOtId(null);
                          setOtReason("");
                          setExtraOpen("overtime");
                        }}
                        className="text-[11px] font-bold text-[#a7084b] hover:underline"
                      >
                        + HS
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRepAbsent(selected.id);
                          setEditingRepId(null);
                          setRepReason("");
                          setExtraOpen("replacement");
                        }}
                        className="text-[11px] font-bold text-[#a7084b] hover:underline"
                      >
                        + Remplacement
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {(() => {
                      const staffOt = overtimes.filter((item) => item.staffId === selected.id);
                      const staffRep = replacements.filter(
                        (item) =>
                          item.active &&
                          (item.absentStaffId === selected.id || item.substituteStaffId === selected.id),
                      );
                      if (!staffOt.length && !staffRep.length) {
                        return <PremiumEmpty>Aucune heure supplémentaire ni remplacement.</PremiumEmpty>;
                      }
                      return (
                        <>
                          {staffOt.slice(0, 4).map((item) => (
                            <div
                              key={item.id}
                              className="rounded-2xl border border-amber-100 bg-amber-50/50 px-3.5 py-3"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-[#401126]">
                                    <span className="mr-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-800">
                                      HS
                                    </span>
                                    {item.reason?.trim() || "Heures supplémentaires"}
                                  </p>
                                  <p className="mt-1 text-xs text-[#80596c]">
                                    {new Date(item.startAt).toLocaleString("fr-FR", {
                                      day: "2-digit",
                                      month: "short",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                    {" → "}
                                    {new Date(item.endAt).toLocaleString("fr-FR", {
                                      day: "2-digit",
                                      month: "short",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </p>
                                </div>
                                <span className="flex shrink-0 gap-1">
                                  <button
                                    type="button"
                                    aria-label="Modifier les heures supplémentaires"
                                    onClick={() => beginEditOvertime(item)}
                                    className="rounded-lg p-1.5 text-[#947c89] hover:bg-white"
                                  >
                                    <Pencil size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    aria-label="Supprimer les heures supplémentaires"
                                    onClick={() => void removeOvertime(item.id)}
                                    className="rounded-lg p-1.5 text-[#947c89] hover:bg-rose-50 hover:text-rose-600"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </span>
                              </div>
                            </div>
                          ))}
                          {staffRep.slice(0, 4).map((item) => (
                            <div
                              key={item.id}
                              className="rounded-2xl border border-violet-100 bg-violet-50/50 px-3.5 py-3"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-[#401126]">
                                    {item.absentStaffId === selected.id
                                      ? `Remplacée par ${item.substituteName}`
                                      : `Remplace ${item.absentName}`}
                                  </p>
                                  <p className="mt-1 text-xs text-[#80596c]">
                                    {new Date(item.startAt).toLocaleString("fr-FR", {
                                      day: "2-digit",
                                      month: "short",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                    {" → "}
                                    {new Date(item.endAt).toLocaleString("fr-FR", {
                                      day: "2-digit",
                                      month: "short",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </p>
                                  {item.reason ? (
                                    <p className="mt-1 text-[11px] text-[#947c89]">{item.reason}</p>
                                  ) : null}
                                </div>
                                <span className="flex shrink-0 gap-1">
                                  <button
                                    type="button"
                                    aria-label="Modifier le remplacement"
                                    onClick={() => beginEditReplacement(item)}
                                    className="rounded-lg p-1.5 text-[#947c89] hover:bg-white"
                                  >
                                    <Pencil size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    aria-label="Supprimer le remplacement"
                                    onClick={() => void removeReplacement(item.id)}
                                    className="rounded-lg p-1.5 text-[#947c89] hover:bg-rose-50 hover:text-rose-600"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </span>
                              </div>
                            </div>
                          ))}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </Card>
            </>
          ) : null}

          <Card className="space-y-4">
            <div className="flex items-center justify-between gap-3 border-b border-[#f0dce5] pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#fce7f1] text-[#a7084b]">
                  <Clock3 size={18} aria-hidden />
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold text-[#54112f]">
                    Horaires d&apos;ouverture du salon
                  </h3>
                  <p className="text-[11px] text-[#947c89]">Dérivés des shifts de l&apos;équipe</p>
                </div>
              </div>
              <button
                type="button"
                onClick={openHoursEditor}
                className="rounded-xl border border-[#edcfdb] bg-white px-3 py-2 text-[11px] font-bold text-[#831d4a] hover:bg-[#fff7fa]"
              >
                Modifier
              </button>
            </div>
            <div className="space-y-1.5">
              {openingHours.map((row) => (
                <div
                  key={row.day}
                  className={cn(
                    "flex items-center justify-between rounded-xl px-3 py-2.5 text-xs",
                    row.hours.includes("Fermé")
                      ? "bg-[#fff0f5] font-bold text-[#b00052]"
                      : "bg-[#fff8fb] text-[#6f5666]",
                  )}
                >
                  <span className="font-semibold">{row.label}</span>
                  <span className={row.hours.includes("Fermé") ? undefined : "font-extrabold text-[#401126]"}>
                    {row.hours}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card id="planning-history" className="space-y-4">
            <div className="flex items-start gap-3 border-b border-[#f0dce5] pb-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#fce7f1] text-[#a7084b]">
                <CalendarDays size={18} aria-hidden />
              </div>
              <div>
                <h3 className="font-serif text-base font-bold text-[#54112f]">
                  Historique congés, absences et remplacements
                </h3>
                <p className="mt-0.5 text-[11px] text-[#947c89]">
                  Toute l’équipe, y compris les périodes passées
                </p>
              </div>
            </div>
            <Select value={historyStaffId} onChange={(e) => setHistoryStaffId(e.target.value)}>
              <option value="ALL">Toute l’équipe</option>
              {staff.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.displayName}
                </option>
              ))}
            </Select>
            <div className="max-h-[32rem] space-y-5 overflow-y-auto">
              <section className="space-y-2.5">
                <h3 className="text-[11px] font-bold uppercase tracking-wide text-[#947c89]">
                  Congés &amp; absences
                </h3>
                {historyLeaves.filter((leave) => historyStaffId === "ALL" || leave.staffId === historyStaffId).length ? (
                  historyLeaves
                    .filter((leave) => historyStaffId === "ALL" || leave.staffId === historyStaffId)
                    .map((leave) => (
                      <div
                        key={leave.id}
                        className="rounded-2xl border border-[#f0dce5] bg-gradient-to-r from-[#fff8fb] to-white p-3.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-bold text-[#401126]">{leave.staffName}</p>
                              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", leaveStatusTone(leave.status))}>
                                {LEAVE_STATUS_LABEL[leave.status]}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-[#80596c]">
                              {formatLeaveSpan(leave.startAt, leave.endAt)} · {LEAVE_TYPE_LABEL[leave.type]}
                            </p>
                            {leave.reason ? (
                              <p className="mt-1 text-[11px] font-medium text-[#a7084b]">{leave.reason}</p>
                            ) : null}
                          </div>
                          {leave.status !== "CANCELLED" ? (
                            <span className="flex shrink-0 gap-1">
                              <button type="button" aria-label="Modifier l’absence" onClick={() => beginEditLeave(leave)} className="rounded-lg p-1.5 text-[#947c89] hover:bg-[#fff0f5]">
                                <Pencil size={13} />
                              </button>
                              <button type="button" aria-label="Supprimer l’absence" onClick={() => void removeLeave(leave.staffId, leave.id)} className="rounded-lg p-1.5 text-[#947c89] hover:bg-rose-50 hover:text-rose-600">
                                <Trash2 size={13} />
                              </button>
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ))
                ) : (
                  <PremiumEmpty>Aucun congé ni absence.</PremiumEmpty>
                )}
              </section>
              <section className="space-y-2.5">
                <h3 className="text-[11px] font-bold uppercase tracking-wide text-[#947c89]">
                  Heures supp. &amp; remplacements
                </h3>
                {historyOvertimes
                  .filter((item) => historyStaffId === "ALL" || item.staffId === historyStaffId)
                  .map((item) => (
                    <div key={item.id} className="rounded-2xl border border-amber-100 bg-amber-50/40 p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-[#401126]">
                            HS · {item.staffName ?? staff.find((s) => s.id === item.staffId)?.displayName ?? "Employée"}
                          </p>
                          <p className="mt-1 text-xs text-[#80596c]">
                            {new Date(item.startAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                            {" → "}
                            {new Date(item.endAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </p>
                          {item.reason ? <p className="mt-1 text-[11px] text-[#947c89]">{item.reason}</p> : null}
                        </div>
                        <span className="flex shrink-0 gap-1">
                          <button type="button" aria-label="Modifier les heures supplémentaires" onClick={() => beginEditOvertime(item)} className="rounded-lg p-1.5 text-[#947c89] hover:bg-white">
                            <Pencil size={13} />
                          </button>
                          <button type="button" aria-label="Supprimer les heures supplémentaires" onClick={() => void removeOvertime(item.id)} className="rounded-lg p-1.5 text-[#947c89] hover:bg-rose-50 hover:text-rose-600">
                            <Trash2 size={13} />
                          </button>
                        </span>
                      </div>
                    </div>
                  ))}
                {historyReplacements
                  .filter((item) => historyStaffId === "ALL" || item.absentStaffId === historyStaffId || item.substituteStaffId === historyStaffId)
                  .map((item) => (
                    <div key={item.id} className="rounded-2xl border border-violet-100 bg-violet-50/40 p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-[#401126]">
                            {item.absentName} → {item.substituteName}
                            {!item.active ? (
                              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                                annulé
                              </span>
                            ) : null}
                          </p>
                          <p className="mt-1 text-xs text-[#80596c]">
                            {new Date(item.startAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                            {" → "}
                            {new Date(item.endAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </p>
                          {item.reason ? <p className="mt-1 text-[11px] text-[#947c89]">{item.reason}</p> : null}
                        </div>
                        {item.active ? (
                          <span className="flex shrink-0 gap-1">
                            <button type="button" aria-label="Modifier le remplacement" onClick={() => beginEditReplacement(item)} className="rounded-lg p-1.5 text-[#947c89] hover:bg-white">
                              <Pencil size={13} />
                            </button>
                            <button type="button" aria-label="Supprimer le remplacement" onClick={() => void removeReplacement(item.id)} className="rounded-lg p-1.5 text-[#947c89] hover:bg-rose-50 hover:text-rose-600">
                              <Trash2 size={13} />
                            </button>
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                {!historyOvertimes.filter((item) => historyStaffId === "ALL" || item.staffId === historyStaffId).length &&
                !historyReplacements.filter((item) => historyStaffId === "ALL" || item.absentStaffId === historyStaffId || item.substituteStaffId === historyStaffId).length ? (
                  <PremiumEmpty>Aucune heure supplémentaire ni remplacement.</PremiumEmpty>
                ) : null}
              </section>
            </div>
          </Card>

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

        </div>
      </div>

      <Drawer
        open={leaveOpen}
        onClose={() => {
          setLeaveOpen(false);
          setEditingLeaveId(null);
        }}
        title={editingLeaveId ? "Modifier l’absence" : "Ajouter une absence"}
        side="right"
      >
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
            <Button type="button" variant="ghost" onClick={() => { setLeaveOpen(false); setEditingLeaveId(null); }}>
              Annuler
            </Button>
            <Button type="button" variant="brand" disabled={!leaveStaff || !leaveStart || !leaveEnd} onClick={addLeave}>
              {editingLeaveId ? "Enregistrer" : "Enregistrer"}
            </Button>
          </div>
        </div>
      </Drawer>

      <Drawer
        open={extraOpen === "overtime"}
        onClose={() => {
          setExtraOpen(null);
          setEditingOtId(null);
        }}
        title={editingOtId ? "Modifier les heures supplémentaires" : "Heures supplémentaires"}
        side="right"
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
            {editingOtId ? "Enregistrer" : "Ajouter"}
          </Button>
        </div>
      </Drawer>

      <Drawer
        open={extraOpen === "replacement"}
        onClose={() => {
          setExtraOpen(null);
          setEditingRepId(null);
        }}
        title={editingRepId ? "Modifier le remplacement" : "Remplacement"}
        side="right"
      >
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
            {editingRepId ? "Enregistrer" : "Ajouter"}
          </Button>
        </div>
      </Drawer>

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

function toDateInput(iso: string) {
  const value = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

function toDatetimeLocal(iso: string) {
  const value = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
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

function StaffIdentity({
  person,
  position,
  color,
}: {
  person: StaffAgendaContext;
  position?: string;
  color: StaffColor;
}) {
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
function DayCellBadge({ color, cell }: { color: StaffColor; cell: DayCell }) {
  if (cell.kind === "work" || cell.kind === "overtime") {
    return <ShiftChip color={color} cell={cell} />;
  }
  if (cell.kind === "leave") {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-600">
        <span className={cn("h-2 w-2 rounded-full", color.bar)} />
        {cell.label}
      </span>
    );
  }
  if (cell.kind === "replaced") {
    return (
      <span className="inline-flex rounded-lg border border-violet-200 bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-700">
        Rempl. {cell.substituteName.split(" ")[0]}
      </span>
    );
  }
  return <OffBadge />;
}
