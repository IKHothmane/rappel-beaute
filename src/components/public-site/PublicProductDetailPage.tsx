"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Heart,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
} from "lucide-react";
import { bookPath } from "@/components/public-site/PublicSiteShell";
import { usePublicCart } from "@/components/public-site/PublicCartContext";
import { slugifyLabel } from "@/lib/booking-qr";
import { productPlaceholderImage } from "@/lib/public-site";
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
  const [tab, setTab] = useState(0);

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
    return (
      <p className="px-5 py-16 text-center text-sm text-[#746970]">Chargement…</p>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-xl px-5 py-16 text-center">
        <p className="text-sm text-[#746970]">Produit introuvable.</p>
        <Link
          href={bookPath(slug, "/products/")}
          className="mt-4 inline-block text-sm font-bold text-[#B76E79]"
        >
          Retour boutique
        </Link>
      </div>
    );
  }

  if (added) {
    return (
      <div className="mx-auto max-w-md px-5 py-16 text-center">
        <p className="text-lg font-semibold text-emerald-700">✓ Produit ajouté au panier</p>
        <p className="mt-2 text-sm text-[#746970]">{product.name}</p>
        <div className="mt-6 flex flex-col gap-2">
          <Link
            href={bookPath(slug, "/products/")}
            className="rounded-xl border border-[#EBDDE4] py-3 text-sm font-bold"
            onClick={() => setAdded(false)}
          >
            Continuer mes achats
          </Link>
          <Link
            href={bookPath(slug, "/cart/")}
            className="rounded-xl bg-[#B76E79] py-3 text-sm font-bold text-white"
          >
            Voir mon panier
          </Link>
        </div>
      </div>
    );
  }

  const mainImage = productPlaceholderImage(product.id);
  const thumbs = [product, ...similar.slice(0, 3)];

  return (
    <div>
      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <div className="flex flex-wrap items-center gap-2 text-xs text-[#887980]">
          <Link href={bookPath(slug)}>Accueil</Link>
          <span>/</span>
          <Link href={bookPath(slug, "/products/")}>Produits</Link>
          <span>/</span>
          <span>{product.name}</span>
        </div>

        <section className="mt-8 grid gap-10 lg:grid-cols-2">
          <div className="grid grid-cols-[80px_1fr] gap-4">
            <div className="space-y-3">
              {thumbs.map((item, index) => (
                <div
                  key={`${item.id}-${index}`}
                  className="relative h-20 w-full overflow-hidden rounded-xl border border-[#EBDDE4] bg-[#FAF6F5]"
                >
                  <Image
                    src={productPlaceholderImage(item.id)}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </div>
              ))}
            </div>
            <div className="relative min-h-[420px] overflow-hidden rounded-3xl bg-[#FAF6F5] lg:min-h-[500px]">
              <Image
                src={mainImage}
                alt={product.name}
                fill
                priority
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 45vw"
              />
              <button
                type="button"
                className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow-sm"
                aria-label="Favori"
              >
                <Heart size={20} />
              </button>
            </div>
          </div>

          <div className="flex flex-col justify-center">
            {product.brand ? (
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B76E79]">
                {product.brand}
              </p>
            ) : null}
            <h1 className="mt-3 font-serif text-4xl md:text-5xl">{product.name}</h1>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex text-[#D89A22]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i}>★</span>
                ))}
              </div>
              <span className="text-sm text-[#83767D]">4.8</span>
            </div>
            <div className="mt-6 flex items-center gap-4">
              <span className="text-3xl font-bold text-[#B14F5E]">
                {formatMad(product.salePrice)}
              </span>
              <span
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  product.inStock
                    ? "bg-[#EAF7EE] text-emerald-700"
                    : "bg-amber-50 text-amber-800"
                }`}
              >
                {product.inStock ? "✓ En stock" : "Rupture"}
              </span>
            </div>
            <p className="mt-6 leading-7 text-[#665A61]">
              {product.notes?.trim() ||
                "Produit professionnel disponible auprès de l'institut. Idéal pour prolonger les soins à domicile."}
            </p>

            <div className="mt-8 flex items-center gap-4">
              <div className="flex items-center rounded-xl border border-[#EBDDE4]">
                <button
                  type="button"
                  className="p-3"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  aria-label="Diminuer"
                >
                  <Minus size={16} />
                </button>
                <span className="w-8 text-center font-medium">{qty}</span>
                <button
                  type="button"
                  className="p-3"
                  onClick={() => setQty((q) => Math.min(20, q + 1))}
                  aria-label="Augmenter"
                >
                  <Plus size={16} />
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
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#B76E79] py-4 font-semibold text-white shadow-sm transition hover:bg-[#9F5C67] disabled:opacity-40"
              >
                <ShoppingBag size={18} />
                Ajouter au panier
              </button>
            </div>

            <div className="mt-8 grid grid-cols-3 border-y border-[#EBDDE4] py-5">
              <Benefit
                icon={<ShieldCheck size={19} />}
                title="Produit professionnel"
                text="Qualité vérifiée"
              />
              <Benefit
                icon={<Sparkles size={19} />}
                title="Conseil personnalisé"
                text="Par nos expertes"
              />
              <Benefit
                icon={<Truck size={19} />}
                title="Retrait à l'institut"
                text="Simple et rapide"
              />
            </div>
          </div>
        </section>

        <section className="mt-16 border-t border-[#EBDDE4] pt-12">
          <div className="flex gap-8 overflow-x-auto border-b border-[#EBDDE4]">
            {["Description", "Conseils d'utilisation", "Ingrédients", "Avis"].map(
              (label, index) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setTab(index)}
                  className={`whitespace-nowrap pb-4 text-sm font-semibold ${
                    tab === index
                      ? "border-b-2 border-[#B76E79] text-[#B76E79]"
                      : "text-[#7D7077]"
                  }`}
                >
                  {label}
                </button>
              ),
            )}
          </div>
          <div className="grid gap-10 py-8 md:grid-cols-2">
            <div>
              <h2 className="font-serif text-3xl">À propos du produit</h2>
              <p className="mt-4 leading-7 text-[#6E6268]">
                {tab === 0 &&
                  (product.notes?.trim() ||
                    `${product.name} — produit professionnel disponible à l'achat auprès de l'institut.`)}
                {tab === 1 &&
                  "Suivez les recommandations de votre esthéticienne pour un usage optimal à domicile."}
                {tab === 2 &&
                  "Composition détaillée disponible sur demande à l'accueil de l'institut."}
                {tab === 3 &&
                  "Les avis clientes seront bientôt disponibles sur cette fiche produit."}
              </p>
            </div>
            <div className="rounded-2xl bg-[#FAF2F3] p-6">
              <h3 className="font-semibold">Informations</h3>
              <dl className="mt-5 space-y-4 text-sm">
                {product.brand ? (
                  <div className="flex justify-between border-b border-[#E7D7DB] pb-3">
                    <dt className="text-[#85767D]">Marque</dt>
                    <dd className="font-medium">{product.brand}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between border-b border-[#E7D7DB] pb-3">
                  <dt className="text-[#85767D]">Contenance</dt>
                  <dd className="font-medium">{product.unit}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#85767D]">Catégorie</dt>
                  <dd className="font-medium">{product.category}</dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        {similar.length > 0 ? (
          <section className="mt-8 border-t border-[#EBDDE4] py-12">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B76E79]">
                  Vous pourriez aimer
                </p>
                <h2 className="mt-2 font-serif text-4xl">Produits similaires</h2>
              </div>
              <Link
                href={bookPath(slug, "/products/")}
                className="hidden items-center gap-2 text-sm text-[#B76E79] md:flex"
              >
                Voir tous les produits
                <ArrowLeft size={15} className="rotate-180" />
              </Link>
            </div>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {similar.map((item) => {
                const s = item.slug || slugifyLabel(item.name);
                return (
                  <Link
                    key={item.id}
                    href={bookPath(slug, `/products/${s}/`)}
                    className="rounded-2xl border border-[#EBDDE4] bg-white p-3"
                  >
                    <div className="relative h-56 overflow-hidden rounded-xl bg-[#FAF6F5]">
                      <Image
                        src={productPlaceholderImage(item.id)}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, 25vw"
                      />
                    </div>
                    <div className="p-2">
                      <h3 className="font-semibold">{item.name}</h3>
                      <p className="mt-2 font-semibold text-[#B14F5E]">
                        {formatMad(item.salePrice)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

function Benefit({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="text-[#B76E79]">{icon}</div>
      <p className="mt-2 text-xs font-semibold">{title}</p>
      <p className="mt-1 text-[11px] text-[#8B7D84]">{text}</p>
    </div>
  );
}
