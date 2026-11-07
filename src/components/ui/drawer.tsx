"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  side?: "right" | "bottom";
  className?: string;
  /** Laisse la barre du haut (header) visible et blanche. */
  preserveHeader?: boolean;
};

export function Drawer({
  open,
  onClose,
  title,
  children,
  side = "right",
  className,
  preserveHeader = false,
}: DrawerProps) {
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

  const isBottom = side === "bottom";

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Fermer"
            className={cn(
              "fixed z-[60] bg-black/20",
              isBottom
                ? "rb-fullscreen-overlay"
                : preserveHeader
                  ? "bottom-0 left-0 right-0 top-[calc(64px/0.8)] sm:top-[calc(72px/0.8)]"
                  : "rb-fullscreen-overlay",
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal
            className={cn(
              "fixed z-[70] flex flex-col border-line bg-white shadow-soft",
              isBottom
                ? "bottom-0 left-0 right-0 max-h-[92vh] rounded-t-2xl border-t"
                : preserveHeader
                  ? "right-0 top-[calc(64px/0.8)] w-full max-w-md border-l sm:top-[calc(72px/0.8)]"
                  : "rb-side-panel w-full max-w-md border-l",
              !isBottom && preserveHeader && "h-[calc((100dvh-64px)/0.8)] sm:h-[calc((100dvh-72px)/0.8)]",
              className,
            )}
            initial={isBottom ? { y: "100%" } : { x: "100%" }}
            animate={isBottom ? { y: 0 } : { x: 0 }}
            exit={isBottom ? { y: "100%" } : { x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-4">
              <h2 className="font-display text-lg font-semibold">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl p-2 text-ink/50 hover:bg-[#FBF4F6]"
                aria-label="Fermer le panneau"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">{children}</div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
