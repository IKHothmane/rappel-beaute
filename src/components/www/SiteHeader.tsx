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
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 pt-3 md:px-5 md:pt-4">
      <div
        className={`pointer-events-auto mx-auto max-w-[1200px] rounded-[1.25rem] border border-white/80 shadow-[0_10px_28px_rgb(186_0_73/12%)] backdrop-blur-md transition-all duration-300 ${
          scrolled ? "bg-white/95" : "bg-white/75"
        }`}
      >
        <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-5">
          <BrandLogo height={40} className="max-h-10" priority />

          <nav
            className="hidden items-center gap-3 lg:flex xl:gap-5"
            aria-label="Navigation principale"
          >
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={
                  pathname?.replace(/\/$/, "") === item.href.replace(/\/$/, "") ? "page" : undefined
                }
                className="relative text-sm font-medium text-ink/70 transition hover:text-ink after:absolute after:-bottom-1 after:left-0 after:h-px after:w-0 after:bg-primary after:transition-all after:duration-300 hover:after:w-full"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/professionnel/"
              className="btn-ghost hidden px-3 py-2 text-sm transition hover:scale-[1.02] lg:inline-flex"
            >
              Je suis un professionnel
            </Link>
            <Link
              href="/connexion/"
              className="btn-primary px-3 py-2 text-sm transition hover:scale-[1.02]"
            >
              Se connecter
            </Link>

            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-line transition hover:bg-primary-light lg:hidden"
              aria-expanded={open}
              aria-controls="site-mobile-nav"
              aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
              onClick={() => setOpen((v) => !v)}
            >
              <span className="sr-only">Menu</span>
              <span className="relative flex h-3.5 w-4 flex-col justify-between">
                <span
                  className={`block h-px w-full origin-center bg-ink transition duration-300 ${
                    open ? "translate-y-[6.5px] rotate-45" : ""
                  }`}
                />
                <span
                  className={`block h-px w-full bg-ink transition duration-300 ${
                    open ? "opacity-0" : ""
                  }`}
                />
                <span
                  className={`block h-px w-3 origin-center bg-ink transition duration-300 ${
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
          <div className="min-h-0 overflow-hidden">
            <nav className="container-rb flex flex-col gap-3 border-t border-line/70 py-4">
              {NAV.map((item, i) => (
                <div
                  key={item.href}
                  className={`transition duration-300 motion-reduce:transition-none ${
                    open ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0"
                  }`}
                  style={{ transitionDelay: open ? `${40 * i}ms` : "0ms" }}
                >
                  <Link
                    href={item.href}
                    aria-current={
                      pathname?.replace(/\/$/, "") === item.href.replace(/\/$/, "")
                        ? "page"
                        : undefined
                    }
                    className="block text-sm font-medium"
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </Link>
                </div>
              ))}
              <Link
                href="/professionnel/"
                className="btn-ghost mt-2 w-full"
                onClick={() => setOpen(false)}
              >
                Je suis un professionnel
              </Link>
              <Link
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
