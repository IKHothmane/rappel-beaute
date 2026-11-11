"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { CheckCircle2, ImagePlus, Loader2, MapPin, Palette, Search, Sparkles, Store, Trash2, X } from "lucide-react";
import {
  fetchOrganizations,
  removeOrganizationCardBackground,
  uploadOrganizationCardBackground,
} from "@/modules/admin/client";
import type { OrganizationListItem } from "@/types/platform";
import { loyaltyCardBackgroundStyle } from "@/lib/loyalty/card-background";
import { cn } from "@/lib/utils";
import { StatusPill } from "./OrganizationsView";

type LoyaltyOrg = OrganizationListItem & { cardBackgroundUrl: string | null };
type Filter = "all" | "custom" | "default";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const STAMPS_TOTAL = 10;

/** Aperçu de la carte de fidélité : même rendu dans la grille et dans le modal. */
function LoyaltyCardPreview({
  name,
  city,
  backgroundUrl,
  compact = false,
}: {
  name: string;
  city: string | null;
  backgroundUrl: string | null;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative aspect-[1.75/1] w-full overflow-hidden text-white",
        compact ? "p-4" : "rounded-3xl p-5 shadow-xl ring-1 ring-black/10 sm:p-6",
      )}
      style={{ background: loyaltyCardBackgroundStyle(backgroundUrl) }}
      role="img"
      aria-label={`Carte fidélité de ${name}`}
    >
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-black/25" />
      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#E8C56B]">Carte fidélité</p>
          <Sparkles className="h-4 w-4 text-[#E8C56B]" aria-hidden />
        </div>
        <div>
          <p
            className={cn(
              "line-clamp-2 font-display leading-tight drop-shadow",
              compact ? "text-xl" : "text-2xl sm:text-3xl",
            )}
          >
            {name}
          </p>
          {city ? <p className="mt-0.5 text-xs text-white/75">{city}</p> : null}
        </div>
        <div>
          <div className="flex gap-1.5" aria-hidden>
            {Array.from({ length: STAMPS_TOTAL }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "flex-1 rounded-full border",
                  compact ? "h-3.5" : "h-5",
                  i < 4 ? "border-[#E8C56B] bg-[#E8C56B]/90" : "border-white/40 bg-white/10",
                )}
              />
            ))}
          </div>
          {!compact ? <p className="mt-2 text-xs text-white/80">4 / {STAMPS_TOTAL} passages · exemple</p> : null}
        </div>
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl bg-white p-4 shadow-sm motion-reduce:animate-none">
      <div className="aspect-[1.75/1] rounded-xl bg-slate-100" />
      <div className="mt-4 h-5 w-2/3 rounded bg-slate-100" />
      <div className="mt-3 h-4 w-1/2 rounded bg-slate-100" />
      <div className="mt-5 h-11 rounded-xl bg-slate-100" />
    </div>
  );
}

