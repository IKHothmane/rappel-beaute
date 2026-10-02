import Link from "next/link";
import type { Metadata } from "next";
import { HomeHero } from "@/components/www/HomeHero";
import { MobileAutoCarousel } from "@/components/www/MobileAutoCarousel";
import { Reveal, RevealItem, RevealStagger } from "@/components/www/Reveal";
import { PUBLIC_OFFER, SITE } from "@/lib/site";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Logiciel de gestion pour institut de beauté au Maroc",
  description:
    "Rappel Beauty est le logiciel de gestion pour les instituts de beauté au Maroc : rendez-vous, clientes, équipe, stock, caisse, ventes et réservation en ligne. Essai gratuit 7 jours.",
  alternates: { canonical: "/" },
};

const IMG_NAIL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuD0fvsDZQJS45sn9q57hA70EzY7OTfqUwQK_SXkzaaGePQ1dolTSzXOzbhXFC1s0KLBoecVlYqHWKxB_dra0hRbprTMVZahTn-RKhrjB5XBD4F_4mwmGg_CD1hBhiEmSuC-UO52SQaMH7LGuoxEvKkR5WoPy_VM6ICX4kuz8Mpdmsieg2gzGYxuscwYM5FWPQIz4lckMtHKXZqFndlcUFkF3Fb5qlUG8gQLhZRjPwgEe3ehZfGqq648Dg";

const IMG_CREAM =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDcr3LZiHds53F9XMiXpa6ZKppvM6zsqgOQYgop1ObTceSpw6a6CUgrkaC6t2uLUoZzjaB29fxHNImvX7auo_CqPVJH307keRZn_P2tQLTvUjqVr37aGP03L1h-IyElFo_cD56FP3Lfg_WpLR3V-1rNikHfF60NoLFUZin-ylI_1CcFrX-RF1rEjt3SI4kaihrHGRA0JKd8BcvJPgFeF9hbETG6FtN34mf-t4rh1fm-9GV2aLmI68L5Cw";

const IMG_SERUM =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBDLiMyu3xOkmnr-lZxYA0O_oPqkqIUu1q726zQ6orRGGV8GGi0qcXaCHTu1aYmrsvgC-fAxrwSWHg0ak-TU5-Qn_7RHODDRRLC493c9OdMcPpwIDE-y7WS-6wAHaiKXPvm22Njcwj6t4M5SlCe_po_O1i57iraQ9YREX-H7GqwyMEZRAltYN6koDlbVmr0uxF5aM2zxlpn1S5FLd4Q8r0uHTVk7U4Jk6lnY96zhUMERAen4lh7qCzUMw";

const IMG_TEAM =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBMz86RbBst2uEKW0W6aJCA_J2kvT2tULe700qf0jqyT28soEeagVbEjtrA1w9rWDFCZBkBIc5VV5yHpZvLcIlikKPb5BW58fLp-Q0KwvF6ZMXJvd7kHEIHusLemKkjgT1Nn4czy-KMk7vyjeZ3hTeZcq-1Ubqun9W0JQwmFgWLnmuOaKz4lQEEngJAoyN8g-PNv4T5vvbt1FVXSBFGXDJkLKMKn7W056yAclfaa6q-uWzEyS1pihUsuA";

const CAPABILITIES = [
  { title: "Agenda & rendez-vous", text: "Planning, disponibilités et rendez-vous de l'équipe." },
  { title: "Clientes & équipe", text: "Fiches clientes, historique et organisation des employées." },
  { title: "Services & ressources", text: "Prestations, cabines et déroulement au salon." },
  { title: "Produits & stock", text: "Produits, fournisseurs, achats et niveaux de stock." },
  { title: "Caisse & finances", text: "Encaissements, paiements, dépenses et factures." },
  { title: "Réservation & fidélisation", text: "Page publique, prise de rendez-vous, fidélité et avis." },
];

const BOOKING = [
  "Page publique",
  "Services et tarifs",
  "Disponibilités",
  "Prise de rendez-vous",
  "Vitrine produits",
  "Retrait à l'institut",
];

