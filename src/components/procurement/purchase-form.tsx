"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
    supplierId?: string;
    supplierName?: string;
    notes?: string;
    submit: boolean;
    items: PurchaseItemInput[];
  }) => void;
  onCancel: () => void;
  onAddSupplier: (name: string) => void;
  pickedSupplier?: { id: string; name: string; token: number } | null;
};

export function PurchaseForm({
  suppliers,
  catalog,
  submitting,
  onSubmit,
  onCancel,
  onAddSupplier,
  pickedSupplier,
}: Props) {
  const [supplierId, setSupplierId] = useState("");
  const [supplierQuery, setSupplierQuery] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const supplierBox = useRef<HTMLDivElement>(null);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([
    { key: "1", productId: "", quantityOrdered: 1, unitPrice: 0 },
  ]);

  const total = useMemo(
    () => lines.reduce((s, l) => s + l.quantityOrdered * l.unitPrice, 0),
    [lines],
  );
  const supplierMatches = useMemo(() => {
    const q = supplierQuery.trim().toLowerCase();
    return suppliers.filter((s) => !q || s.name.toLowerCase().includes(q));
  }, [suppliers, supplierQuery]);

  useEffect(() => {
    if (!pickedSupplier) return;
    setSupplierId(pickedSupplier.id);
    setSupplierQuery(pickedSupplier.name);
    setListOpen(false);
  }, [pickedSupplier?.token, pickedSupplier?.id, pickedSupplier?.name]);

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function emit(submit: boolean) {
    onSubmit({
      supplierId: supplierId || undefined,
      supplierName: supplierQuery.trim() || undefined,
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
      <div className="block text-sm">
        <span className="mb-1.5 block font-medium">Fournisseur</span>
        <div ref={supplierBox} className="relative">
          <Input
            value={supplierQuery}
            onChange={(e) => {
              setSupplierQuery(e.target.value);
              setSupplierId("");
              setListOpen(true);
            }}
            onFocus={() => setListOpen(true)}
            onBlur={(e) => {
              if (supplierBox.current?.contains(e.relatedTarget as Node | null)) return;
              setListOpen(false);
            }}
            placeholder="Choisir ou saisir un nom"
            autoComplete="off"
            role="combobox"
            aria-expanded={listOpen}
            aria-autocomplete="list"
          />
          {listOpen ? (
            <ul className="mt-1 max-h-44 overflow-y-auto rounded-xl border border-line bg-white py-1">
              {supplierMatches.length > 0 ? (
                supplierMatches.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm text-ink hover:bg-[#FFEFF8]"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setSupplierId(s.id);
                        setSupplierQuery(s.name);
                        setListOpen(false);
                      }}
                    >
                      {s.name}
                    </button>
                  </li>
                ))
              ) : (
                <li className="px-3 py-2 text-sm text-ink/45">Aucun fournisseur correspondant.</li>
              )}
            </ul>
          ) : null}
        </div>
        <button
          type="button"
          className="mt-2 text-sm font-semibold text-primary hover:underline"
          onClick={() => onAddSupplier(supplierQuery.trim())}
        >
          + Ajouter un fournisseur
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Produits</p>
        <div className="grid grid-cols-[1fr_72px_88px_auto] gap-2 text-[11px] font-semibold text-ink/45">
          <span>Produit</span>
          <span>Quantité</span>
          <span>Prix</span>
          <span />
        </div>
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
              aria-label="Quantité"
            />
            <Input
              type="number"
              min={0}
              step={0.01}
              value={line.unitPrice}
              onChange={(e) => updateLine(line.key, { unitPrice: Number(e.target.value) || 0 })}
              aria-label="Prix"
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
