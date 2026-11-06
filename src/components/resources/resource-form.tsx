"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ServiceResponsiveImage } from "@/components/services/service-responsive-image";
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
  const isCreate = !initial?.id;
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<ResourceType>(initial?.type ?? "CABINE");
  const [active, setActive] = useState(initial?.active ?? true);
  const [catalogDefaults, setCatalogDefaults] = useState<Partial<Record<ResourceType, string>>>({});
  const [serviceIds, setServiceIds] = useState<string[]>(
    initial?.services?.map((s) => s.serviceId) ?? [],
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/api/resources/catalog-defaults/", { credentials: "include", cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { defaults?: Partial<Record<ResourceType, string>> };
        if (!cancelled) setCatalogDefaults(data.defaults ?? {});
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const previewUrl = isCreate
    ? catalogDefaults[type] ?? null
    : initial?.imageUrl ?? catalogDefaults[type] ?? null;

  function toggleService(id: string) {
    setServiceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      name: name.trim(),
      type,
      capacity: initial?.capacity ?? 1,
      active,
      serviceIds: services ? serviceIds : undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {previewUrl ? (
        <div>
          <span className="mb-1.5 block text-sm font-medium">Photo du type</span>
          <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-[20px] border border-[#EAC4D5] bg-[#FFF5F9]">
            <ServiceResponsiveImage
              imageUrl={previewUrl}
              alt={RESOURCE_TYPE_LABEL[type]}
              variant="main"
              className="h-full w-full object-cover"
            />
          </div>
          <p className="mt-1.5 text-[11px] text-ink/45">
            Image catalogue « {RESOURCE_TYPE_LABEL[type]} ».
          </p>
        </div>
      ) : null}

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">Nom *</span>
        <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Cabine Privilège 3" />
      </label>

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
