"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { HomeSearch } from "@/components/www/HomeSearch";

const POPULAR_CITIES = [
  "Casablanca Gauthier",
  "Rabat Agdal",
  "Marrakech Guéliz",
  "Tanger Malabata",
];

const ease = [0.22, 1, 0.36, 1] as const;

export function HomeHero({ imageSrc }: { imageSrc: string }) {
  return (
    <section className="relative flex min-h-[520px] items-center justify-center overflow-hidden bg-institut text-white sm:min-h-[640px] lg:min-h-[720px]">
      <div className="absolute inset-0 z-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          className="h-full w-full animate-kenburns object-cover object-center brightness-75"
          src={imageSrc}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-institut/90 via-institut/50 to-institut/70" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-4 py-14 text-center sm:px-6 sm:py-20 lg:px-8">
        <motion.p
          className="mb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-gold sm:mb-3 sm:text-xs sm:tracking-[0.3em]"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease, delay: 0.1 }}
        >
          La référence beauté au Maroc
        </motion.p>

        <motion.h1
          className="mb-2 font-display text-3xl font-light tracking-tight text-white sm:mb-3 sm:text-6xl md:text-7xl"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease, delay: 0.22 }}
        >
          Réservez en beauté
        </motion.h1>

        <motion.p
          className="mb-8 flex items-center justify-center space-x-2 text-xs font-normal tracking-wide text-white/90 sm:mb-10 sm:space-x-3 sm:text-base"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease, delay: 0.38 }}
        >
          <span>Simple</span>
          <span className="inline-block h-1 w-1 animate-pulse-dot rounded-full bg-primary" />
          <span>Immédiat</span>
          <span className="inline-block h-1 w-1 animate-pulse-dot rounded-full bg-primary" />
          <span>24h/24 &amp; 7j/7</span>
        </motion.p>

        <motion.div
          className="w-full max-w-2xl"
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease, delay: 0.5 }}
        >
          <HomeSearch />
        </motion.div>

        <motion.div
          className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-white/80"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.06, delayChildren: 0.7 } },
          }}
        >
          <motion.span
            className="font-medium text-gold"
            variants={{
              hidden: { opacity: 0, y: 8 },
              show: { opacity: 1, y: 0 },
            }}
          >
            Populaires :
          </motion.span>
          {POPULAR_CITIES.map((city) => (
            <motion.div
              key={city}
              variants={{
                hidden: { opacity: 0, y: 10 },
                show: { opacity: 1, y: 0 },
              }}
            >
              <Link
                href="/#explore"
                className="inline-block rounded-full border border-line/20 bg-institut/50 px-3 py-1 text-white backdrop-blur-sm transition hover:scale-105 hover:bg-primary/30"
              >
                {city}
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <motion.div
        className="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 sm:flex"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        aria-hidden
      >
        <span className="text-[10px] uppercase tracking-[0.2em] text-white/50">Scroll</span>
        <span className="h-8 w-px animate-scroll-line bg-gradient-to-b from-gold to-transparent" />
      </motion.div>
    </section>
  );
}
