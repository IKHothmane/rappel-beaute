import { ChevronDown, RotateCcw, Search } from "lucide-react";
import type { ReactNode } from "react";
import {
  CATEGORY_LABEL,
  HAS_LABEL,
  PROSPECT_CATEGORIES,
  PROSPECT_STATUSES,
  SORT_LABEL,
  STATUS_LABEL,
  type ProspectFilters,
  type ProspectHas,
  type ProspectSort,
} from "@/lib/admin/prospects-client";
import { cn } from "@/lib/utils";

const selectCls =
  "h-11 w-full appearance-none rounded-xl border-0 bg-slate-100 pl-3 pr-9 text-sm text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-[#3B63D6]/40";

function FilterSelect({
  id,
  label,
  value,
  onChange,
  children,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </label>
      <div className="relative">
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={selectCls}>
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
      </div>
    </div>
  );
}

const nf = new Intl.NumberFormat("fr-FR");

export function ProspectsFilters({
  searchInput,
  onSearchInput,
  filters,
  cities,
  onChange,
  onReset,
  canReset,
}: {
  searchInput: string;
  onSearchInput: (value: string) => void;
  filters: ProspectFilters;
  cities: { city: string; count: number }[];
  onChange: (patch: Partial<ProspectFilters>) => void;
  onReset: () => void;
  canReset: boolean;
}) {
  // La ville sélectionnée reste proposée même si elle sort de la liste renvoyée.
  const cityOptions =
    filters.city && !cities.some((c) => c.city === filters.city) ? [{ city: filters.city, count: 0 }, ...cities] : cities;

  return (
    <section aria-label="Recherche et filtres" className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100 sm:p-4">
      <form role="search" onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label htmlFor="prospects-search" className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Recherche
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                id="prospects-search"
                type="search"
                value={searchInput}
                onChange={(e) => onSearchInput(e.target.value)}
                placeholder="Nom, ville ou téléphone…"
                autoComplete="off"
                enterKeyHint="search"
                maxLength={100}
                className="h-11 w-full rounded-xl border-0 bg-slate-100 pl-10 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#3B63D6]/40"
              />
            </div>
          </div>
          {canReset ? (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#3B63D6]"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              Réinitialiser
            </button>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
          <FilterSelect id="prospects-city" label="Ville" value={filters.city} onChange={(city) => onChange({ city })}>
            <option value="">Toutes les villes</option>
            {cityOptions.map((c) => (
              <option key={c.city} value={c.city}>
                {c.count > 0 ? `${c.city} (${nf.format(c.count)})` : c.city}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            id="prospects-category"
            label="Catégorie"
            value={filters.category}
            onChange={(v) => onChange({ category: v as ProspectFilters["category"] })}
          >
            <option value="">Toutes les catégories</option>
            {PROSPECT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            id="prospects-status"
            label="Statut"
            value={filters.status}
            onChange={(v) => onChange({ status: v as ProspectFilters["status"] })}
          >
            <option value="">Tous les statuts</option>
            {PROSPECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect id="prospects-has" label="Coordonnées" value={filters.has} onChange={(v) => onChange({ has: v as ProspectHas | "" })}>
            <option value="">Toutes les fiches</option>
            {(Object.keys(HAS_LABEL) as ProspectHas[]).map((h) => (
              <option key={h} value={h}>
                {HAS_LABEL[h]}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            id="prospects-sort"
            label="Trier par"
            value={filters.sort}
            onChange={(v) => onChange({ sort: v as ProspectSort })}
            className="col-span-2 md:col-span-1"
          >
            {(Object.keys(SORT_LABEL) as ProspectSort[]).map((s) => (
              <option key={s} value={s}>
                {SORT_LABEL[s]}
              </option>
            ))}
          </FilterSelect>
        </div>
      </form>
    </section>
  );
}
