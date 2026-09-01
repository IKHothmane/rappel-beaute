"use client";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { ServiceFormOptions } from "@/types/service";
import { PRODUCT_UNIT_LABEL } from "@/types/inventory";
import Link from "next/link";

export type ProductLink = { productId: string; quantity: number; unit: string };

type ServiceProductSelectorProps = {
  options: ServiceFormOptions["products"];
  value: ProductLink[];
  onChange: (items: ProductLink[]) => void;
  disabled?: boolean;
};

export function ServiceProductSelector({
  options,
  value,
  onChange,
  disabled,
}: ServiceProductSelectorProps) {
  function add() {
    const first = options.find((p) => !value.some((v) => v.productId === p.id));
    if (!first) return;
    onChange([...value, { productId: first.id, quantity: 1, unit: first.unit }]);
  }

  function update(index: number, patch: Partial<ProductLink>) {
    onChange(value.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function unitLabel(unit: string) {
    return PRODUCT_UNIT_LABEL[unit as keyof typeof PRODUCT_UNIT_LABEL] ?? unit;
  }

  return (
    <div className="space-y-2">
      {value.map((item, index) => {
        const product = options.find((p) => p.id === item.productId);
        return (
          <div key={`${item.productId}-${index}`} className="grid grid-cols-[1fr_88px_72px_auto] gap-2">
            <Select
              value={item.productId}
              onChange={(e) => {
                const p = options.find((x) => x.id === e.target.value);
                update(index, {
                  productId: e.target.value,
                  unit: p?.unit ?? item.unit,
                });
              }}
              disabled={disabled}
            >
              {options.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </Select>
            <Input
              type="number"
              min={0.001}
              step={0.001}
              value={item.quantity}
              onChange={(e) => update(index, { quantity: Number(e.target.value) || 1 })}
              disabled={disabled}
              aria-label="Quantité consommée"
            />
            <div className="flex h-11 items-center rounded-xl border border-line bg-[#FBF4F6] px-2 text-xs font-medium text-ink/70">
              {unitLabel(item.unit || product?.unit || "")}
            </div>
            <button
              type="button"
              onClick={() => remove(index)}
              disabled={disabled}
              className="text-sm text-ink/50 hover:text-red-600"
            >
              ×
            </button>
          </div>
        );
      })}
      <button
        type="button"
        onClick={add}
        disabled={disabled || value.length >= options.length || options.length === 0}
        className="text-sm text-primary hover:underline disabled:opacity-40"
      >
        + Ajouter un produit consommé
      </button>
      {options.length === 0 ? (
        <p className="text-xs text-ink/45">
          Aucun produit — créez-en dans{" "}
          <Link href="/products/" className="text-primary underline">
            Produits
          </Link>
          .
        </p>
      ) : (
        <p className="text-xs text-ink/45">
          À la finalisation du RDV, ces quantités génèrent un mouvement SERVICE_CONSUMPTION (idempotent).
        </p>
      )}
    </div>
  );
}
