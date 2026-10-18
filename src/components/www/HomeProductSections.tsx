"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CalendarDays, CheckCircle2, UsersRound, Wallet } from "lucide-react";

const SECTIONS = [
  {
    eyebrow: "Agenda intelligent",
    title: "Organisez facilement vos rendez-vous.",
    description:
      "Planifiez par cabine, par vue jour, semaine et mois. Suivez en temps réel les rendez-vous et l’occupation de votre équipe.",
    bullets: [
      "Planning multi-praticiennes",
      "Anti double-réservation",
      "Vue par cabine et par employée",
      "Rappels et statuts des rendez-vous",
    ],
    image: "/marketing/screen-agenda.png",
    alt: "Agenda Rappel Beauty sur ordinateur",
    width: 612,
    height: 408,
    href: "/fonctionnalites/#rdv",
    linkText: "Découvrir l’agenda",
    Icon: CalendarDays,
    imageFirst: true,
  },
  {
    eyebrow: "Gestion des clientes",
    title: "Des fiches clientes complètes et intelligentes.",
    description:
      "Historique des soins, fidélité, relances et notes. Retrouvez toutes les informations de vos clientes en un seul endroit.",
    bullets: [
      "Fiches complètes et historique",
      "Carte de fidélité intégrée",
      "Relances adaptées",
      "Segmentation VIP et clientes inactives",
    ],
    image: "/marketing/screen-clientes.png",
    alt: "Gestion des clientes Rappel Beauty sur ordinateur",
    width: 1536,
    height: 1024,
    href: "/fonctionnalites/#clientes",
    linkText: "Découvrir la gestion clientes",
    Icon: UsersRound,
    imageFirst: false,
  },
  {
    eyebrow: "Gestion financière",
    title: "Suivez vos encaissements en toute simplicité.",
    description:
      "Caisse, paiements, dépenses et statistiques. Gardez le contrôle sur la santé financière de votre institut.",
    bullets: [
      "Encaissements et moyens de paiement",
      "Suivi des dépenses",
      "Rapports et statistiques",
      "Clôture de caisse quotidienne",
    ],
    image: "/marketing/screen-caisse.png",
    alt: "Caisse Rappel Beauty sur ordinateur",
    width: 1536,
    height: 1024,
    href: "/fonctionnalites/#caisse",
    linkText: "Découvrir la caisse",
    Icon: Wallet,
    imageFirst: true,
  },
] as const;

export function HomeProductSections() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="logiciel"
      className="relative scroll-mt-24 overflow-hidden bg-[#fff9fc] px-4 py-12 sm:px-6 sm:py-20"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 top-40 h-72 w-72 rounded-full bg-pink-200/25 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 top-[55%] h-80 w-80 rounded-full bg-rose-200/25 blur-3xl"
      />

      <div className="relative mx-auto max-w-6xl space-y-16 sm:space-y-24">
        {SECTIONS.map((section) => {
          const { eyebrow, title, description, bullets, image, alt, width, height, href, linkText, Icon, imageFirst } =
            section;

          return (
            <motion.article
              key={eyebrow}
              initial={reduceMotion ? false : { opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: reduceMotion ? 0 : 0.65, delay: reduceMotion ? 0 : 0.05, ease: "easeOut" }}
              className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14"
            >
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, x: imageFirst ? -28 : 28 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: reduceMotion ? 0 : 0.7, ease: "easeOut" }}
                className={`group relative min-w-0 ${imageFirst ? "lg:order-1" : "lg:order-2"}`}
              >
                <div
                  aria-hidden="true"
                  className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-pink-200/50 via-white/40 to-rose-100/60 blur-xl"
                />
                <div className="relative overflow-hidden rounded-2xl border border-pink-100 bg-white p-1.5 shadow-[0_24px_65px_-30px_rgba(190,24,93,0.32)] transition-transform duration-500 group-hover:-translate-y-1 motion-reduce:transform-none">
                  <Image
                    src={image}
                    alt={alt}
                    width={width}
                    height={height}
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="h-auto w-full rounded-xl object-contain"
                  />
                </div>
                <div className="absolute -bottom-4 right-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-pink-100 bg-white text-primary shadow-lg sm:-right-5 sm:h-14 sm:w-14">
                  <Icon size={25} strokeWidth={1.7} aria-hidden="true" />
                </div>
              </motion.div>

              <div className={`min-w-0 ${imageFirst ? "lg:order-2" : "lg:order-1"}`}>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
                <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
                  {title}
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-7 text-ink/65 sm:text-base">{description}</p>
                <ul className="mt-5 space-y-3">
                  {bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2.5 text-sm text-ink/80">
                      <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={href}
                  className="mt-7 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-md shadow-pink-900/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary-dark hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2 motion-reduce:transform-none"
                >
                  {linkText}
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}
