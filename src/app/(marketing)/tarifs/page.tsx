import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Heart,
  MessageCircle,
  Sparkles,
  Users,
  BarChart3,
  ShieldCheck,
  Gift,
  Clock3,
  BriefcaseBusiness,
  Scissors,
  UserRound,
  Package,
  Wallet,
  CreditCard,
  Receipt,
  ListChecks,
  RefreshCcw,
  Megaphone,
  Star,
  Bot,
  Headphones,
  RotateCcw,
} from "lucide-react";
import { TarifsFaq } from "@/components/www/TarifsFaq";
import { SITE } from "@/lib/site";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Tarifs — 399 DH/mois",
  description:
    "Une seule formule à 399 DH/mois. Toutes les fonctionnalités essentielles pour gérer votre institut. Essai 14 jours sans carte bancaire.",
};

const WA_HREF = `https://wa.me/${SITE.phone.replace(/\D/g, "")}`;

const FEATURES = [
  { label: "Agenda & rendez-vous illimités", icon: CalendarDays },
  { label: "Planning de l'équipe", icon: BriefcaseBusiness },
  { label: "Gestion complète des clientes", icon: Users },
  { label: "Services & prestations", icon: Scissors },
  { label: "Gestion des employées", icon: UserRound },
  { label: "Produits, stock, fournisseurs & achats", icon: Package },
  { label: "Caisse & POS", icon: Wallet },
  { label: "Paiements, dépenses & commissions", icon: CreditCard },
  { label: "Factures", icon: Receipt },
  { label: "Liste d'attente", icon: ListChecks },
  { label: "Réactivation des clientes", icon: RefreshCcw },
  { label: "Fidélité, promotions & cartes cadeaux", icon: Gift },
  { label: "Marketing & campagnes", icon: Megaphone },
  { label: "Avis clientes", icon: Star },
  { label: "Analytics & rapports", icon: BarChart3 },
  { label: "Assistant IA", icon: Bot },
  { label: "WhatsApp V1 — envoi manuel", icon: MessageCircle },
  { label: "Support inclus", icon: Headphones },
  { label: "Mises à jour incluses", icon: RotateCcw },
] as const;

const FAQS = [
  {
    question: "Pourquoi un seul tarif ?",
    answer:
      "Nous avons choisi une formule simple et transparente. Toutes les fonctionnalités principales de Rappel Beauty sont incluses dans le même abonnement, sans devoir choisir entre plusieurs niveaux d'offre.",
  },
  {
    question: "L'essai gratuit est-il vraiment sans engagement ?",
    answer:
      "Oui. Vous pouvez tester Rappel Beauty gratuitement pendant 14 jours. Aucune carte bancaire n'est nécessaire pour commencer l'essai.",
  },
  {
    question: "Que se passe-t-il après les 14 jours ?",
    answer:
      "À la fin de l'essai, vous pouvez souscrire à l'abonnement de 399 DH/mois pour continuer à utiliser votre espace.",
  },
  {
    question: "Puis-je arrêter mon abonnement facilement ?",
    answer:
      "Oui. L'abonnement est sans engagement et peut être arrêté selon les conditions prévues dans votre espace.",
  },
  {
    question: "WhatsApp est-il automatique ?",
    answer:
      "Non. Dans la version actuelle, WhatsApp fonctionne en mode manuel assisté : Rappel Beauty prépare le message et vous ouvrez WhatsApp pour effectuer vous-même l'envoi.",
  },
] as const;

const TRUST = [
  {
    icon: ShieldCheck,
    title: "Sécurisé",
    text: "Vos données sont protégées.",
  },
  {
    icon: CalendarDays,
    title: "Agenda fiable",
    text: "Gestion des rendez-vous et disponibilités.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp V1",
    text: "Messages préparés, envoi manuel.",
  },
  {
    icon: BarChart3,
    title: "Pilotage",
    text: "Suivez votre activité simplement.",
  },
] as const;

