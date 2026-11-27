"use client";

import { ChevronDown, Download, FileSpreadsheet, FileText } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { prospectsExportHref, type ProspectExportFormat, type ProspectFilters } from "@/lib/admin/prospects-client";
import { cn } from "@/lib/utils";
import { btnSecondary } from "./prospect-styles";

const ITEMS: { format: ProspectExportFormat; label: string; hint: string; icon: typeof FileText }[] = [
  { format: "xlsx", label: "Google Sheets / Excel (.xlsx)", hint: "À ouvrir dans Google Sheets ou Excel", icon: FileSpreadsheet },
  { format: "csv", label: "CSV", hint: "Texte séparé, pour d'autres outils", icon: FileText },
];

/**
 * Bouton « Télécharger » : menu (motif ARIA menu button) avec les liens .xlsx et .csv portant les filtres courants.
 * Positionné en absolu sous le bouton : aucun calcul de viewport, donc indifférent à html { zoom: 0.8 }.
 */
export function ProspectsDownloadMenu({
  filters,
  filtering,
  disabled = false,
  className,
}: {
  filters: ProspectFilters;
  filtering: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  function openAt(index: number) {
    setOpen(true);
    window.requestAnimationFrame(() => itemRefs.current[(index + ITEMS.length) % ITEMS.length]?.focus());
  }

  function close(focusButton: boolean) {
    setOpen(false);
    if (focusButton) buttonRef.current?.focus();
  }

  function onButtonKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      openAt(0);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      openAt(ITEMS.length - 1);
    }
  }

  function onMenuKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const current = itemRefs.current.findIndex((el) => el === document.activeElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = (current + (e.key === "ArrowDown" ? 1 : -1) + ITEMS.length) % ITEMS.length;
      itemRefs.current[next]?.focus();
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      itemRefs.current[e.key === "Home" ? 0 : ITEMS.length - 1]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close(true);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={buttonRef}
        type="button"
        id={`${uid}-button`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? `${uid}-menu` : undefined}
        disabled={disabled}
        onClick={(e) => {
          if (open) close(false);
          // Entrée / Espace (detail 0) : le focus va directement sur le premier choix.
          else if (e.detail === 0) openAt(0);
          else setOpen(true);
        }}
        onKeyDown={onButtonKeyDown}
        className={cn(btnSecondary, "w-full")}
      >
        <Download className="h-4 w-4 text-[#3B63D6]" aria-hidden />
        Télécharger
        <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 rounded-xl bg-white p-1.5 shadow-lg ring-1 ring-slate-200 sm:left-auto sm:w-72">
          <div id={`${uid}-menu`} role="menu" aria-labelledby={`${uid}-button`} onKeyDown={onMenuKeyDown}>
          {ITEMS.map((item, i) => {
            const Icon = item.icon;
            return (
              <a
                key={item.format}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                role="menuitem"
                tabIndex={-1}
                href={prospectsExportHref(filters, item.format)}
                download
                onClick={() => close(true)}
                className="flex min-h-11 items-start gap-3 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none hover:bg-slate-50 focus:bg-[#3B63D6]/10 focus-visible:ring-2 focus-visible:ring-[#3B63D6]"
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#3B63D6]" aria-hidden />
                <span className="min-w-0">
                  <span className="block font-semibold">{item.label}</span>
                  <span className="block text-xs text-slate-500">{item.hint}</span>
                </span>
              </a>
            );
          })}
          </div>
          <p className="border-t border-slate-100 px-3 pb-1 pt-2 text-[11px] text-slate-500">
            {filtering ? "Avec les filtres et la recherche en cours." : "Toutes les fiches (aucun filtre)."}
          </p>
        </div>
      ) : null}
    </div>
  );
}
