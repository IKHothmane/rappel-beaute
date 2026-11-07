"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AgendaGrid,
  AgendaMonthGrid,
} from "@/components/agenda/agenda-grid";
import { AgendaPremiumLayout } from "@/components/agenda/agenda-premium-layout";
import { AgendaWeekBoard } from "@/components/agenda/agenda-week-board";
import { AgendaMobile } from "@/components/agenda/agenda-mobile";
import { AppointmentDetails } from "@/components/agenda/appointment-details";
import { AppointmentForm } from "@/components/agenda/appointment-form";
import NouveauRendezVousModal from "@/components/agenda/nouveau-rendez-vous-modal";
import { AgendaSkeleton } from "@/components/ui/empty-state";
import { PremiumSidePanel } from "@/components/ui/premium-side-panel";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import {
  filterAppointmentsForDates,
  getMonthGrid,
  getWeekDates,
} from "@/modules/appointments/availability";
import {
  AGENDA_CLOSE_HOUR,
  AGENDA_OPEN_HOUR,
} from "@/modules/appointments/constants";
import {
  applyAppointmentPromo,
  createAppointment,
  listAppointments,
  updateAppointment,
  updateAppointmentStatus,
} from "@/modules/appointments/service";
import {
  getServiceFormOptions,
  listServicesForAgenda,
} from "@/modules/services/service";
import { listStaffForAgenda } from "@/modules/staff/service";
import { listResourcesForAgenda } from "@/modules/resources/service";
import { loadPlanningApi } from "@/modules/planning/service";
import { getWhatsAppDashboard } from "@/modules/whatsapp/service";
import type { ServiceAgendaOption, ServiceFormOptions } from "@/types/service";
import type { StaffAgendaContext } from "@/types/staff";
import type { ResourceAgendaContext } from "@/types/resource";
import type { OrganizationClosureItem } from "@/types/planning";
import type {
  AgendaView,
  Appointment,
  AppointmentStatus,
  CreateAppointmentInput,
} from "@/types/appointment";
type DrawerMode = "create" | "detail" | "edit" | null;

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function useIsXl() {
  const [xl, setXl] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const fn = () => setXl(mq.matches);
    fn();
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return xl;
}

function visibleDatesFor(view: AgendaView, date: Date) {
  if (view === "week") return getWeekDates(date);
  if (view === "3days") {
    return [0, 1, 2].map((i) => {
      const d = new Date(date);
      d.setDate(date.getDate() + i);
      return d;
    });
  }
  return [date];
}

