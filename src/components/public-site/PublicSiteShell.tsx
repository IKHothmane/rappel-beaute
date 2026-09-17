"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  CalendarDays,
  Home,
  Menu,
  Package,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react";
import { usePublicCart } from "@/components/public-site/PublicCartContext";
import { cn } from "@/lib/utils";
import type { PublicOrganizationProfile } from "@/types/public-booking";

function bookPath(slug: string, path = "") {
  const base = `/book/${encodeURIComponent(slug)}`;
  if (!path || path === "/") return `${base}/`;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

type Props = {
  org: PublicOrganizationProfile;
  children: ReactNode;
};

export function PublicSiteShell({ org, children }: Props) {
  const pathname = usePathname();
  const { count } = usePublicCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const slug = org.slug;

  const nav = [
    { href: bookPath(slug), label: "Accueil", match: "exact" as const },
    { href: bookPath(slug, "/services/"), label: "Services", match: "prefix" as const },
    { href: bookPath(slug, "/products/"), label: "Produits", match: "prefix" as const },
    { href: bookPath(slug, "/booking/"), label: "Réserver", match: "prefix" as const },
  ];

  function isActive(href: string, match: "exact" | "prefix") {
    const path = pathname.replace(/\/$/, "") || "/";
    const target = href.replace(/\/$/, "") || "/";
    if (match === "exact") return path === target || path.endsWith(`/book/${slug}`);
    return path === target || path.startsWith(target);
  }

  const waPhone = org.phone?.replace(/\D/g, "") ?? "";
  const wa =
    waPhone.length >= 9
      ? `https://wa.me/${waPhone.startsWith("0") ? `212${waPhone.slice(1)}` : waPhone}`
      : null;

  return (
    <div className="min-h-screen bg-[#FFF7F9] text-[#221820]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[#E4BDC2]/40 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href={bookPath(slug)} className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#382D36] text-sm font-bold text-[#FFDEA4]">
              {org.name.charAt(0)}
            </span>
            <div className="min-w-0 hidden sm:block">
              <p className="truncate font-serif text-base font-semibold tracking-tight">
                {org.name}
              </p>
              <p className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-[#7B5900]">
                Beauté · Bien-être · Soin
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigation">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-semibold transition",
                  isActive(item.href, item.match)
                    ? "bg-[#FFEFF8] text-primary"
                    : "text-[#221820]/65 hover:bg-[#FFEFF8] hover:text-[#221820]",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href={bookPath(slug, "/cart/")}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl text-[#221820]/70 hover:bg-[#FFEFF8]"
              aria-label="Panier"
            >
              <ShoppingBag className="h-5 w-5" />
              {count > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                  {Math.min(count, 99)}
                </span>
              ) : null}
            </Link>
            <Link
              href={bookPath(slug, "/booking/")}
              className="hidden h-10 items-center rounded-lg bg-[#7B5900] px-4 text-sm font-bold text-white shadow-sm hover:bg-[#5D4200] sm:inline-flex"
            >
              Prendre rendez-vous
            </Link>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-xl lg:hidden"
              aria-label="Menu"
              onClick={() => setMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[#221820]/40"
            aria-label="Fermer"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute right-0 top-0 flex h-full w-72 flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#FFEFF8] p-4">
              <p className="font-semibold">{org.name}</p>
              <button type="button" onClick={() => setMenuOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-1 p-3">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-xl px-3 py-3 text-sm font-semibold hover:bg-[#FFEFF8]"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href={bookPath(slug, "/cart/")}
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-3 py-3 text-sm font-semibold hover:bg-[#FFEFF8]"
              >
                Panier {count > 0 ? `(${count})` : ""}
              </Link>
            </nav>
          </div>
        </div>
      ) : null}

      <main className="pb-24 lg:pb-0">{children}</main>

      {/* Footer */}
      <footer className="mt-12 border-t border-[#E4BDC2]/40 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6">
          <div>
            <p className="font-serif text-lg font-semibold">{org.name}</p>
            <p className="mt-2 text-sm text-[#221820]/55">
              {org.address ?? "Adresse à venir"}
              {org.city ? ` · ${org.city}` : ""}
            </p>
            {org.phone ? (
              <a href={`tel:${org.phone}`} className="mt-2 block text-sm font-semibold text-primary">
                {org.phone}
              </a>
            ) : null}
            {org.email ? (
              <a href={`mailto:${org.email}`} className="mt-1 block text-sm text-[#221820]/55">
                {org.email}
              </a>
            ) : null}
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#221820]/40">
              Horaires
            </p>
            <p className="mt-2 text-sm">Lun – Sam · 09:00 – 19:00</p>
            <p className="text-sm text-[#221820]/45">Dimanche · Fermé</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#221820]/40">
              Contact
            </p>
            <div className="mt-2 flex flex-col gap-2 text-sm">
              {wa ? (
                <a href={wa} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary">
                  WhatsApp
                </a>
              ) : null}
              <Link href={bookPath(slug, "/booking/")} className="font-semibold text-[#7B5900]">
                Réserver en ligne
              </Link>
            </div>
          </div>
        </div>
        <div className="border-t border-[#FFEFF8] px-4 py-4 text-center text-[11px] text-[#221820]/40 sm:px-6">
          Propulsé par Rappel Beauté · Conditions · Confidentialité
        </div>
      </footer>

      {/* Mobile bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E4BDC2]/40 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
        aria-label="Navigation mobile"
      >
        <div className="flex h-16 items-center justify-around px-1">
          {(
            [
              { href: bookPath(slug), label: "Accueil", icon: Home },
              { href: bookPath(slug, "/services/"), label: "Services", icon: Sparkles },
              { href: bookPath(slug, "/products/"), label: "Produits", icon: Package },
              { href: bookPath(slug, "/booking/"), label: "Réserver", icon: CalendarDays },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.href.endsWith(`/book/${slug}`) || item.href.endsWith(`/book/${slug}/`) ? "exact" : "prefix");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-semibold",
                  active ? "text-primary" : "text-[#221820]/45",
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export { bookPath };
