"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, Textarea } from "@/components/ui/select";
import { ServiceCommissionForm, type CommissionLink } from "@/components/services/service-commission-form";
import { ServiceProductSelector, type ProductLink } from "@/components/services/service-product-selector";
import { ServiceResourceSelector, type ResourceLink } from "@/components/services/service-resource-selector";
import { ServiceStaffSelector } from "@/components/services/service-staff-selector";
import type { CreateServiceInput, ServiceDetail, ServiceFormOptions } from "@/types/service";
import { SERVICE_CATEGORIES } from "@/types/service";

type ServiceFormProps = {
  initial?: Partial<ServiceDetail>;
  options: ServiceFormOptions;
  canEditPrice?: boolean;
  submitting?: boolean;
  onSubmit: (data: CreateServiceInput) => void;
  onCancel: () => void;
};

export function ServiceForm({
  initial,
  options,
  canEditPrice = true,
  submitting,
  onSubmit,
  onCancel,
}: ServiceFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(initial?.price?.toString() ?? "");
  const [durationMin, setDurationMin] = useState(initial?.durationMin?.toString() ?? "60");
  const [prepTimeMin, setPrepTimeMin] = useState(initial?.prepTimeMin?.toString() ?? "0");
  const [cleanupTimeMin, setCleanupTimeMin] = useState(initial?.cleanupTimeMin?.toString() ?? "0");
  const [deposit, setDeposit] = useState(initial?.deposit?.toString() ?? "");
  const [staffIds, setStaffIds] = useState<string[]>(initial?.staff?.map((s) => s.staffId) ?? []);
  const [resources, setResources] = useState<ResourceLink[]>(
    initial?.resources?.map((r) => ({ resourceId: r.resourceId, quantity: r.quantity })) ?? [],
  );
  const [products, setProducts] = useState<ProductLink[]>(
    initial?.products?.map((p) => ({
      productId: p.productId,
      quantity: p.quantity,
      unit: p.unit,
    })) ?? [],
  );
  const [commissions, setCommissions] = useState<CommissionLink[]>(
    initial?.commissions?.map((c) => ({
      staffId: c.staffId,
      type: c.type,
      percentage: c.percentage ?? undefined,
      fixedAmount: c.fixedAmount ?? undefined,
    })) ?? [],
  );
  const [showAdvanced, setShowAdvanced] = useState(
    Boolean(initial?.resources?.length || initial?.products?.length || initial?.commissions?.length),
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      name: name.trim(),
      category: category.trim() || undefined,
      description: description.trim() || undefined,
      price: Number(price),
      durationMin: Number(durationMin),
      prepTimeMin: Number(prepTimeMin) || 0,
      cleanupTimeMin: Number(cleanupTimeMin) || 0,
      deposit: deposit ? Number(deposit) : undefined,
      staffIds,
      resources,
      products,
      commissions,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Nom *</span>
        <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Hydrafacial" />
      </label>

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Catégorie</span>
        <Select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">—</option>
          {SERVICE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
          {category && !SERVICE_CATEGORIES.includes(category as (typeof SERVICE_CATEGORIES)[number]) ? (
            <option value={category}>{category}</option>
          ) : null}
        </Select>
      </label>

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Description</span>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Détails de la prestation…"
          rows={3}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Prix (MAD) *</span>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            disabled={!canEditPrice}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Durée (min) *</span>
          <Input
            type="number"
            min={1}
            value={durationMin}
            onChange={(e) => setDurationMin(e.target.value)}
            required
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Préparation (min)</span>
          <Input type="number" min={0} value={prepTimeMin} onChange={(e) => setPrepTimeMin(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Nettoyage (min)</span>
          <Input
            type="number"
            min={0}
            value={cleanupTimeMin}
            onChange={(e) => setCleanupTimeMin(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Acompte (MAD)</span>
          <Input type="number" min={0} value={deposit} onChange={(e) => setDeposit(e.target.value)} />
        </label>
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium">Employées autorisées</span>
        <ServiceStaffSelector options={options.staff} value={staffIds} onChange={setStaffIds} />
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="text-sm text-primary hover:underline"
      >
        {showAdvanced ? "Masquer ressources & stock" : "Ressources, produits & commissions"}
      </button>

      {showAdvanced ? (
        <div className="space-y-4 border-t border-line pt-4">
          <div>
            <span className="mb-1.5 block text-sm font-medium">Ressources nécessaires</span>
            <ServiceResourceSelector options={options.resources} value={resources} onChange={setResources} />
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-medium">Produits consommés</span>
            <ServiceProductSelector options={options.products} value={products} onChange={setProducts} />
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-medium">Commissions par employée</span>
            <ServiceCommissionForm
              staffOptions={options.staff}
              allowedStaffIds={staffIds}
              value={commissions}
              onChange={setCommissions}
            />
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 border-t border-line pt-4 sm:flex-row">
        <Button type="button" variant="ghost" className="w-full sm:flex-1" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" variant="primary" className="w-full sm:flex-1" disabled={submitting}>
          {submitting ? "Enregistrement…" : initial?.id ? "Enregistrer" : "Créer le service"}
        </Button>
      </div>
    </form>
  );
}
