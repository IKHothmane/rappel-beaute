"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarDays, Clock3 } from "lucide-react";
import { bookPath } from "@/components/public-site/PublicSiteShell";
import { slugifyLabel } from "@/lib/booking-qr";
import { servicePlaceholderImage } from "@/lib/public-site";
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
    return (
      <p className="px-5 py-16 text-center text-sm text-[#746970]">Chargement…</p>
    );
  }

  if (!service) {
    return (
      <div className="mx-auto max-w-xl px-5 py-16 text-center">
        <p className="text-sm text-[#746970]">Service introuvable.</p>
        <Link
          href={bookPath(slug, "/services/")}
          className="mt-4 inline-block text-sm font-bold text-[#B76E79]"
        >
          Retour aux services
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <Link
        href={bookPath(slug, "/services/")}
        className="text-sm font-semibold text-[#B76E79] hover:underline"
      >
        ← Services
      </Link>

      <div className="mt-6 overflow-hidden rounded-3xl border border-[#EBDDE4] bg-white shadow-sm">
        <div className="relative h-64 sm:h-80">
          <Image
            src={servicePlaceholderImage(service.id)}
            alt={service.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
            priority
          />
        </div>
        <div className="p-6 sm:p-8">
          {service.category ? (
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B76E79]">
              {service.category}
            </p>
          ) : null}
          <h1 className="mt-2 font-serif text-4xl text-[#241A22]">{service.name}</h1>
          <p className="mt-4 leading-7 text-[#665A61]">
            {service.description ?? "Prestation réalisée par notre équipe."}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-6 border-t border-[#F0E4E8] pt-5">
            <div className="flex items-center gap-2 text-sm text-[#776B71]">
              <Clock3 size={16} className="text-[#B76E79]" />
              {formatDuration(service.durationMin)}
            </div>
            <strong className="text-xl text-[#B14F5E]">{formatMad(service.price)}</strong>
          </div>
          {service.deposit != null && service.deposit > 0 ? (
            <p className="mt-3 text-xs text-amber-700">
              Acompte : {formatMad(service.deposit)} (encaissement à l&apos;institut)
            </p>
          ) : null}
          <Link
            href={bookPath(slug, `/booking/?service=${encodeURIComponent(service.id)}`)}
            className="mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#B76E79] text-sm font-semibold text-white hover:bg-[#9F5C67] sm:w-auto sm:px-8"
          >
            <CalendarDays size={17} />
            Réserver ce service
          </Link>
        </div>
      </div>
    </div>
  );
}
