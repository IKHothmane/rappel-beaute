"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMad } from "@/modules/procurement/service";
import type { ProductListItem } from "@/types/inventory";
import type { PurchaseItemInput, SupplierListItem } from "@/types/procurement";

type DraftLine = PurchaseItemInput & { key: string; query: string };

function wholeNumber(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return 0;
  return Number(digits);
}

export type PurchaseFormInitial = {
  supplierId?: string | null;
  supplierName?: string | null;
  notes?: string | null;
  items: { productId: string; productName: string; quantityOrdered: number; unitPrice: number }[];
};

type Props = {
  suppliers: SupplierListItem[];
  catalog: ProductListItem[];
  submitting: boolean;
  /** Brouillon existant : le formulaire préremplit les lignes. */
  initial?: PurchaseFormInitial | null;
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
  initial,
  onSubmit,
  onCancel,
  onAddSupplier,
  pickedSupplier,
}: Props) {
  const editing = Boolean(initial);
  const [supplierId, setSupplierId] = useState(initial?.supplierId ?? "");
  const [supplierQuery, setSupplierQuery] = useState(
    initial?.supplierId ? (initial.supplierName ?? "") : "",
  );
  const [listOpen, setListOpen] = useState(false);
  const supplierBox = useRef<HTMLDivElement>(null);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [openLine, setOpenLine] = useState<string | null>(null);
  const [lines, setLines] = useState<DraftLine[]>(() =>
    initial?.items.length
      ? initial.items.map((item, index) => ({
          key: `${item.productId}-${index}`,
          query: item.productName,
          productId: item.productId,
          quantityOrdered: Math.max(1, Math.round(item.quantityOrdered)),
          unitPrice: Math.max(0, Math.round(item.unitPrice)),
        }))
      : [{ key: "1", query: "", productId: "", quantityOrdered: 1, unitPrice: 0 }],
  );

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
      notes: notes.trim(),
      submit,
      items: lines.map(({ productId, query, quantityOrdered, unitPrice }) => {
        const name = query.trim();
        const known = productId
          ? catalog.find((product) => product.id === productId)
          : catalog.find((product) => product.name.trim().toLowerCase() === name.toLowerCase());
        const resolvedId = productId || known?.id;
        return {
          productId: resolvedId,
          productName: resolvedId ? undefined : name || undefined,
          quantityOrdered: Math.round(quantityOrdered),
          unitPrice: Math.round(unitPrice),
        };
      }),
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
        <p className="text-xs text-ink/50">
          Choisissez un produit du catalogue, ou saisissez un nom : il sera créé automatiquement.
        </p>
        <div className="grid grid-cols-[1fr_72px_88px_auto] gap-2 text-[11px] font-semibold text-ink/45">
          <span>Produit</span>
          <span>Quantité</span>
          <span>Prix</span>
          <span />
        </div>
        {lines.map((line) => {
          const query = line.query.trim().toLowerCase();
          const matches = catalog.filter((product) => !query || product.name.toLowerCase().includes(query));
          const exact = catalog.find((product) => product.name.trim().toLowerCase() === query);
          const isNew = Boolean(query) && !line.productId && !exact;
          return (
          <div key={line.key} className="grid grid-cols-[1fr_72px_88px_auto] gap-2">
            <div className="relative">
              <Input
                value={line.query}
                onChange={(e) => {
                  const next = e.target.value;
                  const match = catalog.find(
                    (product) => product.name.trim().toLowerCase() === next.trim().toLowerCase(),
                  );
                  updateLine(line.key, {
                    query: next,
                    productId: match?.id ?? "",
                    unitPrice: match ? Math.round(match.purchasePrice) : line.unitPrice,
                  });
                  setOpenLine(line.key);
                }}
                onFocus={() => setOpenLine(line.key)}
                onBlur={(e) => {
                  if (e.currentTarget.parentElement?.contains(e.relatedTarget as Node | null)) return;
                  setOpenLine((current) => (current === line.key ? null : current));
                }}
                placeholder="Choisir ou saisir un produit"
                autoComplete="off"
                role="combobox"
                aria-expanded={openLine === line.key}
                aria-autocomplete="list"
                aria-label="Produit"
              />
              {isNew && openLine !== line.key ? (
                <span className="mt-1 block text-[11px] font-semibold text-primary">Nouveau produit</span>
              ) : null}
              {openLine === line.key ? (
                <ul className="mt-1 max-h-44 overflow-y-auto rounded-xl border border-line bg-white py-1">
                  {matches.slice(0, 8).map((product) => (
                    <li key={product.id}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm text-ink hover:bg-[#FFEFF8]"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          updateLine(line.key, {
                            query: product.name,
                            productId: product.id,
                            unitPrice: Math.round(product.purchasePrice),
                          });
                          setOpenLine(null);
                        }}
                      >
                        {product.name}
                      </button>
                    </li>
                  ))}
                  {isNew ? (
                    <li>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm font-semibold text-primary hover:bg-[#FFEFF8]"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setOpenLine(null)}
                      >
                        Créer « {line.query.trim()} »
                      </button>
                    </li>
                  ) : null}
                  {matches.length === 0 && !isNew ? (
                    <li className="px-3 py-2 text-sm text-ink/45">Aucun produit correspondant.</li>
                  ) : null}
                </ul>
              ) : null}
            </div>
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={line.quantityOrdered}
              onChange={(e) =>
                updateLine(line.key, { quantityOrdered: wholeNumber(e.target.value) })
              }
              aria-label="Quantité"
            />
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={line.unitPrice}
              onChange={(e) => updateLine(line.key, { unitPrice: wholeNumber(e.target.value) })}
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
          );
        })}
        <button
          type="button"
          className="text-sm text-primary hover:underline"
          onClick={() =>
            setLines((prev) => [
              ...prev,
              { key: String(Date.now()), query: "", productId: "", quantityOrdered: 1, unitPrice: 0 },
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
          {editing ? "Enregistrer" : "Brouillon"}
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
