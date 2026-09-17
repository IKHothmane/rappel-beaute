"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Sparkles,
  Star,
} from "lucide-react";
import { bookPath } from "@/components/public-site/PublicSiteShell";
import { usePublicCart } from "@/components/public-site/PublicCartContext";
import { slugifyLabel } from "@/lib/booking-qr";
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
        setServices(s.slice(0, 6));
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
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-[#221820]/45">
        Chargement…
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-[#221820]/55">
        Institut introuvable.
      </div>
    );
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(120deg, rgba(34,24,32,0.55), rgba(186,0,73,0.25)), url('https://images.unsplash.com/photo-1560750588-73207b1ef5b7?auto=format&fit=crop&w=1600&q=80')",
          }}
        />
        <div className="relative mx-auto flex max-w-6xl flex-col justify-end px-4 pb-12 pt-24 sm:px-6 sm:pb-16 sm:pt-32">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#FFDEA4]">
            Révélez votre beauté
          </p>
          <h1 className="mt-3 max-w-xl font-serif text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            {org.name}
          </h1>
          <p className="mt-2 text-sm font-semibold uppercase tracking-[0.12em] text-white/80">
            Beauté · Bien-être · Soin
          </p>
          <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-white/85">
            Prenez soin de vous dans un espace dédié à votre beauté
            {org.city ? ` à ${org.city}` : ""}.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={bookPath(slug, "/booking/")}
              className="inline-flex h-12 items-center gap-2 rounded-lg bg-[#7B5900] px-5 text-sm font-bold text-white shadow-md hover:bg-[#5D4200]"
            >
              <CalendarDays className="h-4 w-4" />
              Prendre rendez-vous
            </Link>
            <Link
              href={bookPath(slug, "/services/")}
              className="inline-flex h-12 items-center rounded-lg border border-white/40 bg-white/10 px-5 text-sm font-bold text-white backdrop-blur hover:bg-white/20"
            >
              Découvrir nos services
            </Link>
          </div>
        </div>
      </section>

      {/* Info bar */}
      <section className="border-b border-[#E4BDC2]/30 bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-4 py-5 sm:grid-cols-4 sm:px-6">
          <InfoCell
            icon={<MapPin className="h-4 w-4" />}
            title={org.city ?? "Maroc"}
            subtitle={org.address ?? "Adresse à venir"}
          />
          <InfoCell
            icon={<Phone className="h-4 w-4" />}
            title={org.phone ?? "Sur rendez-vous"}
            subtitle="Nous appeler"
          />
          <InfoCell
            icon={<Clock className="h-4 w-4" />}
            title="Lun – Sam"
            subtitle="09:00 – 19:00"
          />
          <InfoCell
            icon={<Star className="h-4 w-4 text-[#7B5900]" />}
            title="4.8 / 5"
            subtitle="Avis clientes (soft)"
          />
        </div>
      </section>

      {/* Popular services */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Prestations
            </p>
            <h2 className="mt-1 font-serif text-2xl font-semibold sm:text-3xl">
              Nos services populaires
            </h2>
          </div>
          <Link
            href={bookPath(slug, "/services/")}
            className="shrink-0 text-sm font-semibold text-primary hover:underline"
          >
            Voir tous les services →
          </Link>
        </div>
        {services.length === 0 ? (
          <p className="text-sm text-[#221820]/45">Aucun service publié pour le moment.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <article
                key={s.id}
                className="flex flex-col overflow-hidden rounded-xl border border-[#E4BDC2]/35 bg-white shadow-sm"
              >
                <div className="flex h-36 items-center justify-center bg-gradient-to-br from-[#FFEFF8] to-[#F6E3EF]">
                  <Sparkles className="h-10 w-10 text-primary/40" />
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="font-semibold">{s.name}</h3>
                  <p className="mt-1 text-sm text-[#221820]/50">
                    {formatDuration(s.durationMin)} · {formatMad(s.price)}
                  </p>
                  <Link
                    href={bookPath(slug, `/booking/?service=${encodeURIComponent(s.id)}`)}
                    className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-[#7B5900] text-sm font-bold text-white hover:bg-[#5D4200]"
                  >
                    Réserver
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Popular products */}
      {products.length > 0 ? (
        <section className="bg-white py-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-6 flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  Boutique
                </p>
                <h2 className="mt-1 font-serif text-2xl font-semibold sm:text-3xl">
                  Produits populaires
                </h2>
              </div>
              <Link
                href={bookPath(slug, "/products/")}
                className="shrink-0 text-sm font-semibold text-primary hover:underline"
              >
                Voir tous les produits →
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {products.map((p) => (
                <article
                  key={p.id}
                  className="flex flex-col rounded-xl border border-[#E4BDC2]/35 bg-[#FFF7F9] p-4 shadow-sm"
                >
                  <Link href={bookPath(slug, `/products/${p.slug || slugifyLabel(p.name)}/`)}>
                    <div className="mb-3 flex h-28 items-center justify-center rounded-lg bg-white">
                      <span className="font-serif text-2xl font-semibold text-primary/30">
                        {p.name.charAt(0)}
                      </span>
                    </div>
                    <h3 className="line-clamp-2 text-sm font-semibold">{p.name}</h3>
                    {p.unit ? (
                      <p className="mt-0.5 text-xs text-[#221820]/45">{p.unit}</p>
                    ) : null}
                    <p className="mt-2 font-mono text-sm font-bold text-primary">
                      {formatMad(p.salePrice)}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                      {p.inStock ? "En stock" : "Rupture"}
                    </p>
                  </Link>
                  <button
                    type="button"
                    disabled={!p.inStock}
                    onClick={() => {
                      addItem({
                        productId: p.id,
                        name: p.name,
                        slug: p.slug || slugifyLabel(p.name),
                        salePrice: p.salePrice,
                        unit: p.unit,
                      });
                      setToast("Produit ajouté au panier");
                    }}
                    className="mt-3 h-10 rounded-lg bg-[#FFEFF8] text-xs font-bold text-[#221820] hover:bg-[#F6E3EF] disabled:opacity-40"
                  >
                    Ajouter au panier
                  </button>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Why us */}
      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:grid-cols-2 sm:px-6">
        <div>
          <h2 className="font-serif text-2xl font-semibold">Une expérience unique</h2>
          <ul className="mt-6 space-y-4">
            {(
              [
                "Professionnelles qualifiées",
                "Produits professionnels",
                "Rendez-vous rapide",
                "Espace confortable",
              ] as const
            ).map((label) => (
              <li key={label} className="flex items-start gap-3 text-sm">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#7B5900]" />
                <span className="font-semibold">{label}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-[#E4BDC2]/35 bg-white p-6 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
            Avis de nos clientes
          </p>
          <div className="mt-3 flex gap-0.5 text-[#7B5900]">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-current" />
            ))}
          </div>
          <p className="mt-4 text-[15px] leading-relaxed text-[#221820]/75">
            « Un accueil chaleureux et des soins de grande qualité. On se sent vraiment
            choyée. »
          </p>
          <p className="mt-4 text-sm font-semibold">— Sara</p>
          <p className="text-xs text-[#221820]/40">Témoignage illustratif (soft)</p>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
        <div
          className="overflow-hidden rounded-2xl bg-cover bg-center px-6 py-12 text-center sm:px-10"
          style={{
            backgroundImage:
              "linear-gradient(rgba(56,45,54,0.72), rgba(56,45,54,0.72)), url('https://images.unsplash.com/photo-1600334129128-685c5582fd35?auto=format&fit=crop&w=1400&q=80')",
          }}
        >
          <h2 className="font-serif text-2xl font-semibold text-white sm:text-3xl">
            Prête pour votre prochain rendez-vous ?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/75">
            Offrez-vous un moment de bien-être dès aujourd&apos;hui.
          </p>
          <Link
            href={bookPath(slug, "/booking/")}
            className="mt-6 inline-flex h-12 items-center gap-2 rounded-lg bg-[#7B5900] px-6 text-sm font-bold text-white hover:bg-[#5D4200]"
          >
            <CalendarDays className="h-4 w-4" />
            Réserver maintenant
          </Link>
        </div>
      </section>

      {toast ? (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-[#221820] px-4 py-2.5 text-sm font-semibold text-white shadow-lg lg:bottom-8">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function InfoCell({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 text-primary">{icon}</span>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold">{title}</p>
        <p className="truncate text-xs text-[#221820]/45">{subtitle}</p>
      </div>
    </div>
  );
}