function CardEditorModal({
  org,
  onClose,
  onBackgroundChange,
}: {
  org: LoyaltyOrg;
  onClose: () => void;
  onBackgroundChange: (id: string, url: string | null) => void;
}) {
  const titleId = useId();
  const fileInputId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  async function save(file: File) {
    if (file.size > MAX_IMAGE_BYTES) {
      setError("Image trop lourde : 2 Mo maximum.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const url = await uploadOrganizationCardBackground(org.id, file);
      onBackgroundChange(org.id, url);
      setNotice("Image de la carte enregistrée.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function clear() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await removeOrganizationCardBackground(org.id);
      onBackgroundChange(org.id, null);
      setNotice("Image retirée, fond par défaut rétabli.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retrait impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="rb-fullscreen-overlay fixed z-[70] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative my-auto w-full max-w-[520px] rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
      >
        <header className="mb-4 flex items-center justify-between">
          <h2 id={titleId} className="text-xl font-bold text-[#0F172A]">
            Carte de fidélité
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="relative">
          <LoyaltyCardPreview name={org.name} city={org.city} backgroundUrl={org.cardBackgroundUrl} />
          {busy ? (
            <div role="status" className="absolute inset-0 flex items-center justify-center rounded-3xl bg-white/60 backdrop-blur-[1px]">
              <Loader2 className="h-6 w-6 animate-spin text-[#3B63D6]" aria-label="Chargement" />
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <h3 className="min-w-0 truncate text-lg font-bold text-slate-900">{org.name}</h3>
          <StatusPill status={org.status} />
        </div>

        {error ? (
          <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p role="status" className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
            {notice}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          <label
            htmlFor={fileInputId}
            aria-disabled={busy}
            className={cn(
              "inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-[#3B63D6] px-5 text-sm font-semibold text-white shadow-md shadow-[#3B63D6]/25 transition hover:bg-[#2F52B8] focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#3B63D6]",
              busy && "pointer-events-none opacity-60",
            )}
          >
            <ImagePlus className="h-4 w-4" aria-hidden />
            {org.cardBackgroundUrl ? "Changer l’image" : "Ajouter une image"}
          </label>
          {org.cardBackgroundUrl ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void clear()}
              className="inline-flex h-11 items-center gap-2 rounded-xl border-2 border-red-200 px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Retirer
            </button>
          ) : null}
        </div>
        <p className="mt-3 text-xs text-slate-400">PNG, JPG ou WEBP · 2 Mo maximum · format paysage recommandé.</p>
        <input
          id={fileInputId}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void save(file);
            event.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

export function AdminLoyaltyView() {
  const [items, setItems] = useState<LoyaltyOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await fetchOrganizations();
      setItems(result.items as LoyaltyOrg[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Liste indisponible.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const closeEditor = useCallback(() => setSelectedId(null), []);

  const updateBackground = useCallback((id: string, url: string | null) => {
    setItems((rows) => rows.map((row) => (row.id === id ? { ...row, cardBackgroundUrl: url } : row)));
  }, []);

  const counts = useMemo(() => {
    const custom = items.filter((o) => o.cardBackgroundUrl).length;
    return { all: items.length, custom, default: items.length - custom };
  }, [items]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((o) => {
      if (filter === "custom" && !o.cardBackgroundUrl) return false;
      if (filter === "default" && o.cardBackgroundUrl) return false;
      if (!needle) return true;
      return o.name.toLowerCase().includes(needle) || (o.city ?? "").toLowerCase().includes(needle);
    });
  }, [items, query, filter]);

  const selected = items.find((o) => o.id === selectedId) ?? null;

  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: "Tous" },
    { key: "custom", label: "Personnalisée" },
    { key: "default", label: "Par défaut" },
  ];

  return (
    <div className="mx-auto max-w-[1400px]">
      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold sm:text-3xl tracking-tight text-[#0F172A]">Fidélité</h1>
          <p className="mt-1.5 max-w-md text-sm text-slate-500">
            Personnalisez la carte de fidélité de chaque institut
          </p>
        </div>
        <div className="relative w-full lg:w-80">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un institut…"
            aria-label="Rechercher un institut"
            className="h-11 w-full rounded-xl border-0 bg-white pl-10 pr-4 text-sm text-slate-900 shadow-sm outline-none ring-1 ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-[#3B63D6]/40"
          />
        </div>
      </header>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Filtrer les cartes">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={filter === t.key}
              onClick={() => setFilter(t.key)}
              className={cn(
                "rounded-lg border px-4 py-1.5 text-sm font-semibold transition",
                filter === t.key
                  ? "border-[#3B63D6] bg-[#3B63D6] text-white shadow-sm"
                  : "border-slate-300 bg-white text-slate-600 hover:border-slate-400",
              )}
            >
              {t.label}
              <span className={cn("ml-1.5 text-xs", filter === t.key ? "text-white/80" : "text-slate-400")}>
                {counts[t.key]}
              </span>
            </button>
          ))}
        </div>
        <p className="text-sm font-medium text-slate-600">
          {loading ? "Chargement…" : `${counts.all} institut${counts.all > 1 ? "s" : ""} au total`}
        </p>
      </div>

      {error ? (
        <div role="alert" className="mb-6 flex items-center justify-between gap-3 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void load();
            }}
            className="rounded-lg bg-white px-3 py-1.5 font-semibold shadow-sm"
          >
            Réessayer
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : visible.length === 0 && !error ? (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
          <Store className="mx-auto h-10 w-10 text-slate-300" strokeWidth={1.5} aria-hidden />
          <p className="mt-3 text-sm font-semibold text-slate-700">Aucun institut trouvé</p>
          <p className="mt-1 text-sm text-slate-500">Modifiez la recherche ou le filtre pour voir d’autres résultats.</p>
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((org) => (
            <li key={org.id} className="flex">
              <article className="flex w-full flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="relative overflow-hidden rounded-xl">
                  <LoyaltyCardPreview name={org.name} city={org.city} backgroundUrl={org.cardBackgroundUrl} compact />
                  <StatusPill status={org.status} className="absolute right-3 top-3 bg-white/95 shadow-sm" />
                </div>

                <h2 className="mt-4 truncate text-lg font-bold text-[#0F172A]">{org.name}</h2>
                <p className="mt-1.5 flex items-start gap-1.5 text-sm text-slate-500">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span className="line-clamp-2">{org.city ?? "Ville non renseignée"}</span>
                </p>
                <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-600">
                  <Palette className="h-4 w-4 text-slate-400" aria-hidden />
                  {org.cardBackgroundUrl ? "Image personnalisée" : "Fond par défaut"}
                </p>

                <button
                  type="button"
                  onClick={() => setSelectedId(org.id)}
                  className="mt-5 h-11 w-full rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-800 transition hover:border-[#3B63D6] hover:text-[#3B63D6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B63D6]"
                >
                  Personnaliser la carte
                </button>
              </article>
            </li>
          ))}
        </ul>
      )}

      {selected ? (
        <CardEditorModal org={selected} onClose={closeEditor} onBackgroundChange={updateBackground} />
      ) : null}
    </div>
  );
}
