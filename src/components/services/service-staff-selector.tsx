"use client";

import { staffColor } from "@/components/agenda/staff-colors";
import { useStaffPalette } from "@/components/agenda/staff-color-provider";
import { cn } from "@/lib/utils";
import type { ServiceFormOptions } from "@/types/service";

type ServiceStaffSelectorProps = {
  options: ServiceFormOptions["staff"];
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
};

export function ServiceStaffSelector({
  options,
  value,
  onChange,
  disabled,
}: ServiceStaffSelectorProps) {
  const palette = useStaffPalette();

  function toggle(id: string) {
    if (disabled) return;
    if (value.includes(id)) onChange(value.filter((x) => x !== id));
    else onChange([...value, id]);
  }

  if (options.length === 0) {
    return <p className="text-sm text-ink/50">Aucune employée active.</p>;
  }

  return (
    <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-line p-3">
      {options.map((s) => {
        const color = staffColor(s.id, palette);
        const checked = value.includes(s.id);
        return (
          <label
            key={s.id}
            className={cn(
              "flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors",
              checked ? cn(color.soft, color.text) : "text-ink hover:bg-[#FFEFF8]",
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(s.id)}
              disabled={disabled}
              className="rounded border-line"
            />
            <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full ring-2", color.bar, color.ring)} />
            <span className="min-w-0 flex-1 font-medium">{s.name}</span>
            {s.role ? <span className="text-xs opacity-60">({s.role})</span> : null}
          </label>
        );
      })}
    </div>
  );
}
