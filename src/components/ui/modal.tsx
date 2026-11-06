"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  /** Laisse la barre du haut (social bar) visible et blanche. */
  preserveHeader?: boolean;
};

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
  preserveHeader = false,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <div
          className={cn(
            "fixed z-[80] flex items-end justify-center p-4 sm:items-center",
            preserveHeader
              ? "bottom-0 left-0 right-0 top-[64px] sm:top-[72px]"
              : "inset-0",
          )}
        >
          <motion.button
            type="button"
            aria-label="Fermer"
            className="absolute inset-0 bg-black/25"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal
            className={cn(
              "relative max-h-[min(88vh,720px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-white shadow-soft",
              className,
            )}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
          >
            {title ? (
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white px-5 py-4">
                <h2 className="font-display text-lg font-semibold">{title}</h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl p-2 text-ink/50 hover:bg-[#FBF4F6]"
                >
                  <X size={18} />
                </button>
              </div>
            ) : null}
            <div className="p-5">{children}</div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