const FAQ = [
  {
    q: "Qu'est-ce que Rappel Beauty ?",
    a: "Rappel Beauty est un logiciel SaaS marocain de gestion pour les instituts de beauté. L'institut s'abonne, gère son activité, et peut publier sa page pour que ses clientes prennent rendez-vous.",
  },
  {
    q: "Combien coûte Rappel Beauty ?",
    a: "Une seule formule : 599 DH par mois, ou 5 999 DH par an. Sans engagement. Essai de 7 jours, sans carte bancaire.",
  },
  {
    q: "Les clientes paient-elles Rappel Beauty ?",
    a: "Non. Les clientes paient directement à l'institut. Le retrait des produits se fait aussi à l'institut.",
  },
  {
    q: "Que comprend la formule ?",
    a: "Agenda, clientes, équipe, stock, caisse, facturation, fidélité, marketing, réservation en ligne, vitrine produits et assistant IA.",
  },
  {
    q: "Quel est le prix de Rappel Beauty ?",
    a: "Rappel Beauty propose une formule à 599 DH par mois ou 5 999 DH par an, sans engagement. L'essai gratuit dure 7 jours et ne nécessite pas de carte bancaire.",
  },
  {
    q: "À quels instituts Rappel Beauty s'adresse-t-il ?",
    a: "Rappel Beauty est conçu pour les instituts de beauté au Maroc.",
  },
  {
    q: "Que peut-on gérer avec Rappel Beauty ?",
    a: "Rendez-vous, clientes, équipe, services, cabines, produits, stock, caisse, paiements, factures, commissions, fidélité, marketing et réservation en ligne.",
  },
];

