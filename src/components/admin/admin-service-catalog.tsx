"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, Search, Trash2 } from "lucide-react";
import { ServiceResponsiveImage } from "@/components/services/service-responsive-image";
import { cn } from "@/lib/utils";

type CatalogItem = {
  name: string;
  imageUrl: string | null;
  updatedAt: string | null;
  source?: "suggested" | "added";
  usedBy?: number;
};

export function AdminServiceCatalogView() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyName, setBusyName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pendingNameRef = useRef<string | null>(null);
  const fileInputId = useId();

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/service-catalog/", { credentials: "include", cache: "no-store" });
      const data = (await res.json()) as { items?: CatalogItem[]; error?: string };
      if (!res.ok) throw new Error(data.error || "Chargement impossible.");
      setItems(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function upload(name: string, file: File) {
    setBusyName(name);
    setError(null);
    try {
      const form = new FormData();
      form.append("name", name);
      form.append("image", file);
      const res = await fetch("/api/admin/service-catalog/", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      const data = (await res.json()) as { item?: CatalogItem; error?: string };
      if (!res.ok || !data.item) throw new Error(data.error || "Échec du téléversement.");
      setItems((prev) =>
        prev.map((item) => (item.name === name ? { ...item, ...data.item!, source: item.source, usedBy: item.usedBy } : item)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'envoi.");
    } finally {
      setBusyName(null);
    }
  }

  async function remove(name: string) {
    setBusyName(name);
    setError(null);
    try {
      const res = await fetch(`/api/admin/service-catalog/?name=${encodeURIComponent(name)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Suppression impossible.");
      setItems((prev) =>
        prev.map((item) => (item.name === name ? { ...item, imageUrl: null, updatedAt: null } : item)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de suppression.");
    } finally {
      setBusyName(null);
    }
  }

  const visible = items.filter((item) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return item.name.toLowerCase().includes(needle);
  });

  const withImage = items.filter((item) => item.imageUrl).length;
  const addedCount = items.filter((item) => item.source === "added").length;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[#F0DFE8] bg-white p-5 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/40">Catalogue plateforme</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-ink">Tous les services</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink/55">
          Les services suggérés par la plateforme et tous les services ajoutés par les instituts, sans doublons.
          Ces photos s’appliquent automatiquement quand un institut choisit un nom dans la liste
          « Nouveau service ». Chaque institut peut ensuite remplacer l’image par la sienne.
          Idéal : WebP ou JPG 800×600 (4:3), max 2 Mo — conversion WebP automatique.
        </p>
        <p className="mt-3 text-xs font-semibold text-[#B60050]">
          {items.length} services · {addedCount} ajoutés par les instituts · {withImage} avec image par défaut
        </p>
      </section>

      <div className="flex items-center gap-3 rounded-2xl border border-[#EEDDE5] bg-white px-4 shadow-sm">
        <Search size={18} className="text-[#B90E54]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un soin…"
          className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
      </div>

      {error ? (
        <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <input
        id={fileInputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          const name = pendingNameRef.current;
          pendingNameRef.current = null;
          if (file && name) void upload(name, file);
          e.target.value = "";
        }}
      />

      {loading ? (
        <p className="rounded-xl bg-white py-12 text-center text-sm text-ink/45 shadow-sm">Chargement…</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((item) => {
            const busy = busyName === item.name;
            return (
              <article
                key={item.name}
                className="overflow-hidden rounded-2xl border border-[#F0DFE8] bg-white shadow-sm"
              >
                <div className="relative flex aspect-[4/3] items-center justify-center bg-[#FFF5F9]">
                  {item.imageUrl ? (
                    <ServiceResponsiveImage
                      imageUrl={item.imageUrl}
                      alt={item.name}
                      variant="thumb"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-[#A55477]">
                      <Camera size={28} />
                      <span className="text-xs font-semibold">Aucune image</span>
                    </div>
                  )}
                  {busy ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                      <Loader2 size={26} className="animate-spin text-[#A01750]" />
                    </div>
                  ) : null}
                </div>

                <div className="space-y-3 p-4">
                  <div>
                    <h2 className="font-bold text-ink">{item.name}</h2>
                    <p className="mt-0.5 text-xs text-ink/50">
                      {item.source === "added" ? "Ajouté par les instituts" : "Suggestion plateforme"}
                      {item.usedBy ? ` · ${item.usedBy} institut${item.usedBy > 1 ? "s" : ""}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <label
                      htmlFor={fileInputId}
                      aria-disabled={busy}
                      onClick={() => {
                        if (busy) return;
                        pendingNameRef.current = item.name;
                      }}
                      className={cn(
                        "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold text-white",
                        "bg-[#9B1B50] hover:bg-[#7F153F]",
                        busy && "pointer-events-none opacity-50",
                      )}
                    >
                      <ImagePlus size={15} />
                      {item.imageUrl ? "Changer" : "Ajouter une image"}
                    </label>
                    {item.imageUrl ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void remove(item.name)}
                        className="rounded-xl border border-red-100 px-3 text-red-600 hover:bg-red-50 disabled:opacity-50"
                        aria-label={`Retirer l'image de ${item.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
