"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  MapPin,
  Phone,
  ShoppingBag,
  Sparkles,
  Star,
} from "lucide-react";
import { bookPath } from "@/components/public-site/PublicSiteShell";
import { usePublicCart } from "@/components/public-site/PublicCartContext";
import { slugifyLabel } from "@/lib/booking-qr";
import {
  HERO_IMAGE,
  productPlaceholderImage,
  servicePlaceholderImage,
} from "@/lib/public-site";
import {
  formatDuration,
  formatMad,
  getPublicOrganization,
  getPublicProducts,
  getPublicServices,
} from "@/modules/public-booking/service";
import type {
  PublicOrganizationProfile,
  PublicProductItem,
  PublicServiceItem,
} from "@/types/public-booking";

export function PublicHomePage({ slug }: { slug: string }) {
  const { addItem } = usePublicCart();
  const [org, setOrg] = useState<PublicOrganizationProfile | null>(null);
  const [services, setServices] = useState<PublicServiceItem[]>([]);
  const [products, setProducts] = useState<PublicProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [o, s, p] = await Promise.all([
          getPublicOrganization(slug),
          getPublicServices(slug),
          getPublicProducts(slug).catch(() => []),
        ]);
        if (cancelled) return;
        setOrg(o);
        setServices(s.slice(0, 4));
        setProducts(p.slice(0, 5));
      } catch {
        if (!cancelled) setOrg(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(t);
  }, [toast]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-[#746970]">
        Chargement…
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-[#746970]">
        Institut introuvable.
      </div>
    );
  }

  return (
    <div>
      {toast ? (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#241A22] px-4 py-2 text-xs font-semibold text-white shadow-lg md:bottom-8">
          {toast}
        </div>
      ) : null}

      <section className="relative overflow-hidden bg-[#F9ECE9]">
        <div className="mx-auto grid max-w-7xl lg:grid-cols-2">
          <div className="flex flex-col justify-center px-5 py-16 lg:px-8 lg:py-24">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#B76E79]">
              Révélez votre beauté
            </p>
            <h1 className="mt-4 font-serif text-5xl leading-[1.05] text-[#241A22] md:text-6xl">
              {org.name}
            </h1>
            <p className="mt-4 font-serif text-2xl text-[#5C4C53]">
              Beauté • Bien-être • Soin
            </p>
            <p className="mt-6 max-w-xl text-base leading-7 text-[#62565C]">
              Prenez soin de vous dans un espace dédié à votre beauté. Des soins
              professionnels, une équipe passionnée et une expérience unique
              {org.city ? ` à ${org.city}` : ""}.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={bookPath(slug, "/booking/")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#B76E79] px-6 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-[#9F5C67]"
              >
                <CalendarDays size={17} />
                Prendre rendez-vous
              </Link>
              <Link
                href={bookPath(slug, "/services/")}
                className="inline-flex items-center justify-center rounded-xl border border-[#B76E79] px-6 py-3.5 text-sm font-semibold text-[#A85F6C]"
              >
                Découvrir nos services
              </Link>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-5 border-t border-[#DFCAC7] pt-6 md:grid-cols-4">
              <Info icon={<MapPin size={17} />} title={org.city ?? "Maroc"} />
              {org.phone ? (
                <Info icon={<Phone size={17} />} title={org.phone} />
              ) : (
                <Info icon={<Phone size={17} />} title="Sur rendez-vous" />
              )}
              <Info icon={<Clock3 size={17} />} title="09:00 - 19:00" />
              <Info icon={<Star size={17} />} title="4.8/5" subtitle="Avis clientes" />
            </div>
          </div>

          <div className="relative min-h-[420px] lg:min-h-[560px]">
            <Image
              src={HERO_IMAGE}
              alt={org.name}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#F9ECE9]/30 to-transparent" />
            <div className="absolute bottom-10 left-8 max-w-xs rounded-2xl bg-white/85 p-5 font-serif text-xl italic text-[#7A555E] backdrop-blur">
              Plus qu&apos;un institut,
              <br />
              une expérience.
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <SectionHeader
          eyebrow="Nos prestations"
          title="Nos services populaires"
          href={bookPath(slug, "/services/")}
          link="Voir tous les services"
        />
        {services.length === 0 ? (
          <p className="mt-8 text-sm text-[#746970]">Aucun service publié pour le moment.</p>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => (
              <article
                key={service.id}
                className="overflow-hidden rounded-2xl border border-[#EBDDE4] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="relative h-44">
                  <Image
                    src={servicePlaceholderImage(service.id)}
                    alt={service.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 25vw"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold">{service.name}</h3>
                  <p className="mt-1 text-sm text-[#776B71]">
                    {formatDuration(service.durationMin)} · {formatMad(service.price)}
                  </p>
                  <Link
                    href={bookPath(slug, `/booking/?service=${encodeURIComponent(service.id)}`)}
                    className="mt-4 flex justify-center rounded-xl bg-[#B76E79] py-2.5 text-sm font-semibold text-white"
                  >
                    Réserver
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="border-y border-[#F0E4E8] bg-white">
        <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <SectionHeader
            eyebrow="Nos produits"
            title="Produits populaires"
            href={bookPath(slug, "/products/")}
            link="Voir tous les produits"
          />
          {products.length === 0 ? (
            <p className="mt-8 text-sm text-[#746970]">Aucun produit en boutique pour le moment.</p>
          ) : (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
              {products.map((product) => {
                const pSlug = product.slug || slugifyLabel(product.name);
                return (
                  <article
                    key={product.id}
                    className="group rounded-2xl border border-[#EBDDE4] bg-white p-3 transition hover:-translate-y-1 hover:shadow-md"
                  >
                    <Link href={bookPath(slug, `/products/${pSlug}/`)}>
                      <div className="relative h-48 overflow-hidden rounded-xl bg-[#FAF6F5]">
                        <Image
                          src={productPlaceholderImage(product.id)}
                          alt={product.name}
                          fill
                          className="object-cover transition duration-500 group-hover:scale-105"
                          sizes="(max-width: 640px) 50vw, 20vw"
                        />
                      </div>
                      <div className="p-2">
                        <h3 className="mt-2 text-sm font-semibold">{product.name}</h3>
                        <p className="mt-1 text-xs text-[#8A7B82]">{product.unit}</p>
                        <p className="mt-2 font-semibold text-[#B14F5E]">
                          {formatMad(product.salePrice)}
                        </p>
                        <p
                          className={`mt-1 text-xs ${product.inStock ? "text-emerald-600" : "text-amber-700"}`}
                        >
                          ● {product.inStock ? "En stock" : "Rupture"}
                        </p>
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
                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#FBECEF] py-2.5 text-xs font-semibold text-[#A55261] disabled:opacity-40"
                    >
                      <ShoppingBag size={14} />
                      Ajouter au panier
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#B76E79]">
              Pourquoi nous choisir ?
            </p>
            <h2 className="mt-3 font-serif text-4xl">Une expérience unique</h2>
            <div className="mt-8 grid grid-cols-2 gap-6">
              {(
                [
                  ["Professionnelles qualifiées", "Une équipe experte"],
                  ["Produits professionnels", "Des marques de qualité"],
                  ["Rendez-vous rapide", "Réservation simple"],
                  ["Espace confortable", "Un cadre élégant"],
                ] as const
              ).map(([title, text]) => (
                <div key={title}>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#F9E6EA] text-[#B76E79]">
                    <Sparkles size={20} />
                  </div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-1 text-sm text-[#7B6E75]">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#B76E79]">
              Ce qu&apos;elles disent
            </p>
            <h2 className="mt-3 font-serif text-4xl">Avis de nos clientes</h2>
            <div className="mt-8 rounded-3xl border border-[#EBDDE4] bg-white p-7 shadow-sm">
              <div className="flex gap-1 text-[#D89A22]">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} size={16} fill="currentColor" />
                ))}
              </div>
              <p className="mt-5 font-serif text-xl leading-8 text-[#493E44]">
                « Un accueil chaleureux et des soins de grande qualité. Je
                recommande vivement {org.name} ! »
              </p>
              <div className="mt-6 text-sm">
                <strong>Sara El Amrani</strong>
                <p className="text-[#8B7E84]">Cliente fidèle</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 overflow-hidden rounded-3xl bg-[#F4DDD5] px-8 py-10 md:flex-row">
          <div>
            <h2 className="font-serif text-3xl">
              Prête pour votre prochain rendez-vous ?
            </h2>
            <p className="mt-2 text-sm text-[#705E62]">
              Offrez-vous un moment de bien-être dès aujourd&apos;hui.
            </p>
          </div>
          <Link
            href={bookPath(slug, "/booking/")}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#B76E79] px-6 py-3.5 font-semibold text-white"
          >
            <CalendarDays size={17} />
            Réserver maintenant
          </Link>
        </div>
      </section>
    </div>
  );
}

function Info({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="mt-0.5 text-[#B76E79]">{icon}</span>
      <div>
        <p className="font-medium">{title}</p>
        {subtitle ? <p className="text-xs text-[#806F76]">{subtitle}</p> : null}
      </div>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  href,
  link,
}: {
  eyebrow: string;
  title: string;
  href: string;
  link: string;
}) {
  return (
    <div className="flex items-end justify-between gap-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#B76E79]">
          {eyebrow}
        </p>
        <h2 className="mt-2 font-serif text-4xl">{title}</h2>
      </div>
      <Link href={href} className="flex items-center gap-1 text-sm text-[#B76E79]">
        {link}
        <ArrowRight size={15} />
      </Link>
    </div>
  );
}
