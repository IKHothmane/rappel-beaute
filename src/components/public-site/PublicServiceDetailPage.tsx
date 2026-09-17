"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { bookPath } from "@/components/public-site/PublicSiteShell";
import { slugifyLabel } from "@/lib/booking-qr";
import {
  formatDuration,
  formatMad,
  getPublicServices,
} from "@/modules/public-booking/service";
import type { PublicServiceItem } from "@/types/public-booking";

export function PublicServiceDetailPage({
  slug,
  serviceSlug,
}: {
  slug: string;
  serviceSlug: string;
}) {
  const [service, setService] = useState<PublicServiceItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPublicServices(slug)
      .then((list) => {
        const needle = serviceSlug.toLowerCase();
        setService(
          list.find((s) => s.id.toLowerCase() === needle) ??
            list.find((s) => slugifyLabel(s.name) === needle) ??
            null,
        );
      })
      .catch(() => setService(null))
      .finally(() => setLoading(false));
  }, [slug, serviceSlug]);

  if (loading) {
    return <p className="px-4 py-16 text-center text-sm text-[#221820]/45">Chargement…</p>;
  }

  if (!service) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-sm text-[#221820]/55">Service introuvable.</p>
        <Link href={bookPath(slug, "/services/")} className="mt-4 inline-block text-sm font-bold text-primary">
          Retour aux services
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link href={bookPath(slug, "/services/")} className="text-sm font-semibold text-primary hover:underline">
        ← Services
      </Link>
      <h1 className="mt-4 font-serif text-3xl font-semibold">{service.name}</h1>
      <p className="mt-3 text-sm text-[#221820]/60">
        {service.description ?? "Prestation réalisée par notre équipe."}
      </p>
      <div className="mt-6 grid grid-cols-2 gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-[#E4BDC2]/35">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#221820]/40">Durée</p>
          <p className="font-semibold">{formatDuration(service.durationMin)}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#221820]/40">Prix</p>
          <p className="font-semibold text-primary">{formatMad(service.price)}</p>
        </div>
      </div>
      {service.deposit != null && service.deposit > 0 ? (
        <p className="mt-3 text-xs text-amber-700">
          Acompte : {formatMad(service.deposit)} (encaissement à l&apos;institut)
        </p>
      ) : null}
      <Link
        href={bookPath(slug, `/booking/?service=${encodeURIComponent(service.id)}`)}
        className="mt-8 flex h-12 items-center justify-center rounded-lg bg-[#7B5900] text-sm font-bold text-white hover:bg-[#5D4200]"
      >
        Réserver ce service
      </Link>
    </div>
  );
}
