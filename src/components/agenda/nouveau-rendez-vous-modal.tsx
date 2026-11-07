"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarPlus,
  Check,
  ChevronDown,
  Clock3,
  Crown,
  DoorOpen,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AvailabilitySlots } from "@/components/agenda/availability-slots";
import { staffColor } from "@/components/agenda/staff-colors";
import { useStaffPalette } from "@/components/agenda/staff-color-provider";
import {
  extraIdsFromNotes,
  notesWithServices,
  soinLabelsFromNotes,
} from "@/components/agenda/service-notes";
import { createCustomer, listCustomers } from "@/modules/customers/service";
import { getAvailableSlots, isResourceAvailableOnDate } from "@/modules/appointments/availability";
import { limitPhoneDigits, moroccoPhoneSearchVariants } from "@/lib/validation/customer";
import {
  limitName,
  limitNotes,
  limitPriceDigits,
  limitPromoCode,
  limitSearch,
  NAME_MAX,
  NOTES_MAX,
  PROMO_CODE_MAX,
  PRICE_MAX_DIGITS,
  SEARCH_MAX,
} from "@/lib/validation/input-limits";
import { cn } from "@/lib/utils";
import type { Appointment, CreateAppointmentInput } from "@/types/appointment";
import type { CustomerListItem } from "@/types/customer";
import type { ResourceAgendaContext } from "@/types/resource";
import { RESOURCE_TYPE_LABEL } from "@/types/resource";
import type { ServiceAgendaOption, ServiceFormOptions } from "@/types/service";
import type { StaffAgendaContext } from "@/types/staff";

/** Payload envoyé à `onCreate` — aligné sur l’API agenda. */
export type BookingPayload = CreateAppointmentInput;

export type NouveauRendezVousModalProps = {
  open: boolean;
  onClose: () => void;
  appointments: Appointment[];
  services: ServiceAgendaOption[];
  formOptions: ServiceFormOptions | null;
  staffContexts: StaffAgendaContext[];
  resourceContexts: ResourceAgendaContext[];
  initial?: Partial<CreateAppointmentInput>;
  submitting?: boolean;
  onCreate: (payload: BookingPayload) => void | Promise<void>;
};

function todayIsoLocal(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Casablanca" });
}

function initials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || "?";
}

