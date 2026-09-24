"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search, ShoppingBag, SlidersHorizontal } from "lucide-react";
import { bookPath } from "@/components/public-site/PublicSiteShell";
import { usePublicCart } from "@/components/public-site/PublicCartContext";
import { slugifyLabel } from "@/lib/booking-qr";
import { productPlaceholderImage } from "@/lib/public-site";
import { formatMad, getPublicProducts } from "@/modules/public-booking/service";
import type { PublicProductItem } from "@/types/public-booking";

type SortKey = "pertinence" | "prix-asc" | "prix-desc";

export function PublicProductsPage({ slug }: { slug: string }) {
  const { addItem } = usePublicCart();
  const [products, setProducts] = useState<PublicProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("Tous");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("pertinence");
  const [showFilters, setShowFilters] = useState(false);
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
    let list = products.filter((p) => {
      if (category !== "Tous" && p.category !== category) return false;
      if (inStockOnly && !p.inStock) return false;
      if (q.trim()) {
        const hay = `${p.name} ${p.brand ?? ""} ${p.category}`.toLowerCase();
        if (!hay.includes(q.trim().toLowerCase())) return false;
      }
      return true;
    });
    if (sort === "prix-asc") list = [...list].sort((a, b) => a.salePrice - b.salePrice);
    if (sort === "prix-desc") list = [...list].sort((a, b) => b.salePrice - a.salePrice);
    return list;
  }, [products, category, inStockOnly, q, sort]);

  if (loading) {
    return (
      <p className="px-5 py-16 text-center text-sm text-[#746970]">Chargement…</p>
    );
  }

  return (
    <div>
      {toast ? (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#241A22] px-4 py-2 text-xs font-semibold text-white shadow-lg md:bottom-8">
          {toast}
        </div>
      ) : null}

      <section className="border-b border-[#EBDDE4] bg-[#F9ECE9]">
        <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#B76E79]">
            Nos produits
          </p>
          <h1 className="mt-3 font-serif text-5xl">Produits de beauté</h1>
          <p className="mt-4 max-w-2xl text-[#6E6268]">
            Découvrez notre sélection de produits professionnels utilisés dans
            notre institut et disponibles à l&apos;achat.
          </p>
          <div className="mt-8 flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9A858C]"
              />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Rechercher un produit..."
                className="w-full rounded-xl border border-[#E5D4D9] bg-white py-3 pl-11 pr-4 outline-none focus:border-[#B76E79]"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className="flex items-center justify-center gap-2 rounded-xl border border-[#E5D4D9] bg-white px-5 py-3 text-sm"
            >
              <SlidersHorizontal size={17} />
              Filtres
            </button>
          </div>
          {showFilters ? (
            <label className="mt-4 flex items-center gap-2 text-sm text-[#665960]">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="rounded border-[#EBDDE4]"
              />
              En stock uniquement
            </label>
          ) : null}
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <div className="flex gap-2 overflow-x-auto pb-3">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-medium ${
                category === cat
                  ? "bg-[#B76E79] text-white"
                  : "bg-[#F7EFF1] text-[#665960]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="mt-8 flex items-center justify-between">
          <p className="text-sm text-[#82747B]">{filtered.length} produits</p>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-lg border border-[#EBDDE4] bg-white px-3 py-2 text-sm"
          >
            <option value="pertinence">Pertinence</option>
            <option value="prix-asc">Prix croissant</option>
            <option value="prix-desc">Prix décroissant</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <p className="mt-12 text-center text-sm text-[#746970]">
            Aucun produit ne correspond à votre recherche.
          </p>
        ) : (
          <div className="mt-7 grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {filtered.map((product) => {
              const pSlug = product.slug || slugifyLabel(product.name);
              return (
                <article
                  key={product.id}
                  className="group rounded-2xl border border-[#EBDDE4] bg-white p-3 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <Link href={bookPath(slug, `/products/${pSlug}/`)}>
                    <div className="relative h-56 overflow-hidden rounded-xl bg-[#FAF6F5]">
                      <Image
                        src={productPlaceholderImage(product.id)}
                        alt={product.name}
                        fill
                        className="object-cover transition duration-500 group-hover:scale-105"
                        sizes="(max-width: 640px) 50vw, 20vw"
                      />
                    </div>
                    <div className="p-2">
                      {product.brand ? (
                        <p className="mt-2 text-xs text-[#A47780]">{product.brand}</p>
                      ) : null}
                      <h2 className="mt-1 text-sm font-semibold">{product.name}</h2>
                      <p className="mt-1 text-xs text-[#8A7B82]">{product.unit}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <strong className="text-[#B14F5E]">
                          {formatMad(product.salePrice)}
                        </strong>
                        <span
                          className={`text-[11px] ${product.inStock ? "text-emerald-600" : "text-amber-700"}`}
                        >
                          {product.inStock ? "✓ En stock" : "Rupture"}
                        </span>
                      </div>
                    </div>
                  </Link>
                  <button
                    type="button"
                    disabled={!product.inStock}
                    onClick={() => {
                      addItem({
                        productId: product.id,
                        name: product.name,
                        slug: pSlug,
                        salePrice: product.salePrice,
                        unit: product.unit,
                      });
                      setToast("Ajouté au panier");
                    }}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#FBECEF] py-3 text-sm font-semibold text-[#A55261] transition hover:bg-[#F6DDE3] disabled:opacity-40"
                  >
                    <ShoppingBag size={15} />
                    Ajouter au panier
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
