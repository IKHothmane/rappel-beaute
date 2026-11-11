"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, MapPin, Plus, Search, Star, Store, Users } from "lucide-react";
import { adminHref } from "@/lib/admin/href";
import { cn } from "@/lib/utils";
import type { OrganizationListItem, OrganizationStatus } from "@/types/platform";
import { OrganizationDetailModal } from "./OrganizationDetailModal";

export type OrganizationCard = OrganizationListItem & {
  coverUrl: string | null;
  staffCount: number;
  rating: number | null;
  reviewCount: number;
};

type Filter = "all" | "active" | "inactive";

const STATUS_STYLE: Record<OrganizationStatus, { label: string; className: string; dot: string }> = {
  ACTIVE: { label: "Actif", className: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  SUSPENDED: { label: "Suspendu", className: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  ARCHIVED: { label: "Archivé", className: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
};

export function StatusPill({
  status,
  className,
}: {
  status: OrganizationStatus;
  className?: string;
}) {
  const s = STATUS_STYLE[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        s.className,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} aria-hidden />
      {s.label}
    </span>
  );
}

export function OrganizationCover({
  src,
  name,
  className,
}: {
  src: string | null;
  name: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={`Visuel de ${name}`}
        loading="lazy"
        onError={() => setFailed(true)}
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center bg-gradient-to-br from-[#E8ECF8] via-[#F3E8F0] to-[#FBEFE6] text-slate-400",
        className,
      )}
      aria-hidden
    >
      <Store className="h-10 w-10" strokeWidth={1.5} />
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl bg-white p-4 shadow-sm motion-reduce:animate-none">
      <div className="aspect-[4/3] rounded-xl bg-slate-100" />
      <div className="mt-4 h-5 w-2/3 rounded bg-slate-100" />
      <div className="mt-3 h-4 w-full rounded bg-slate-100" />
      <div className="mt-5 h-4 w-1/2 rounded bg-slate-100" />
      <div className="mt-5 h-11 rounded-xl bg-slate-100" />
    </div>
  );
}

export function OrganizationsView() {
  const [items, setItems] = useState<OrganizationCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/organizations/", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Erreur ${res.status}`);
      }
      const data = (await res.json()) as { items: OrganizationCard[] };
      setItems(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const active = items.filter((o) => o.status === "ACTIVE").length;
    return { all: items.length, active, inactive: items.length - active };
  }, [items]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((o) => {
      if (filter === "active" && o.status !== "ACTIVE") return false;
      if (filter === "inactive" && o.status === "ACTIVE") return false;
      if (!q) return true;
      return [o.name, o.city, o.slug, o.ownerName, o.ownerEmail, o.email]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [items, filter, query]);

  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: "Tous" },
    { key: "active", label: "Actif" },
    { key: "inactive", label: "Inactif" },
  ];

  return (
    <div className="mx-auto max-w-[1400px]">
      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold sm:text-3xl tracking-tight text-[#0F172A]">Instituts</h1>
          <p className="mt-1.5 max-w-md text-sm text-slate-500">
            Gérez l’ensemble de vos instituts et salons de beauté
          </p>
        </div>
        <div className="flex w-full items-center gap-3 lg:w-auto">
          <div className="relative min-w-0 flex-1 lg:w-80 lg:flex-none">
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
          <Link
            href={adminHref("/notifications/")}
            aria-label="Notifications"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:text-slate-900"
          >
            <Bell className="h-5 w-5" />
          </Link>
          <Link
            href={adminHref("/organizations/new/")}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[#3B63D6] px-4 text-sm font-semibold text-white shadow-lg shadow-[#3B63D6]/25 transition hover:bg-[#2F52B8] sm:px-5"
          >
            <Plus className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Nouvel Institut</span>
            <span className="sm:hidden">Nouveau</span>
          </Link>
        </div>
      </header>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center gap-2" role="tablist" aria-label="Filtrer par statut">
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
              <article
                className={cn(
                  "flex w-full flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-md",
                  org.status !== "ACTIVE" && "opacity-90",
                )}
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100">
                  <OrganizationCover src={org.coverUrl ?? org.logoUrl} name={org.name} />
                  <StatusPill status={org.status} className="absolute right-3 top-3 bg-white/95 shadow-sm" />
                </div>

                <h2 className="mt-4 truncate text-lg font-bold text-[#0F172A]">{org.name}</h2>
                <p className="mt-1.5 flex items-start gap-1.5 text-sm text-slate-500">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span className="line-clamp-2">{org.city ?? "Ville non renseignée"}</span>
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
                  {org.rating != null ? (
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
                      <strong className="font-bold text-slate-900">{org.rating.toFixed(1)}</strong>
                      <span className="text-xs text-slate-400">({org.reviewCount} avis)</span>
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">Pas encore d’avis</span>
                  )}
                  <span aria-hidden className="text-slate-300">
                    ·
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-4 w-4 text-slate-400" aria-hidden />
                    {org.staffCount} employé{org.staffCount > 1 ? "s" : ""}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedId(org.id)}
                  className="mt-5 h-11 w-full rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-800 transition hover:border-[#3B63D6] hover:text-[#3B63D6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B63D6]"
                >
                  Voir détails
                </button>
              </article>
            </li>
          ))}
        </ul>
      )}

      {selectedId ? (
        <OrganizationDetailModal
          organizationId={selectedId}
          fallback={items.find((o) => o.id === selectedId) ?? null}
          onClose={() => setSelectedId(null)}
          onChanged={() => void load()}
          onDeleted={() => {
            setSelectedId(null);
            void load();
          }}
        />
      ) : null}
    </div>
  );
}