function isoToFr(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function frToIso(fr: string): string | null {
  const match = fr.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const dt = new Date(year, month - 1, day);
  if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Saisie chiffres → JJ/MM/AAAA */
function formatDateDigits(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export default function NouveauRendezVousModal({
  open,
  onClose,
  appointments,
  services,
  formOptions,
  staffContexts,
  resourceContexts,
  initial,
  submitting,
  onCreate,
}: NouveauRendezVousModalProps) {
  const palette = useStaffPalette();
  const [customerId, setCustomerId] = useState(initial?.customerId ?? "");
  const [customerMode, setCustomerMode] = useState<"search" | "new">("search");
  const [query, setQuery] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const searchRef = useRef<HTMLDivElement>(null);

  const [serviceId, setServiceId] = useState(initial?.serviceId ?? "");
  const [extraIds, setExtraIds] = useState<string[]>(() =>
    extraIdsFromNotes(initial?.notes, services, initial?.serviceId ?? ""),
  );
  const [keptLabels, setKeptLabels] = useState<string[]>(() => {
    const known = new Set(
      [
        services.find((item) => item.id === (initial?.serviceId ?? ""))?.name ?? "",
        ...extraIdsFromNotes(initial?.notes, services, initial?.serviceId ?? "").map(
          (id) => services.find((item) => item.id === id)?.name ?? "",
        ),
      ].map((name) => name.replace(/\s+/g, " ").trim().toLowerCase()),
    );
    return soinLabelsFromNotes(initial?.notes).filter(
      (name) => !known.has(name.replace(/\s+/g, " ").trim().toLowerCase()),
    );
  });
  const [staffId, setStaffId] = useState(initial?.staffId ?? "");
  const [resourceId, setResourceId] = useState(initial?.resourceId ?? "");
  const [date, setDate] = useState(() => {
    if (initial?.startAt) return initial.startAt.slice(0, 10);
    return todayIsoLocal();
  });
  const [dateInput, setDateInput] = useState(() => {
    const iso = initial?.startAt ? initial.startAt.slice(0, 10) : todayIsoLocal();
    return isoToFr(iso);
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
  const [freeNotes, setFreeNotes] = useState("");
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [staffOpen, setStaffOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [extraOpenIdx, setExtraOpenIdx] = useState<number | null>(null);
  const [resourceOpen, setResourceOpen] = useState(false);
  const [serviceQuery, setServiceQuery] = useState("");
  const staffRef = useRef<HTMLDivElement>(null);
  const serviceRef = useRef<HTMLDivElement>(null);
  const resourceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setCustomerId(initial?.customerId ?? "");
    setCustomerMode("search");
    setQuery("");
    setNewName("");
    setNewPhone("");
    setServiceId(initial?.serviceId ?? "");
    setExtraIds(extraIdsFromNotes(initial?.notes, services, initial?.serviceId ?? ""));
    setStaffId(initial?.staffId ?? "");
    setResourceId(initial?.resourceId ?? "");
    const nextDate = initial?.startAt ? initial.startAt.slice(0, 10) : todayIsoLocal();
    setDate(nextDate);
    setDateInput(isoToFr(nextDate));
    if (initial?.startAt) {
      const d = new Date(initial.startAt);
      setTime(d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
    } else {
      setTime("");
    }
    setPrice(initial?.price?.toString() ?? "");
    setPromoCode("");
    setFreeNotes("");
    setFormError("");
    setStaffOpen(false);
    setServiceOpen(false);
    setExtraOpenIdx(null);
    setResourceOpen(false);
    setServiceQuery("");
    setListOpen(false);
  }, [open, initial, services]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setCustomersLoading(true);
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
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const target = e.target as Node;
      if (!searchRef.current?.contains(target)) setListOpen(false);
      if (!staffRef.current?.contains(target)) setStaffOpen(false);
      if (!serviceRef.current?.contains(target)) {
        setServiceOpen(false);
        setExtraOpenIdx(null);
        setServiceQuery("");
      }
      if (!resourceRef.current?.contains(target)) setResourceOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const selectedCustomer = customers.find((c) => c.id === customerId);
  const service = services.find((s) => s.id === serviceId);
  const extraServices = extraIds
    .map((id) => services.find((s) => s.id === id))
    .filter((s): s is ServiceAgendaOption => Boolean(s));
  const totalDuration =
    (service?.durationMin ?? 60) + extraServices.reduce((n, s) => n + s.durationMin, 0);
  const catalogTotal = (service?.price ?? 0) + extraServices.reduce((n, s) => n + s.price, 0);

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

  const filteredServices = useMemo(() => {
    const q = serviceQuery.trim().toLowerCase();
    if (!q) return services;
    return services.filter((s) => s.name.toLowerCase().includes(q));
  }, [services, serviceQuery]);

  const selectedResource = allowedResources.find((r) => r.id === resourceId);
  const selectedResourceLabel = selectedResource
    ? selectedResource.name
    : "Sans ressource";
  const selectedResourceType = selectedResource
    ? (RESOURCE_TYPE_LABEL[selectedResource.type as keyof typeof RESOURCE_TYPE_LABEL] ??
      selectedResource.type)
    : null;

  useEffect(() => {
    if (service && !initial?.price) setPrice(String(catalogTotal));
  }, [service, extraIds, catalogTotal, initial?.price]);

  const slots = useMemo(() => {
    if (!serviceId || !date) return [];
    const [y, m, d] = date.split("-").map(Number);
    const day = new Date(y, m - 1, d);
    const ctx = staffId ? staffContexts.find((s) => s.id === staffId) : undefined;
    return getAvailableSlots(appointments, {
      date: day,
      staffId,
      resourceId: resourceId || undefined,
      durationMinutes: totalDuration,
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
      setFormError("Indiquez une date valide (JJ/MM/AAAA).");
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
    const [h, min] = time.split(":").map(Number);
    const [y, mo, d] = date.split("-").map(Number);
    const start = new Date(y, mo - 1, d, h, min, 0);
    const end = new Date(start.getTime() + totalDuration * 60_000);
    const extras = extraIds.filter((id, index) => id && id !== serviceId && extraIds.indexOf(id) === index);
    const baseNotes = notesWithServices(undefined, services, serviceId, extras, keptLabels);
    const notes = [baseNotes, freeNotes.trim()].filter(Boolean).join("\n");

    try {
      await onCreate({
        customerId: resolvedCustomer.id,
        serviceId,
        staffId: staffId || undefined,
        resourceId: resourceId || undefined,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        price: Number(price),
        notes: notes || undefined,
        promotionCode: promoCode.trim() || undefined,
      });
    } finally {
      setCreating(false);
    }
  }

  const selectedStaff = allowedStaff.find((member) => member.id === staffId);
  const selectedStaffLabel = !selectedStaff
    ? "Sans employée"
    : selectedStaff.onLeave
      ? `${selectedStaff.name} · en congé`
      : selectedStaff.name;
  const busy = submitting || creating;

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Fermer"
            className="rb-fullscreen-overlay fixed z-[200] bg-[#261524]/35 backdrop-blur-[1px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal
            aria-labelledby="nrv-title"
            className="rb-side-panel fixed z-[201] flex w-[min(100vw,36rem)] flex-col overflow-hidden border-l border-[#F0DDE6] bg-white shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
          >
            <header className="relative shrink-0 overflow-hidden border-b border-[#F0DDE6] bg-gradient-to-br from-[#FFF5F9] via-[#FCE7F1] to-[#F3E8FF] px-5 pb-4 pt-5 sm:px-7 sm:pt-6">
              <div
                className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-[#B60050]/10 blur-2xl"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -left-6 bottom-0 h-28 w-28 rounded-full bg-[#75133D]/10 blur-2xl"
                aria-hidden
              />
              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 id="nrv-title" className="font-display text-2xl font-bold tracking-tight text-[#261524] sm:text-[28px]">
                    Nouveau rendez-vous
                  </h2>
                  <p className="mt-1 max-w-md text-sm leading-5 text-[#654254]">
                    Créez un rendez-vous en quelques clics.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl p-2 text-[#887787] transition hover:bg-white/70 hover:text-[#261524]"
                  aria-label="Fermer"
                >
                  <X size={20} />
                </button>
              </div>
            </header>

            <form
              noValidate
              onSubmit={(e) => void handleSubmit(e)}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
                <section className="space-y-3">
                  <div
                    className="inline-flex rounded-xl bg-[#F8F0F4] p-1"
                    role="group"
                    aria-label="Type de cliente"
                  >
                    <button
                      type="button"
                      onClick={() => setCustomerMode("search")}
                      className={cn(
                        "rounded-lg px-3.5 py-2 text-sm font-semibold transition",
                        customerMode === "search"
                          ? "bg-[#75133D] text-white shadow-sm"
                          : "text-[#887787] hover:text-[#261524]",
                      )}
                    >
                      Cliente existante
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerMode("new");
                        setCustomerId("");
                      }}
                      className={cn(
                        "rounded-lg px-3.5 py-2 text-sm font-semibold transition",
                        customerMode === "new"
                          ? "bg-[#75133D] text-white shadow-sm"
                          : "text-[#887787] hover:text-[#261524]",
                      )}
                    >
                      Nouvelle cliente
                    </button>
                  </div>

                  {customerMode === "new" ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block space-y-1.5">
                        <span className="text-xs font-semibold uppercase tracking-wide text-[#887787]">
                          Nom complet
                        </span>
                        <input
                          value={newName}
                          onChange={(e) => setNewName(limitName(e.target.value))}
                          placeholder="Prénom Nom"
                          maxLength={NAME_MAX}
                          autoComplete="name"
                          required
                          className="h-11 w-full rounded-xl border border-[#E8D4DE] bg-white px-3 text-sm outline-none transition focus:border-[#B60050]"
                        />
                      </label>
                      <label className="block space-y-1.5">
                        <span className="text-xs font-semibold uppercase tracking-wide text-[#887787]">
                          Téléphone
                        </span>
                        <input
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          value={newPhone}
                          onChange={(e) => setNewPhone(limitPhoneDigits(e.target.value))}
                          placeholder="0655443322"
                          required
                          className="h-11 w-full rounded-xl border border-[#E8D4DE] bg-white px-3 text-sm outline-none transition focus:border-[#B60050]"
                        />
                      </label>
                    </div>
                  ) : (
                    <div ref={searchRef} className="relative space-y-3">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search
                            size={16}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#887787]"
                            aria-hidden
                          />
                          <input
                            value={
                              selectedCustomer
                                ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`
                                : query
                            }
                            onChange={(e) => {
                              setCustomerId("");
                              setQuery(limitSearch(e.target.value));
                              setListOpen(true);
                            }}
                            onFocus={() => setListOpen(true)}
                            maxLength={SEARCH_MAX}
                            placeholder="Rechercher une cliente (nom, prénom, téléphone…)"
                            className="h-11 w-full rounded-xl border border-[#E8D4DE] bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-[#B60050]"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomerMode("new");
                            setCustomerId("");
                          }}
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#E8D4DE] text-[#75133D] transition hover:bg-[#FCE7F1]"
                          aria-label="Nouvelle cliente"
                        >
                          <Plus size={18} />
                        </button>
                      </div>

                      {listOpen && !selectedCustomer ? (
                        <div className="absolute z-30 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-[#E8D4DE] bg-white shadow-lg">
                          <button
                            type="button"
                            className="block w-full px-3 py-2.5 text-left text-sm hover:bg-[#FFF1F6]"
                            onClick={() => {
                              setCustomerId("");
                              setQuery("");
                              setListOpen(false);
                            }}
                          >
                            Sans cliente (passage)
                          </button>
                          {customersLoading ? (
                            <p className="px-3 py-2 text-xs text-[#887787]">Chargement…</p>
                          ) : (
                            filteredCustomers.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                className="block w-full px-3 py-2.5 text-left text-sm hover:bg-[#FFF1F6]"
                                onClick={() => {
                                  setCustomerId(c.id);
                                  setQuery("");
                                  setListOpen(false);
                                }}
                              >
                                {c.firstName} {c.lastName}
                                <span className="ml-2 text-xs text-[#887787]">{c.phone}</span>
                              </button>
                            ))
                          )}
                        </div>
                      ) : null}

                      {selectedCustomer ? (
                        <div className="flex items-center gap-3 rounded-2xl border border-[#E8D4DE] bg-[#FFF8FB] p-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#75133D] text-sm font-bold text-white">
                            {initials(selectedCustomer.firstName, selectedCustomer.lastName)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate font-semibold text-[#261524]">
                                {selectedCustomer.firstName} {selectedCustomer.lastName}
                              </p>
                              {selectedCustomer.segment === "VIP" ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-[#F6E7C1] px-2 py-0.5 text-[11px] font-bold text-[#8A6A1F]">
                                  <Crown size={11} aria-hidden />
                                  Cliente fidèle
                                </span>
                              ) : null}
                            </div>
                            <p className="text-sm text-[#887787]">{selectedCustomer.phone}</p>
                          </div>
                          <a
                            href={`/customers/?id=${selectedCustomer.id}`}
                            className="shrink-0 text-xs font-semibold text-[#75133D] hover:underline"
                          >
                            Voir l&apos;historique →
                          </a>
                        </div>
                      ) : null}
                    </div>
                  )}
                </section>

                <section className="grid gap-4 sm:grid-cols-2">
                  <div className="block space-y-1.5 sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wide text-[#887787]">
                        Service <span className="text-[#B60050]">*</span>
                      </span>
                      <button
                        type="button"
                        className="text-xs font-semibold text-[#B60050]"
                        onClick={() => {
                          setExtraIds((prev) => [...prev, ""]);
                          setServiceOpen(false);
                          setExtraOpenIdx(null);
                        }}
                      >
                        + Ajouter un soin
                      </button>
                    </div>
                    <div ref={serviceRef} className="relative space-y-2">
                      <button
                        type="button"
                        aria-expanded={serviceOpen}
                        aria-haspopup="listbox"
                        onClick={() => {
                          setServiceOpen((v) => !v);
                          setExtraOpenIdx(null);
                          setStaffOpen(false);
                          setResourceOpen(false);
                          setServiceQuery("");
                        }}
                        className={cn(
                          "flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border bg-white px-3 py-2.5 text-left outline-none transition",
                          serviceOpen ? "border-[#B60050]" : "border-[#E8D4DE] focus:border-[#B60050]",
                        )}
                      >
                        {service ? (
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-[#261524]">
                              {service.name}
                            </span>
                            <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[#887787]">
                              <span className="inline-flex items-center gap-1">
                                <Clock3 size={12} aria-hidden />
                                {service.durationMin} min
                              </span>
                              <span className="font-semibold text-[#75133D]">
                                {service.price.toLocaleString("fr-MA")} MAD
                              </span>
                            </span>
                          </span>
                        ) : (
                          <span className="text-sm text-[#887787]">Choisir un service</span>
                        )}
                        <ChevronDown size={16} className="shrink-0 text-[#887787]" />
                      </button>

                      {serviceOpen ? (
                        <div
                          className="absolute z-30 w-full overflow-hidden rounded-xl border border-[#E8D4DE] bg-white shadow-lg"
                          role="listbox"
                          aria-label="Service"
                        >
                          {services.length > 6 ? (
                            <div className="border-b border-[#F0DDE6] p-2">
                              <div className="relative">
                                <Search
                                  size={14}
                                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#887787]"
                                  aria-hidden
                                />
                                <input
                                  value={serviceQuery}
                                  onChange={(e) => setServiceQuery(limitSearch(e.target.value))}
                                  maxLength={SEARCH_MAX}
                                  placeholder="Rechercher un service…"
                                  className="h-9 w-full rounded-lg border border-[#E8D4DE] bg-[#FFF8FB] py-1.5 pl-8 pr-2 text-sm outline-none focus:border-[#B60050]"
                                  autoFocus
                                />
                              </div>
                            </div>
                          ) : null}
                          <div className="max-h-56 overflow-y-auto p-1.5">
                            {filteredServices.length === 0 ? (
                              <p className="px-3 py-3 text-sm text-[#887787]">Aucun service trouvé.</p>
                            ) : (
                              filteredServices.map((s) => {
                                const selected = serviceId === s.id;
                                return (
                                  <button
                                    key={s.id}
                                    type="button"
                                    role="option"
                                    aria-selected={selected}
                                    onClick={() => {
                                      setServiceId(s.id);
                                      setExtraIds((prev) => prev.filter((id) => id !== s.id));
                                      setTime("");
                                      setServiceOpen(false);
                                      setServiceQuery("");
                                    }}
                                    className={cn(
                                      "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition",
                                      selected
                                        ? "bg-[#FCE7F1]"
                                        : "hover:bg-[#FFF1F6]",
                                    )}
                                  >
                                    <span className="min-w-0 flex-1">
                                      <span
                                        className={cn(
                                          "block truncate text-sm",
                                          selected
                                            ? "font-semibold text-[#75133D]"
                                            : "font-medium text-[#261524]",
                                        )}
                                      >
                                        {s.name}
                                      </span>
                                      <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-[#887787]">
                                        <span className="inline-flex items-center gap-1">
                                          <Clock3 size={12} aria-hidden />
                                          {s.durationMin} min
                                        </span>
                                        <span>{s.price.toLocaleString("fr-MA")} MAD</span>
                                      </span>
                                    </span>
                                    {selected ? (
                                      <Check size={16} className="mt-0.5 shrink-0 text-[#B60050]" aria-hidden />
                                    ) : null}
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>
                      ) : null}

                      {extraIds.map((id, idx) => {
                        const extra = services.find((s) => s.id === id);
                        const open = extraOpenIdx === idx;
                        const options = services.filter((s) => s.id !== serviceId);
                        return (
                          <div key={`extra-${idx}`} className="relative flex gap-2">
                            <div className="relative min-w-0 flex-1">
                              <button
                                type="button"
                                aria-expanded={open}
                                aria-haspopup="listbox"
                                onClick={() => {
                                  setExtraOpenIdx(open ? null : idx);
                                  setServiceOpen(false);
                                  setStaffOpen(false);
                                  setResourceOpen(false);
                                }}
                                className={cn(
                                  "flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border bg-white px-3 py-2.5 text-left outline-none transition",
                                  open ? "border-[#B60050]" : "border-[#E8D4DE]",
                                )}
                              >
                                {extra ? (
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-semibold text-[#261524]">
                                      {extra.name}
                                    </span>
                                    <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-[#887787]">
                                      <span className="inline-flex items-center gap-1">
                                        <Clock3 size={12} aria-hidden />
                                        {extra.durationMin} min
                                      </span>
                                      <span className="font-semibold text-[#75133D]">
                                        {extra.price.toLocaleString("fr-MA")} MAD
                                      </span>
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-sm text-[#887787]">Choisir un soin</span>
                                )}
                                <ChevronDown size={16} className="shrink-0 text-[#887787]" />
                              </button>
                              {open ? (
                                <div
                                  className="absolute z-30 mt-1.5 max-h-52 w-full overflow-y-auto rounded-xl border border-[#E8D4DE] bg-white p-1.5 shadow-lg"
                                  role="listbox"
                                  aria-label="Soin supplémentaire"
                                >
                                  {options.map((s) => {
                                    const selected = id === s.id;
                                    return (
                                      <button
                                        key={s.id}
                                        type="button"
                                        role="option"
                                        aria-selected={selected}
                                        onClick={() => {
                                          const copy = [...extraIds];
                                          copy[idx] = s.id;
                                          setExtraIds(copy);
                                          setTime("");
                                          setExtraOpenIdx(null);
                                        }}
                                        className={cn(
                                          "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left",
                                          selected ? "bg-[#FCE7F1]" : "hover:bg-[#FFF1F6]",
                                        )}
                                      >
                                        <span className="min-w-0 flex-1">
                                          <span
                                            className={cn(
                                              "block truncate text-sm",
                                              selected
                                                ? "font-semibold text-[#75133D]"
                                                : "font-medium text-[#261524]",
                                            )}
                                          >
                                            {s.name}
                                          </span>
                                          <span className="mt-0.5 flex gap-x-3 text-xs text-[#887787]">
                                            <span className="inline-flex items-center gap-1">
                                              <Clock3 size={12} aria-hidden />
                                              {s.durationMin} min
                                            </span>
                                            <span>{s.price.toLocaleString("fr-MA")} MAD</span>
                                          </span>
                                        </span>
                                        {selected ? (
                                          <Check size={16} className="mt-0.5 shrink-0 text-[#B60050]" />
                                        ) : null}
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setExtraIds((prev) => prev.filter((_, i) => i !== idx));
                                setExtraOpenIdx(null);
                              }}
                              className="shrink-0 rounded-xl px-3 text-sm font-semibold text-[#887787] hover:bg-[#F8F0F4]"
                            >
                              Retirer
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    {keptLabels.map((name) => (
                      <div
                        key={name}
                        className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-[#E8D4DE] bg-white px-3 py-2"
                      >
                        <span className="text-sm font-semibold text-[#261524]">{name}</span>
                        <button
                          type="button"
                          onClick={() => setKeptLabels((prev) => prev.filter((item) => item !== name))}
                          className="text-sm font-semibold text-[#887787]"
                        >
                          Retirer
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="block space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[#887787]">
                      Employée
                    </span>
                    <div ref={staffRef} className="relative">
                      <button
                        type="button"
                        aria-expanded={staffOpen}
                        aria-haspopup="listbox"
                        onClick={() => setStaffOpen((v) => !v)}
                        className="flex h-11 w-full items-center justify-between rounded-xl border border-[#E8D4DE] bg-white px-3 text-left text-sm outline-none transition focus:border-[#B60050]"
                      >
                        <span className="truncate">{selectedStaffLabel}</span>
                        <ChevronDown size={16} className="shrink-0 text-[#887787]" />
                      </button>
                      {staffOpen ? (
                        <div
                          className="absolute z-20 mt-1.5 max-h-52 w-full overflow-y-auto rounded-xl border border-[#E8D4DE] bg-white p-1.5 shadow-lg"
                          role="listbox"
                          aria-label="Employée"
                        >
                          <button
                            type="button"
                            role="option"
                            aria-selected={staffId === ""}
                            onClick={() => {
                              setStaffId("");
                              setTime("");
                              setStaffOpen(false);
                            }}
                            className={cn(
                              "h-10 w-full rounded-lg px-3 text-left text-sm",
                              staffId === ""
                                ? "bg-[#FCE7F1] font-semibold text-[#75133D]"
                                : "hover:bg-[#FFF1F6]",
                            )}
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
                              className={cn(
                                "flex h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm",
                                staffId === s.id
                                  ? "bg-[#FCE7F1] font-semibold text-[#75133D]"
                                  : "hover:bg-[#FFF1F6]",
                              )}
                            >
                              <span
                                className={cn(
                                  "h-2.5 w-2.5 shrink-0 rounded-full",
                                  staffColor(s.id, palette).bar,
                                )}
                              />
                              {s.name}
                              {s.onLeave ? (
                                <span className="text-[#887787]"> · en congé</span>
                              ) : null}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="block space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[#887787]">
                      Ressource / cabine
                    </span>
                    <div ref={resourceRef} className="relative">
                      <button
                        type="button"
                        aria-expanded={resourceOpen}
                        aria-haspopup="listbox"
                        onClick={() => {
                          setResourceOpen((v) => !v);
                          setServiceOpen(false);
                          setExtraOpenIdx(null);
                          setStaffOpen(false);
                        }}
                        className={cn(
                          "flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border bg-white px-3 py-2.5 text-left outline-none transition",
                          resourceOpen ? "border-[#B60050]" : "border-[#E8D4DE] focus:border-[#B60050]",
                        )}
                      >
                        <span className="flex min-w-0 flex-1 items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F8F0F4] text-[#75133D]">
                            <DoorOpen size={15} aria-hidden />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-[#261524]">
                              {selectedResourceLabel}
                            </span>
                            {selectedResourceType ? (
                              <span className="text-xs text-[#887787]">{selectedResourceType}</span>
                            ) : (
                              <span className="text-xs text-[#887787]">Optionnel</span>
                            )}
                          </span>
                        </span>
                        <ChevronDown size={16} className="shrink-0 text-[#887787]" />
                      </button>
                      {resourceOpen ? (
                        <div
                          className="absolute z-30 mt-1.5 max-h-52 w-full overflow-y-auto rounded-xl border border-[#E8D4DE] bg-white p-1.5 shadow-lg"
                          role="listbox"
                          aria-label="Ressource / cabine"
                        >
                          <button
                            type="button"
                            role="option"
                            aria-selected={resourceId === ""}
                            onClick={() => {
                              setResourceId("");
                              setResourceOpen(false);
                            }}
                            className={cn(
                              "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm",
                              resourceId === ""
                                ? "bg-[#FCE7F1] font-semibold text-[#75133D]"
                                : "hover:bg-[#FFF1F6]",
                            )}
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F8F0F4] text-[#887787]">
                              <DoorOpen size={15} aria-hidden />
                            </span>
                            Sans ressource
                          </button>
                          {allowedResources.length === 0 ? (
                            <p className="px-3 py-2 text-xs text-[#887787]">
                              Aucune cabine disponible pour cette date.
                            </p>
                          ) : (
                            allowedResources.map((r) => {
                              const typeLabel =
                                RESOURCE_TYPE_LABEL[r.type as keyof typeof RESOURCE_TYPE_LABEL] ??
                                r.type;
                              const selected = resourceId === r.id;
                              return (
                                <button
                                  key={r.id}
                                  type="button"
                                  role="option"
                                  aria-selected={selected}
                                  onClick={() => {
                                    setResourceId(r.id);
                                    setResourceOpen(false);
                                  }}
                                  className={cn(
                                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left",
                                    selected ? "bg-[#FCE7F1]" : "hover:bg-[#FFF1F6]",
                                  )}
                                >
                                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F8F0F4] text-[#75133D]">
                                    <DoorOpen size={15} aria-hidden />
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span
                                      className={cn(
                                        "block truncate text-sm",
                                        selected
                                          ? "font-semibold text-[#75133D]"
                                          : "font-medium text-[#261524]",
                                      )}
                                    >
                                      {r.name}
                                    </span>
                                    <span className="text-xs text-[#887787]">{typeLabel}</span>
                                  </span>
                                  {selected ? (
                                    <Check size={16} className="shrink-0 text-[#B60050]" aria-hidden />
                                  ) : null}
                                </button>
                              );
                            })
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[#887787]">
                      Date <span className="text-[#B60050]">*</span>
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="JJ/MM/AAAA"
                      maxLength={10}
                      value={dateInput}
                      onChange={(e) => {
                        const formatted = formatDateDigits(e.target.value);
                        setDateInput(formatted);
                        const iso = frToIso(formatted);
                        if (iso) {
                          setDate(iso);
                          setTime("");
                        } else if (formatted.length === 10) {
                          setDate("");
                          setTime("");
                        } else if (formatted.length < 10) {
                          setDate("");
                          setTime("");
                        }
                      }}
                      required
                      className="h-11 w-full rounded-xl border border-[#E8D4DE] bg-white px-3 font-mono text-sm outline-none transition focus:border-[#B60050]"
                    />
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[#887787]">
                      Prix (MAD) <span className="text-[#B60050]">*</span>
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={price}
                      onChange={(e) => setPrice(limitPriceDigits(e.target.value))}
                      maxLength={PRICE_MAX_DIGITS}
                      required
                      className="h-11 w-full rounded-xl border border-[#E8D4DE] bg-white px-3 text-sm outline-none focus:border-[#B60050]"
                    />
                    <p className="text-xs text-[#887787]">
                      {totalDuration} min · catalogue {catalogTotal} MAD
                    </p>
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[#887787]">
                      Code promo
                    </span>
                    <input
                      value={promoCode}
                      onChange={(e) => setPromoCode(limitPromoCode(e.target.value))}
                      maxLength={PROMO_CODE_MAX}
                      placeholder="Ex : E4FB"
                      autoComplete="off"
                      className="h-11 w-full rounded-xl border border-[#E8D4DE] bg-white px-3 text-sm outline-none focus:border-[#B60050]"
                    />
                    <p className="text-xs text-[#887787]">
                      Réduction sur une seule prestation :{" "}
                      {service?.name ?? "la prestation principale"}.
                    </p>
                  </label>

                  <div className="space-y-1.5 sm:col-span-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[#887787]">
                      Créneau <span className="text-[#B60050]">*</span>
                    </span>
                    {serviceId && date ? (
                      <AvailabilitySlots slots={slots} value={time} onSelect={setTime} loading={busy} />
                    ) : (
                      <p className="text-sm text-[#887787]">Choisissez un service et une date.</p>
                    )}
                  </div>

                  <label className="block space-y-1.5 sm:col-span-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[#887787]">
                      Notes (optionnel)
                    </span>
                    <textarea
                      value={freeNotes}
                      onChange={(e) => setFreeNotes(limitNotes(e.target.value))}
                      maxLength={NOTES_MAX}
                      placeholder="Ajoutez une note pour la cliente…"
                      rows={3}
                      className="w-full resize-none rounded-xl border border-[#E8D4DE] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#B60050]"
                    />
                    <p className="text-right text-[11px] text-[#887787]">
                      {freeNotes.length}/{NOTES_MAX}
                    </p>
                  </label>
                </section>

                {formError ? (
                  <p
                    role="alert"
                    className="rounded-xl bg-[#FCE7F1] px-3 py-2.5 text-sm font-medium text-[#75133D]"
                  >
                    {formError}
                  </p>
                ) : null}
              </div>

              <footer className="shrink-0 border-t border-[#F0DDE6] bg-white px-5 py-4 sm:px-7">
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={busy}
                    className="h-11 rounded-xl border border-[#E8D4DE] px-5 text-sm font-semibold text-[#654254] transition hover:bg-[#F8F0F4] disabled:opacity-60"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#75133D] px-5 text-sm font-semibold text-white shadow-md transition hover:bg-[#5c0f30] disabled:opacity-60"
                  >
                    <CalendarPlus size={18} aria-hidden />
                    {busy ? "Création…" : "Créer le rendez-vous"}
                  </button>
                </div>
              </footer>
            </form>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
