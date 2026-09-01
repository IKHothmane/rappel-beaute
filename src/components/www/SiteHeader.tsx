"use client";

import Link from "next/link";
import { useState } from "react";
import { NAV } from "@/lib/site";

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-paper/90 backdrop-blur-md">
      <div className="container-rb flex h-[4.25rem] items-center justify-between gap-3">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary font-display text-lg font-semibold text-white">
            R
          </span>
          <span className="leading-tight">
            <span className="block font-display text-[15px] font-semibold tracking-tight text-ink">
              RAPPEL BEAUTÉ
            </span>
            <span className="font-mono text-[10px] tracking-[0.16em] text-primary">
              V1.2
            </span>
          </span>
        </Link>

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
            <Link href="/login/" className="btn-ghost px-4 py-2">
              Se connecter
            </Link>
            <Link href="/demo/" className="btn-primary px-4 py-2">
              Demander une démo
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
              href="/login/"
              className="btn-ghost mt-2 w-full"
              onClick={() => setOpen(false)}
            >
              Se connecter
            </Link>
            <Link
              href="/demo/"
              className="btn-primary w-full"
              onClick={() => setOpen(false)}
            >
              Demander une démo
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
