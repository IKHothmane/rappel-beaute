"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function HomeHero() {
  return (
    <section className="relative flex min-h-[520px] items-center justify-center overflow-hidden bg-[#FFF8FB] text-ink sm:min-h-[640px] lg:min-h-[720px]">
      <div className="absolute inset-0 z-0">
        <picture className="absolute inset-0 block h-full w-full">
          <source media="(max-width: 767px)" srcSet="/brand/hero-mobile.avif" type="image/avif" />
          <source media="(max-width: 767px)" srcSet="/brand/hero-mobile.webp" type="image/webp" />
          <source srcSet="/brand/hero.avif" type="image/avif" />
          <source srcSet="/brand/hero.webp" type="image/webp" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt=""
            width={1600}
            height={640}
            className="h-full w-full animate-kenburns object-cover object-center"
            src="/brand/hero.webp"
            fetchPriority="high"
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-r from-[#FFF8FB]/85 via-[#FFF8FB]/40 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-4 py-14 text-center sm:px-6 sm:py-20 lg:px-8">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-primary sm:mb-3 sm:text-xs sm:tracking-[0.3em]">
          Logiciel SaaS pour instituts de beauté
        </p>

        <h1 className="mb-4 max-w-4xl font-display text-3xl font-light leading-tight tracking-tight text-ink sm:text-5xl md:text-6xl">
          Le logiciel de gestion tout-en-un pour votre institut de beauté
        </h1>

        <p className="mb-8 max-w-2xl text-sm leading-relaxed text-ink/70 sm:text-lg">
          Rendez-vous, clientes, équipe, caisse, stock et réservation en ligne — tout depuis une seule
          plateforme, conçue pour les instituts de beauté au Maroc.
        </p>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/essai/"
            className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark"
          >
            Essayer gratuitement 7 jours
          </Link>
          <Link
            href="/demo/"
            className="inline-flex items-center justify-center rounded-full border border-line bg-white/80 px-6 py-3 text-sm font-semibold text-ink backdrop-blur-sm transition hover:border-primary/40"
          >
            Voir une démo
          </Link>
        </div>

        <ul className="mt-6 flex flex-col items-center gap-1.5 text-xs text-ink/70 sm:flex-row sm:gap-5 sm:text-sm">
          <li>7 jours gratuits</li>
          <li>Sans carte bancaire</li>
          <li>Sans engagement</li>
        </ul>
        <p className="mt-3 text-xs font-semibold text-ink/80 sm:text-sm">
          Conçu pour les instituts de beauté au Maroc
        </p>
      </div>

      <motion.div
        className="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 sm:flex"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        aria-hidden
      >
        <span className="text-[10px] uppercase tracking-[0.2em] text-ink/40">Scroll</span>
        <span className="h-8 w-px animate-scroll-line bg-gradient-to-b from-gold to-transparent" />
      </motion.div>
    </section>
  );
}
