"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatMad } from "@/modules/procurement/service";
import type { ProductListItem } from "@/types/inventory";
import type { PurchaseItemInput, SupplierListItem } from "@/types/procurement";

type DraftLine = PurchaseItemInput & { key: string };

type Props = {
  suppliers: SupplierListItem[];
  catalog: ProductListItem[];
  submitting: boolean;
  onSubmit: (payload: {
    supplierId: string;
    notes?: string;
    submit: boolean;
    items: PurchaseItemInput[];
  }) => void;
  onCancel: () => void;
};

export function PurchaseForm({ suppliers, catalog, submitting, onSubmit, onCancel }: Props) {
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([
    { key: "1", productId: "", quantityOrdered: 1, unitPrice: 0 },
  ]);

  const total = useMemo(
    () => lines.reduce((s, l) => s + l.quantityOrdered * l.unitPrice, 0),
    [lines],
  );

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function emit(submit: boolean) {
    onSubmit({
      supplierId,
      notes: notes.trim() || undefined,
      submit,
      items: lines.map(({ productId, quantityOrdered, unitPrice }) => ({
        productId,
        quantityOrdered,
        unitPrice,
      })),
    });
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Fournisseur *</span>
        <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
          <option value="">Choisir…</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </label>

      <div className="space-y-2">
        <p className="text-sm font-medium">Produits</p>
        {lines.map((line) => (
          <div key={line.key} className="grid grid-cols-[1fr_72px_88px_auto] gap-2">
            <Select
              value={line.productId}
              onChange={(e) => {
                const p = catalog.find((x) => x.id === e.target.value);
                updateLine(line.key, {
                  productId: e.target.value,
                  unitPrice: p?.purchasePrice ?? line.unitPrice,
                });
              }}
            >
              <option value="">Produit…</option>
              {catalog.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
            <Input
              type="number"
              min={0.001}
              step={0.001}
              value={line.quantityOrdered}
              onChange={(e) =>
                updateLine(line.key, { quantityOrdered: Number(e.target.value) || 0 })
              }
            />
            <Input
              type="number"
              min={0}
              step={0.01}
              value={line.unitPrice}
              onChange={(e) => updateLine(line.key, { unitPrice: Number(e.target.value) || 0 })}
            />
            <button
              type="button"
              className="text-ink/40 hover:text-red-600"
              onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          className="text-sm text-primary hover:underline"
          onClick={() =>
            setLines((prev) => [
              ...prev,
              { key: String(Date.now()), productId: "", quantityOrdered: 1, unitPrice: 0 },
            ])
          }
        >
          + Ligne
        </button>
      </div>

      <p className="text-right text-sm font-semibold">Total {formatMad(total)}</p>

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Notes</span>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>

      <div className="flex flex-col gap-2 border-t border-line pt-4 sm:flex-row">
        <Button type="button" variant="ghost" className="w-full sm:flex-1" onClick={onCancel}>
          Annuler
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full sm:flex-1"
          disabled={submitting}
          onClick={() => emit(false)}
        >
          Brouillon
        </Button>
        <Button
          type="button"
          variant="primary"
          className="w-full sm:flex-1"
          disabled={submitting}
          onClick={() => emit(true)}
        >
          Commander
        </Button>
      </div>
    </div>
  );
}
