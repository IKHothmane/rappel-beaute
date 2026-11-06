"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, Search, Trash2 } from "lucide-react";
import { ServiceResponsiveImage } from "@/components/services/service-responsive-image";
import { cn } from "@/lib/utils";
import { RESOURCE_TYPE_LABEL, RESOURCE_TYPES, type ResourceType } from "@/types/resource";

type CatalogItem = {
  type: ResourceType;
  imageUrl: string | null;
  updatedAt: string | null;
};

export function AdminResourceCatalogView() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyType, setBusyType] = useState<ResourceType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pendingTypeRef = useRef<ResourceType | null>(null);
  const fileInputId = useId();

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/resource-catalog/", { credentials: "include", cache: "no-store" });
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

  async function upload(type: ResourceType, file: File) {
    setBusyType(type);
    setError(null);
    try {
      const form = new FormData();
      form.append("type", type);
      form.append("image", file);
      const res = await fetch("/api/admin/resource-catalog/", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      const data = (await res.json()) as { item?: CatalogItem; error?: string };
      if (!res.ok || !data.item) throw new Error(data.error || "Échec du téléversement.");
      setItems((prev) => prev.map((item) => (item.type === type ? data.item! : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'envoi.");
    } finally {
      setBusyType(null);
    }
  }

  async function remove(type: ResourceType) {
    setBusyType(type);
    setError(null);
    try {
      const res = await fetch(`/api/admin/resource-catalog/?type=${encodeURIComponent(type)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Suppression impossible.");
      setItems((prev) =>
        prev.map((item) => (item.type === type ? { ...item, imageUrl: null, updatedAt: null } : item)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de suppression.");
    } finally {
      setBusyType(null);
    }
  }

  const visible = items.filter((item) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return RESOURCE_TYPE_LABEL[item.type].toLowerCase().includes(needle);
  });

  const withImage = items.filter((item) => item.imageUrl).length;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[#F0DFE8] bg-white p-5 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/40">Catalogue plateforme</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-ink">Images des types de ressources</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink/55">
          Ces photos s’affichent dans l’app institut selon le type choisi (Cabine, Salle, Fauteuil…).
          Idéal : WebP ou JPG 800×600 (4:3), max 2 Mo — conversion WebP automatique.
        </p>
        <p className="mt-3 text-xs font-semibold text-[#B60050]">
          {withImage} / {RESOURCE_TYPES.length} types avec image
        </p>
      </section>

      <div className="flex items-center gap-3 rounded-2xl border border-[#EEDDE5] bg-white px-4 shadow-sm">
        <Search size={18} className="text-[#B90E54]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un type…"
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
          const type = pendingTypeRef.current;
          pendingTypeRef.current = null;
          if (file && type) void upload(type, file);
          e.target.value = "";
        }}
      />

      {loading ? (
        <p className="rounded-xl bg-white py-12 text-center text-sm text-ink/45 shadow-sm">Chargement…</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((item) => {
            const busy = busyType === item.type;
            return (
              <article
                key={item.type}
                className="overflow-hidden rounded-2xl border border-[#F0DFE8] bg-white shadow-sm"
              >
                <div className="relative flex aspect-[4/3] items-center justify-center bg-[#FFF5F9]">
                  {item.imageUrl ? (
                    <ServiceResponsiveImage
                      imageUrl={item.imageUrl}
                      alt={RESOURCE_TYPE_LABEL[item.type]}
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
                  <h2 className="font-bold text-ink">{RESOURCE_TYPE_LABEL[item.type]}</h2>
                  <div className="flex gap-2">
                    <label
                      htmlFor={fileInputId}
                      aria-disabled={busy}
                      onClick={() => {
                        if (busy) return;
                        pendingTypeRef.current = item.type;
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
                        onClick={() => void remove(item.type)}
                        className="rounded-xl border border-red-100 px-3 text-red-600 hover:bg-red-50 disabled:opacity-50"
                        aria-label={`Retirer l'image de ${RESOURCE_TYPE_LABEL[item.type]}`}
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
