"use client";

import Link from "next/link";
import { CalendarDays, Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { bookHref } from "@/lib/public-site";
import type { PublicOrganizationProfile } from "@/types/public-booking";
import type { ReactNode } from "react";

type Props = {
  org: PublicOrganizationProfile;
  children: ReactNode;
};

export function PublicSiteShell({ org, children }: Props) {
  const booking = bookHref(org.slug, "/booking/");
  const waDigits = org.phone?.replace(/\D/g, "") ?? "";
  const wa =
    waDigits.length >= 9
      ? `https://wa.me/${waDigits.startsWith("0") ? `212${waDigits.slice(1)}` : waDigits}`
      : null;

  return (
    <div className="min-h-screen bg-[#FFFDFC] text-[#241A22]">
      <header className="sticky top-0 z-50 border-b border-[#EBDDE4]/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-3xl items-center justify-between gap-4 px-5">
          <Link href={booking} className="min-w-0">
            <div className="truncate font-serif text-lg font-semibold tracking-wide">{org.name}</div>
            <div className="text-[11px] text-[#9A7A83]">Réservation en ligne</div>
          </Link>
          <Link
            href={booking}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-[#B76E79] px-4 py-3 text-sm font-semibold text-white"
          >
            <CalendarDays size={16} />
            Réserver
          </Link>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-[#EBDDE4] bg-white">
        <div className="mx-auto grid max-w-3xl gap-8 px-5 py-10 sm:grid-cols-2">
          <div className="space-y-3 text-sm text-[#746970]">
            <h2 className="font-semibold text-[#241A22]">Nous trouver</h2>
            <div className="flex gap-3">
              <MapPin size={17} className="shrink-0" />
              <span>{org.address ?? "Adresse à venir"}</span>
            </div>
            {org.phone ? (
              <div className="flex gap-3">
                <Phone size={17} className="shrink-0" />
                <a href={`tel:${org.phone}`}>{org.phone}</a>
              </div>
            ) : null}
            {org.email ? (
              <div className="flex gap-3">
                <Mail size={17} className="shrink-0" />
                <a href={`mailto:${org.email}`}>{org.email}</a>
              </div>
            ) : null}
            {wa ? (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-semibold text-[#B76E79]">
                <MessageCircle size={17} />
                WhatsApp
              </a>
            ) : null}
          </div>
          <div className="text-sm text-[#746970]">
            <h2 className="font-semibold text-[#241A22]">Horaires</h2>
            <div className="mt-3 flex gap-3">
              <Clock size={17} className="shrink-0" />
              <div>
                <p>Lundi – Samedi</p>
                <p>09:00 – 19:00</p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export { bookHref as bookPath };
