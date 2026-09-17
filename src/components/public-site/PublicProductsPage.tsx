"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { bookPath } from "@/components/public-site/PublicSiteShell";
import { usePublicCart } from "@/components/public-site/PublicCartContext";
import { slugifyLabel } from "@/lib/booking-qr";
import { formatMad, getPublicProducts } from "@/modules/public-booking/service";
import type { PublicProductItem } from "@/types/public-booking";

export function PublicProductsPage({ slug }: { slug: string }) {
  const { addItem } = usePublicCart();
  const [products, setProducts] = useState<PublicProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("Tous");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    getPublicProducts(slug)
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    return ["Tous", ...Array.from(set).sort()];
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (category !== "Tous" && p.category !== category) return false;
      if (inStockOnly && !p.inStock) return false;
      if (q.trim()) {
        const hay = `${p.name} ${p.brand ?? ""} ${p.category}`.toLowerCase();
        if (!hay.includes(q.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [products, category, inStockOnly, q]);

  if (loading) {
    return <p className="px-4 py-16 text-center text-sm text-[#221820]/45">Chargement…</p>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Boutique</p>
      <h1 className="mt-1 font-serif text-3xl font-semibold">Nos produits</h1>
      <p className="mt-2 text-sm text-[#221820]/55">
        Découvrez les produits disponibles dans notre institut.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          className="h-11 flex-1 rounded-xl border border-[#E4BDC2]/50 bg-white px-4 text-sm"
          placeholder="Rechercher…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm font-semibold text-[#221820]/65">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => setInStockOnly(e.target.checked)}
          />
          En stock uniquement
        </label>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${
              category === c
                ? "bg-[#7B5900] text-white"
                : "bg-white text-[#221820]/65 ring-1 ring-[#E4BDC2]/50"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-10 text-sm text-[#221820]/45">Aucun produit trouvé.</p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => {
            const pSlug = p.slug || slugifyLabel(p.name);
            return (
              <article
                key={p.id}
                className="flex flex-col rounded-xl border border-[#E4BDC2]/35 bg-white p-4 shadow-sm"
              >
                <Link href={bookPath(slug, `/products/${pSlug}/`)}>
                  <div className="mb-3 flex h-32 items-center justify-center rounded-lg bg-[#FFEFF8]">
                    <span className="font-serif text-3xl text-primary/30">
                      {p.name.charAt(0)}
                    </span>
                  </div>
                  <h2 className="line-clamp-2 font-semibold">{p.name}</h2>
                  {p.brand ? (
                    <p className="mt-0.5 text-xs text-[#221820]/45">{p.brand}</p>
                  ) : null}
                  <p className="mt-2 font-mono text-sm font-bold text-primary">
                    {formatMad(p.salePrice)}
                  </p>
                  <p className="mt-1 text-xs text-emerald-700">
                    {p.inStock ? "✓ En stock" : "Rupture"}
                  </p>
                </Link>
                <button
                  type="button"
                  disabled={!p.inStock}
                  onClick={() => {
                    addItem({
                      productId: p.id,
                      name: p.name,
                      slug: pSlug,
                      salePrice: p.salePrice,
                      unit: p.unit,
                    });
                    setToast("Produit ajouté au panier");
                  }}
                  className="mt-3 h-10 rounded-lg bg-[#FFEFF8] text-xs font-bold hover:bg-[#F6E3EF] disabled:opacity-40"
                >
                  Ajouter
                </button>
              </article>
            );
          })}
        </div>
      )}

      {toast ? (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-[#221820] px-4 py-2.5 text-sm font-semibold text-white lg:bottom-8">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
