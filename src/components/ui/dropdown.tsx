"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type DropdownOption = { value: string; label: string; dotClassName?: string; colorClassName?: string };

type DropdownProps = {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
};

export function Dropdown({
  value,
  onChange,
  options,
  placeholder = "Sélectionner…",
  className,
  ariaLabel,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-full items-center justify-between rounded-xl border border-line bg-white px-3 text-sm"
      >
        <span className={cn("flex min-w-0 items-center gap-2", selected ? "text-ink" : "text-ink/40", selected?.colorClassName)}>
          {selected?.dotClassName ? <span aria-hidden="true" className={cn("h-2.5 w-2.5 shrink-0 rounded-full", selected.dotClassName)} /> : null}
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown size={16} className="text-ink/35" />
      </button>
      {open ? (
        <ul onKeyDown={(event) => { if (event.key === "Escape") { setOpen(false); ref.current?.querySelector("button")?.focus(); } }} className="no-scrollbar absolute z-50 mt-2 max-h-64 w-full min-w-[180px] overflow-auto rounded-xl border border-line bg-white p-1 shadow-lg">
          {options.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-[#FBF4F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                  value === o.value && "bg-primary-light font-medium text-primary-dark",
                  o.colorClassName,
                )}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              >
                {o.dotClassName ? <span aria-hidden="true" className={cn("h-2.5 w-2.5 shrink-0 rounded-full", o.dotClassName)} /> : null}
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
