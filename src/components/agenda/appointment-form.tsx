"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AvailabilitySlots } from "@/components/agenda/availability-slots";
import { Button } from "@/components/ui/button";
import { FieldGroup, Label, Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { createCustomer, listCustomers } from "@/modules/customers/service";
import { getAvailableSlots, isStaffAvailableOnDate, isResourceAvailableOnDate } from "@/modules/appointments/availability";
import { limitPhoneDigits, moroccoPhoneSearchVariants } from "@/lib/validation/customer";
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
  const [customerMode, setCustomerMode] = useState<"search" | "new">("search");
  const [query, setQuery] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const searchRef = useRef<HTMLDivElement>(null);

  const [serviceId, setServiceId] = useState(initial?.serviceId ?? "");
  const [extraIds, setExtraIds] = useState<string[]>([]);
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
  const [promoCode, setPromoCode] = useState("");
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [creating, setCreating] = useState(false);

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

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!searchRef.current?.contains(e.target as Node)) setListOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const selectedCustomer = customers.find((c) => c.id === customerId);
  const service = services.find((s) => s.id === serviceId);
  const extraServices = extraIds
    .map((id) => services.find((s) => s.id === id))
    .filter((s): s is ServiceAgendaOption => Boolean(s));
  const totalDuration = (service?.durationMin ?? 60) + extraServices.reduce((n, s) => n + s.durationMin, 0);
  const catalogTotal = (service?.price ?? 0) + extraServices.reduce((n, s) => n + s.price, 0);

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

  const filteredCustomers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers.slice(0, 12);
    const phoneVars = moroccoPhoneSearchVariants(q).map((v) => v.toLowerCase());
    return customers
      .filter((c) => {
        const name = `${c.firstName} ${c.lastName}`.toLowerCase();
        if (name.includes(q)) return true;
        const stored = moroccoPhoneSearchVariants(c.phone ?? "");
        return stored.some((s) => phoneVars.some((v) => s.includes(v) || v.includes(s)));
      })
      .slice(0, 12);
  }, [customers, query]);

  useEffect(() => {
    if (service && !initial?.price) setPrice(String(catalogTotal));
  }, [service, extraIds, catalogTotal, initial?.price]);

  const slots = useMemo(() => {
    if (!serviceId || !date) return [];
    const [y, m, d] = date.split("-").map(Number);
    const day = new Date(y, m - 1, d);
    const slotStaff = staffId || allowedStaff[0]?.id || "";
    const ctx = staffContexts.find((s) => s.id === slotStaff);
    return getAvailableSlots(appointments, {
      date: day,
      staffId: slotStaff,
      resourceId: resourceId || undefined,
      durationMinutes: totalDuration,
      excludeAppointmentId: initial?.id,
      staffContext: ctx,
      resourceContext,
    });
  }, [
    appointments,
    staffId,
    allowedStaff,
    serviceId,
    resourceId,
    date,
    totalDuration,
    initial?.id,
    staffContexts,
    resourceContext,
  ]);

  async function resolveCustomerId(): Promise<string | null> {
    if (customerId) return customerId;
    if (customerMode === "new") {
      const full = newName.trim();
      const phone = limitPhoneDigits(newPhone);
      if (!full || phone.length < 8) return null;
      const parts = full.split(/\s+/);
      const firstName = parts[0] ?? full;
      const lastName = parts.slice(1).join(" ") || "—";
      const created = await createCustomer({ firstName, lastName, phone });
      return created.ok ? created.customer.id : null;
    }
    const created = await createCustomer({
      firstName: "Cliente",
      lastName: "de passage",
      phone: `06${Date.now().toString().slice(-8)}`,
    });
    return created.ok ? created.customer.id : null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!serviceId || !date || !time || !price) return;
    setCreating(true);
    const resolvedCustomer = await resolveCustomerId();
    if (!resolvedCustomer) {
      setCreating(false);
      return;
    }
    const resolvedStaff = staffId || allowedStaff[0]?.id;
    if (!resolvedStaff) {
      setCreating(false);
      return;
    }

    const [h, min] = time.split(":").map(Number);
    const [y, mo, d] = date.split("-").map(Number);
    const start = new Date(y, mo - 1, d, h, min, 0);
    const end = new Date(start.getTime() + totalDuration * 60_000);
    const extraLabel = extraServices.map((s) => s.name).join(" + ");

    onSubmit({
      customerId: resolvedCustomer,
      serviceId,
      staffId: resolvedStaff,
      resourceId: resourceId || undefined,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      price: Number(price),
      notes: [
        extraLabel ? `Soins: ${service?.name ?? ""} + ${extraLabel}` : undefined,
        promoCode.trim() ? `Promo: ${promoCode.trim()}` : undefined,
      ]
        .filter(Boolean)
        .join("\n") || undefined,
    });
    setCreating(false);
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="grid gap-3 sm:grid-cols-2">
      <FieldGroup className="sm:col-span-2">
        <Label>Cliente</Label>
        <div className="mb-2 flex gap-2 text-[12px]">
          <button
            type="button"
            className={`rounded-lg px-2.5 py-1 font-semibold ${customerMode === "search" ? "bg-primary text-white" : "bg-[#FCE9F4]"}`}
            onClick={() => setCustomerMode("search")}
          >
            Existante / passage
          </button>
          <button
            type="button"
            className={`rounded-lg px-2.5 py-1 font-semibold ${customerMode === "new" ? "bg-primary text-white" : "bg-[#FCE9F4]"}`}
            onClick={() => {
              setCustomerMode("new");
              setCustomerId("");
            }}
          >
            + Nouvelle cliente
          </button>
        </div>
        {customerMode === "new" ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nom complet"
              required
            />
            <Input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={newPhone}
              onChange={(e) => setNewPhone(limitPhoneDigits(e.target.value))}
              placeholder="0655443322"
              required
            />
          </div>
        ) : (
          <div ref={searchRef} className="relative">
            <Input
              value={selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : query}
              onChange={(e) => {
                setCustomerId("");
                setQuery(e.target.value);
                setListOpen(true);
              }}
              onFocus={() => setListOpen(true)}
              placeholder="Rechercher nom, prénom ou téléphone — ou laisser vide (passage)"
            />
            {listOpen ? (
              <div className="absolute z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-line bg-white shadow-lg">
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-[13px] hover:bg-[#FFEFF8]"
                  onClick={() => {
                    setCustomerId("");
                    setQuery("");
                    setListOpen(false);
                  }}
                >
                  Sans cliente (passage)
                </button>
                {customersLoading ? (
                  <p className="px-3 py-2 text-[12px] text-ink/45">Chargement…</p>
                ) : (
                  filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="block w-full px-3 py-2 text-left text-[13px] hover:bg-[#FFEFF8]"
                      onClick={() => {
                        setCustomerId(c.id);
                        setQuery("");
                        setListOpen(false);
                      }}
                    >
                      {c.firstName} {c.lastName}
                      <span className="ml-2 text-[11px] text-ink/45">{c.phone}</span>
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>
        )}
      </FieldGroup>

      <FieldGroup>
        <Label>Service</Label>
        <Select
          value={serviceId}
          onChange={(e) => {
            setServiceId(e.target.value);
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
        <Select value={staffId} onChange={(e) => setStaffId(e.target.value)}>
          <option value="">Sans employée</option>
          {allowedStaff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </FieldGroup>

      <FieldGroup>
        <Label>Ressource / cabine</Label>
        <Select value={resourceId} onChange={(e) => setResourceId(e.target.value)}>
          <option value="">Sans ressource</option>
          {allowedResources.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} ({RESOURCE_TYPE_LABEL[r.type as keyof typeof RESOURCE_TYPE_LABEL] ?? r.type})
            </option>
          ))}
        </Select>
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

      <FieldGroup className="sm:col-span-2">
        <div className="flex items-center justify-between">
          <Label>Autres soins</Label>
          <button
            type="button"
            className="text-[12px] font-semibold text-primary"
            onClick={() => setExtraIds((prev) => [...prev, ""])}
          >
            Ajouter un autre soin
          </button>
        </div>
        {extraIds.map((id, idx) => (
          <div key={`${id}-${idx}`} className="mt-2 flex gap-2">
            <Select
              value={id}
              onChange={(e) => {
                const copy = [...extraIds];
                copy[idx] = e.target.value;
                setExtraIds(copy);
              }}
            >
              <option value="">Choisir un soin</option>
              {services
                .filter((s) => s.id !== serviceId)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.durationMin} min · {s.price} MAD
                  </option>
                ))}
            </Select>
            <Button type="button" variant="ghost" onClick={() => setExtraIds((prev) => prev.filter((_, i) => i !== idx))}>
              Retirer
            </Button>
          </div>
        ))}
      </FieldGroup>

      <FieldGroup>
        <Label>Prix (MAD)</Label>
        <Input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} required />
        <p className="mt-1 text-xs text-ink/45">
          {totalDuration} min · catalogue {catalogTotal} MAD
        </p>
      </FieldGroup>

      <FieldGroup>
        <Label>Code promo</Label>
        <Input value={promoCode} onChange={(e) => setPromoCode(e.target.value)} placeholder="CODE" />
      </FieldGroup>

      <FieldGroup className="sm:col-span-2">
        <Label>Heure</Label>
        {date && serviceId ? (
          <AvailabilitySlots slots={slots} value={time} onSelect={setTime} loading={submitting} />
        ) : (
          <p className="text-[12px] text-ink/45">Choisissez un service et une date.</p>
        )}
      </FieldGroup>

      <div className="flex flex-col gap-2 border-t border-line pt-4 sm:col-span-2 sm:flex-row">
        <Button type="button" variant="ghost" className="w-full sm:flex-1" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" variant="primary" className="w-full sm:flex-1" disabled={submitting || creating || !time}>
          {submitting || creating ? "Création…" : initial?.id ? "Enregistrer" : "Créer le RDV"}
        </Button>
      </div>
    </form>
  );
}
