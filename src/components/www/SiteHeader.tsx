"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/www/BrandLogo";
import { NAV } from "@/lib/site";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="pointer-events-none fixed inset-x-[var(--vt-size-0rem)] top-[var(--vt-size-0rem)] z-50 px-[var(--vt-space-0p75rem)] pt-[var(--vt-space-0p75rem)] md:px-[var(--vt-space-1p25rem)] md:pt-[var(--vt-space-1rem)]">
      <div
        className={`pointer-events-auto mx-auto max-w-[var(--vt-size-1200px)] rounded-[var(--vt-size-1p25rem)] border border-white/80 shadow-[0_10px_28px_rgb(186_0_73/12%)] backdrop-blur-md transition-all duration-300 ${
          scrolled ? "bg-white/95" : "bg-white/75"
        }`}
      >
        <div className="flex h-[var(--vt-size-4rem)] items-center justify-between gap-[var(--vt-space-0p75rem)] px-[var(--vt-space-1rem)] md:px-[var(--vt-space-1p25rem)]">
          <BrandLogo height={40} className="max-h-[var(--vt-size-2p5rem)]" priority />

          <nav
            className="hidden items-center gap-[var(--vt-space-0p75rem)] lg:flex xl:gap-[var(--vt-space-1p25rem)]"
            aria-label="Navigation principale"
          >
            {NAV.map((item) => (
              <Link prefetch={false}
                key={item.href}
                href={item.href}
                aria-current={
                  pathname?.replace(/\/$/, "") === item.href.replace(/\/$/, "") ? "page" : undefined
                }
                className="relative text-[length:var(--vt-text-0p875rem)]/[var(--vt-line-1p25rem)] font-medium text-ink/70 transition hover:text-ink after:absolute after:-bottom-1 after:left-[var(--vt-size-0rem)] after:h-[var(--vt-size-1px)] after:w-[var(--vt-size-0rem)] after:bg-primary after:transition-all after:duration-300 hover:after:w-full"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-[var(--vt-size-0p5rem)]">
            <Link prefetch={false}
              href="/professionnel/"
              className="btn-ghost hidden px-[var(--vt-space-0p75rem)] py-[var(--vt-size-0p5rem)] text-[length:var(--vt-text-0p875rem)]/[var(--vt-line-1p25rem)] transition hover:scale-[1.02] lg:inline-flex"
            >
              Je suis un professionnel
            </Link>
            <Link prefetch={false}
              href="/connexion/"
              className="btn-primary px-[var(--vt-space-0p75rem)] py-[var(--vt-size-0p5rem)] text-[length:var(--vt-text-0p875rem)]/[var(--vt-line-1p25rem)] transition hover:scale-[1.02]"
            >
              Se connecter
            </Link>

            <button
              type="button"
              className="flex h-[var(--vt-btn-h)] w-[var(--vt-btn-h)] items-center justify-center rounded-lg border border-line transition hover:bg-primary-light lg:hidden"
              aria-expanded={open}
              aria-controls="site-mobile-nav"
              aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
              onClick={() => setOpen((v) => !v)}
            >
              <span className="sr-only">Menu</span>
              <span className="relative flex h-[var(--vt-size-0p875rem)] w-[var(--vt-size-1rem)] flex-col justify-between">
                <span
                  className={`block h-[var(--vt-size-1px)] w-full origin-center bg-ink transition duration-300 ${
                    open ? "translate-y-[6.5px] rotate-45" : ""
                  }`}
                />
                <span
                  className={`block h-[var(--vt-size-1px)] w-full bg-ink transition duration-300 ${
                    open ? "opacity-0" : ""
                  }`}
                />
                <span
                  className={`block h-[var(--vt-size-1px)] w-[var(--vt-size-0p75rem)] origin-center bg-ink transition duration-300 ${
                    open ? "w-full -translate-y-[6.5px] -rotate-45" : ""
                  }`}
                />
              </span>
            </button>
          </div>
        </div>

        {/* Menu mobile : transition CSS (hauteur via grid-rows), sans framer-motion. */}
        <div
          id="site-mobile-nav"
          className={`grid transition-[grid-template-rows,opacity,visibility] duration-[280ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none lg:hidden ${
            open ? "visible grid-rows-[1fr] opacity-100" : "invisible grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="min-h-[var(--vt-size-0rem)] overflow-hidden">
            <nav className="container-rb flex flex-col gap-[var(--vt-space-0p75rem)] border-t border-line/70 py-[var(--vt-space-1rem)]">
              {NAV.map((item, i) => (
                <div
                  key={item.href}
                  className={`transition duration-300 motion-reduce:transition-none ${
                    open ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0"
                  }`}
                  style={{ transitionDelay: open ? `${40 * i}ms` : "0ms" }}
                >
                  <Link prefetch={false}
                    href={item.href}
                    aria-current={
                      pathname?.replace(/\/$/, "") === item.href.replace(/\/$/, "")
                        ? "page"
                        : undefined
                    }
                    className="block text-[length:var(--vt-text-0p875rem)]/[var(--vt-line-1p25rem)] font-medium"
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </Link>
                </div>
              ))}
              <Link prefetch={false}
                href="/professionnel/"
                className="btn-ghost mt-[var(--vt-size-0p5rem)] w-full"
                onClick={() => setOpen(false)}
              >
                Je suis un professionnel
              </Link>
              <Link prefetch={false}
                href="/connexion/"
                className="btn-primary w-full"
                onClick={() => setOpen(false)}
              >
                Se connecter
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
