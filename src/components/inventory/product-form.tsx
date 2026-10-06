"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CreateProductInput, ProductDetail } from "@/types/inventory";

type ProductFormProps = {
  initial?: Partial<ProductDetail>;
  submitting?: boolean;
  onSubmit: (data: CreateProductInput) => void;
  onCancel: () => void;
};

function sanitizeDecimal(raw: string) {
  const value = raw.replace(/\s/g, "").replace(/\./g, ",").replace(/[^\d,]/g, "");
  const comma = value.indexOf(",");
  if (comma === -1) return value;
  return `${value.slice(0, comma)},${value.slice(comma + 1).replace(/,/g, "")}`;
}

function parseDecimal(raw: string) {
  if (!raw.trim() || raw.trim() === ",") return Number.NaN;
  const value = Number(raw.replace(",", "."));
  return Number.isFinite(value) ? value : Number.NaN;
}

function formatDecimal(value: number) {
  const rounded = Math.round(Math.max(0, value) * 1000) / 1000;
  return String(rounded).replace(".", ",");
}

function optionalDecimal(raw: string) {
  if (!raw.trim() || raw.trim() === ",") return undefined;
  const value = parseDecimal(raw);
  return Number.isFinite(value) ? value : undefined;
}

function displayAmount(value: number | null | undefined, fallback = "") {
  if (value == null || Number.isNaN(value)) return fallback;
  return formatDecimal(value);
}

function AmountField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  function step(delta: number) {
    const current = parseDecimal(value);
    onChange(formatDecimal((Number.isFinite(current) ? current : 0) + delta));
  }

  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Diminuer ${label}`}
          onClick={() => step(-1)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-lg font-bold text-ink hover:bg-[#FFEFF8]"
        >
          −
        </button>
        <Input
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(sanitizeDecimal(e.target.value))}
          placeholder="0"
        />
        <button
          type="button"
          aria-label={`Augmenter ${label}`}
          onClick={() => step(1)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-lg font-bold text-ink hover:bg-[#FFEFF8]"
        >
          +
        </button>
      </div>
      {hint ? <span className="mt-1 block text-xs text-ink/45">{hint}</span> : null}
    </label>
  );
}

function generateSku(name: string) {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .slice(0, 8)
    .toUpperCase();
  return `${slug || "PRD"}-${Date.now().toString(36).toUpperCase()}`;
}

export function ProductForm({ initial, submitting, onSubmit, onCancel }: ProductFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [purchasePrice, setPurchasePrice] = useState(displayAmount(initial?.purchasePrice, "0"));
  const [salePrice, setSalePrice] = useState(displayAmount(initial?.salePrice));
  const [minStock, setMinStock] = useState(displayAmount(initial?.minStock, "0"));
  const [maxStock, setMaxStock] = useState(displayAmount(initial?.maxStock));
  const [supplierName, setSupplierName] = useState(initial?.supplierName ?? "");
  const [initialStock, setInitialStock] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    onSubmit({
      name: trimmed,
      sku: initial?.sku?.trim() || generateSku(trimmed),
      category: initial?.category ?? "CONSOMMABLE",
      brand: initial?.brand ?? undefined,
      unit: initial?.unit ?? "UNIT",
      purchasePrice: Number.isFinite(parseDecimal(purchasePrice)) ? parseDecimal(purchasePrice) : 0,
      salePrice: optionalDecimal(salePrice),
      minStock: Number.isFinite(parseDecimal(minStock)) ? parseDecimal(minStock) : 0,
      maxStock: optionalDecimal(maxStock),
      supplierName: supplierName.trim() || undefined,
      consumable: initial?.id ? initial.consumable ?? true : true,
      sellable: initial?.id ? initial.sellable ?? true : true,
      notes: initial?.notes ?? undefined,
      initialStock: !initial?.id ? optionalDecimal(initialStock) : undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Nom *</span>
        <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Sérum 30 ml" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <AmountField label="Prix achat (MAD)" value={purchasePrice} onChange={setPurchasePrice} />
        <AmountField label="Prix vente (MAD)" value={salePrice} onChange={setSalePrice} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <AmountField label="Stock minimum" value={minStock} onChange={setMinStock} />
        <AmountField label="Stock maximum" value={maxStock} onChange={setMaxStock} />
      </div>
      {!initial?.id ? (
        <AmountField
          label="Stock initial"
          value={initialStock}
          onChange={setInitialStock}
          hint="Créera un mouvement Achat."
        />
      ) : null}
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Fournisseur</span>
        <Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
      </label>
      <div className="flex flex-col gap-2 border-t border-line pt-4 sm:flex-row">
        <Button type="button" variant="ghost" className="w-full sm:flex-1" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" variant="primary" className="w-full sm:flex-1" disabled={submitting}>
          {submitting ? "Enregistrement…" : initial?.id ? "Enregistrer" : "Créer le produit"}
        </Button>
      </div>
    </form>
  );
}
