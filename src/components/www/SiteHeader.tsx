"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BrandLogo } from "@/components/www/BrandLogo";
import { NAV } from "@/lib/site";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b backdrop-blur-md transition-all duration-300 ${
        scrolled
          ? "border-line bg-paper/95 shadow-soft"
          : "border-line/80 bg-paper/90"
      }`}
    >
      <div className="container-rb flex h-[5.5rem] items-center justify-between gap-3 md:h-24">
        <BrandLogo height={72} className="max-h-16 md:max-h-[4.5rem]" priority />

        <nav
          className="hidden items-center gap-7 lg:flex"
          aria-label="Navigation principale"
        >
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="relative text-[13px] font-medium text-ink/70 transition hover:text-ink after:absolute after:-bottom-1 after:left-0 after:h-px after:w-0 after:bg-primary after:transition-all after:duration-300 hover:after:w-full"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2.5">
          <div className="hidden items-center gap-2.5 lg:flex">
            <Link href="/professionnel/" className="btn-ghost px-4 py-2 transition hover:scale-[1.02]">
              Je suis un professionnel
            </Link>
            <Link href="/connexion/" className="btn-primary px-4 py-2 transition hover:scale-[1.02]">
              Se connecter
            </Link>
          </div>

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-line transition hover:bg-primary-light lg:hidden"
            aria-expanded={open}
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

      <AnimatePresence>
        {open ? (
          <motion.div
            key="mobile-nav"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-line bg-paper lg:hidden"
          >
            <nav className="container-rb flex flex-col gap-3 py-4">
              {NAV.map((item, i) => (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 * i }}
                >
                  <Link
                    href={item.href}
                    className="block text-sm font-medium"
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </Link>
                </motion.div>
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
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
