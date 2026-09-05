"use client";

import { useEffect, useMemo, useState } from "react";
import { AvailabilitySlots } from "@/components/agenda/availability-slots";
import { Button } from "@/components/ui/button";
import { FieldGroup, Label, Select, Textarea } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/empty-state";
import { listCustomers } from "@/modules/customers/service";
import { getAvailableSlots, isStaffAvailableOnDate, isResourceAvailableOnDate } from "@/modules/appointments/availability";
import type { ServiceAgendaOption } from "@/types/service";
import type { ServiceFormOptions } from "@/types/service";
import type { StaffAgendaContext } from "@/types/staff";
import type { ResourceAgendaContext } from "@/types/resource";
import { RESOURCE_TYPE_LABEL } from "@/types/resource";
import type { CustomerListItem } from "@/types/customer";
import type { Appointment, CreateAppointmentInput } from "@/types/appointment";

function todayIsoLocal(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Casablanca" });
}

type AppointmentFormProps = {
  appointments: Appointment[];
  services: ServiceAgendaOption[];
  formOptions: ServiceFormOptions | null;
  staffContexts: StaffAgendaContext[];
  resourceContexts: ResourceAgendaContext[];
  initial?: Partial<CreateAppointmentInput & { id?: string }>;
  submitting?: boolean;
  onSubmit: (data: CreateAppointmentInput) => void;
  onCancel: () => void;
};

