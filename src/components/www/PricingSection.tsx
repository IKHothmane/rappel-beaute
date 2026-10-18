"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CalendarDays, Check, CreditCard, ShieldCheck } from "lucide-react";
import { formatPrice, PUBLIC_OFFER } from "@/lib/site";

const BENEFITS = [
  "Toutes les fonctionnalités",
  "Support en français",
  "Mises à jour incluses",
] as const;

export function PricingSection() {
  const reduce = useReducedMotion();
  const price = (amount: number) => formatPrice(amount).replace(/[\u202f\u00a0]/g, " ");
  const monthly = price(PUBLIC_OFFER.monthlyPrice);
  const annual = price(PUBLIC_OFFER.annualPrice);
  const savings = price(PUBLIC_OFFER.annualSavings);
  const trial = PUBLIC_OFFER.trialDays;

  const enter = (delay = 0) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.3 },
          transition: { duration: 0.45, delay },
        };

  const guarantees = [
    {
      icon: CalendarDays,
      title: `${trial} jours gratuits`,
      text: "Pour tester le logiciel",
    },
    {
      icon: CreditCard,
      title: "Sans carte bancaire",
      text: "Pour commencer",
    },
    {
      icon: ShieldCheck,
      title: "Sans engagement",
      text: "Une offre transparente",
    },
  ] as const;

  return (
    <section id="tarifs" className="scroll-mt-24 bg-[#fff8fb] py-14 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div {...enter()} className="max-w-xl">
          <h2 className="font-display text-3xl font-light leading-tight text-ink sm:text-4xl">
            Une offre simple et transparente.
          </h2>
          <p className="mt-3 text-sm leading-7 text-ink/65 sm:text-base">
            Toutes les fonctionnalités pour gérer votre institut de beauté, sans frais cachés et
            sans engagement.
          </p>
        </motion.div>

        <div className="mt-8 grid items-stretch gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_220px] lg:gap-6">
          <motion.article
            {...enter(0.05)}
            className="flex flex-col rounded-2xl border border-line bg-white p-5 shadow-[0_16px_40px_-32px_rgba(190,24,93,0.45)] sm:p-6"
          >
            <p className="text-sm font-medium text-ink/70">Formule mensuelle</p>
            <p className="mt-3 flex items-end gap-1.5">
              <span className="font-display text-4xl font-semibold tracking-tight text-ink">
                {monthly}
              </span>
              <span className="mb-1 text-sm text-ink/55">DH/mois</span>
            </p>
            <ul className="mt-5 space-y-2.5">
              {BENEFITS.map((benefit) => (
                <li key={benefit} className="flex items-center gap-2.5 text-sm text-ink/75">
                  <Check className="shrink-0 text-primary" size={16} strokeWidth={2.5} aria-hidden="true" />
                  {benefit}
                </li>
              ))}
            </ul>
            <Link
              href="/professionnel/"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full border border-primary px-5 py-3 text-sm font-semibold text-primary transition hover:bg-primary-light"
            >
              Essayer gratuitement {trial} jours
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </motion.article>

          <motion.article
            {...enter(0.1)}
            className="relative flex flex-col rounded-2xl border border-primary/20 bg-white p-5 shadow-[0_18px_46px_-30px_rgba(190,24,93,0.55)] sm:p-6"
          >
            <span className="absolute right-4 top-4 rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold text-white">
              Économisez {savings} DH
            </span>
            <p className="pr-28 text-sm font-medium text-ink/70">Formule annuelle</p>
            <p className="mt-3 flex items-end gap-1.5">
              <span className="font-display text-4xl font-semibold tracking-tight text-primary">
                {annual}
              </span>
              <span className="mb-1 text-sm text-ink/55">DH/an</span>
            </p>
            <ul className="mt-5 space-y-2.5">
              {BENEFITS.map((benefit) => (
                <li key={`annual-${benefit}`} className="flex items-center gap-2.5 text-sm text-ink/75">
                  <Check className="shrink-0 text-primary" size={16} strokeWidth={2.5} aria-hidden="true" />
                  {benefit}
                </li>
              ))}
            </ul>
            <Link
              href="/professionnel/"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark"
            >
              Essayer gratuitement {trial} jours
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </motion.article>

          <motion.ul {...enter(0.15)} className="flex flex-col justify-center gap-5 lg:pl-2">
            {guarantees.map((item) => (
              <li key={item.title} className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
                  <item.icon size={18} aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-ink">{item.title}</span>
                  <span className="block text-xs text-ink/55">{item.text}</span>
                </span>
              </li>
            ))}
          </motion.ul>
        </div>
      </div>
    </section>
  );
}
