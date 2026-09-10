"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

export function PageHero({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <section className="relative overflow-hidden border-b border-line bg-[radial-gradient(ellipse_at_top_left,_rgba(227,28,95,0.10),_transparent_50%),linear-gradient(180deg,#FFFBF9_0%,#FDEAF0_100%)]">
      <div className="pointer-events-none absolute inset-0 bg-grain opacity-70" />
      <div className="container-rb relative py-16 md:py-20">
        <motion.p
          className="eyebrow"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
        >
          {eyebrow}
        </motion.p>
        <motion.h1
          className="mt-3 max-w-3xl font-display text-3xl font-semibold tracking-tight sm:text-4xl md:text-[2.75rem] md:leading-tight"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease, delay: 0.08 }}
        >
          {title}
        </motion.h1>
        <motion.p
          className="mt-4 max-w-xl text-base leading-relaxed text-ink/70"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease, delay: 0.18 }}
        >
          {text}
        </motion.p>
        <motion.div
          className="mt-8 flex flex-wrap gap-3"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease, delay: 0.28 }}
        >
          <Link href="/demo/" className="btn-primary transition hover:scale-[1.02]">
            Demander une démo
          </Link>
          <Link href="/essai/" className="btn-ghost transition hover:scale-[1.02]">
            Demande d’essai
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
