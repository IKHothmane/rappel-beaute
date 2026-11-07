"use client";

import { AnimatePresence, motion } from "framer-motion";
import { UserPlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { limitPhoneDigits, splitCustomerName } from "@/lib/validation/customer";
import {
  EMAIL_MAX,
  limitEmail,
  limitName,
  NAME_MAX,
} from "@/lib/validation/input-limits";
import type { CreateCustomerInput, CustomerDetail } from "@/types/customer";

export type NouvelleClienteModalProps = {
  open: boolean;
  onClose: () => void;
  initial?: Partial<CustomerDetail>;
  submitting?: boolean;
  onSubmit: (data: CreateCustomerInput) => void | Promise<void>;
};

export default function NouvelleClienteModal({
  open,
  onClose,
  initial,
  submitting,
  onSubmit,
}: NouvelleClienteModalProps) {
  const isEdit = Boolean(initial?.id);
  const [fullName, setFullName] = useState(() =>
    [initial?.firstName, initial?.lastName].filter(Boolean).join(" ").trim(),
  );
  const [phone, setPhone] = useState(limitPhoneDigits(initial?.phone ?? ""));
  const [email, setEmail] = useState(initial?.email ?? "");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!open) return;
    setFullName([initial?.firstName, initial?.lastName].filter(Boolean).join(" ").trim());
    setPhone(limitPhoneDigits(initial?.phone ?? ""));
    setEmail(initial?.email ?? "");
    setFormError("");
  }, [open, initial]);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { firstName, lastName } = splitCustomerName(fullName);
    if (!firstName) {
      setFormError("Indiquez le nom complet.");
      return;
    }
    const digits = limitPhoneDigits(phone);
    if (digits.length < 8) {
      setFormError("Indiquez un téléphone d’au moins 8 chiffres.");
      return;
    }
    setFormError("");
    await onSubmit({
      firstName,
      lastName: lastName || "—",
      phone: digits,
      email: email.trim() || undefined,
    });
  }

  const field =
    "h-11 w-full rounded-xl border border-[#E8D4DE] bg-white px-3 text-sm outline-none transition focus:border-[#B60050]";
  const label = "text-xs font-semibold uppercase tracking-wide text-[#887787]";

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[80]">
          <motion.button
            type="button"
            aria-label="Fermer"
            className="absolute inset-0 bg-[#261524]/35 backdrop-blur-[1px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal
            aria-labelledby="ncl-title"
            className="absolute right-0 top-0 flex h-full w-full max-w-lg flex-col overflow-hidden border-l border-[#F0DDE6] bg-white shadow-2xl sm:max-w-xl"
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
                    id="ncl-title"
                    className="font-display text-2xl font-bold tracking-tight text-[#261524] sm:text-[28px]"
                  >
                    {isEdit ? "Modifier la cliente" : "Nouvelle cliente"}
                  </h2>
                  <p className="mt-1 max-w-md text-sm leading-5 text-[#654254]">
                    {isEdit
                      ? "Mettez à jour le profil de la cliente."
                      : "Ajoutez une cliente à votre institut."}
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
                <label className="block space-y-1.5">
                  <span className={label}>
                    Nom complet <span className="text-[#B60050]">*</span>
                  </span>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(limitName(e.target.value))}
                    placeholder="Prénom Nom"
                    maxLength={NAME_MAX}
                    autoComplete="name"
                    required
                    className={field}
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className={label}>
                    Téléphone <span className="text-[#B60050]">*</span>
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(limitPhoneDigits(e.target.value))}
                    placeholder="0655443322"
                    required
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
                    placeholder="cliente@email.com"
                    className={field}
                  />
                </label>

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
                        : "Créer la cliente"}
                  </button>
                </div>
              </footer>
            </form>
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
