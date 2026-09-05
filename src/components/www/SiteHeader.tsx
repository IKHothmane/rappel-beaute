"use client";

import Link from "next/link";
import { useState } from "react";
import { BrandLogo } from "@/components/www/BrandLogo";
import { NAV } from "@/lib/site";

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-paper/90 backdrop-blur-md">
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
              className="text-[13px] font-medium text-ink/70 transition hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2.5">
          <div className="hidden items-center gap-2.5 lg:flex">
            <Link href="/professionnel/" className="btn-ghost px-4 py-2">
              Je suis un professionnel
            </Link>
            <Link href="/connexion/" className="btn-primary px-4 py-2">
              Se connecter
            </Link>
          </div>

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-line lg:hidden"
            aria-expanded={open}
            aria-label="Ouvrir le menu"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">Menu</span>
            <span className="flex flex-col gap-1.5">
              <span className="block h-px w-4 bg-ink" />
              <span className="block h-px w-4 bg-ink" />
              <span className="block h-px w-3 bg-ink" />
            </span>
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-line bg-paper px-5 py-4 md:px-8 lg:hidden">
          <nav className="container-rb flex flex-col gap-3 !px-0">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
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
      ) : null}
    </header>
  );
}
