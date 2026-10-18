"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  Gift,
  Sparkles,
  UserRoundCog,
  UsersRound,
  Wallet,
} from "lucide-react";

const FEATURES = [
  {
    title: "Rendez-vous",
    description: "Agenda simple et flexible.",
    href: "/fonctionnalites/#rdv",
    Icon: CalendarDays,
  },
  {
    title: "Clientes",
    description: "Fiches complètes et historique.",
    href: "/fonctionnalites/#clientes",
    Icon: UsersRound,
  },
  {
    title: "Services",
    description: "Prestations et tarifs.",
    href: "/fonctionnalites/#services",
    Icon: Sparkles,
  },
  {
    title: "Équipe",
    description: "Planning et commissions.",
    href: "/fonctionnalites/#equipe",
    Icon: UserRoundCog,
  },
  {
    title: "Caisse",
    description: "Encaissements et paiements.",
    href: "/fonctionnalites/#caisse",
    Icon: Wallet,
  },
  {
    title: "Fidélité",
    description: "Cartes et récompenses.",
    href: "/fidelite/",
    Icon: Gift,
  },
] as const;

export function HomeFeatureCards() {
  return (
    <section
      aria-label="Fonctionnalités principales de Rappel Beauty"
      className="relative overflow-hidden bg-[#fff8fb] px-4 pb-8 sm:px-6 sm:pb-10"
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {FEATURES.map(({ title, description, href, Icon }, index) => (
            <Link
              key={title}
              href={href}
              className="group relative flex min-h-[132px] flex-col rounded-2xl border border-white/90 bg-white/75 p-4 shadow-[0_8px_25px_-18px_rgba(190,24,93,0.35)] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-pink-200 hover:bg-white hover:shadow-[0_15px_30px_-15px_rgba(190,24,93,0.3)] motion-reduce:transform-none motion-reduce:transition-none"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary-light text-primary transition duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-white">
                <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <span className="text-sm font-bold text-ink">{title}</span>
              <span className="mt-1 pr-6 text-xs leading-relaxed text-ink/55">{description}</span>
              <span
                className="absolute bottom-3 right-3 flex h-6 w-6 items-center justify-center rounded-full border border-pink-200 text-primary transition-all duration-300 group-hover:border-primary group-hover:bg-primary group-hover:text-white"
                aria-hidden="true"
              >
                <ArrowUpRight size={14} />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
