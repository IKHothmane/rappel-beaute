"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { bookPath } from "@/components/public-site/PublicSiteShell";
import { usePublicCart } from "@/components/public-site/PublicCartContext";
import { slugifyLabel } from "@/lib/booking-qr";
import { formatMad, getPublicProducts } from "@/modules/public-booking/service";
import type { PublicProductItem } from "@/types/public-booking";

export function PublicProductDetailPage({
  slug,
  productSlug,
}: {
  slug: string;
  productSlug: string;
}) {
  const { addItem } = usePublicCart();
  const [product, setProduct] = useState<PublicProductItem | null>(null);
  const [similar, setSimilar] = useState<PublicProductItem[]>([]);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    getPublicProducts(slug)
      .then((list) => {
        const needle = productSlug.toLowerCase();
        const hit =
          list.find((p) => p.id.toLowerCase() === needle) ??
          list.find((p) => (p.slug || slugifyLabel(p.name)) === needle) ??
          null;
        setProduct(hit);
        if (hit) {
          setSimilar(
            list
              .filter((p) => p.id !== hit.id && p.category === hit.category)
              .slice(0, 4),
          );
        }
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [slug, productSlug]);

  const pSlug = useMemo(
    () => (product ? product.slug || slugifyLabel(product.name) : ""),
    [product],
  );

  if (loading) {
    return <p className="px-4 py-16 text-center text-sm text-[#221820]/45">Chargement…</p>;
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-sm text-[#221820]/55">Produit introuvable.</p>
        <Link href={bookPath(slug, "/products/")} className="mt-4 inline-block text-sm font-bold text-primary">
          Retour boutique
        </Link>
      </div>
    );
  }

  if (added) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-lg font-semibold text-emerald-700">✓ Produit ajouté au panier</p>
        <p className="mt-2 text-sm text-[#221820]/55">{product.name}</p>
        <div className="mt-6 flex flex-col gap-2">
          <Link
            href={bookPath(slug, "/products/")}
            className="rounded-lg border border-[#E4BDC2]/50 py-3 text-sm font-bold"
            onClick={() => setAdded(false)}
          >
            Continuer mes achats
          </Link>
          <Link
            href={bookPath(slug, "/cart/")}
            className="rounded-lg bg-[#7B5900] py-3 text-sm font-bold text-white"
          >
            Voir le panier
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href={bookPath(slug, "/products/")} className="text-sm font-semibold text-primary hover:underline">
        ← Boutique
      </Link>
      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <div className="flex h-64 items-center justify-center rounded-2xl bg-[#FFEFF8] md:h-80">
          <span className="font-serif text-6xl text-primary/25">{product.name.charAt(0)}</span>
        </div>
        <div>
          <h1 className="font-serif text-3xl font-semibold">{product.name}</h1>
          {product.brand ? (
            <p className="mt-1 text-sm text-[#221820]/50">{product.brand}</p>
          ) : null}
          <p className="mt-4 font-mono text-2xl font-bold text-primary">
            {formatMad(product.salePrice)}
          </p>
          <p className="mt-2 text-sm text-emerald-700">
            {product.inStock ? "✓ Disponible" : "Rupture de stock"}
          </p>
          {product.notes ? (
            <p className="mt-4 text-sm leading-relaxed text-[#221820]/65">{product.notes}</p>
          ) : (
            <p className="mt-4 text-sm text-[#221820]/55">
              Produit professionnel disponible au retrait dans l&apos;institut.
            </p>
          )}
          <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-[10px] font-bold uppercase text-[#221820]/40">Catégorie</dt>
              <dd className="font-semibold">{product.category}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase text-[#221820]/40">Format</dt>
              <dd className="font-semibold">{product.unit || "—"}</dd>
            </div>
          </dl>
          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-lg border"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
            >
              −
            </button>
            <span className="w-8 text-center font-bold">{qty}</span>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-lg border"
              onClick={() => setQty((q) => Math.min(20, q + 1))}
            >
              +
            </button>
          </div>
          <button
            type="button"
            disabled={!product.inStock}
            onClick={() => {
              addItem(
                {
                  productId: product.id,
                  name: product.name,
                  slug: pSlug,
                  salePrice: product.salePrice,
                  unit: product.unit,
                },
                qty,
              );
              setAdded(true);
            }}
            className="mt-6 flex h-12 w-full items-center justify-center rounded-lg bg-[#7B5900] text-sm font-bold text-white disabled:opacity-40"
          >
            Ajouter au panier
          </button>
        </div>
      </div>

      {similar.length > 0 ? (
        <div className="mt-14">
          <h2 className="font-serif text-xl font-semibold">Produits similaires</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map((p) => (
              <Link
                key={p.id}
                href={bookPath(slug, `/products/${p.slug || slugifyLabel(p.name)}/`)}
                className="rounded-xl border border-[#E4BDC2]/35 bg-white p-3 text-sm shadow-sm"
              >
                <p className="line-clamp-2 font-semibold">{p.name}</p>
                <p className="mt-1 font-mono text-primary">{formatMad(p.salePrice)}</p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
