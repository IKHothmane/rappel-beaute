"use client";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { CommissionType, ServiceFormOptions } from "@/types/service";

export type CommissionLink = {
  staffId: string;
  type: CommissionType;
  percentage?: number;
  fixedAmount?: number;
};

type ServiceCommissionFormProps = {
  staffOptions: ServiceFormOptions["staff"];
  allowedStaffIds: string[];
  value: CommissionLink[];
  onChange: (items: CommissionLink[]) => void;
  disabled?: boolean;
};

export function ServiceCommissionForm({
  staffOptions,
  allowedStaffIds,
  value,
  onChange,
  disabled,
}: ServiceCommissionFormProps) {
  const eligible = staffOptions.filter((s) => allowedStaffIds.includes(s.id));

  function add() {
    const first = eligible.find((s) => !value.some((v) => v.staffId === s.id));
    if (!first) return;
    onChange([...value, { staffId: first.id, type: "PERCENTAGE", percentage: 10 }]);
  }

  function update(index: number, patch: Partial<CommissionLink>) {
    onChange(value.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  if (allowedStaffIds.length === 0) {
    return (
      <p className="text-sm text-ink/50">
        Sélectionnez d&apos;abord les employées autorisées pour définir les commissions.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {value.map((item, index) => (
          <div key={`${item.staffId}-${index}`} className="rounded-lg border border-line p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">
                {staffOptions.find((s) => s.id === item.staffId)?.name ?? item.staffId}
              </span>
              <button
                type="button"
                onClick={() => remove(index)}
                disabled={disabled}
                className="text-xs text-ink/50 hover:text-red-600"
              >
                Retirer
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={item.staffId}
                onChange={(e) => update(index, { staffId: e.target.value })}
                disabled={disabled}
              >
                {eligible.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
              <Select
                value={item.type}
                onChange={(e) =>
                  update(index, {
                    type: e.target.value as CommissionType,
                    percentage: e.target.value === "PERCENTAGE" ? item.percentage ?? 10 : undefined,
                    fixedAmount: e.target.value === "FIXED" ? item.fixedAmount ?? 50 : undefined,
                  })
                }
                disabled={disabled}
              >
                <option value="PERCENTAGE">Pourcentage</option>
                <option value="FIXED">Montant fixe</option>
              </Select>
            </div>
            {item.type === "PERCENTAGE" ? (
              <label className="mt-2 block text-sm">
                <span className="mb-1 block text-xs text-ink/50">Taux (%)</span>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={item.percentage ?? ""}
                  onChange={(e) => update(index, { percentage: Number(e.target.value) })}
                  disabled={disabled}
                />
              </label>
            ) : (
              <label className="mt-2 block text-sm">
                <span className="mb-1 block text-xs text-ink/50">Montant (MAD)</span>
                <Input
                  type="number"
                  min={0}
                  value={item.fixedAmount ?? ""}
                  onChange={(e) => update(index, { fixedAmount: Number(e.target.value) })}
                  disabled={disabled}
                />
              </label>
            )}
          </div>
      ))}
      <button
        type="button"
        onClick={add}
        disabled={disabled || value.length >= eligible.length}
        className="text-sm text-primary hover:underline disabled:opacity-40"
      >
        + Ajouter une commission
      </button>
    </div>
  );
}
