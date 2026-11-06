"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/select";
import { ServiceImageUpload } from "@/components/services/service-image-upload";
import { ServiceResponsiveImage } from "@/components/services/service-responsive-image";
import { ServiceStaffSelector } from "@/components/services/service-staff-selector";
import { DURATION_PRESETS, SERVICE_NAME_SUGGESTIONS } from "@/components/services/services-helpers";
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

function isCatalogDefaultUrl(url: string | null | undefined) {
  return Boolean(url && url.includes("/services/platform/"));
}

function catalogImageForName(name: string, defaults: Record<string, string>): string | null {
  const exact = SERVICE_NAME_SUGGESTIONS.find((item) => item.toLowerCase() === name.trim().toLowerCase());
  if (!exact) return null;
  return defaults[exact] ?? null;
}

export function ServiceForm({
  initial,
  options,
  canEditPrice = true,
  submitting,
  onSubmit,
  onCancel,
}: ServiceFormProps) {
  const isCreate = !initial?.id;
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(initial?.price?.toString() ?? "");
  const [durationMin, setDurationMin] = useState(initial?.durationMin?.toString() ?? "60");
  const [staffIds, setStaffIds] = useState<string[]>(initial?.staff?.map((s) => s.staffId) ?? []);
  const [imageUrl, setImageUrl] = useState<string | null>(initial?.imageUrl ?? null);
  const [active, setActive] = useState(initial?.active ?? true);
  const [nameOpen, setNameOpen] = useState(false);
  const [catalogDefaults, setCatalogDefaults] = useState<Record<string, string>>({});
  const nameBox = useRef<HTMLDivElement>(null);
  const nameQuery = name.trim().toLowerCase();
  const nameSuggestions = SERVICE_NAME_SUGGESTIONS.filter((item) =>
    nameQuery ? item.toLowerCase().includes(nameQuery) : true,
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/api/services/catalog-defaults/", { credentials: "include", cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { defaults?: Record<string, string> };
        if (!cancelled) setCatalogDefaults(data.defaults ?? {});
      })
      .catch(() => {
        /* ignore — suggestions restent utilisables sans image */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isCreate) return;
    setImageUrl(catalogImageForName(name, catalogDefaults));
  }, [isCreate, name, catalogDefaults]);

  function applySuggestedName(item: string) {
    setName(item);
    setNameOpen(false);
    if (!isCreate) {
      const defaultImage = catalogDefaults[item] ?? null;
      if (!defaultImage) return;
      if (!imageUrl || isCatalogDefaultUrl(imageUrl)) {
        setImageUrl(defaultImage);
      }
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const resolvedImage = isCreate
      ? catalogImageForName(trimmedName, catalogDefaults)
      : imageUrl;

    onSubmit({
      name: trimmedName,
      description: description.trim() || undefined,
      price: Number(price),
      durationMin: Number(durationMin),
      imageUrl: resolvedImage,
      active,
      staffIds,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isCreate ? (
        imageUrl ? (
          <div>
            <span className="mb-1.5 block text-sm font-medium">Photo du service</span>
            <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-[20px] border border-[#EAC4D5] bg-[#FFF5F9]">
              <ServiceResponsiveImage
                imageUrl={imageUrl}
                alt={name || "Photo du service"}
                variant="main"
                className="h-full w-full object-cover"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-ink/45">Image catalogue du soin sélectionné.</p>
          </div>
        ) : null
      ) : (
        <div>
          <span className="mb-1.5 block text-sm font-medium">Photo du service</span>
          <ServiceImageUpload value={imageUrl} onChange={setImageUrl} disabled={submitting} />
          {isCatalogDefaultUrl(imageUrl) ? (
            <p className="mt-1.5 text-[11px] text-ink/45">
              Image catalogue par défaut — vous pouvez la remplacer par votre photo.
            </p>
          ) : null}
        </div>
      )}

      <div className="block text-sm">
        <span className="mb-1.5 block font-medium">Nom *</span>
        <div ref={nameBox} className="relative">
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameOpen(true);
            }}
            onFocus={() => setNameOpen(true)}
            onBlur={(e) => {
              if (nameBox.current?.contains(e.relatedTarget as Node | null)) return;
              setNameOpen(false);
            }}
            required
            placeholder="Choisir ou saisir un soin"
            autoComplete="off"
            role="combobox"
            aria-expanded={nameOpen}
            aria-autocomplete="list"
          />
          {nameOpen && nameSuggestions.length > 0 ? (
            <ul className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-line bg-white py-1 shadow-soft">
              {nameSuggestions.map((item) => {
                const thumb = catalogDefaults[item];
                return (
                  <li key={item}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-ink hover:bg-[#FFEFF8]"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applySuggestedName(item)}
                    >
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt="" className="h-8 w-8 rounded-lg object-cover" />
                      ) : (
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FCE9F4] text-[10px] font-bold text-primary">
                          {item.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                      <span>{item}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
        <p className="mt-1 text-[12px] text-ink/45">Choisissez dans la liste, ou saisissez un autre nom.</p>
      </div>

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
        <span className="mb-1.5 block text-sm font-medium">Employées</span>
        <p className="mb-2 text-[12px] leading-5 text-ink/50">
          Toutes les employées de l’institut. Cochez celles qui réalisent ce soin.
        </p>
        <ServiceStaffSelector options={options.staff} value={staffIds} onChange={setStaffIds} />
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl bg-[#FFEFF8] p-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">Statut du service</p>
          <p className="text-[12px] font-semibold text-ink">{active ? "Actif" : "Inactif"}</p>
          <p className="mt-1 text-[12px] leading-5 text-ink/55">
            {active
              ? "Actif : le soin est proposé dans l’agenda et à la réservation. Les clientes peuvent le choisir."
              : "Inactif : le soin reste enregistré, mais il n’est plus proposé à la réservation."}
          </p>
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
