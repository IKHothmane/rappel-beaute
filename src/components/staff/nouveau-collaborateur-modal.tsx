"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, UserPlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { limitPhoneDigits } from "@/lib/validation/customer";
import {
  EMAIL_MAX,
  limitEmail,
  limitName,
  limitPosition,
  NAME_MAX,
  POSITION_MAX,
} from "@/lib/validation/input-limits";
import { listServices } from "@/modules/services/service";
import { cn } from "@/lib/utils";
import type { CreateStaffInput, StaffDetail, StaffStatus } from "@/types/staff";
import { STAFF_STATUS_LABEL } from "@/types/staff";

const STATUSES: StaffStatus[] = ["ACTIVE", "INACTIVE", "ON_LEAVE", "ARCHIVED"];

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

function formatDateDigits(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export type NouveauCollaborateurModalProps = {
  open: boolean;
  onClose: () => void;
  initial?: Partial<StaffDetail>;
  submitting?: boolean;
  onSubmit: (data: CreateStaffInput) => void | Promise<void>;
};

export default function NouveauCollaborateurModal({
  open,
  onClose,
  initial,
  submitting,
  onSubmit,
}: NouveauCollaborateurModalProps) {
  const isEdit = Boolean(initial?.id);
  const [firstName, setFirstName] = useState(initial?.firstName ?? "");
  const [lastName, setLastName] = useState(initial?.lastName ?? "");
  const [phone, setPhone] = useState(limitPhoneDigits(initial?.phone ?? ""));
  const [email, setEmail] = useState(initial?.email ?? "");
  const [position, setPosition] = useState(initial?.position ?? "");
  const [status, setStatus] = useState<StaffStatus>(initial?.status ?? "ACTIVE");
  const [hireDate, setHireDate] = useState(
    initial?.hireDate ? initial.hireDate.slice(0, 10) : "",
  );
  const [hireDateInput, setHireDateInput] = useState(
    initial?.hireDate ? isoToFr(initial.hireDate.slice(0, 10)) : "",
  );
  const [serviceIds, setServiceIds] = useState<string[]>(
    initial?.serviceIds ?? initial?.services?.map((s) => s.serviceId) ?? [],
  );
  const [services, setServices] = useState<{ id: string; name: string }[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [statusOpen, setStatusOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [mounted, setMounted] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setFirstName(initial?.firstName ?? "");
    setLastName(initial?.lastName ?? "");
    setPhone(limitPhoneDigits(initial?.phone ?? ""));
    setEmail(initial?.email ?? "");
    setPosition(initial?.position ?? "");
    setStatus(initial?.status ?? "ACTIVE");
    const hd = initial?.hireDate ? initial.hireDate.slice(0, 10) : "";
    setHireDate(hd);
    setHireDateInput(hd ? isoToFr(hd) : "");
    setServiceIds(initial?.serviceIds ?? initial?.services?.map((s) => s.serviceId) ?? []);
    setStatusOpen(false);
    setFormError("");
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setServicesLoading(true);
    listServices({ active: true, limit: 100 })
      .then((res) => {
        if (!cancelled) setServices(res.data.map((s) => ({ id: s.id, name: s.name })));
      })
      .catch(() => {
        if (!cancelled) setServices([]);
      })
      .finally(() => {
        if (!cancelled) setServicesLoading(false);
      });
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
      if (!statusRef.current?.contains(target)) setStatusOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function toggleService(id: string) {
    setServiceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim()) {
      setFormError("Le prénom est obligatoire.");
      return;
    }
    if (hireDateInput && !hireDate) {
      setFormError("Indiquez une date d’embauche valide (JJ/MM/AAAA).");
      return;
    }
    setFormError("");
    await onSubmit({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      position: position.trim() || undefined,
      status,
      hireDate: hireDate || undefined,
      serviceIds,
    });
  }

  const field =
    "h-11 w-full rounded-xl border border-[#E8D4DE] bg-white px-3 text-sm outline-none transition focus:border-[#B60050]";
  const label = "text-xs font-semibold uppercase tracking-wide text-[#887787]";

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
            aria-labelledby="nc-title"
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
              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2
                    id="nc-title"
                    className="font-display text-2xl font-bold tracking-tight text-[#261524] sm:text-[28px]"
                  >
                    {isEdit ? "Modifier la collaboratrice" : "Nouveau collaborateur"}
                  </h2>
                  <p className="mt-1 max-w-md text-sm leading-5 text-[#654254]">
                    {isEdit
                      ? "Mettez à jour le profil de l’équipe."
                      : "Ajoutez une collaboratrice à votre équipe."}
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

            <form noValidate onSubmit={(e) => void handleSubmit(e)} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-1.5">
                    <span className={label}>
                      Prénom <span className="text-[#B60050]">*</span>
                    </span>
                    <input
                      value={firstName}
                      onChange={(e) => setFirstName(limitName(e.target.value))}
                      maxLength={NAME_MAX}
                      required
                      autoComplete="given-name"
                      className={field}
                      placeholder="Meryem"
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className={label}>Nom</span>
                    <input
                      value={lastName}
                      onChange={(e) => setLastName(limitName(e.target.value))}
                      maxLength={NAME_MAX}
                      autoComplete="family-name"
                      className={field}
                      placeholder="Louk"
                    />
                  </label>
                </div>

                <label className="block space-y-1.5">
                  <span className={label}>Téléphone</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(limitPhoneDigits(e.target.value))}
                    placeholder="0655443322"
                    className={field}
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className={label}>E-mail</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(limitEmail(e.target.value))}
                    maxLength={EMAIL_MAX}
                    placeholder="contact@institut.ma"
                    className={field}
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className={label}>Poste</span>
                  <input
                    value={position}
                    onChange={(e) => setPosition(limitPosition(e.target.value))}
                    maxLength={POSITION_MAX}
                    placeholder="Esthéticienne"
                    className={field}
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="block space-y-1.5">
                    <span className={label}>Statut</span>
                    <div ref={statusRef} className="relative">
                      <button
                        type="button"
                        aria-expanded={statusOpen}
                        aria-haspopup="listbox"
                        onClick={() => setStatusOpen((v) => !v)}
                        className={cn(
                          "flex h-11 w-full items-center justify-between rounded-xl border bg-white px-3 text-left text-sm outline-none transition",
                          statusOpen ? "border-[#B60050]" : "border-[#E8D4DE] focus:border-[#B60050]",
                        )}
                      >
                        <span className="font-medium text-[#261524]">
                          {STAFF_STATUS_LABEL[status]}
                        </span>
                        <ChevronDown size={16} className="shrink-0 text-[#887787]" />
                      </button>
                      {statusOpen ? (
                        <div
                          className="absolute z-30 mt-1.5 max-h-52 w-full overflow-y-auto rounded-xl border border-[#E8D4DE] bg-white p-1.5 shadow-lg"
                          role="listbox"
                          aria-label="Statut"
                        >
                          {STATUSES.map((s) => {
                            const selected = status === s;
                            return (
                              <button
                                key={s}
                                type="button"
                                role="option"
                                aria-selected={selected}
                                onClick={() => {
                                  setStatus(s);
                                  setStatusOpen(false);
                                }}
                                className={cn(
                                  "flex h-10 w-full items-center justify-between rounded-lg px-3 text-left text-sm",
                                  selected
                                    ? "bg-[#FCE7F1] font-semibold text-[#75133D]"
                                    : "hover:bg-[#FFF1F6]",
                                )}
                              >
                                {STAFF_STATUS_LABEL[s]}
                                {selected ? (
                                  <Check size={16} className="text-[#B60050]" aria-hidden />
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <label className="block space-y-1.5">
                    <span className={label}>Date d&apos;embauche</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="JJ/MM/AAAA"
                      maxLength={10}
                      value={hireDateInput}
                      onChange={(e) => {
                        const formatted = formatDateDigits(e.target.value);
                        setHireDateInput(formatted);
                        const iso = frToIso(formatted);
                        setHireDate(iso ?? "");
                      }}
                      className={cn(field, "font-mono")}
                    />
                  </label>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={label}>Services qu&apos;elle peut réaliser</span>
                    {serviceIds.length > 0 ? (
                      <span className="text-xs font-semibold text-[#75133D]">
                        {serviceIds.length} sélectionné{serviceIds.length > 1 ? "s" : ""}
                      </span>
                    ) : null}
                  </div>
                  {servicesLoading ? (
                    <p className="text-sm text-[#887787]">Chargement des services…</p>
                  ) : services.length === 0 ? (
                    <p className="text-sm text-[#887787]">Aucun service dans le catalogue.</p>
                  ) : (
                    <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-[#E8D4DE] bg-[#FFF8FB] p-1.5">
                      {services.map((s) => {
                        const selected = serviceIds.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => toggleService(s.id)}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition",
                              selected ? "bg-[#FCE7F1]" : "hover:bg-white",
                            )}
                          >
                            <span
                              className={cn(
                                "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                                selected
                                  ? "border-[#B60050] bg-[#B60050] text-white"
                                  : "border-[#E8D4DE] bg-white",
                              )}
                              aria-hidden
                            >
                              {selected ? <Check size={12} strokeWidth={3} /> : null}
                            </span>
                            <span
                              className={cn(
                                "min-w-0 flex-1 truncate text-sm",
                                selected
                                  ? "font-semibold text-[#75133D]"
                                  : "font-medium text-[#261524]",
                              )}
                            >
                              {s.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

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
                    disabled={submitting}
                    className="h-11 rounded-xl border border-[#E8D4DE] px-5 text-sm font-semibold text-[#654254] transition hover:bg-[#F8F0F4] disabled:opacity-60"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#75133D] px-5 text-sm font-semibold text-white shadow-md transition hover:bg-[#5c0f30] disabled:opacity-60"
                  >
                    <UserPlus size={18} aria-hidden />
                    {submitting
                      ? "Enregistrement…"
                      : isEdit
                        ? "Enregistrer"
                        : "Créer la collaboratrice"}
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