export function AppointmentForm({
  appointments,
  services,
  formOptions,
  staffContexts,
  resourceContexts,
  initial,
  submitting,
  onSubmit,
  onCancel,
}: AppointmentFormProps) {
  const [customerId, setCustomerId] = useState(initial?.customerId ?? "");
  const [serviceId, setServiceId] = useState(initial?.serviceId ?? "");
  const [staffId, setStaffId] = useState(initial?.staffId ?? "");
  const [resourceId, setResourceId] = useState(initial?.resourceId ?? "");
  const [date, setDate] = useState(() => {
    if (initial?.startAt) return initial.startAt.slice(0, 10);
    return todayIsoLocal();
  });
  const [time, setTime] = useState(() => {
    if (initial?.startAt) {
      const d = new Date(initial.startAt);
      return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    }
    return "";
  });
  const [price, setPrice] = useState(initial?.price?.toString() ?? "");
  const [deposit, setDeposit] = useState(initial?.deposit?.toString() ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await listCustomers({ limit: 200 });
        if (!cancelled) setCustomers(res.data);
      } catch {
        if (!cancelled) setCustomers([]);
      } finally {
        if (!cancelled) setCustomersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const service = services.find((s) => s.id === serviceId);

  const staffContext = staffContexts.find((s) => s.id === staffId);
  const resourceContext = resourceContexts.find((r) => r.id === resourceId);

  const allowedStaff = useMemo(() => {
    if (!formOptions) return [];
    let list = formOptions.staff;
    if (service?.staffIds.length) {
      list = list.filter((s) => service.staffIds.includes(s.id));
    }
    if (date) {
      const [y, m, d] = date.split("-").map(Number);
      const day = new Date(y, m - 1, d);
      list = list.filter((s) => {
        const ctx = staffContexts.find((c) => c.id === s.id);
        return ctx ? isStaffAvailableOnDate(ctx, day) : true;
      });
    }
    return list;
  }, [formOptions, service, date, staffContexts]);

  const allowedResources = useMemo(() => {
    if (!formOptions) return [];
    let list = formOptions.resources;
    if (service?.resourceIds.length) {
      list = list.filter((r) => service.resourceIds.includes(r.id));
    }
    if (date) {
      const [y, m, d] = date.split("-").map(Number);
      const day = new Date(y, m - 1, d);
      list = list.filter((r) => {
        const ctx = resourceContexts.find((c) => c.id === r.id);
        return ctx ? isResourceAvailableOnDate(ctx, day) : true;
      });
    }
    return list;
  }, [formOptions, service, date, resourceContexts]);

  useEffect(() => {
    if (service && !initial?.price) {
      setPrice(String(service.price));
      if (service.deposit != null) setDeposit(String(service.deposit));
    }
  }, [service, initial?.price]);

  useEffect(() => {
    if (staffId && !allowedStaff.some((s) => s.id === staffId)) {
      setStaffId(allowedStaff[0]?.id ?? "");
      setTime("");
    }
  }, [allowedStaff, staffId]);

  useEffect(() => {
    if (resourceId && !allowedResources.some((r) => r.id === resourceId)) {
      setResourceId("");
    }
  }, [allowedResources, resourceId]);

  const slots = useMemo(() => {
    if (!staffId || !serviceId || !date) return [];
    const [y, m, d] = date.split("-").map(Number);
    const day = new Date(y, m - 1, d);
    return getAvailableSlots(appointments, {
      date: day,
      staffId,
      resourceId: resourceId || undefined,
      durationMinutes: service?.durationMin ?? 60,
      excludeAppointmentId: initial?.id,
      staffContext,
      resourceContext,
    });
  }, [appointments, staffId, serviceId, resourceId, date, service, initial?.id, staffContext, resourceContext]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId || !serviceId || !staffId || !date || !time || !price) return;
    if (service?.resourceIds.length && !resourceId) return;

    const [h, min] = time.split(":").map(Number);
    const [y, mo, d] = date.split("-").map(Number);
    const start = new Date(y, mo - 1, d, h, min, 0);
    const end = new Date(start.getTime() + (service?.durationMin ?? 60) * 60_000);

    onSubmit({
      customerId,
      serviceId,
      staffId,
      resourceId: resourceId || undefined,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      price: Number(price),
      deposit: deposit ? Number(deposit) : undefined,
      notes: notes || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FieldGroup>
        <Label>Cliente</Label>
        <Select
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          required
          disabled={customersLoading}
        >
          <option value="">
            {customersLoading ? "Chargement des clientes…" : "Choisir une cliente…"}
          </option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.firstName} {c.lastName}
            </option>
          ))}
        </Select>
        {!customersLoading && customers.length === 0 ? (
          <p className="mt-1 text-xs text-amber-700">Aucune cliente en base pour cet institut.</p>
        ) : null}
      </FieldGroup>

      <FieldGroup>
        <Label>Service</Label>
        <Select
          value={serviceId}
          onChange={(e) => {
            setServiceId(e.target.value);
            setStaffId("");
            setResourceId("");
            setTime("");
          }}
          required
        >
          <option value="">Choisir un service</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {s.durationMin} min · {s.price} MAD
            </option>
          ))}
        </Select>
      </FieldGroup>

      <FieldGroup>
        <Label>Employée</Label>
        <Select
          value={staffId}
          onChange={(e) => {
            setStaffId(e.target.value);
            setTime("");
          }}
          required
          disabled={!serviceId}
        >
          <option value="">
            {serviceId ? "Choisir une employée" : "Sélectionnez d'abord un service"}
          </option>
          {allowedStaff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        {service && service.staffIds.length > 0 && allowedStaff.length === 0 ? (
          <p className="mt-1 text-xs text-amber-700">Aucune employée autorisée pour ce service.</p>
        ) : null}
      </FieldGroup>

      <FieldGroup>
        <Label>Ressource / cabine</Label>
        <Select
          value={resourceId}
          onChange={(e) => setResourceId(e.target.value)}
          disabled={!serviceId}
          required={Boolean(service?.resourceIds.length)}
        >
          <option value="">
            {service?.resourceIds.length ? "Choisir une ressource" : "Sans ressource"}
          </option>
          {allowedResources.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} ({RESOURCE_TYPE_LABEL[r.type as keyof typeof RESOURCE_TYPE_LABEL] ?? r.type})
            </option>
          ))}
        </Select>
        {service && service.resourceIds.length > 0 && allowedResources.length === 0 ? (
          <p className="mt-1 text-xs text-amber-700">
            Aucune ressource disponible pour ce service à cette date.
          </p>
        ) : null}
      </FieldGroup>

      <FieldGroup>
        <Label htmlFor="apt-date">Date</Label>
        <Input
          id="apt-date"
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setTime("");
          }}
          required
        />
      </FieldGroup>

      {staffId && serviceId && date ? (
        <FieldGroup>
          <Label>Heure disponible</Label>
          <AvailabilitySlots
            slots={slots}
            value={time}
            onSelect={setTime}
            loading={submitting}
          />
        </FieldGroup>
      ) : (
        <Skeleton className="h-24 w-full" />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldGroup>
          <Label>Prix (MAD)</Label>
          <Input
            type="number"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
          {service ? (
            <p className="mt-1 text-xs text-ink/45">
              Prix catalogue : {service.price} MAD — conservé sur le RDV même si le tarif change.
            </p>
          ) : null}
        </FieldGroup>
        <FieldGroup>
          <Label>Acompte (MAD)</Label>
          <Input
            type="number"
            min={0}
            value={deposit}
            onChange={(e) => setDeposit(e.target.value)}
          />
        </FieldGroup>
      </div>

      <FieldGroup>
        <Label>Notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Allergie, préférences…" />
      </FieldGroup>

      <div className="flex flex-col gap-2 border-t border-line pt-4 sm:flex-row">
        <Button type="button" variant="ghost" className="w-full sm:flex-1" onClick={onCancel}>
          Annuler
        </Button>
        <Button
          type="submit"
          variant="primary"
          className="w-full sm:flex-1"
          disabled={submitting || !time}
        >
          {submitting ? "Création…" : initial?.id ? "Enregistrer" : "Créer le RDV"}
        </Button>
      </div>
    </form>
  );
}
