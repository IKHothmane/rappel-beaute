"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn, formatMad } from "@/lib/utils";
import type { PromotionType } from "@/types/promo";
import { PROMOTION_CREATABLE_TYPES, PROMOTION_TYPE_HINT, PROMOTION_TYPE_LABEL } from "@/types/promo";
import type { ServiceListItem } from "@/types/service";

/** Choix du type de promotion : cartes avec une courte explication (Forfait et Happy Hour ne sont plus proposés). */
export function PromoTypePicker({
  value,
  onChange,
}: {
  value: PromotionType;
  onChange: (value: PromotionType) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Type de promotion" className="grid gap-2 sm:grid-cols-3">
      {PROMOTION_CREATABLE_TYPES.map((t) => {
        const active = value === t;
        return (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(t)}
            className={cn(
              "flex flex-col items-start gap-0.5 rounded-xl border px-3 py-2.5 text-left transition",
              active
                ? "border-[#981C52] bg-[#FCE9F4] text-[#78133E] shadow-sm"
                : "border-[#EADDE4] bg-white text-[#69515E] hover:bg-[#FAF0F5]",
            )}
          >
            <span className="text-[14px] font-semibold">{PROMOTION_TYPE_LABEL[t]}</span>
            <span className="text-[11px] leading-snug opacity-80">{PROMOTION_TYPE_HINT[t]}</span>
          </button>
        );
      })}
    </div>
  );
}

function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Choix d'une prestation : recherche, regroupement par catégorie, prix et durée. Seules les prestations
 * actives sont proposées. La valeur vide signifie « toutes les prestations ».
 */
export function ServicePicker({
  value,
  onChange,
  services,
}: {
  value: string;
  onChange: (value: string) => void;
  services: ServiceListItem[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    searchRef.current?.focus();
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const selected = services.find((s) => s.id === value) ?? null;

  const groups = useMemo(() => {
    const q = normalize(query.trim());
    const map = new Map<string, ServiceListItem[]>();
    for (const s of services) {
      if (!s.active && s.id !== value) continue;
      if (q && !normalize(`${s.name} ${s.category ?? ""}`).includes(q)) continue;
      const key = s.category?.trim() || "Autres prestations";
      map.set(key, [...(map.get(key) ?? []), s]);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b, "fr"))
      .map(([category, items]) => ({
        category,
        items: items.sort((a, b) => a.name.localeCompare(b.name, "fr")),
      }));
  }, [services, query, value]);

  function pick(id: string) {
    onChange(id);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
        className="flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-line bg-white px-3 text-left text-sm"
      >
        <span className={cn("min-w-0 truncate", selected ? "text-ink" : "text-ink/60")}>
          {selected ? selected.name : "Toutes les prestations"}
        </span>
        <ChevronDown size={16} className="shrink-0 text-ink/35" />
      </button>
      {open ? (
        <div
          className="absolute z-50 mt-2 w-full min-w-[260px] rounded-xl border border-line bg-white p-2 shadow-lg"
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
        >
          <label className="relative mb-2 block">
            <Search size={14} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher une prestation…"
              aria-label="Rechercher une prestation"
              className="h-10 w-full rounded-lg border border-line bg-white pl-8 pr-3 text-sm outline-none focus:border-primary"
            />
          </label>
          <ul id={listId} role="listbox" className="no-scrollbar max-h-64 overflow-auto">
            <li role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={value === ""}
                onClick={() => pick("")}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm hover:bg-[#FBF4F6]",
                  value === "" && "bg-primary-light font-medium text-primary-dark",
                )}
              >
                <span>
                  Toutes les prestations
                  <span className="block text-[11px] font-normal text-ink/50">La promotion s’applique à tout le catalogue</span>
                </span>
                {value === "" ? <Check size={14} aria-hidden="true" /> : null}
              </button>
            </li>
            {groups.map((group) => (
              <li key={group.category} role="presentation">
                <p className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-ink/45">{group.category}</p>
                <ul role="presentation">
                  {group.items.map((s) => (
                    <li key={s.id} role="presentation">
                      <button
                        type="button"
                        role="option"
                        aria-selected={value === s.id}
                        onClick={() => pick(s.id)}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-[#FBF4F6]",
                          value === s.id && "bg-primary-light font-medium text-primary-dark",
                        )}
                      >
                        <span className="min-w-0 truncate">{s.name}</span>
                        <span className="flex shrink-0 items-center gap-2 text-[11px] text-ink/55">
                          {s.durationMin} min · {formatMad(s.price)}
                          {value === s.id ? <Check size={14} aria-hidden="true" /> : null}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
            {groups.length === 0 ? <li className="px-3 py-4 text-center text-sm text-ink/50">Aucune prestation trouvée.</li> : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
