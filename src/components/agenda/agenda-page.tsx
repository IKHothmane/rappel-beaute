"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import {
  AgendaGrid,
  AgendaMonthGrid,
} from "@/components/agenda/agenda-grid";
import { AgendaChrome } from "@/components/agenda/agenda-toolbar";
import { AgendaWeekBoard } from "@/components/agenda/agenda-week-board";
import { AgendaMobile } from "@/components/agenda/agenda-mobile";
import { AppointmentDetails } from "@/components/agenda/appointment-details";
import { AppointmentForm } from "@/components/agenda/appointment-form";
import { BlockSlotDialog } from "@/components/agenda/block-slot-dialog";
import { AgendaSkeleton } from "@/components/ui/empty-state";
import { Drawer } from "@/components/ui/drawer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import {
  filterAppointmentsForDates,
  getAvailableSlots,
  getMonthGrid,
  getWeekDates,
} from "@/modules/appointments/availability";
import {
  AGENDA_CLOSE_HOUR,
  AGENDA_OPEN_HOUR,
} from "@/modules/appointments/constants";
import {
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
import { createClosureApi, loadPlanningApi } from "@/modules/planning/service";
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
import type { AgendaColumnMode } from "@/types/planning";

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
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockSubmitting, setBlockSubmitting] = useState(false);
  const [closures, setClosures] = useState<OrganizationClosureItem[]>([]);
  const [whatsappConnected, setWhatsappConnected] = useState<boolean | null>(null);
  const [createSeed, setCreateSeed] = useState<Partial<CreateAppointmentInput> | undefined>();
  const [fullscreen, setFullscreen] = useState(false);
  const [services, setServices] = useState<ServiceAgendaOption[]>([]);
  const [formOptions, setFormOptions] = useState<ServiceFormOptions | null>(null);
  const [staffContexts, setStaffContexts] = useState<StaffAgendaContext[]>([]);
  const [resourceContexts, setResourceContexts] = useState<ResourceAgendaContext[]>([]);
  const [staffFilter, setStaffFilter] = useState("ALL");
  const [serviceFilter, setServiceFilter] = useState("ALL");
  const [resourceFilter, setResourceFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [columnMode, setColumnMode] = useState<AgendaColumnMode>("staff");

  const refreshMeta = useCallback(async () => {
    try {
      const [svc, opts, staffCtx, resCtx, plan, wa] = await Promise.all([
        listServicesForAgenda(),
        getServiceFormOptions(),
        listStaffForAgenda(),
        listResourcesForAgenda(),
        loadPlanningApi().catch(() => ({ closures: [] as OrganizationClosureItem[] })),
        getWhatsAppDashboard("pending").catch(() => null),
      ]);
      setServices(svc);
      setFormOptions(opts);
      setStaffContexts(staffCtx);
      setResourceContexts(resCtx);
      setClosures(plan.closures);
      setWhatsappConnected(wa != null);
    } catch {
      toast("Impossible de charger les services.", "error");
    }
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
    let cancelled = false;
    (async () => {
      await Promise.all([refresh(), refreshMeta()]);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh, refreshMeta]);

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
    if (columnMode === "resource") {
      const allRes = formOptions?.resources ?? [];
      if (resourceFilter !== "ALL") {
        const r = allRes.find((x) => x.id === resourceFilter);
        return r ? [{ id: r.id, name: r.name }] : allRes.map((x) => ({ id: x.id, name: x.name }));
      }
      return allRes.map((x) => ({ id: x.id, name: x.name }));
    }
    const allStaff = formOptions?.staff ?? [];
    if (staffFilter !== "ALL") {
      const s = allStaff.find((x) => x.id === staffFilter);
      return s ? [{ id: s.id, name: s.name }] : allStaff.map((x) => ({ id: x.id, name: x.name }));
    }
    return allStaff.map((s) => ({ id: s.id, name: s.name }));
  }, [columnMode, staffFilter, resourceFilter, formOptions]);

  const weekDates = useMemo(() => getWeekDates(date), [date]);
  const monthDates = useMemo(() => getMonthGrid(date), [date]);

  const kpis = useMemo(() => {
    const today = new Date();
    const dayAppts = appointments.filter((a) => sameDay(new Date(a.startAt), today));
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
      confirmed,
      pending,
      cancelled,
      forecast,
      secured,
      occupancy,
      starLabel,
    };
  }, [appointments, formOptions, weekDates]);

  const staffCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const apt of filtered) {
      if (apt.status === "CANCELLED") continue;
      counts[apt.staffId] = (counts[apt.staffId] ?? 0) + 1;
    }
    return counts;
  }, [filtered]);

  const nextSlotHint = useMemo(() => {
    if (!selected) return null;
    const service = services.find((s) => s.id === selected.serviceId);
    const ctx = staffContexts.find((c) => c.id === selected.staffId);
    const slots = getAvailableSlots(appointments, {
      date,
      staffId: selected.staffId,
      resourceId: selected.resourceId,
      durationMinutes: service?.durationMin ?? 60,
      excludeAppointmentId: selected.id,
      staffContext: ctx,
    }).filter((s) => s.available);
    return slots[0]?.time ?? null;
  }, [selected, services, staffContexts, appointments, date]);

  const rangeLabel = useMemo(() => {
    if (view === "day") {
      return date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    }
    if (view === "month") {
      return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    }
    const first = visibleDates[0];
    const last = visibleDates[visibleDates.length - 1];
    return `Du ${first.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} au ${last.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`;
  }, [view, date, visibleDates]);

  const todayChip = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

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
    if (!isXl) setDrawer("detail");
    else setDrawer(null);
  }

  async function handleCreate(data: CreateAppointmentInput) {
    setSubmitting(true);
    const result = await createAppointment(data);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    await refresh();
    setDrawer(null);
    setCreateSeed(undefined);
    toast("Rendez-vous créé.", "success");
  }

  async function handleUpdate(data: CreateAppointmentInput) {
    if (!selectedId) return;
    setSubmitting(true);
    const result = await updateAppointment(selectedId, data);
    setSubmitting(false);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    await refresh();
    setDrawer(isXl ? null : "detail");
    toast("Rendez-vous mis à jour.", "success");
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
    const patch =
      columnMode === "resource" ? { resourceId: columnId } : { staffId: columnId };
    await moveAppointment(date, hour, minute, appointmentId, patch);
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
      ...(columnMode === "resource" ? { resourceId: columnId } : { staffId: columnId }),
    });
  }

  async function handleBlock(input: { startAt: string; endAt: string; reason: string }) {
    setBlockSubmitting(true);
    try {
      await createClosureApi(input);
      const plan = await loadPlanningApi();
      setClosures(plan.closures);
      setBlockOpen(false);
      toast("Créneau bloqué.", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Impossible de bloquer le créneau.", "error");
    } finally {
      setBlockSubmitting(false);
    }
  }

  const showWeekBoard = view === "week" || view === "3days";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={fullscreen ? "fixed inset-0 z-[45] overflow-auto bg-paper p-4 lg:p-6" : undefined}
    >
      <div className="hidden md:block">
        <AgendaChrome
          view={view}
          onViewChange={setView}
          rangeLabel={rangeLabel}
          todayChip={`${todayChip} (en cours)`}
          onPrev={() => shiftDate(-1)}
          onNext={() => shiftDate(1)}
          onToday={() => setDate(new Date())}
          onCreate={() => openCreate()}
          onBlockSlot={() => setBlockOpen(true)}
          onFullscreen={() => setFullscreen((v) => !v)}
          kpis={kpis}
          staffFilter={staffFilter}
          serviceFilter={serviceFilter}
          resourceFilter={resourceFilter}
          statusFilter={statusFilter}
          search={search}
          services={services}
          staffOptions={formOptions?.staff ?? []}
          resourceOptions={formOptions?.resources ?? []}
          staffCounts={staffCounts}
          whatsappConnected={whatsappConnected}
          onStaffFilter={setStaffFilter}
          onServiceFilter={setServiceFilter}
          onResourceFilter={setResourceFilter}
          onStatusFilter={setStatusFilter}
          onSearch={setSearch}
        />
      </div>

      <div className="mb-3 hidden flex-wrap items-center gap-2 text-sm md:flex">
        <span className="text-ink/45">Colonnes jour :</span>
        <button
          type="button"
          onClick={() => setColumnMode("staff")}
          className={`rounded-lg px-3 py-1.5 text-xs ${
            columnMode === "staff" ? "bg-primary-light text-primary" : "bg-white text-ink/60"
          }`}
        >
          Employées
        </button>
        <button
          type="button"
          onClick={() => setColumnMode("resource")}
          className={`rounded-lg px-3 py-1.5 text-xs ${
            columnMode === "resource" ? "bg-primary-light text-primary" : "bg-white text-ink/60"
          }`}
        >
          Cabines
        </button>
        <span className="text-[11px] text-ink/40">(vue Jour uniquement)</span>
        <Link href="/planning/" className="ml-auto text-xs text-ink/50 underline">
          Fermetures · heures supp. · remplacements
        </Link>
      </div>

      {loading ? (
        <AgendaSkeleton />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={`${view}-${date.toISOString().slice(0, 10)}`}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.25 }}
          >
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="lg:col-span-8 2xl:col-span-9">
                {view === "month" ? (
                  <AgendaMonthGrid
                    dates={monthDates}
                    anchor={date}
                    appointments={appointments}
                    onSelectDay={(d) => {
                      setDate(d);
                      setView("day");
                    }}
                  />
                ) : null}

                {showWeekBoard ? (
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
                    columnMode={columnMode}
                    onAppointmentClick={openDetail}
                    onSlotDrop={handleDrop}
                    onEmptySlotClick={handleEmptyDaySlot}
                  />
                ) : null}
              </div>

              <aside className="hidden flex-col gap-4 lg:col-span-4 lg:flex 2xl:col-span-3">
                <div className="rounded-xl bg-white p-5 shadow-soft">
                  {selected ? (
                    <AppointmentDetails
                      appointment={selected}
                      onEdit={() => setDrawer("edit")}
                      onStatusChange={handleStatus}
                      onCancel={() => setConfirmCancel(true)}
                    />
                  ) : (
                    <div className="flex flex-col gap-3 text-sm text-ink/55">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-ink/40">
                        Fiche rendez-vous
                      </p>
                      <p>Sélectionnez un rendez-vous dans la grille pour voir la cliente, le statut et l&apos;encaissement.</p>
                      <button
                        type="button"
                        onClick={() => openCreate()}
                        className="rounded-lg bg-primary py-2.5 font-semibold text-white"
                      >
                        Nouveau rendez-vous
                      </button>
                    </div>
                  )}
                </div>
                <div className="rounded-xl bg-white p-4 shadow-soft">
                  <div className="mb-2 flex items-center gap-2">
                    <Sparkles size={16} className="text-gold" />
                    <h4 className="font-semibold text-ink">Disponibilité</h4>
                  </div>
                  {nextSlotHint && selected ? (
                    <p className="text-sm text-ink/70">
                      Prochain créneau libre pour {selected.staffName.split(" ")[0]} :{" "}
                      <strong>{nextSlotHint}</strong>
                    </p>
                  ) : (
                    <p className="text-xs text-ink/45">
                      Cliquez un créneau vide pour créer un rendez-vous. Les conflits sont revérifiés en base.
                    </p>
                  )}
                </div>
              </aside>
            </div>

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
              onBlockSlot={() => setBlockOpen(true)}
              onStatusChange={(id, status) => void handleStatus(status, id)}
            />
          </motion.div>
        </AnimatePresence>
      )}

      <p className="mt-6 hidden text-[11px] text-ink/40 md:block">
        Données chiffrées selon les normes CNDP · montants en dirhams marocains (MAD TTC).
      </p>

      <Drawer
        open={drawer === "create"}
        onClose={() => {
          setDrawer(null);
          setCreateSeed(undefined);
        }}
        title="Nouveau rendez-vous"
        side="right"
      >
        <AppointmentForm
          key={createSeed?.startAt ?? "new"}
          appointments={appointments}
          services={services}
          formOptions={formOptions}
          staffContexts={staffContexts}
          resourceContexts={resourceContexts}
          initial={createSeed}
          submitting={submitting}
          onSubmit={handleCreate}
          onCancel={() => {
            setDrawer(null);
            setCreateSeed(undefined);
          }}
        />
      </Drawer>

      <Drawer
        open={drawer === "edit" && !!selected}
        onClose={() => setDrawer(isXl ? null : "detail")}
        title="Modifier le rendez-vous"
      >
        {selected ? (
          <AppointmentForm
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
            }}
            submitting={submitting}
            onSubmit={handleUpdate}
            onCancel={() => setDrawer(isXl ? null : "detail")}
          />
        ) : null}
      </Drawer>

      <Drawer
        open={drawer === "detail" && !!selected && !isXl}
        onClose={() => {
          setDrawer(null);
          setSelectedId(null);
        }}
        title="Détail du rendez-vous"
        side="right"
      >
        {selected ? (
          <AppointmentDetails
            appointment={selected}
            onEdit={() => setDrawer("edit")}
            onStatusChange={handleStatus}
            onCancel={() => setConfirmCancel(true)}
          />
        ) : null}
      </Drawer>

      <BlockSlotDialog
        open={blockOpen}
        date={date}
        submitting={blockSubmitting}
        onClose={() => setBlockOpen(false)}
        onConfirm={handleBlock}
      />

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
