"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

export function HomeHero({ imageSrc }: { imageSrc: string }) {
  return (
    <section className="relative flex min-h-[520px] items-center justify-center overflow-hidden bg-[#FFF8FB] text-ink sm:min-h-[640px] lg:min-h-[720px]">
      <div className="absolute inset-0 z-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          className="h-full w-full animate-kenburns object-cover object-center"
          src={imageSrc}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#FFF8FB]/85 via-[#FFF8FB]/40 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-4 py-14 text-center sm:px-6 sm:py-20 lg:px-8">
        <motion.p
          className="mb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-primary sm:mb-3 sm:text-xs sm:tracking-[0.3em]"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease, delay: 0.1 }}
        >
          Logiciel SaaS pour instituts de beauté
        </motion.p>

        <motion.h1
          className="mb-4 max-w-4xl font-display text-3xl font-light leading-tight tracking-tight text-ink sm:text-5xl md:text-6xl"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease, delay: 0.22 }}
        >
          Le logiciel de gestion pour les instituts de beauté au Maroc
        </motion.h1>

        <motion.p
          className="mb-8 max-w-2xl text-sm leading-relaxed text-ink/70 sm:text-lg"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease, delay: 0.38 }}
        >
          Gérez vos rendez-vous, clientes, équipe, stock, caisse et ventes depuis une seule plateforme.
        </motion.p>

        <motion.div
          className="flex flex-col items-center justify-center gap-3 sm:flex-row"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease, delay: 0.5 }}
        >
          <Link
            href="/essai/"
            className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark"
          >
            Essayer gratuitement 7 jours
          </Link>
          <Link
            href="/fonctionnalites/"
            className="inline-flex items-center justify-center rounded-full border border-line bg-white/80 px-6 py-3 text-sm font-semibold text-ink backdrop-blur-sm transition hover:border-primary/40"
          >
            Voir les fonctionnalités
          </Link>
        </motion.div>

        <motion.p
          className="mt-6 text-xs text-ink/60 sm:text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          Sans engagement · 7 jours gratuits · Sans carte bancaire
        </motion.p>
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
