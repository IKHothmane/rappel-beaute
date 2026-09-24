"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, Clock3 } from "lucide-react";
import { bookPath } from "@/components/public-site/PublicSiteShell";
import { slugifyLabel } from "@/lib/booking-qr";
import { servicePlaceholderImage } from "@/lib/public-site";
import {
  formatDuration,
  formatMad,
  getPublicServices,
} from "@/modules/public-booking/service";
import type { PublicServiceItem } from "@/types/public-booking";

export function PublicServicesPage({ slug }: { slug: string }) {
  const [services, setServices] = useState<PublicServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("Tous");

  useEffect(() => {
    getPublicServices(slug)
      .then(setServices)
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  }, [slug]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const s of services) {
      if (s.category?.trim()) set.add(s.category.trim());
    }
    return ["Tous", ...Array.from(set).sort()];
  }, [services]);

  const filtered = useMemo(() => {
    if (category === "Tous") return services;
    return services.filter((s) => (s.category ?? "").trim() === category);
  }, [services, category]);

  if (loading) {
    return (
      <p className="px-5 py-16 text-center text-sm text-[#746970]">Chargement…</p>
    );
  }

  return (
    <div>
      <section className="border-b border-[#EBDDE4] bg-[#F9ECE9]">
        <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#B76E79]">
            Nos prestations
          </p>
          <div className="mt-3 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <h1 className="font-serif text-5xl">Tous nos services</h1>
              <p className="mt-4 max-w-2xl text-[#6E6268]">
                Découvrez notre gamme complète de soins, réalisés par des
                professionnelles qualifiées dans un cadre élégant et apaisant.
              </p>
            </div>
            <Link
              href={bookPath(slug, "/booking/")}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#B76E79] px-5 py-3 font-semibold text-white"
            >
              <CalendarDays size={17} />
              Réserver
            </Link>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <div className="flex gap-2 overflow-x-auto pb-3">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-medium transition ${
                category === cat
                  ? "bg-[#B76E79] text-white"
                  : "bg-[#F7EFF1] text-[#665960] hover:bg-[#F0E4E8]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="mt-10 text-center text-sm text-[#746970]">
            Aucun service dans cette catégorie.
          </p>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {filtered.map((service) => {
              const sSlug = slugifyLabel(service.name);
              return (
                <article
                  key={service.id}
                  className="overflow-hidden rounded-2xl border border-[#EBDDE4] bg-white shadow-sm"
                >
                  <div className="relative h-52">
                    <Image
                      src={servicePlaceholderImage(service.id)}
                      alt={service.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 25vw"
                    />
                  </div>
                  <div className="p-5">
                    {service.category ? (
                      <span className="text-xs font-medium text-[#B76E79]">
                        {service.category}
                      </span>
                    ) : null}
                    <h2 className="mt-2 font-serif text-2xl">{service.name}</h2>
                    <p className="mt-2 min-h-12 text-sm leading-6 text-[#766970]">
                      {service.description?.trim() ||
                        "Soin professionnel réalisé à l'institut."}
                    </p>
                    <div className="mt-4 flex items-center justify-between border-t border-[#F0E4E8] pt-4">
                      <div className="flex items-center gap-1 text-sm text-[#776B71]">
                        <Clock3 size={15} />
                        {formatDuration(service.durationMin)}
                      </div>
                      <strong className="text-[#B14F5E]">
                        {formatMad(service.price)}
                      </strong>
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-2">
                      <Link
                        href={bookPath(
                          slug,
                          `/booking/?service=${encodeURIComponent(service.id)}`,
                        )}
                        className="flex items-center justify-center rounded-xl bg-[#B76E79] py-2.5 text-sm font-semibold text-white"
                      >
                        Réserver
                      </Link>
                      <Link
                        href={bookPath(slug, `/services/${sSlug}/`)}
                        className="flex items-center justify-center gap-1 rounded-xl border border-[#D8B9C0] py-2.5 text-sm font-medium text-[#A55261]"
                      >
                        Détails
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
