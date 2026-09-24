"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  CalendarDays,
  Clock,
  Home,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Package,
  Phone,
  Search,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react";
import { usePublicCart } from "@/components/public-site/PublicCartContext";
import { bookHref } from "@/lib/public-site";
import { cn } from "@/lib/utils";
import type { PublicOrganizationProfile } from "@/types/public-booking";

type Props = {
  org: PublicOrganizationProfile;
  children: ReactNode;
};

export function PublicSiteShell({ org, children }: Props) {
  const pathname = usePathname();
  const { count } = usePublicCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const slug = org.slug;
  const base = bookHref(slug);

  const nav = [
    { href: base, label: "Accueil", match: "exact" as const },
    { href: bookHref(slug, "/services/"), label: "Services", match: "prefix" as const },
    { href: bookHref(slug, "/products/"), label: "Produits", match: "prefix" as const },
    { href: bookHref(slug, "/booking/"), label: "Réserver", match: "prefix" as const },
  ];

  function isActive(href: string, match: "exact" | "prefix") {
    const path = pathname.replace(/\/$/, "") || "/";
    const target = href.replace(/\/$/, "") || "/";
    if (match === "exact") {
      return path === target || path.endsWith(`/book/${slug}`);
    }
    return path === target || path.startsWith(target);
  }

  const waDigits = org.phone?.replace(/\D/g, "") ?? "";
  const wa =
    waDigits.length >= 9
      ? `https://wa.me/${waDigits.startsWith("0") ? `212${waDigits.slice(1)}` : waDigits}`
      : null;

  return (
    <div className="min-h-screen bg-[#FFFDFC] text-[#241A22]">
      <header className="sticky top-0 z-50 border-b border-[#EBDDE4]/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link href={base} className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFF1F5] text-[#B76E79]">
              ✦
            </div>
            <div className="min-w-0">
              <div className="truncate font-serif text-lg font-semibold tracking-wide text-[#241A22]">
                {org.name.toUpperCase()}
              </div>
              <div className="text-[8px] uppercase tracking-[0.25em] text-[#9A7A83]">
                Beauté · Bien-être · Soin
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-7 md:flex" aria-label="Navigation">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm transition",
                  isActive(item.href, item.match)
                    ? "font-semibold text-[#B76E79]"
                    : "text-[#51474D] hover:text-[#B76E79]",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <button
              type="button"
              className="rounded-full p-2 text-[#51474D] hover:bg-[#FFF4F7]"
              aria-label="Rechercher"
            >
              <Search size={19} />
            </button>
            <Link
              href={bookHref(slug, "/cart/")}
              className="relative rounded-full p-2 text-[#51474D] hover:bg-[#FFF4F7]"
              aria-label="Panier"
            >
              <ShoppingBag size={20} />
              {count > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#B76E79] text-[10px] text-white">
                  {Math.min(count, 99)}
                </span>
              ) : null}
            </Link>
            <Link
              href={bookHref(slug, "/booking/")}
              className="flex items-center gap-2 rounded-xl bg-[#B76E79] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#9F5C67]"
            >
              <CalendarDays size={16} />
              Prendre rendez-vous
            </Link>
          </div>

          <div className="flex items-center gap-1 md:hidden">
            <Link
              href={bookHref(slug, "/cart/")}
              className="relative rounded-full p-2"
              aria-label="Panier"
            >
              <ShoppingBag size={20} />
              {count > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#B76E79] px-1 text-[9px] text-white">
                  {Math.min(count, 99)}
                </span>
              ) : null}
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-xl p-2"
              aria-label="Menu"
            >
              {menuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {menuOpen ? (
          <div className="border-t border-[#EBDDE4] bg-white px-5 py-5 md:hidden">
            <nav className="flex flex-col gap-4">
              {nav.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>
                  {item.label}
                </Link>
              ))}
              <Link
                href={bookHref(slug, "/booking/")}
                onClick={() => setMenuOpen(false)}
                className="rounded-xl bg-[#B76E79] px-4 py-3 text-center font-medium text-white"
              >
                Prendre rendez-vous
              </Link>
            </nav>
          </div>
        ) : null}
      </header>

      <main className="pb-20 md:pb-0">{children}</main>

      <footer className="border-t border-[#EBDDE4] bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-3 lg:px-8">
          <div>
            <div className="font-serif text-xl font-semibold">{org.name}</div>
            <p className="mt-3 max-w-sm text-sm leading-6 text-[#746970]">
              Beauté, bien-être et soins professionnels dans un espace élégant
              {org.city ? ` à ${org.city}` : ""}.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-[#241A22]">Nous trouver</h3>
            <div className="mt-4 space-y-3 text-sm text-[#746970]">
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
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-semibold text-[#B76E79]"
                >
                  <MessageCircle size={17} />
                  WhatsApp
                </a>
              ) : null}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-[#241A22]">Horaires</h3>
            <div className="mt-4 flex gap-3 text-sm text-[#746970]">
              <Clock size={17} className="shrink-0" />
              <div>
                <p>Lundi - Samedi</p>
                <p>09:00 - 19:00</p>
                <p className="mt-1">Dimanche · Fermé</p>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-[#EBDDE4]">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-5 text-xs text-[#8B7E84] md:flex-row md:items-center md:justify-between lg:px-8">
            <div className="flex gap-4">
              <span>Conditions d&apos;utilisation</span>
              <span>Politique de confidentialité</span>
            </div>
            <div className="flex items-center gap-2">
              © {new Date().getFullYear()} {org.name}
            </div>
          </div>
        </div>
      </footer>

      {wa ? (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg md:bottom-6"
          aria-label="WhatsApp"
        >
          <MessageCircle size={22} />
        </a>
      ) : null}

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[#EBDDE4] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="Navigation mobile"
      >
        <div className="flex h-16 items-center justify-around px-1">
          {(
            [
              { href: base, label: "Accueil", icon: Home, match: "exact" as const },
              {
                href: bookHref(slug, "/services/"),
                label: "Services",
                icon: Sparkles,
                match: "prefix" as const,
              },
              {
                href: bookHref(slug, "/products/"),
                label: "Produits",
                icon: Package,
                match: "prefix" as const,
              },
              {
                href: bookHref(slug, "/booking/"),
                label: "Réserver",
                icon: CalendarDays,
                match: "prefix" as const,
              },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.match);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-semibold",
                  active ? "text-[#B76E79]" : "text-[#8B7E84]",
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

export { bookHref as bookPath };