export default function TarifsPage() {
  return (
    <div className="bg-[#FFF9FC] text-ink">
      {/* Hero */}
      <section className="relative overflow-x-clip px-5 pb-20 pt-12 sm:px-8 lg:px-12 lg:pb-28 lg:pt-20">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-1/2 top-[-220px] h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-[#FCE8F0] blur-3xl" />
          <div className="absolute left-[-200px] top-[350px] h-[300px] w-[300px] rounded-full bg-[#FFF0E8] blur-3xl" />
          <div className="absolute right-[-200px] top-[300px] h-[300px] w-[300px] rounded-full bg-[#F8EAF7] blur-3xl" />
        </div>

        <div className="mx-auto max-w-6xl">
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#F2CBDC] bg-white/80 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-[#C21852] shadow-sm">
              <Sparkles size={13} aria-hidden />
              Tarif simple &amp; transparent
            </div>
          </div>

          <div className="mx-auto mt-7 max-w-3xl text-center">
            <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Tout votre institut
              <br />
              pour <span className="text-primary">399 DH/mois</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-ink/55 sm:text-lg">
              Une seule formule. Toutes les fonctionnalités essentielles pour gérer, organiser et
              développer votre institut de beauté.
            </p>
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            {["Sans engagement", "Configuration incluse", "Support inclus", "Essai 14 jours gratuit"].map(
              (item) => (
                <div key={item} className="flex items-center gap-2 text-xs font-medium text-ink/60">
                  <Check size={15} strokeWidth={3} className="text-emerald-600" aria-hidden />
                  {item}
                </div>
              ),
            )}
          </div>

          {/* Price card + cartes flottantes + flèches */}
          <div className="relative mx-auto mt-12 max-w-[460px] overflow-visible lg:max-w-6xl lg:px-4">
            {/* Haut gauche */}
            <div className="pointer-events-none absolute left-0 top-10 z-20 hidden w-[210px] -rotate-3 rounded-2xl border border-[#F2DDE6] bg-white px-4 py-3.5 shadow-md lg:block">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary-light p-2 text-primary">
                  <Clock3 size={18} aria-hidden />
                </div>
                <p className="text-xs font-semibold leading-snug text-ink">
                  Gagnez du temps
                  <br />
                  <span className="font-medium text-ink/45">au quotidien</span>
                </p>
              </div>
            </div>

            {/* Bas gauche */}
            <div className="pointer-events-none absolute bottom-28 left-0 z-20 hidden w-[210px] rotate-2 rounded-2xl border border-[#F2DDE6] bg-white px-4 py-3.5 shadow-md lg:block">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary-light p-2 text-primary">
                  <Users size={18} aria-hidden />
                </div>
                <p className="text-xs font-semibold leading-snug text-ink">
                  Fidélisez vos
                  <br />
                  <span className="font-medium text-ink/45">clientes</span>
                </p>
              </div>
            </div>

            {/* Haut droite */}
            <div className="pointer-events-none absolute right-0 top-24 z-20 hidden w-[230px] rotate-3 rounded-2xl border border-[#F2DDE6] bg-white px-4 py-3.5 shadow-md lg:block">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary-light p-2 text-primary">
                  <BarChart3 size={18} aria-hidden />
                </div>
                <p className="text-xs font-semibold leading-snug text-ink">
                  Développez votre
                  <br />
                  <span className="font-medium text-ink/45">chiffre d&apos;affaires</span>
                </p>
              </div>
            </div>

            {/* Bas droite */}
            <div className="pointer-events-none absolute bottom-20 right-0 z-20 hidden w-[230px] -rotate-2 rounded-2xl border border-[#F2DDE6] bg-white px-4 py-3.5 shadow-md lg:block">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary-light p-2 text-primary">
                  <Heart size={18} aria-hidden />
                </div>
                <p className="text-xs font-semibold leading-snug text-ink">
                  Offrez une expérience
                  <br />
                  <span className="font-medium text-ink/45">haut de gamme</span>
                </p>
              </div>
            </div>

            {/* Flèches décoratives — z-30 au-dessus des cartes */}
            {/* Flèche haut gauche → carte */}
            <svg
              className="pointer-events-none absolute left-[18%] top-[38px] z-30 hidden h-[90px] w-[190px] overflow-visible lg:block"
              viewBox="0 0 190 90"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M10 18 C55 18, 75 25, 120 48"
                stroke="#E31C5F"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M108 38 L122 49 L105 53"
                stroke="#E31C5F"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            {/* Flèche haut droite → carte */}
            <svg
              className="pointer-events-none absolute right-[18%] top-[72px] z-30 hidden h-[90px] w-[190px] overflow-visible lg:block"
              viewBox="0 0 190 90"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M180 18 C135 18, 115 28, 70 52"
                stroke="#E31C5F"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M82 42 L68 53 L85 57"
                stroke="#E31C5F"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            {/* Flèche bas gauche → carte */}
            <svg
              className="pointer-events-none absolute bottom-[115px] left-[19%] z-30 hidden h-[100px] w-[190px] overflow-visible lg:block"
              viewBox="0 0 190 100"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M10 78 C55 78, 80 68, 125 38"
                stroke="#E31C5F"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M112 32 L128 37 L117 50"
                stroke="#E31C5F"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            {/* Flèche bas droite → carte */}
            <svg
              className="pointer-events-none absolute bottom-[95px] right-[19%] z-30 hidden h-[100px] w-[190px] overflow-visible lg:block"
              viewBox="0 0 190 100"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M180 78 C135 78, 110 68, 65 38"
                stroke="#E31C5F"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M78 32 L62 38 L73 50"
                stroke="#E31C5F"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            <div className="relative z-10 mx-auto max-w-[460px] overflow-hidden rounded-[26px] border border-[#F0C7D8] bg-white p-6 shadow-[0_25px_80px_rgba(190,30,90,0.12)] sm:max-w-[640px] sm:p-8">
              <div className="absolute left-0 right-0 top-0 h-1.5 bg-primary" />

              <div className="flex justify-center">
                <span className="rounded-full bg-primary px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-sm">
                  Formule unique
                </span>
              </div>

              <div className="mt-5 text-center">
                <h2 className="font-display text-2xl font-bold">{SITE.name}</h2>
                <p className="mt-2 text-sm text-ink/45">
                  La solution complète pour votre institut
                </p>

                <div className="mt-5 flex items-end justify-center gap-2">
                  <span className="text-5xl font-extrabold tracking-tight text-primary">399</span>
                  <div className="pb-2 text-left">
                    <div className="text-sm font-bold text-primary">DH</div>
                    <div className="text-xs text-ink/45">/ mois</div>
                  </div>
                </div>

                <p className="mt-1 text-xs text-ink/45">
                  Sans engagement · Résiliable à tout moment
                </p>
              </div>

              <Link
                href="/essai/"
                className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-white shadow-[0_10px_25px_rgba(227,28,95,0.22)] transition hover:-translate-y-0.5 hover:bg-primary-dark"
              >
                Commencer l&apos;essai gratuit
                <ArrowRight size={17} aria-hidden />
              </Link>

              <div className="mt-7 grid gap-1.5 sm:grid-cols-2">
                {FEATURES.map(({ label, icon: Icon }) => (
                  <div
                    key={label}
                    className="group flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-[#FFF5F8]"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FFF0F5] text-primary transition group-hover:bg-primary group-hover:text-white">
                      <Icon size={15} strokeWidth={2} aria-hidden />
                    </div>
                    <span className="text-sm font-medium text-ink/65">{label}</span>
                    <Check
                      size={14}
                      strokeWidth={2.5}
                      className="ml-auto shrink-0 text-emerald-500"
                      aria-hidden
                    />
                  </div>
                ))}
              </div>

              <div className="mt-7 flex items-center gap-3 rounded-xl bg-[#FFF0F5] p-4">
                <div className="rounded-xl bg-white p-2 text-primary shadow-sm">
                  <Gift size={19} aria-hidden />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#C21852]">14 jours gratuits</p>
                  <p className="mt-0.5 text-xs text-ink/45">Aucune carte bancaire requise</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="border-y border-line bg-white px-5 py-14 sm:px-8">
        <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-3">
          <div className="rounded-2xl bg-[#FFF9FC] p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light text-primary">
              <Clock3 size={22} aria-hidden />
            </div>
            <h3 className="mt-4 font-display text-xl font-bold">Gagnez du temps</h3>
            <p className="mt-2 text-sm leading-6 text-ink/50">
              Centralisez vos rendez-vous, clientes, équipe et opérations dans un seul espace.
            </p>
          </div>

          <div className="rounded-2xl bg-[#FFF9FC] p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light text-primary">
              <Users size={22} aria-hidden />
            </div>
            <h3 className="mt-4 font-display text-xl font-bold">Fidélisez vos clientes</h3>
            <p className="mt-2 text-sm leading-6 text-ink/50">
              Suivez leur historique, leur fidélité et vos actions de réactivation.
            </p>
          </div>

          <div className="rounded-2xl bg-[#FFF9FC] p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light text-primary">
              <Heart size={22} aria-hidden />
            </div>
            <h3 className="mt-4 font-display text-xl font-bold">Développez votre institut</h3>
            <p className="mt-2 text-sm leading-6 text-ink/50">
              Promotions, marketing, fidélité, avis et analytics pour piloter votre activité.
            </p>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
              Une solution pensée pour vous
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
              Simple à utiliser,
              <br />
              sérieuse pour votre activité
            </h2>
            <p className="mt-4 text-sm leading-6 text-ink/50">
              Rappel Beauty combine simplicité d&apos;utilisation, sécurité et outils de gestion
              adaptés aux instituts.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-2xl border border-[#EEDFE7] bg-white p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light text-primary">
                    <Icon size={19} aria-hidden />
                  </div>
                  <h3 className="mt-4 text-sm font-bold">{item.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-ink/45">{item.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[#FFF4F8] px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
              Des questions ?
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold">Foire aux questions</h2>
            <p className="mt-3 text-sm text-ink/50">
              Tout ce que vous devez savoir avant de commencer.
            </p>
          </div>

          <div className="mt-9">
            <TarifsFaq items={FAQS} />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-[28px] bg-[#24121D] px-6 py-14 text-center shadow-[0_25px_80px_rgba(36,18,29,0.18)] sm:px-10">
          <div className="mx-auto max-w-2xl">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold">
              Votre institut mérite le meilleur
            </span>

            <h2 className="mt-4 font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
              Testez Rappel Beauty
              <br />
              gratuitement pendant 14 jours
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-[#D5C7CE]">
              Découvrez une gestion plus simple de votre institut, sans engagement et sans carte
              bancaire.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/essai/"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-white transition hover:bg-primary-dark"
              >
                Commencer gratuitement
                <ArrowRight size={17} aria-hidden />
              </Link>

              <a
                href={WA_HREF}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/10"
              >
                <MessageCircle size={17} aria-hidden />
                Nous contacter
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
