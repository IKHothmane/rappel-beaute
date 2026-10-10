"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AvailabilitySlots } from "@/components/agenda/availability-slots";
import { staffColor } from "@/components/agenda/staff-colors";
import { useStaffPalette } from "@/components/agenda/staff-color-provider";
import { Button } from "@/components/ui/button";
import { FieldGroup, Label, Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { createCustomer, listCustomers } from "@/modules/customers/service";
import { getAvailableSlots, isResourceAvailableOnDate } from "@/modules/appointments/availability";
import { limitPhoneDigits, moroccoPhoneSearchVariants } from "@/lib/validation/customer";
import { businessParts } from "@/lib/time/business-timezone";
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
  const palette = useStaffPalette();
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
  const [formError, setFormError] = useState("");
  const [staffOpen, setStaffOpen] = useState(false);
  const staffRef = useRef<HTMLDivElement>(null);

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
      const target = e.target as Node;
      if (!searchRef.current?.contains(target)) setListOpen(false);
      if (!staffRef.current?.contains(target)) setStaffOpen(false);
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
    const fromOptions = (formOptions?.staff ?? [])
      .filter((s) => s.status === "ACTIVE" || s.status === "ON_LEAVE")
      .map((s) => ({
        id: s.id,
        name: s.name.trim() || "Employée",
        onLeave: s.status === "ON_LEAVE",
      }));
    const source =
      fromOptions.length > 0
        ? fromOptions
        : staffContexts
            .filter((s) => s.status === "ACTIVE" || s.status === "ON_LEAVE")
            .map((s) => ({
              id: s.id,
              name: (s.displayName || `${s.firstName} ${s.lastName}`).trim() || "Employée",
              onLeave: s.status === "ON_LEAVE",
            }));
    if (!service?.staffIds.length) return source;
    const linked = source.filter((s) => service.staffIds.includes(s.id));
    return linked.length > 0 ? linked : source;
  }, [formOptions, service, staffContexts]);

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
    const slotStaff = staffId;
    const ctx = slotStaff ? staffContexts.find((s) => s.id === slotStaff) : undefined;
    return getAvailableSlots(appointments, {
      date: day,
      staffId: slotStaff,
      resourceId: resourceId || undefined,
      durationMinutes: totalDuration,
      excludeAppointmentId: initial?.id,
      staffContext: ctx,
      resourceContext,
      ignoreStaffSchedule: true,
    });
  }, [
    appointments,
    staffId,
    serviceId,
    resourceId,
    date,
    totalDuration,
    initial?.id,
    staffContexts,
    resourceContext,
  ]);

  async function resolveCustomerId(): Promise<{ id: string } | { error: string }> {
    if (customerId) return { id: customerId };
    if (customerMode === "new") {
      const full = newName.trim();
      const phone = limitPhoneDigits(newPhone);
      if (!full || phone.length < 8) {
        return { error: "Indiquez le nom et un téléphone d’au moins 8 chiffres." };
      }
      const parts = full.split(/\s+/);
      const firstName = parts[0] ?? full;
      const lastName = parts.slice(1).join(" ") || "—";
      const created = await createCustomer({ firstName, lastName, phone });
      return created.ok ? { id: created.customer.id } : { error: created.error };
    }
    const created = await createCustomer({
      firstName: "Cliente",
      lastName: "de passage",
      phone: `06${Date.now().toString().slice(-8)}`,
    });
    return created.ok ? { id: created.customer.id } : { error: created.error };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!serviceId) {
      setFormError("Choisissez un service.");
      return;
    }
    if (!date) {
      setFormError("Choisissez une date.");
      return;
    }
    const chosen = slots.find((slot) => slot.time === time && slot.available);
    if (!chosen) {
      setFormError(
        slots.some((slot) => slot.available)
          ? "Choisissez un créneau libre."
          : staffId
            ? "Aucun créneau libre pour cette employée à cette date."
            : "Aucun créneau libre à cette date.",
      );
      return;
    }
    if (!price) {
      setFormError("Indiquez le prix.");
      return;
    }
    setFormError("");
    setCreating(true);
    const resolvedCustomer = await resolveCustomerId();
    if (!("id" in resolvedCustomer)) {
      setCreating(false);
      setFormError(resolvedCustomer.error);
      return;
    }
    const resolvedStaff = staffId || undefined;

    const [h, min] = time.split(":").map(Number);
    const [y, mo, d] = date.split("-").map(Number);
    const start = new Date(y, mo - 1, d, h, min, 0);
    const end = new Date(start.getTime() + totalDuration * 60_000);
    const extraLabel = extraServices.map((s) => s.name).join(" + ");

    onSubmit({
      customerId: resolvedCustomer.id,
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

  const selectedStaff = allowedStaff.find((member) => member.id === staffId);
  const selectedStaffLabel = !selectedStaff
    ? "Sans employée"
    : selectedStaff.onLeave
      ? `${selectedStaff.name} · en congé`
      : selectedStaff.name;

  return (
    <form noValidate onSubmit={(e) => void handleSubmit(e)} className="grid gap-3 sm:grid-cols-2">
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
        <div ref={staffRef} className="relative">
          <button
            type="button"
            aria-expanded={staffOpen}
            aria-haspopup="listbox"
            onClick={() => setStaffOpen((open) => !open)}
            className="flex h-11 w-full items-center justify-between rounded-xl border border-line bg-white px-3 text-left text-sm text-ink outline-none transition focus:border-primary"
          >
            <span className="truncate">{selectedStaffLabel}</span>
            <ChevronDown size={16} className="shrink-0 text-ink/35" />
          </button>
          {staffOpen ? (
            <div className="mt-1.5 flex max-h-52 flex-col gap-1.5 overflow-y-auto" role="listbox" aria-label="Employée">
              <button
                type="button"
                role="option"
                aria-selected={staffId === ""}
                onClick={() => {
                  setStaffId("");
                  setTime("");
                  setStaffOpen(false);
                }}
                className={`h-10 shrink-0 rounded-xl border px-3 text-left text-sm ${
                  staffId === ""
                    ? "border-primary bg-primary-light font-semibold text-ink"
                    : "border-line bg-white text-ink/70"
                }`}
              >
                Sans employée
              </button>
              {allowedStaff.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="option"
                  aria-selected={staffId === s.id}
                  onClick={() => {
                    setStaffId(s.id);
                    setTime("");
                    setStaffOpen(false);
                  }}
                  className={`h-10 shrink-0 rounded-xl border px-3 text-left text-sm ${
                    staffId === s.id
                      ? "border-primary bg-primary-light font-semibold text-ink"
                      : "border-line bg-white text-ink hover:bg-[#FFEFF8]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${staffColor(s.id, palette).bar}`} />
                    <span>
                      {s.name}
                      {s.onLeave ? <span className="text-ink/45"> · en congé</span> : null}
                    </span>
                  </span>
                </button>
              ))}
              {allowedStaff.length === 0 ? (
                <p className="text-xs text-ink/45">Aucune employée pour cet institut.</p>
              ) : null}
            </div>
          ) : null}
        </div>
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
        <Label>Créneau</Label>
        {serviceId && date ? (
          <AvailabilitySlots slots={slots} value={time} onSelect={setTime} loading={submitting} />
        ) : (
          <p className="text-[12px] text-ink/45">Choisissez un service et une date.</p>
        )}
      </FieldGroup>

      <div className="flex flex-col gap-2 border-t border-line pt-4 sm:col-span-2">
        {formError ? (
          <p className="rounded-xl bg-[#FCE9F4] px-3 py-2 text-sm font-medium text-ink" role="alert">
            {formError}
          </p>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="ghost" className="w-full sm:flex-1" onClick={onCancel}>
            Annuler
          </Button>
          <Button type="submit" variant="primary" className="w-full sm:flex-1" disabled={submitting || creating}>
            {submitting || creating ? "Création…" : initial?.id ? "Enregistrer" : "Créer le RDV"}
          </Button>
        </div>
      </div>
    </form>
  );
}
