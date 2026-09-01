"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type DropdownOption = { value: string; label: string };

type DropdownProps = {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  className?: string;
};

export function Dropdown({
  value,
  onChange,
  options,
  placeholder = "Sélectionner…",
  className,
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
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-full items-center justify-between rounded-xl border border-line bg-white px-3 text-sm"
      >
        <span className={selected ? "text-ink" : "text-ink/40"}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown size={16} className="text-ink/35" />
      </button>
      {open ? (
        <ul className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-line bg-white py-1 shadow-soft">
          {options.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                className={cn(
                  "w-full px-3 py-2 text-left text-sm hover:bg-[#FBF4F6]",
                  value === o.value && "bg-primary-light font-medium text-primary-dark",
                )}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