export default function HomePage() {
  return (
    <>
      <link
        rel="preload"
        as="image"
        href="/brand/hero-mobile.avif"
        type="image/avif"
        media="(max-width: 767px)"
        fetchPriority="high"
      />
      <link
        rel="preload"
        as="image"
        href="/brand/hero.avif"
        type="image/avif"
        media="(min-width: 768px)"
        fetchPriority="high"
      />
      <HomeHero />

      <section className="border-b border-line bg-white py-10 sm:py-14">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary sm:text-[11px]">
            Une formule simple pour votre institut
          </p>
          <p className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            {PUBLIC_OFFER.price} DH / mois
          </p>
          <p className="mt-1 text-sm font-semibold text-ink/70">
            ou {PUBLIC_OFFER.yearlyPrice.toLocaleString("fr-FR")} DH / an
          </p>
          <p className="mt-3 text-xs text-ink/55 sm:text-sm">
            Sans engagement · 7 jours gratuits · Sans carte bancaire
          </p>
          <Link
            href="/tarifs/"
            className="mt-5 inline-flex items-center justify-center rounded-full border border-line bg-paper px-6 py-2.5 text-sm font-semibold text-ink transition hover:border-primary/40"
          >
            Voir les tarifs
          </Link>
        </div>
      </section>

      {/* Découvrir les professionnels */}
      <section className="overflow-hidden bg-paper py-14 sm:py-24" id="explore">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mb-6 flex flex-col justify-center px-1 sm:mb-8 sm:px-2 lg:hidden">
            <span className="mb-4 h-0.5 w-10 origin-left animate-rise bg-primary sm:mb-6 sm:w-12" />
            <h2 className="mb-4 text-2xl font-normal tracking-tight text-ink sm:mb-6 sm:text-4xl">
              Une plateforme complète pour gérer votre institut
            </h2>
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-base font-bold text-ink sm:text-lg">La gestion quotidienne, au même endroit</h3>
              <p className="text-xs leading-relaxed text-ink/55 sm:text-sm">
                Gérez vos rendez-vous, clientes, équipe, services, stock et caisse depuis un seul
                outil. La réservation en ligne permet ensuite à vos clientes de prendre rendez-vous
                directement auprès de votre institut.
              </p>
              <div className="pt-1 sm:pt-2">
                <Link
                  href="/solutions/institut-beaute/"
                  className="group inline-flex items-center text-xs font-semibold text-primary hover:text-primary-dark hover:underline hover:underline-offset-4 sm:text-sm"
                >
                  Voir plus
                  <svg
                    className="ml-1 h-4 w-4 transform transition-transform group-hover:translate-x-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path
                      d="M9 5l7 7-7 7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                </Link>
              </div>
            </div>
          </Reveal>

          {/* Mobile : carrousel auto */}
          <MobileAutoCarousel hideFrom="lg:hidden" durationSec={18} trackClassName="gap-3 pe-3">
            <div className="w-[70vw] max-w-[240px]">
              <div className="aspect-[3/4] overflow-hidden rounded-2xl border border-line bg-primary-light shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="Illustration de produits de beauté pour institut"
                  className="h-full w-full object-cover"
                  src={IMG_NAIL}
                />
              </div>
            </div>
            <div className="w-[70vw] max-w-[240px]">
              <div className="aspect-[4/5] overflow-hidden rounded-2xl border border-line bg-primary-light shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="Produits cosmétiques utilisés dans un institut de beauté"
                  className="h-full w-full object-cover"
                  src={IMG_CREAM}
                />
              </div>
            </div>
            <div className="w-[70vw] max-w-[240px]">
              <div className="aspect-[2/3] overflow-hidden rounded-2xl border border-line bg-primary-light shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="Produits et soins de beauté"
                  className="h-full w-full object-cover"
                  src={IMG_SERUM}
                />
              </div>
            </div>
          </MobileAutoCarousel>

          {/* Desktop : grille d’origine */}
          <div className="hidden items-center gap-8 lg:grid lg:grid-cols-12">
            <Reveal className="lg:col-span-3" delay={0.05} x={-16}>
              <div className="aspect-[3/4] overflow-hidden rounded-2xl border border-line bg-primary-light shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="Illustration de produits de beauté pour institut"
                  className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                  src={IMG_NAIL}
                />
              </div>
            </Reveal>

            <Reveal className="lg:col-span-3" delay={0.15}>
              <div className="aspect-[4/5] overflow-hidden rounded-2xl border border-line bg-primary-light shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="Produits cosmétiques utilisés dans un institut de beauté"
                  className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                  src={IMG_CREAM}
                />
              </div>
            </Reveal>

            <Reveal className="flex flex-col justify-center px-2 lg:col-span-4 lg:px-6" delay={0.1}>
              <span className="mb-6 h-0.5 w-12 bg-primary" />
              <h2 className="mb-6 text-4xl font-normal tracking-tight text-ink">
                Une plateforme complète pour gérer votre institut
              </h2>
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-ink">La gestion quotidienne, au même endroit</h3>
                <p className="text-sm leading-relaxed text-ink/55">
                  Gérez vos rendez-vous, clientes, équipe, services, stock et caisse depuis un seul
                  outil. La réservation en ligne permet ensuite à vos clientes de prendre rendez-vous
                  directement auprès de votre institut.
                </p>
                <div className="pt-2">
                  <Link
                    href="/solutions/institut-beaute/"
                    className="group inline-flex items-center text-sm font-semibold text-primary hover:text-primary-dark hover:underline hover:underline-offset-4"
                  >
                    Voir plus
                    <svg
                      className="ml-1 h-4 w-4 transform transition-transform group-hover:translate-x-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <path
                        d="M9 5l7 7-7 7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      />
                    </svg>
                  </Link>
                </div>
              </div>
            </Reveal>

            <Reveal className="lg:col-span-2" delay={0.2} x={16}>
              <div className="aspect-[2/3] overflow-hidden rounded-2xl border border-line bg-primary-light shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="Produits et soins de beauté"
                  className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                  src={IMG_SERUM}
                />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="bg-paper py-14 sm:py-24" id="pro">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mb-8 text-left sm:mb-14">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-primary sm:mb-2 sm:text-[11px] sm:tracking-[0.2em]">
              Le logiciel
            </p>
            <h2 className="text-xl font-normal tracking-tight text-ink sm:text-4xl lg:text-5xl">
              Une plateforme pensée pour les instituts de beauté marocains
            </h2>
          </Reveal>

          <MobileAutoCarousel hideFrom="md:hidden" durationSec={22} trackClassName="gap-3 pe-3">
            {CAPABILITIES.map((item) => (
              <Link
                key={`m-${item.title}`}
                href="/fonctionnalites/"
                className="block w-[78vw] max-w-[300px] rounded-2xl border border-line bg-paper p-5 shadow-sm transition-colors hover:bg-primary-light/40 sm:p-7"
              >
                <div className="mb-1.5 text-xl font-semibold tracking-tight text-primary sm:mb-2 sm:text-2xl">
                  {item.title}
                </div>
                <p className="text-xs font-normal leading-relaxed text-ink/55 sm:text-sm">{item.text}</p>
              </Link>
            ))}
          </MobileAutoCarousel>

          <RevealStagger className="hidden overflow-hidden rounded-2xl border border-line bg-paper shadow-sm md:grid md:grid-cols-3" stagger={0.06}>
            {CAPABILITIES.map((item, i) => (
              <RevealItem key={item.title} className="h-full">
                <Link
                  href="/fonctionnalites/"
                  className={`flex h-full flex-col border-line p-8 transition-colors hover:bg-primary-light/40 sm:p-10 ${
                    i < 3 ? "border-b" : ""
                  } ${i % 3 !== 2 ? "md:border-r" : ""}`}
                >
                  <div className="mb-2 text-2xl font-semibold tracking-tight text-primary">
                    {item.title}
                  </div>
                  <p className="text-sm font-normal leading-relaxed text-ink/55">{item.text}</p>
                </Link>
              </RevealItem>
            ))}
          </RevealStagger>
          <p className="mx-auto mt-8 max-w-3xl text-center text-sm leading-relaxed text-ink/60">
            Et bien plus : facturation, commissions, campagnes, cartes cadeaux, liste d&apos;attente,
            réactivation, avis, analytics et assistant IA.
          </p>
          <p className="mt-4 text-center">
            <Link href="/fonctionnalites/" className="text-sm font-semibold text-primary hover:text-primary-dark">
              Voir toutes les fonctionnalités
            </Link>
          </p>
        </div>
      </section>

      {/* Équipe */}
      <section className="border-y border-line bg-primary-light/30 py-12 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-8 sm:gap-12 lg:grid-cols-12">
            <Reveal className="lg:col-span-6" x={-20}>
              <div className="overflow-hidden rounded-2xl border border-line shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={`Équipe ${SITE.name}`}
                  className="h-56 w-full object-cover transition-transform duration-700 hover:scale-[1.03] sm:h-96"
                  src={IMG_TEAM}
                />
              </div>
            </Reveal>
            <Reveal className="space-y-4 sm:space-y-6 lg:col-span-6" delay={0.12} x={20}>
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary sm:text-[11px] sm:tracking-[0.2em]">
                Essai 7 jours
              </span>
              <h2 className="text-xl font-normal leading-snug tracking-tight text-ink sm:text-4xl">
                Essayez Rappel Beauty pendant 7 jours
              </h2>
              <p className="text-xs leading-relaxed text-ink/55 sm:text-sm">
                Une seule formule pour gérer l&apos;institut, puis publier sa page si vous le souhaitez.
              </p>
              <div className="pt-1 sm:pt-2">
                <Link
                  href="/essai/"
                  className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:scale-[1.03] hover:bg-primary-dark sm:px-7 sm:py-3 sm:text-sm"
                >
                  Essayer gratuitement 7 jours
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="bg-paper py-14 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mb-8 sm:mb-12">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-primary sm:mb-2 sm:text-[11px] sm:tracking-[0.2em]">
              Réservation
            </p>
            <h2 className="text-xl font-normal tracking-tight text-ink sm:text-4xl">
              Votre institut devient réservable en ligne
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink/60">
              Donnez à votre institut une page publique pour présenter vos services, afficher vos
              disponibilités et permettre aux clientes de prendre rendez-vous.
            </p>
          </Reveal>

          <RevealStagger className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" stagger={0.05}>
            {BOOKING.map((item) => (
              <RevealItem key={item}>
                <p className="rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink">{item}</p>
              </RevealItem>
            ))}
          </RevealStagger>
          <p className="mt-6 text-sm font-semibold text-ink">
            Les clientes paient directement à l&apos;institut.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-line bg-primary-light/20 py-14 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mb-8 text-center sm:mb-12">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-primary sm:mb-2 sm:text-[11px] sm:tracking-[0.2em]">
              FAQ
            </p>
            <h2 className="font-display text-2xl font-light text-ink sm:text-3xl">
              Les questions fréquentes
            </h2>
          </Reveal>

          <RevealStagger className="space-y-3 sm:space-y-4" stagger={0.05}>
            {FAQ.map((item) => (
              <RevealItem key={item.q}>
                <details className="group cursor-pointer rounded-xl border border-line bg-paper p-4 transition-all hover:border-primary/40 hover:shadow-sm sm:p-5">
                  <summary className="flex items-center justify-between text-xs font-medium text-ink transition-colors group-hover:text-primary sm:text-base">
                    <span>{item.q}</span>
                    <span className="ml-3 transform text-primary transition-transform group-open:rotate-180 sm:ml-4">
                      <svg
                        className="h-4 w-4 sm:h-5 sm:w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden
                      >
                        <path
                          d="M19 9l-7 7-7-7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.8"
                        />
                      </svg>
                    </span>
                  </summary>
                  <p className="mt-3 text-[11px] leading-relaxed text-ink/55 sm:mt-4 sm:text-sm">{item.a}</p>
                </details>
              </RevealItem>
            ))}
          </RevealStagger>

          <Reveal className="mt-6 text-center text-xs text-ink/55 sm:mt-8 sm:text-sm" delay={0.1}>
            Plus de réponses sur notre{" "}
            <Link href="/faq/" className="font-semibold text-primary hover:text-primary-dark">
              page FAQ
            </Link>
            .
          </Reveal>
        </div>
      </section>

      <section className="bg-institut py-14 text-center text-white sm:py-20">
        <div className="mx-auto max-w-2xl px-4">
          <h2 className="font-display text-2xl font-light sm:text-4xl">
            Essayez Rappel Beauty pendant 7 jours
          </h2>
          <p className="mt-4 text-sm text-white/75 sm:text-base">
            Sans engagement et sans carte bancaire.
          </p>
          <Link
            href="/essai/"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark"
          >
            Essayer gratuitement 7 jours
          </Link>
        </div>
      </section>
    </>
  );
}