export function AgendaPage() {
  const { toast } = useToast();
  const isXl = useIsXl();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [view, setView] = useState<AgendaView>("week");
  const [date, setDate] = useState(() => new Date());
  const [drawer, setDrawer] = useState<DrawerMode>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [closures, setClosures] = useState<OrganizationClosureItem[]>([]);
  const [whatsappConnected, setWhatsappConnected] = useState<boolean | null>(null);
  const [createSeed, setCreateSeed] = useState<Partial<CreateAppointmentInput> | undefined>();
  const [services, setServices] = useState<ServiceAgendaOption[]>([]);
  const [formOptions, setFormOptions] = useState<ServiceFormOptions | null>(null);
  const [staffContexts, setStaffContexts] = useState<StaffAgendaContext[]>([]);
  const [resourceContexts, setResourceContexts] = useState<ResourceAgendaContext[]>([]);
  const [staffFilter, setStaffFilter] = useState("ALL");
  const [serviceFilter, setServiceFilter] = useState("ALL");
  const [resourceFilter, setResourceFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");

  const refreshMeta = useCallback(async () => {
    const servicesP = listServicesForAgenda().catch(() => []);
    const optionsP = getServiceFormOptions().catch(() => null);
    const staffP = listStaffForAgenda().catch(() => []);
    const resourcesP = listResourcesForAgenda().catch(() => []);
    try {
      const [svc, opts, staffCtx, resCtx] = await Promise.all([
        servicesP,
        optionsP,
        staffP,
        resourcesP,
      ]);
      setServices(svc);
      setFormOptions(opts);
      setStaffContexts(staffCtx);
      setResourceContexts(resCtx);
    } catch {
      toast("Impossible de charger les services.", "error");
    }

    const [plan, wa] = await Promise.all([
      loadPlanningApi().catch(() => ({ closures: [] as OrganizationClosureItem[] })),
      getWhatsAppDashboard("pending").catch(() => null),
    ]);
    setClosures(plan.closures);
    setWhatsappConnected(wa != null);
  }, [toast]);

  const refresh = useCallback(async () => {
    try {
      const data = await listAppointments();
      setAppointments(data);
    } catch {
      toast("Impossible de charger les rendez-vous.", "error");
    }
  }, [toast]);

  useEffect(() => {
    if (window.innerWidth < 768) setView("day");
  }, []);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const google = sp.get("google");
    if (!google) return;
    const reasons: Record<string, string> = {
      "not-configured": "Google Calendar n'est pas configuré (GOOGLE_CLIENT_ID).",
      forbidden: "Seule la gérante peut connecter Google Calendar.",
      denied: "Autorisation Google refusée.",
      state: "Session Google expirée. Réessayez.",
      session: "Reconnectez-vous puis reliez Google Calendar.",
      refresh: "Google n’a pas renvoyé de jeton. Réessayez « Connecter Google ».",
      oauth: "Connexion Google impossible.",
    };
    if (google === "connected") {
      toast("Compte Google lié à cet institut. Choisissez son calendrier.", "success");
    } else {
      toast(reasons[sp.get("reason") ?? ""] ?? "Connexion Google impossible.", "error");
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("google");
    url.searchParams.delete("reason");
    url.searchParams.delete("pick");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, [toast]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.all([refresh(), refreshMeta()]);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh, refreshMeta]);

  // Recharge périodiquement : le serveur termine auto les RDV dont endAt est dépassé.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "hidden") return;
      void refresh();
    };
    const id = window.setInterval(tick, 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  const selected = appointments.find((a) => a.id === selectedId);
  const visibleDates = useMemo(() => visibleDatesFor(view, date), [view, date]);

  const filtered = useMemo(() => {
    const dates = view === "month" ? [date] : visibleDates;
    let list = filterAppointmentsForDates(appointments, dates, {
      staffId: staffFilter === "ALL" ? undefined : staffFilter,
      serviceId: serviceFilter === "ALL" ? undefined : serviceFilter,
      resourceId: resourceFilter === "ALL" ? undefined : resourceFilter,
      status: statusFilter,
    });
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.customerName.toLowerCase().includes(q) ||
          a.serviceName.toLowerCase().includes(q) ||
          a.staffName.toLowerCase().includes(q),
      );
    }
    return list;
  }, [appointments, date, visibleDates, view, staffFilter, serviceFilter, resourceFilter, statusFilter, search]);

  const gridColumns = useMemo(() => {
    const allStaff = formOptions?.staff ?? [];
    if (staffFilter !== "ALL") {
      const s = allStaff.find((x) => x.id === staffFilter);
      return s ? [{ id: s.id, name: s.name }] : allStaff.map((x) => ({ id: x.id, name: x.name }));
    }
    const cols = allStaff.map((s) => ({ id: s.id, name: s.name }));
    if (appointments.some((a) => !a.staffId && a.status !== "CANCELLED" && a.status !== "NO_SHOW")) {
      cols.push({ id: "", name: "Sans employée" });
    }
    return cols;
  }, [staffFilter, formOptions, appointments]);

  const weekDates = useMemo(() => getWeekDates(date), [date]);
  const monthDates = useMemo(() => getMonthGrid(date), [date]);

  const kpis = useMemo(() => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dayAppts = appointments.filter((a) => sameDay(new Date(a.startAt), today));
    const yesterdayAppts = appointments.filter((a) => sameDay(new Date(a.startAt), yesterday));
    const confirmed = dayAppts.filter((a) =>
      ["CONFIRMED", "ARRIVED", "IN_PROGRESS", "COMPLETED"].includes(a.status),
    ).length;
    const pending = dayAppts.filter((a) => a.status === "PENDING").length;
    const cancelled = dayAppts.filter((a) => a.status === "CANCELLED" || a.status === "NO_SHOW").length;
    const active = dayAppts.filter((a) => a.status !== "CANCELLED" && a.status !== "NO_SHOW");
    const forecast = active.reduce((s, a) => s + a.price, 0);
    const secured = active
      .filter((a) => ["CONFIRMED", "ARRIVED", "IN_PROGRESS", "COMPLETED"].includes(a.status))
      .reduce((s, a) => s + a.price, 0);
    const bookedMin = active.reduce((s, a) => {
      return s + Math.max(0, (new Date(a.endAt).getTime() - new Date(a.startAt).getTime()) / 60_000);
    }, 0);
    const staffN = Math.max(1, formOptions?.staff.length ?? 1);
    const capacity = staffN * (AGENDA_CLOSE_HOUR - AGENDA_OPEN_HOUR) * 60;
    const occupancy = dayAppts.length === 0 ? null : Math.min(100, Math.round((bookedMin / capacity) * 100));

    const yActive = yesterdayAppts.filter((a) => a.status !== "CANCELLED" && a.status !== "NO_SHOW");
    const yBookedMin = yActive.reduce((s, a) => {
      return s + Math.max(0, (new Date(a.endAt).getTime() - new Date(a.startAt).getTime()) / 60_000);
    }, 0);
    const yOccupancy =
      yesterdayAppts.length === 0 ? null : Math.min(100, Math.round((yBookedMin / capacity) * 100));

    const todayDeltaPct =
      yesterdayAppts.length === 0
        ? dayAppts.length > 0
          ? 100
          : null
        : Math.round(((dayAppts.length - yesterdayAppts.length) / yesterdayAppts.length) * 100);
    const confirmedPct =
      dayAppts.length === 0 ? null : Math.round((confirmed / dayAppts.length) * 100);
    const occupancyDelta =
      occupancy == null || yOccupancy == null ? null : occupancy - yOccupancy;

    const clientesIds = new Set(active.map((a) => a.customerId).filter(Boolean));
    const clientesToday = clientesIds.size;
    let newClientesToday = 0;
    for (const id of clientesIds) {
      const earlier = appointments.some(
        (a) =>
          a.customerId === id &&
          a.status !== "CANCELLED" &&
          a.status !== "NO_SHOW" &&
          new Date(a.startAt) < new Date(today.getFullYear(), today.getMonth(), today.getDate()),
      );
      if (!earlier) newClientesToday += 1;
    }

    const weekCounts = weekDates.map((d) =>
      appointments.filter((a) => sameDay(new Date(a.startAt), d) && a.status !== "CANCELLED").length,
    );
    const max = Math.max(0, ...weekCounts);
    const starIdx = weekCounts.findIndex((c) => c === max && max > 0);
    const starLabel =
      starIdx >= 0
        ? `Pic : ${weekDates[starIdx].toLocaleDateString("fr-FR", { weekday: "short" })} (${max} RDV)`
        : null;

    return {
      todayCount: dayAppts.length,
      todayDeltaPct,
      confirmed,
      confirmedPct,
      pending,
      cancelled,
      clientesToday,
      newClientesToday,
      forecast,
      forecastCount: active.length,
      secured,
      occupancy,
      occupancyDelta,
      starLabel,
    };
  }, [appointments, formOptions, weekDates]);

  const weekNumber = useMemo(() => {
    if (view !== "week" && view !== "3days") return null;
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }, [date, view]);

  const rangeLabel = useMemo(() => {
    const cap = (value: string) => value.replace(/^\p{L}/u, (letter) => letter.toUpperCase());
    if (view === "day") {
      return cap(
        date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
      );
    }
    if (view === "month") {
      return cap(date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }));
    }
    const first = visibleDates[0];
    const last = visibleDates[visibleDates.length - 1];
    const from = first.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
    const to = last.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    return view === "week" ? `Semaine du ${from} au ${to}` : `Du ${from} au ${to}`;
  }, [view, date, visibleDates]);

  function shiftDate(delta: number) {
    setDate((d) => {
      const next = new Date(d);
      if (view === "month") next.setMonth(next.getMonth() + delta);
      else if (view === "week") next.setDate(next.getDate() + delta * 7);
      else if (view === "3days") next.setDate(next.getDate() + delta * 3);
      else next.setDate(next.getDate() + delta);
      return next;
    });
  }

  function openCreate(seed?: Partial<CreateAppointmentInput>) {
    setCreateSeed(seed);
    setDrawer("create");
  }

  function openDetail(id: string) {
    setSelectedId(id);
    setDrawer("detail");
  }

  async function handleCreate(
    data: CreateAppointmentInput,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const code = data.promotionCode?.trim();
    const { promotionCode: _code, ...payload } = data;
    setSubmitting(true);
    const result = await createAppointment(payload);
    if (!result.ok) {
      setSubmitting(false);
      return { ok: false, error: result.error };
    }
    if (code) {
      const promo = await applyAppointmentPromo(result.appointment.id, code);
      setSubmitting(false);
      await refresh();
      setDrawer(null);
      setCreateSeed(undefined);
      if (!promo.ok) {
        toast(`Rendez-vous créé. ${promo.error}`, "error");
        return { ok: true };
      }
      toast("Rendez-vous créé. Code promo appliqué sur une prestation.", "success");
      return { ok: true };
    }
    setSubmitting(false);
    await refresh();
    setDrawer(null);
    setCreateSeed(undefined);
    toast("Rendez-vous créé.", "success");
    return { ok: true };
  }

  async function handleUpdate(data: CreateAppointmentInput) {
    if (!selectedId) return;
    const code = data.promotionCode?.trim();
    const { promotionCode: _code, ...payload } = data;
    setSubmitting(true);
    const result = await updateAppointment(selectedId, payload);
    if (!result.ok) {
      setSubmitting(false);
      toast(result.error, "error");
      return;
    }
    if (code && !selected?.promotionId) {
      const promo = await applyAppointmentPromo(selectedId, code);
      setSubmitting(false);
      await refresh();
      setDrawer(isXl ? null : "detail");
      if (!promo.ok) {
        toast(`Rendez-vous mis à jour. ${promo.error}`, "error");
        return;
      }
      toast("Rendez-vous mis à jour. Code promo appliqué sur une prestation.", "success");
      return;
    }
    setSubmitting(false);
    await refresh();
    setDrawer(isXl ? null : "detail");
    toast("Rendez-vous mis à jour.", "success");
  }

  async function applyPromo(code: string): Promise<{ ok: true } | { ok: false; error: string }> {
    if (!selectedId) return { ok: false, error: "Rendez-vous introuvable." };
    const result = await applyAppointmentPromo(selectedId, code);
    if (!result.ok) return result;
    await refresh();
    toast("Code promo appliqué.", "success");
    return { ok: true };
  }

  async function patchSelected(
    patch: Partial<CreateAppointmentInput>,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    if (!selectedId) return { ok: false, error: "Rendez-vous introuvable." };
    const result = await updateAppointment(selectedId, patch);
    if (!result.ok) {
      toast(result.error, "error");
      return result;
    }
    await refresh();
    toast("Rendez-vous mis à jour.", "success");
    return { ok: true };
  }

  async function handleStatus(status: AppointmentStatus, id?: string) {
    const target = id ?? selectedId;
    if (!target) return;
    await updateAppointmentStatus(target, status);
    await refresh();
    toast("Statut mis à jour.", "success");
  }

  async function handleCancelConfirm() {
    if (!selectedId) return;
    await updateAppointmentStatus(selectedId, "CANCELLED");
    await refresh();
    setConfirmCancel(false);
    setDrawer(null);
    setSelectedId(null);
    toast("Rendez-vous annulé.", "info");
  }

  async function moveAppointment(when: Date, hour: number, minute: number, appointmentId: string, extra?: Partial<CreateAppointmentInput>) {
    const apt = appointments.find((a) => a.id === appointmentId);
    if (!apt) return;
    const service = services.find((s) => s.id === apt.serviceId);
    const duration = service?.durationMin ?? 60;
    const start = new Date(when);
    start.setHours(hour, minute, 0, 0);
    const end = new Date(start.getTime() + duration * 60_000);
    const result = await updateAppointment(appointmentId, {
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      ...extra,
    });
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    await refresh();
    toast("Rendez-vous déplacé.", "success");
  }

  async function handleDrop(columnId: string, hour: number, minute: number, appointmentId: string) {
    await moveAppointment(date, hour, minute, appointmentId, { staffId: columnId });
  }

  async function handleWeekDrop(day: Date, hour: number, minute: number, appointmentId: string) {
    await moveAppointment(day, hour, minute, appointmentId);
  }

  function handleEmptyWeekSlot(day: Date, hour: number, minute: number) {
    const start = new Date(day);
    start.setHours(hour, minute, 0, 0);
    const end = new Date(start.getTime() + 60 * 60_000);
    setDate(day);
    openCreate({ startAt: start.toISOString(), endAt: end.toISOString() });
  }

  function handleEmptyDaySlot(columnId: string, hour: number, minute: number) {
    const start = new Date(date);
    start.setHours(hour, minute, 0, 0);
    const end = new Date(start.getTime() + 60 * 60_000);
    openCreate({
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      staffId: columnId,
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="min-w-0"
    >
      <div className="hidden md:block">
        <AgendaPremiumLayout
          date={date}
          view={view}
          appointments={appointments}
          todayCount={kpis.todayCount}
          todayDeltaPct={kpis.todayDeltaPct}
          confirmed={kpis.confirmed}
          confirmedPct={kpis.confirmedPct}
          pending={kpis.pending}
          clientesToday={kpis.clientesToday}
          newClientesToday={kpis.newClientesToday}
          forecast={kpis.forecast}
          forecastCount={kpis.forecastCount}
          occupancy={kpis.occupancy}
          occupancyDelta={kpis.occupancyDelta}
          rangeLabel={rangeLabel}
          weekNumber={weekNumber}
          staff={(formOptions?.staff ?? []).map((s) => ({
            id: s.id,
            name: s.name,
          }))}
          services={services.map((s) => ({
            id: s.id,
            name: s.name,
          }))}
          resources={(formOptions?.resources ?? []).map((r) => ({
            id: r.id,
            name: r.name,
          }))}
          staffFilter={staffFilter}
          serviceFilter={serviceFilter}
          resourceFilter={resourceFilter}
          statusFilter={statusFilter}
          onStaffFilter={setStaffFilter}
          onServiceFilter={setServiceFilter}
          onResourceFilter={setResourceFilter}
          onStatusFilter={setStatusFilter}
          onViewChange={setView}
          onDateChange={setDate}
          onPrev={() => shiftDate(-1)}
          onNext={() => shiftDate(1)}
          onToday={() => setDate(new Date())}
          onCreate={() => openCreate()}
          onAppointmentClick={openDetail}
        >
          {loading ? (
            <AgendaSkeleton />
          ) : (
            <>
              {view === "month" ? (
                <AgendaMonthGrid
                  dates={monthDates}
                  anchor={date}
                  appointments={filtered}
                  onSelectDay={(d) => {
                    setDate(d);
                    setView("day");
                  }}
                />
              ) : null}

              {view === "week" || view === "3days" ? (
                <AgendaWeekBoard
                  dates={visibleDates}
                  selected={date}
                  selectedAppointmentId={selectedId}
                  appointments={filtered}
                  closures={closures}
                  onSelectDay={setDate}
                  onAppointmentClick={openDetail}
                  onEmptySlotClick={handleEmptyWeekSlot}
                  onDrop={handleWeekDrop}
                />
              ) : null}

              {view === "day" ? (
                <AgendaGrid
                  date={date}
                  staff={gridColumns}
                  appointments={filtered}
                  staffContexts={staffContexts}
                  columnMode="staff"
                  onAppointmentClick={openDetail}
                  onSlotDrop={handleDrop}
                  onEmptySlotClick={handleEmptyDaySlot}
                />
              ) : null}
            </>
          )}
        </AgendaPremiumLayout>
      </div>

      <div className="md:hidden">
        {loading ? (
          <AgendaSkeleton />
        ) : (
          <AgendaMobile
            date={date}
            view={view}
            onViewChange={setView}
            onSelectDate={setDate}
            staffFilter={staffFilter}
            onStaffFilter={setStaffFilter}
            staffOptions={(formOptions?.staff ?? []).map((s) => ({
              id: s.id,
              name: s.name,
              role: s.role,
            }))}
            staffContexts={staffContexts}
            appointments={filtered}
            allAppointments={appointments}
            closures={closures}
            kpis={kpis}
            whatsappConnected={whatsappConnected}
            onAppointmentClick={openDetail}
            onCreate={(seed) => openCreate(seed)}
            onStatusChange={(id, status) => void handleStatus(status, id)}
          />
        )}
      </div>

      <NouveauRendezVousModal
        key={createSeed?.startAt ?? "new"}
        open={drawer === "create"}
        onClose={() => {
          setDrawer(null);
          setCreateSeed(undefined);
        }}
        appointments={appointments}
        services={services}
        formOptions={formOptions}
        staffContexts={staffContexts}
        resourceContexts={resourceContexts}
        closures={closures}
        initial={createSeed}
        submitting={submitting}
        onCreate={handleCreate}
      />

      <PremiumSidePanel
        open={drawer === "edit" && !!selected}
        onClose={() => setDrawer(isXl ? null : "detail")}
        title="Modifier le rendez-vous"
        description="Mettez à jour le créneau, la prestation ou l’équipe."
        size="md"
      >
        {selected ? (
          <AppointmentForm
            key={selected.id}
            appointments={appointments}
            services={services}
            formOptions={formOptions}
            staffContexts={staffContexts}
            resourceContexts={resourceContexts}
            initial={{
              id: selected.id,
              customerId: selected.customerId,
              serviceId: selected.serviceId,
              staffId: selected.staffId,
              resourceId: selected.resourceId,
              startAt: selected.startAt,
              endAt: selected.endAt,
              price: selected.price,
              deposit: selected.deposit,
              notes: selected.notes,
              promotionId: selected.promotionId,
              promotionCode: selected.promotionCode ?? undefined,
            }}
            submitting={submitting}
            onSubmit={handleUpdate}
            onCancel={() => setDrawer(isXl ? null : "detail")}
          />
        ) : null}
      </PremiumSidePanel>

      <PremiumSidePanel
        open={drawer === "detail" && !!selected}
        onClose={() => {
          setDrawer(null);
          setSelectedId(null);
        }}
        title="Détail du rendez-vous"
        description="Suivez le statut, terminez la prestation ou encaissez."
        size="md"
      >
        {selected ? (
          <AppointmentDetails
            appointment={selected}
            services={services}
            staff={(formOptions?.staff ?? []).map((member) => ({
              id: member.id,
              name: member.name,
            }))}
            onEdit={() => setDrawer("edit")}
            onStatusChange={handleStatus}
            onCancel={() => setConfirmCancel(true)}
            onChange={patchSelected}
            onApplyPromo={applyPromo}
          />
        ) : null}
      </PremiumSidePanel>

      <ConfirmDialog
        open={confirmCancel}
        title="Annuler ce rendez-vous ?"
        description="Le créneau sera libéré. Cette action est traçable dans l'audit."
        confirmLabel="Annuler le RDV"
        destructive
        onConfirm={handleCancelConfirm}
        onCancel={() => setConfirmCancel(false)}
      />
    </motion.div>
  );
}
