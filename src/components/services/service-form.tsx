"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, Textarea } from "@/components/ui/select";
import { ServiceCommissionForm, type CommissionLink } from "@/components/services/service-commission-form";
import { ServiceProductSelector, type ProductLink } from "@/components/services/service-product-selector";
import { ServiceResourceSelector, type ResourceLink } from "@/components/services/service-resource-selector";
import { ServiceStaffSelector } from "@/components/services/service-staff-selector";
import { DURATION_PRESETS } from "@/components/services/services-helpers";
import { cn } from "@/lib/utils";
import type { CreateServiceInput, ServiceDetail, ServiceFormOptions } from "@/types/service";
import { SERVICE_CATEGORIES } from "@/types/service";

type ServiceFormProps = {
  initial?: Partial<ServiceDetail>;
  options: ServiceFormOptions;
  extraCategories?: string[];
  canEditPrice?: boolean;
  submitting?: boolean;
  onSubmit: (data: CreateServiceInput) => void;
  onCancel: () => void;
};

export function ServiceForm({
  initial,
  options,
  extraCategories = [],
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
  const [recommendedReturnDays, setRecommendedReturnDays] = useState(
    initial?.recommendedReturnDays?.toString() ?? "",
  );
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
  const [active, setActive] = useState(initial?.active ?? true);

  const categoryOptions = Array.from(
    new Set([...SERVICE_CATEGORIES, ...extraCategories, category].filter(Boolean)),
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
      recommendedReturnDays: recommendedReturnDays
        ? Number(recommendedReturnDays)
        : null,
      active,
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
          {categoryOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
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
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1.5 block font-medium">Durée calibrée pour l’agenda *</span>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {DURATION_PRESETS.map((min) => (
              <button
                key={min}
                type="button"
                onClick={() => setDurationMin(String(min))}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-[12px] font-semibold",
                  Number(durationMin) === min
                    ? "bg-primary text-white shadow-sm"
                    : "bg-[#FCE9F4] text-ink hover:bg-[#F6E3EF]",
                )}
              >
                {min} min
              </button>
            ))}
          </div>
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

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Relance post-prestation (jours)</span>
        <Input
          type="number"
          min={1}
          placeholder="Ex. 30 — vide = délai institut"
          value={recommendedReturnDays}
          onChange={(e) => setRecommendedReturnDays(e.target.value)}
        />
        <span className="mt-1 block text-xs text-ink/45">
          Après un RDV COMPLETED, propose une relance WhatsApp à J+N.
        </span>
      </label>

      <div>
        <span className="mb-1.5 block text-sm font-medium">Employées autorisées</span>
        <p className="mb-2 text-[11px] text-ink/45">
          Seules les employées cochées seront proposées à la prise de rendez-vous pour ce soin.
        </p>
        <ServiceStaffSelector options={options.staff} value={staffIds} onChange={setStaffIds} />
      </div>

      <div className="flex items-center justify-between rounded-xl bg-[#FFEFF8] p-3">
        <div>
          <p className="text-sm font-semibold text-ink">Statut du service</p>
          <p className="text-[12px] text-ink/50">Visible dans l’agenda et le catalogue s’il est actif.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={active}
          onClick={() => setActive((v) => !v)}
          className={cn(
            "relative h-6 w-11 rounded-full transition-colors",
            active ? "bg-emerald-600" : "bg-ink/20",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
              active ? "translate-x-5" : "translate-x-0.5",
            )}
          />
        </button>
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
