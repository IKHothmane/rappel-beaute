"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/select";
import { ServiceStaffSelector } from "@/components/services/service-staff-selector";
import { DURATION_PRESETS } from "@/components/services/services-helpers";
import { cn } from "@/lib/utils";
import type { CreateServiceInput, ServiceDetail, ServiceFormOptions } from "@/types/service";

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
  canEditPrice = true,
  submitting,
  onSubmit,
  onCancel,
}: ServiceFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(initial?.price?.toString() ?? "");
  const [durationMin, setDurationMin] = useState(initial?.durationMin?.toString() ?? "60");
  const [staffIds, setStaffIds] = useState<string[]>(initial?.staff?.map((s) => s.staffId) ?? []);
  const [active, setActive] = useState(initial?.active ?? true);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      price: Number(price),
      durationMin: Number(durationMin),
      active,
      staffIds,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Nom *</span>
        <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Hydrafacial" />
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
        <span className="mb-1.5 block font-medium">Durée *</span>
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

      <div>
        <span className="mb-1.5 block text-sm font-medium">Employées autorisées</span>
        <ServiceStaffSelector options={options.staff} value={staffIds} onChange={setStaffIds} />
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl bg-[#FFEFF8] p-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">Statut du service</p>
          <p className="text-[12px] text-ink/50">{active ? "Actif" : "Inactif"}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={active}
          aria-label={active ? "Désactiver le service" : "Activer le service"}
          onClick={() => setActive((v) => !v)}
          className={cn(
            "inline-flex h-7 w-12 shrink-0 items-center rounded-full border-0 p-0.5 shadow-inner transition-colors",
            "appearance-none outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            active ? "justify-end bg-emerald-600" : "justify-start bg-ink/25",
          )}
        >
          <span className="block h-6 w-6 rounded-full bg-white shadow-sm" />
        </button>
      </div>

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
