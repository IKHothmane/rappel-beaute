"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function HomeHero() {
  return (
    <section className="relative flex min-h-[520px] items-center justify-center overflow-hidden bg-[#FFF8FB] text-ink sm:min-h-[640px] lg:min-h-[720px]">
      <div className="absolute inset-0 z-0">
        <video
          className="absolute inset-0 h-full w-full object-cover object-center"
          autoPlay
          muted
          loop
          playsInline
          poster="/brand/hero.webp"
          aria-hidden
        >
          <source src="/hero.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-[#1A0A12]/45" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-4 py-14 text-center sm:px-6 sm:py-20 lg:px-8">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/80 sm:mb-3 sm:text-xs sm:tracking-[0.3em]">
          Logiciel SaaS pour instituts de beauté
        </p>

        <h1 className="mb-4 max-w-4xl font-display text-3xl font-light leading-tight tracking-tight text-white sm:text-5xl md:text-6xl">
          Logiciel de gestion pour institut de beauté au Maroc
        </h1>

        <p className="mb-8 max-w-2xl text-sm leading-relaxed text-white/85 sm:text-lg">
          Rendez-vous, clientes, équipe, caisse, stock et réservation en ligne — tout depuis une seule
          plateforme, conçue pour les instituts de beauté au Maroc.
        </p>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/professionnel/"
            className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark"
          >
            Essayer gratuitement 7 jours
          </Link>
          <Link
            href="/professionnel/"
            className="inline-flex items-center justify-center rounded-full border border-line bg-white/80 px-6 py-3 text-sm font-semibold text-ink backdrop-blur-sm transition hover:border-primary/40"
          >
            Voir une démo
          </Link>
        </div>

        <ul className="mt-6 flex flex-col items-center gap-1.5 text-xs text-white/80 sm:flex-row sm:gap-5 sm:text-sm">
          <li>7 jours gratuits</li>
          <li>Sans carte bancaire</li>
          <li>Sans engagement</li>
        </ul>
        <p className="mt-3 text-xs font-semibold text-white/90 sm:text-sm">
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
        <span className="text-[10px] uppercase tracking-[0.2em] text-white/70">Scroll</span>
        <span className="h-8 w-px animate-scroll-line bg-gradient-to-b from-gold to-transparent" />
      </motion.div>
    </section>
  );
}
