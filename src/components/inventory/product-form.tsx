"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, Textarea } from "@/components/ui/select";
import type {
  CreateProductInput,
  ProductCategory,
  ProductDetail,
  ProductUnit,
} from "@/types/inventory";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABEL,
  PRODUCT_UNIT_LABEL,
  PRODUCT_UNITS,
} from "@/types/inventory";

type ProductFormProps = {
  initial?: Partial<ProductDetail>;
  submitting?: boolean;
  onSubmit: (data: CreateProductInput) => void;
  onCancel: () => void;
};

export function ProductForm({ initial, submitting, onSubmit, onCancel }: ProductFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [sku, setSku] = useState(initial?.sku ?? "");
  const [category, setCategory] = useState<ProductCategory>(initial?.category ?? "CONSOMMABLE");
  const [brand, setBrand] = useState(initial?.brand ?? "");
  const [unit, setUnit] = useState<ProductUnit>(initial?.unit ?? "UNIT");
  const [purchasePrice, setPurchasePrice] = useState(initial?.purchasePrice?.toString() ?? "0");
  const [salePrice, setSalePrice] = useState(initial?.salePrice?.toString() ?? "");
  const [minStock, setMinStock] = useState(initial?.minStock?.toString() ?? "0");
  const [maxStock, setMaxStock] = useState(initial?.maxStock?.toString() ?? "");
  const [supplierName, setSupplierName] = useState(initial?.supplierName ?? "");
  const [initialStock, setInitialStock] = useState("");
  const [consumable, setConsumable] = useState(initial?.consumable ?? true);
  const [sellable, setSellable] = useState(initial?.sellable ?? false);
  const [notes, setNotes] = useState(initial?.notes ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      name: name.trim(),
      sku: sku.trim(),
      category,
      brand: brand.trim() || undefined,
      unit,
      purchasePrice: Number(purchasePrice) || 0,
      salePrice: salePrice ? Number(salePrice) : undefined,
      minStock: Number(minStock) || 0,
      maxStock: maxStock ? Number(maxStock) : undefined,
      supplierName: supplierName.trim() || undefined,
      consumable,
      sellable,
      notes: notes.trim() || undefined,
      initialStock: !initial?.id && initialStock ? Number(initialStock) : undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Nom *</span>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">SKU *</span>
        <Input value={sku} onChange={(e) => setSku(e.target.value)} required disabled={Boolean(initial?.id)} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Catégorie</span>
          <Select value={category} onChange={(e) => setCategory(e.target.value as ProductCategory)}>
            {PRODUCT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {PRODUCT_CATEGORY_LABEL[c]}
              </option>
            ))}
          </Select>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Unité</span>
          <Select value={unit} onChange={(e) => setUnit(e.target.value as ProductUnit)} disabled={Boolean(initial?.id)}>
            {PRODUCT_UNITS.map((u) => (
              <option key={u} value={u}>
                {PRODUCT_UNIT_LABEL[u]}
              </option>
            ))}
          </Select>
        </label>
      </div>
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Marque</span>
        <Input value={brand} onChange={(e) => setBrand(e.target.value)} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Prix achat (MAD)</span>
          <Input type="number" min={0} step={0.01} value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Prix vente (MAD)</span>
          <Input type="number" min={0} step={0.01} value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Stock minimum</span>
          <Input type="number" min={0} step={0.001} value={minStock} onChange={(e) => setMinStock(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Stock maximum</span>
          <Input type="number" min={0} step={0.001} value={maxStock} onChange={(e) => setMaxStock(e.target.value)} />
        </label>
      </div>
      {!initial?.id ? (
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Stock initial</span>
          <Input type="number" min={0} step={0.001} value={initialStock} onChange={(e) => setInitialStock(e.target.value)} />
          <span className="mt-1 block text-xs text-ink/45">Créera un mouvement Achat.</span>
        </label>
      ) : null}
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Fournisseur</span>
        <Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
      </label>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={consumable} onChange={(e) => setConsumable(e.target.checked)} />
          Consommable (services)
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={sellable} onChange={(e) => setSellable(e.target.checked)} />
          Vendable
        </label>
      </div>
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Notes</span>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
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
