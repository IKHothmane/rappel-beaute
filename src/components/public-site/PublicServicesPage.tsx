"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { bookPath } from "@/components/public-site/PublicSiteShell";
import {
  formatDuration,
  formatMad,
  getPublicServices,
} from "@/modules/public-booking/service";
import { slugifyLabel } from "@/lib/booking-qr";
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
    return <p className="px-4 py-16 text-center text-sm text-[#221820]/45">Chargement…</p>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Prestations</p>
      <h1 className="mt-1 font-serif text-3xl font-semibold">Nos services</h1>
      <p className="mt-2 text-sm text-[#221820]/55">
        Découvrez toutes nos prestations.
      </p>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${
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
        <p className="mt-10 text-sm text-[#221820]/45">Aucun service dans cette catégorie.</p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => {
            const serviceSlug = slugifyLabel(s.name);
            return (
              <article
                key={s.id}
                className="flex flex-col rounded-xl border border-[#E4BDC2]/35 bg-white p-5 shadow-sm"
              >
                <h2 className="font-semibold text-lg">{s.name}</h2>
                {s.description ? (
                  <p className="mt-2 line-clamp-3 text-sm text-[#221820]/55">{s.description}</p>
                ) : (
                  <p className="mt-2 text-sm text-[#221820]/40">Soin institut</p>
                )}
                <p className="mt-4 text-sm font-semibold text-[#221820]/70">
                  {formatDuration(s.durationMin)} · {formatMad(s.price)}
                </p>
                <div className="mt-4 flex gap-2">
                  <Link
                    href={bookPath(slug, `/services/${serviceSlug}/`)}
                    className="flex-1 rounded-lg border border-[#E4BDC2]/50 py-2.5 text-center text-xs font-bold"
                  >
                    Voir détails
                  </Link>
                  <Link
                    href={bookPath(slug, `/booking/?service=${encodeURIComponent(s.id)}`)}
                    className="flex-1 rounded-lg bg-[#7B5900] py-2.5 text-center text-xs font-bold text-white"
                  >
                    Réserver
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
