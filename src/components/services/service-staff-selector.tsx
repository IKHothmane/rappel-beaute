"use client";

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
      {options.map((s) => (
        <label key={s.id} className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={value.includes(s.id)}
            onChange={() => toggle(s.id)}
            disabled={disabled}
            className="rounded border-line"
          />
          <span>{s.name}</span>
          {s.role ? <span className="text-xs text-ink/45">({s.role})</span> : null}
        </label>
      ))}
    </div>
  );
}
