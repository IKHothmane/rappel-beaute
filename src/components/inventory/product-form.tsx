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
  const [purchasePrice, setPurchasePrice] = useState(initial?.purchasePrice?.toString() ?? "0");
  const [salePrice, setSalePrice] = useState(initial?.salePrice?.toString() ?? "");
  const [minStock, setMinStock] = useState(initial?.minStock?.toString() ?? "0");
  const [maxStock, setMaxStock] = useState(initial?.maxStock?.toString() ?? "");
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
      purchasePrice: Number(purchasePrice) || 0,
      salePrice: salePrice ? Number(salePrice) : undefined,
      minStock: Number(minStock) || 0,
      maxStock: maxStock ? Number(maxStock) : undefined,
      supplierName: supplierName.trim() || undefined,
      consumable: initial?.id ? initial.consumable ?? true : true,
      sellable: initial?.id ? initial.sellable ?? true : true,
      notes: initial?.notes ?? undefined,
      initialStock: !initial?.id && initialStock ? Number(initialStock) : undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Nom *</span>
        <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Sérum 30 ml" />
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
