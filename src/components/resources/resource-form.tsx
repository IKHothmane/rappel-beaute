"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, Textarea } from "@/components/ui/select";
import type { CreateResourceInput, ResourceDetail, ResourceType } from "@/types/resource";
import { RESOURCE_TYPE_LABEL, RESOURCE_TYPES } from "@/types/resource";

type ResourceFormProps = {
  initial?: Partial<ResourceDetail>;
  submitting?: boolean;
  services?: { id: string; name: string }[];
  onSubmit: (data: CreateResourceInput) => void;
  onCancel: () => void;
};

export function ResourceForm({
  initial,
  submitting,
  services,
  onSubmit,
  onCancel,
}: ResourceFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<ResourceType>(initial?.type ?? "CABINE");
  const [capacity, setCapacity] = useState(initial?.capacity?.toString() ?? "1");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [active, setActive] = useState(initial?.active ?? true);
  const [serviceIds, setServiceIds] = useState<string[]>(
    initial?.services?.map((s) => s.serviceId) ?? [],
  );

  function toggleService(id: string) {
    setServiceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      name: name.trim(),
      type,
      capacity: Number(capacity) || 1,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
      active,
      serviceIds: services ? serviceIds : undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Nom *</span>
        <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Cabine Privilège 3" />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Type</span>
          <Select value={type} onChange={(e) => setType(e.target.value as ResourceType)}>
            {RESOURCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {RESOURCE_TYPE_LABEL[t]}
              </option>
            ))}
          </Select>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Capacité</span>
          <Input
            type="number"
            min={1}
            max={6}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Emplacement</span>
        <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="RDC, fond" />
      </label>

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Notes</span>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </label>

      {services && services.length > 0 ? (
        <div>
          <p className="mb-1.5 text-sm font-medium">Prestations associées</p>
          <div className="grid max-h-40 grid-cols-1 gap-1.5 overflow-y-auto rounded-lg bg-[#FFEFF8] p-2 sm:grid-cols-2">
            {services.map((s) => (
              <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded p-1.5 text-[13px] hover:bg-white">
                <input
                  type="checkbox"
                  checked={serviceIds.includes(s.id)}
                  onChange={() => toggleService(s.id)}
                />
                <span className="truncate">{s.name}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {initial?.id ? (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Ressource active
        </label>
      ) : null}

      <div className="flex flex-col gap-2 border-t border-line pt-4 sm:flex-row">
        <Button type="button" variant="ghost" className="w-full sm:flex-1" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" variant="primary" className="w-full sm:flex-1" disabled={submitting}>
          {submitting ? "Enregistrement…" : initial?.id ? "Enregistrer" : "Créer la ressource"}
        </Button>
      </div>
    </form>
  );
}
