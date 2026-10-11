"use client";

import { useEffect, useRef, useState } from "react";
import { Gift, Search } from "lucide-react";
import {
  fetchOrganization,
  fetchOrganizations,
  removeOrganizationCardBackground,
  uploadOrganizationCardBackground,
} from "@/modules/admin/client";
import type { OrganizationListItem } from "@/types/platform";
import { cn } from "@/lib/utils";

function cardBackground(url: string | null) {
  if (!url) return "linear-gradient(145deg, #4A1024 0%, #7A1838 48%, #3A0E1E 100%)";
  return `linear-gradient(180deg, rgba(18, 8, 12, 0.2), rgba(18, 8, 12, 0.35)), url("${url}") center / cover no-repeat`;
}

export function AdminLoyaltyView() {
  const [items, setItems] = useState<OrganizationListItem[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const selected = items.find((item) => item.id === selectedId) ?? null;

  useEffect(() => {
    let cancelled = false;
    fetchOrganizations()
      .then((result) => {
        if (!cancelled) setItems(result.items);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Liste indisponible.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function selectInstitute(id: string) {
    setSelectedId(id);
    setError(null);
    setBusy(true);
    try {
      const result = await fetchOrganization(id);
      setBackgroundUrl(result.organization.cardBackgroundUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Institut indisponible.");
    } finally {
      setBusy(false);
    }
  }

  async function saveBackground(file: File) {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    try {
      const url = await uploadOrganizationCardBackground(selectedId, file);
      setBackgroundUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image impossible.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function clearBackground() {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    try {
      await removeOrganizationCardBackground(selectedId);
      setBackgroundUrl(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retrait impossible.");
    } finally {
      setBusy(false);
    }
  }

  const visible = items.filter((item) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return (
      item.name.toLowerCase().includes(needle) ||
      (item.city ?? "").toLowerCase().includes(needle)
    );
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 sm:p-6">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Plateforme</p>
        <h1 className="mt-1 font-display text-3xl font-light text-ink">Fidélité</h1>
        <p className="mt-1 text-sm text-ink/60">
          Choisissez l&apos;arrière-plan de la carte de chaque institut.
        </p>
      </header>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(240px,320px)_minmax(0,1fr)]">
        <section className="rounded-2xl border border-line bg-white p-3">
          <label className="flex h-10 items-center gap-2 rounded-xl border border-line px-3">
            <Search className="h-4 w-4 text-ink/40" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher un institut"
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>
          <ul className="mt-3 max-h-[32rem] space-y-1 overflow-y-auto">
            {loading ? <li className="px-2 py-3 text-sm text-ink/45">Chargement…</li> : null}
            {!loading && visible.length === 0 ? (
              <li className="px-2 py-3 text-sm text-ink/45">Aucun institut.</li>
            ) : null}
            {visible.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => void selectInstitute(item.id)}
                  className={cn(
                    "w-full rounded-xl px-3 py-2 text-left",
                    item.id === selectedId ? "bg-[#FFEFF8]" : "hover:bg-[#FFF8FB]",
                  )}
                >
                  <span className="block text-sm font-semibold text-ink">{item.name}</span>
                  <span className="block text-[11px] text-ink/45">{item.city || "Ville non renseignée"}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-line bg-white p-4 sm:p-5">
          {!selected ? (
            <div className="flex min-h-64 flex-col items-center justify-center text-center text-ink/50">
              <Gift className="mb-3 h-8 w-8" />
              <p className="text-sm">Sélectionnez un institut pour modifier sa carte.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-lg font-semibold text-ink">{selected.name}</h2>
                <p className="text-sm text-ink/50">{selected.city || "Ville non renseignée"}</p>
              </div>
              <article
                className="min-h-44 rounded-3xl p-5 text-white shadow-md"
                style={{ background: cardBackground(backgroundUrl) }}
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#E8C56B]">Carte fidélité</p>
                <p className="mt-4 font-display text-3xl">{selected.name}</p>
                <p className="mt-6 text-sm text-white/75">0 / 10 passages</p>
              </article>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => fileRef.current?.click()}
                  className="h-10 rounded-xl bg-ink px-4 text-sm font-bold text-white disabled:opacity-60"
                >
                  {busy ? "…" : backgroundUrl ? "Changer l'image" : "Ajouter une image"}
                </button>
                {backgroundUrl ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void clearBackground()}
                    className="h-10 rounded-xl border border-line px-4 text-sm font-semibold text-ink disabled:opacity-60"
                  >
                    Retirer
                  </button>
                ) : null}
              </div>
              <p className="text-[12px] text-ink/45">PNG, JPG ou WEBP · 2 Mo maximum.</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void saveBackground(file);
                }}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
