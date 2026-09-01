"use client";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { ServiceFormOptions } from "@/types/service";

export type ResourceLink = { resourceId: string; quantity: number };

type ServiceResourceSelectorProps = {
  options: ServiceFormOptions["resources"];
  value: ResourceLink[];
  onChange: (items: ResourceLink[]) => void;
  disabled?: boolean;
};

export function ServiceResourceSelector({
  options,
  value,
  onChange,
  disabled,
}: ServiceResourceSelectorProps) {
  function add() {
    const first = options.find((r) => !value.some((v) => v.resourceId === r.id));
    if (!first) return;
    onChange([...value, { resourceId: first.id, quantity: 1 }]);
  }

  function update(index: number, patch: Partial<ResourceLink>) {
    onChange(value.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      {value.map((item, index) => (
        <div key={`${item.resourceId}-${index}`} className="flex gap-2">
          <Select
            value={item.resourceId}
            onChange={(e) => update(index, { resourceId: e.target.value })}
            disabled={disabled}
            className="flex-1"
          >
            {options.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.type})
              </option>
            ))}
          </Select>
          <Input
            type="number"
            min={1}
            value={item.quantity}
            onChange={(e) => update(index, { quantity: Number(e.target.value) || 1 })}
            disabled={disabled}
            className="w-20"
            title="Quantité"
          />
          <button
            type="button"
            onClick={() => remove(index)}
            disabled={disabled}
            className="text-sm text-ink/50 hover:text-red-600"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        disabled={disabled || value.length >= options.length}
        className="text-sm text-primary hover:underline disabled:opacity-40"
      >
        + Ajouter une ressource
      </button>
    </div>
  );
}
