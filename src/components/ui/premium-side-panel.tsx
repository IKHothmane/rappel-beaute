"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type PremiumSidePanelProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Contenu collé en bas (boutons). Si omis, le children occupe tout. */
  footer?: ReactNode;
  className?: string;
  /** Largeur max du panneau */
  size?: "md" | "lg";
};

export function PremiumSidePanel({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  size = "lg",
}: PremiumSidePanelProps) {
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

  const titleId = "premium-side-panel-title";

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
            aria-labelledby={titleId}
            className={cn(
              "absolute right-0 top-0 flex h-full w-full flex-col overflow-hidden border-l border-[#F0DDE6] bg-white shadow-2xl",
              size === "lg" ? "max-w-lg sm:max-w-xl" : "max-w-md sm:max-w-lg",
              className,
            )}
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
                    id={titleId}
                    className="font-display text-2xl font-bold tracking-tight text-[#261524] sm:text-[28px]"
                  >
                    {title}
                  </h2>
                  {description ? (
                    <p className="mt-1 max-w-md text-sm leading-5 text-[#654254]">{description}</p>
                  ) : null}
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

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">{children}</div>

            {footer ? (
              <footer className="shrink-0 border-t border-[#F0DDE6] bg-white px-5 py-4 sm:px-7">
                {footer}
              </footer>
            ) : null}
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
