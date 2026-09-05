"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AgendaGrid,
  AgendaMonthGrid,
  AgendaWeekStrip,
} from "@/components/agenda/agenda-grid";
import { AgendaHeader, AgendaToolbar } from "@/components/agenda/agenda-toolbar";
import { AgendaMobile } from "@/components/agenda/agenda-mobile";
import { AppointmentDetails } from "@/components/agenda/appointment-details";
import { AppointmentForm } from "@/components/agenda/appointment-form";
import { AgendaSkeleton, EmptyState } from "@/components/ui/empty-state";
import { Drawer } from "@/components/ui/drawer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import {
  filterAppointmentsForDay,
  getMonthGrid,
  getWeekDates,
} from "@/modules/appointments/availability";
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
import type { ServiceAgendaOption, ServiceFormOptions } from "@/types/service";
import type { StaffAgendaContext } from "@/types/staff";
import type { ResourceAgendaContext } from "@/types/resource";
import type {
  AgendaView,
  Appointment,
  AppointmentStatus,
  CreateAppointmentInput,
} from "@/types/appointment";

type DrawerMode = "create" | "detail" | "edit" | null;

export function AgendaPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [view, setView] = useState<AgendaView>("day");
  const [date, setDate] = useState(() => new Date());
  const [drawer, setDrawer] = useState<DrawerMode>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [services, setServices] = useState<ServiceAgendaOption[]>([]);
  const [formOptions, setFormOptions] = useState<ServiceFormOptions | null>(null);
  const [staffContexts, setStaffContexts] = useState<StaffAgendaContext[]>([]);
  const [resourceContexts, setResourceContexts] = useState<ResourceAgendaContext[]>([]);

  const refreshMeta = useCallback(async () => {
    try {
      const [svc, opts, staffCtx, resCtx] = await Promise.all([
        listServicesForAgenda(),
        getServiceFormOptions(),
        listStaffForAgenda(),
        listResourcesForAgenda(),
      ]);
      setServices(svc);
      setFormOptions(opts);
      setStaffContexts(staffCtx);
      setResourceContexts(resCtx);
    } catch {
      toast("Impossible de charger les services.", "error");
    }
  }, [toast]);

  const [staffFilter, setStaffFilter] = useState("ALL");
  const [serviceFilter, setServiceFilter] = useState("ALL");
  const [resourceFilter, setResourceFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");

  const refresh = useCallback(async () => {
    try {
      const data = await listAppointments();
      setAppointments(data);
    } catch {
      toast("Impossible de charger les rendez-vous.", "error");
    }
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

  const selected = appointments.find((a) => a.id === selectedId);

  const filtered = useMemo(() => {
    let list = filterAppointmentsForDay(appointments, date, {
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
          a.serviceName.toLowerCase().includes(q),
      );
    }

    return list;
  }, [appointments, date, staffFilter, serviceFilter, resourceFilter, statusFilter, search]);

  const staffColumns = useMemo(() => {
    const allStaff = formOptions?.staff ?? [];
    if (staffFilter !== "ALL") {
      const s = allStaff.find((x) => x.id === staffFilter);
      return s ? [{ id: s.id, name: s.name }] : allStaff.map((s) => ({ id: s.id, name: s.name }));
    }
    return allStaff.map((s) => ({ id: s.id, name: s.name }));
  }, [staffFilter, formOptions]);

  const weekDates = useMemo(() => getWeekDates(date), [date]);
  const monthDates = useMemo(() => getMonthGrid(date), [date]);

  const appointmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const apt of appointments) {
      const key = apt.startAt.slice(0, 10);
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [appointments]);

  function shiftDate(delta: number) {
    setDate((d) => {
      const next = new Date(d);
      if (view === "month") next.setMonth(next.getMonth() + delta);
      else if (view === "week") next.setDate(next.getDate() + delta * 7);
      else next.setDate(next.getDate() + delta);
      return next;
    });
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
    setDrawer("detail");
    toast("Rendez-vous mis à jour.", "success");
  }

  async function handleStatus(status: AppointmentStatus) {
    if (!selectedId) return;
    await updateAppointmentStatus(selectedId, status);
    await refresh();
    toast("Statut mis à jour.", "success");
  }

  async function handleCancelConfirm() {
    if (!selectedId) return;
    await updateAppointmentStatus(selectedId, "CANCELLED");
    await refresh();
    setConfirmCancel(false);
    setDrawer(null);
    toast("Rendez-vous annulé.", "info");
  }

  async function handleDrop(
    staffId: string,
    hour: number,
    minute: number,
    appointmentId: string,
  ) {
    const apt = appointments.find((a) => a.id === appointmentId);
    if (!apt) return;
    const service = services.find((s) => s.id === apt.serviceId);
    const duration = service?.durationMin ?? 60;
    const start = new Date(date);
    start.setHours(hour, minute, 0, 0);
    const end = new Date(start.getTime() + duration * 60_000);

    const result = await updateAppointment(appointmentId, {
      staffId,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
    });

    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    await refresh();
    toast("Rendez-vous déplacé.", "success");
  }

  const dateLabel = date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <AgendaHeader dateLabel={dateLabel} onCreate={() => setDrawer("create")} />

      <AgendaToolbar
        view={view}
        onViewChange={setView}
        dateLabel={dateLabel}
        onPrev={() => shiftDate(-1)}
        onNext={() => shiftDate(1)}
        onToday={() => setDate(new Date())}
        staffFilter={staffFilter}
        serviceFilter={serviceFilter}
        resourceFilter={resourceFilter}
        statusFilter={statusFilter}
        search={search}
        onStaffFilter={setStaffFilter}
        onServiceFilter={setServiceFilter}
        onResourceFilter={setResourceFilter}
        onStatusFilter={setStatusFilter}
        onSearch={setSearch}
        onCreate={() => setDrawer("create")}
        services={services}
        staffOptions={formOptions?.staff ?? []}
        resourceOptions={formOptions?.resources ?? []}
      />

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
            {view === "week" ? (
              <AgendaWeekStrip
                dates={weekDates}
                selected={date}
                onSelect={setDate}
                appointmentCounts={appointmentCounts}
              />
            ) : null}

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

            {view === "day" ? (
              filtered.length === 0 ? (
                <div className="hidden md:block">
                  <EmptyState
                    title="Journée libre"
                    description="Aucun rendez-vous ne correspond à vos filtres."
                    action={
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => setDrawer("create")}
                      >
                        + Nouveau RDV
                      </button>
                    }
                  />
                </div>
              ) : (
                <AgendaGrid
                  date={date}
                  staff={staffColumns}
                  appointments={filtered}
                  staffContexts={staffContexts}
                  onAppointmentClick={(id) => {
                    setSelectedId(id);
                    setDrawer("detail");
                  }}
                  onSlotDrop={handleDrop}
                />
              )
            ) : null}

            {view !== "month" ? (
              <div className="mt-4 hidden md:block">
                {view === "week" ? (
                  <AgendaGrid
                    date={date}
                    staff={staffColumns}
                    appointments={filtered}
                    staffContexts={staffContexts}
                    onAppointmentClick={(id) => {
                      setSelectedId(id);
                      setDrawer("detail");
                    }}
                    onSlotDrop={handleDrop}
                  />
                ) : null}
              </div>
            ) : null}

            <AgendaMobile
              date={date}
              view={view}
              onViewChange={setView}
              onPrev={() => shiftDate(-1)}
              onNext={() => shiftDate(1)}
              onToday={() => setDate(new Date())}
              staffFilter={staffFilter}
              onStaffFilter={setStaffFilter}
              staffOptions={staffColumns}
              appointments={filtered}
              onAppointmentClick={(id) => {
                setSelectedId(id);
                setDrawer("detail");
              }}
              onCreate={() => setDrawer("create")}
            />
          </motion.div>
        </AnimatePresence>
      )}

      <Drawer
        open={drawer === "create"}
        onClose={() => setDrawer(null)}
        title="Nouveau rendez-vous"
        side="right"
      >
        <AppointmentForm
          appointments={appointments}
          services={services}
          formOptions={formOptions}
          staffContexts={staffContexts}
          resourceContexts={resourceContexts}
          submitting={submitting}
          onSubmit={handleCreate}
          onCancel={() => setDrawer(null)}
        />
      </Drawer>

      <Drawer
        open={drawer === "edit" && !!selected}
        onClose={() => setDrawer("detail")}
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
            onCancel={() => setDrawer("detail")}
          />
        ) : null}
      </Drawer>

      <Drawer
        open={drawer === "detail" && !!selected}
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
