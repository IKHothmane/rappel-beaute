import Link from "next/link";
import type { Metadata } from "next";
import { HomeHero } from "@/components/www/HomeHero";
import { MobileAutoCarousel } from "@/components/www/MobileAutoCarousel";
import { Reveal, RevealItem, RevealStagger } from "@/components/www/Reveal";
import { SITE } from "@/lib/site";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Réservez vos soins beauté et bien-être au Maroc",
  description:
    "Rappel Beauté — trouvez un salon, un institut ou un spa au Maroc et réservez en ligne 24h/24. Simple, immédiat, sans téléphoner.",
};

const HERO_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBsdpWrCeBcRo25PASMsrTR3U_6jkBWJJ8AlyWLA38hG4WfRJp1NbpY5jUf1HlRP_S3NXiDxrED3VpT5FTGQXtr_WSWN_f5YJObwoWuvc0eMbHvz2T4Gze8k4u72MUygiO4aOlRcntO9A_4eKdM7J7dhAqgnLiCBvWym3ADxI2YqNG02sh4zTVRUy-fmA0GQ11sPpXX6fs0bTlDKHY16WFA3LPHlWpVF-95enj4Wd2G74l8-U-4HYxc5w";

const IMG_NAIL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuD0fvsDZQJS45sn9q57hA70EzY7OTfqUwQK_SXkzaaGePQ1dolTSzXOzbhXFC1s0KLBoecVlYqHWKxB_dra0hRbprTMVZahTn-RKhrjB5XBD4F_4mwmGg_CD1hBhiEmSuC-UO52SQaMH7LGuoxEvKkR5WoPy_VM6ICX4kuz8Mpdmsieg2gzGYxuscwYM5FWPQIz4lckMtHKXZqFndlcUFkF3Fb5qlUG8gQLhZRjPwgEe3ehZfGqq648Dg";

const IMG_CREAM =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDcr3LZiHds53F9XMiXpa6ZKppvM6zsqgOQYgop1ObTceSpw6a6CUgrkaC6t2uLUoZzjaB29fxHNImvX7auo_CqPVJH307keRZn_P2tQLTvUjqVr37aGP03L1h-IyElFo_cD56FP3Lfg_WpLR3V-1rNikHfF60NoLFUZin-ylI_1CcFrX-RF1rEjt3SI4kaihrHGRA0JKd8BcvJPgFeF9hbETG6FtN34mf-t4rh1fm-9GV2aLmI68L5Cw";

const IMG_SERUM =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBDLiMyu3xOkmnr-lZxYA0O_oPqkqIUu1q726zQ6orRGGV8GGi0qcXaCHTu1aYmrsvgC-fAxrwSWHg0ak-TU5-Qn_7RHODDRRLC493c9OdMcPpwIDE-y7WS-6wAHaiKXPvm22Njcwj6t4M5SlCe_po_O1i57iraQ9YREX-H7GqwyMEZRAltYN6koDlbVmr0uxF5aM2zxlpn1S5FLd4Q8r0uHTVk7U4Jk6lnY96zhUMERAen4lh7qCzUMw";

const IMG_TEAM =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBMz86RbBst2uEKW0W6aJCA_J2kvT2tULe700qf0jqyT28soEeagVbEjtrA1w9rWDFCZBkBIc5VV5yHpZvLcIlikKPb5BW58fLp-Q0KwvF6ZMXJvd7kHEIHusLemKkjgT1Nn4czy-KMk7vyjeZ3hTeZcq-1Ubqun9W0JQwmFgWLnmuOaKz4lQEEngJAoyN8g-PNv4T5vvbt1FVXSBFGXDJkLKMKn7W056yAclfaa6q-uWzEyS1pihUsuA";

const STATS = [
  {
    value: "+ 50%",
    text: "de fréquence sur les rendez-vous pris en ligne par vos clients réguliers.",
  },
  {
    value: "4x",
    text: "moins d'oublis et de no-shows grâce aux rappels instantanés SMS & WhatsApp.",
  },
  {
    value: "50%",
    text: "des rdv en ligne réservés en dehors de vos heures d'ouverture de boutique.",
  },
  {
    value: "+60 000",
    text: "Salons, spas & instituts partenaires équipés de notre logiciel de caisse et agenda.",
  },
  {
    value: "6 RDV",
    text: "Pris toutes les secondes sur notre écosystème mobile et web.",
  },
  {
    value: "> 5 milliards MAD",
    text: "De volume d'affaires de rendez-vous générés pour nos partenaires.",
    gold: true,
  },
];

const DIRECTORY = [
  {
    title: "Coiffeur",
    subtitle: "Salons populaires au Maroc",
    links: [
      "Casablanca Anfa",
      "Rabat Hay Riad",
      "Marrakech Hivernage",
      "Tanger Centre",
      "Fès Ville Nouvelle",
      "Agadir Baie",
      "Mohammedia",
    ],
  },
  {
    title: "Barbier",
    subtitle: "Barbershops tendance",
    links: [
      "Casablanca Gauthier",
      "Rabat Agdal",
      "Marrakech Guéliz",
      "Tanger Malabata",
      "Kénitra",
      "Meknès",
      "El Jadida",
    ],
  },
  {
    title: "Manucure & Ongles",
    subtitle: "Nail bars & prothésie",
    links: [
      "Casablanca Maarif",
      "Rabat Hassan",
      "Marrakech Targa",
      "Tanger Boubana",
      "Fès Atlas",
      "Agadir Sonaba",
      "Bouskoura",
    ],
  },
  {
    title: "Institut de beauté",
    subtitle: "Soins visage & hammams",
    links: [
      "Casablanca Bourgogne",
      "Rabat Souissi",
      "Marrakech Palmeraie",
      "Tanger Marshan",
      "Agadir Founty",
      "Tétouan",
      "Dar Bouazza",
    ],
  },
  {
    title: "Massages & Rituel",
    subtitle: "Hammam & relaxation",
    links: [
      "Casablanca Ain Diab",
      "Rabat Aviation",
      "Marrakech Medina",
      "Tanger Iberia",
      "Essaouira Mogador",
      "Taghazout Bay",
      "Oujda",
    ],
  },
];

const FAQ = [
  {
    q: "Qu'est-ce que Rappel Beauté ?",
    a: "Rappel Beauté est la plateforme marocaine de réservation de prestations beauté et bien-être en ligne. Elle permet aux clients de trouver un salon ou un institut vérifié, de consulter ses tarifs et disponibilités en temps réel, et de réserver gratuitement 24h/24 sans téléphoner.",
  },
  {
    q: "Comment prendre rendez-vous sur la plateforme ?",
    a: "Indiquez la prestation désirée ainsi que votre ville (ex. Casablanca, Rabat, Marrakech). Sélectionnez l'établissement de votre choix, le collaborateur souhaité et le créneau idéal. Votre confirmation et rappel sont reçus instantanément par SMS et WhatsApp.",
  },
  {
    q: "Est-ce que je dois payer en ligne sur Rappel Beauté ?",
    a: "La majorité des établissements encaissent directement sur place (espèces, carte bancaire TPE). Certains salons proposent également le prépaiement ou acompte sécurisé par carte CMI pour bloquer les créneaux VIP.",
  },
  {
    q: "Comment gérer ou reporter mes rendez-vous ?",
    a: "Connectez-vous à votre espace personnel avec votre numéro de téléphone ou cliquez directement sur le lien sécurisé inclus dans votre confirmation SMS pour décaler ou annuler votre séance en un clic, dans le respect du délai d'annulation du salon.",
  },
  {
    q: "Comment faire apparaître mon salon ou mon institut sur Rappel Beauté ?",
    a: "Cliquez simplement sur « Je suis un professionnel ». Un conseiller commercial basé au Maroc prendra contact avec votre salon pour configurer votre planning, votre logiciel de caisse et lancer votre fiche en moins de 48h.",
  },
];

export default function HomePage() {
  return (
    <>
      <HomeHero imageSrc={HERO_IMG} />

      {/* Découvrir les professionnels */}
      <section className="overflow-hidden bg-paper py-14 sm:py-24" id="explore">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mb-6 flex flex-col justify-center px-1 sm:mb-8 sm:px-2 lg:hidden">
            <span className="mb-4 h-0.5 w-10 origin-left animate-rise bg-primary sm:mb-6 sm:w-12" />
            <h2 className="mb-4 text-2xl font-normal tracking-tight text-ink sm:mb-6 sm:text-4xl">
              Découvrez nos <br />
              <span className="font-display italic text-primary">Professionnels</span>
            </h2>
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-base font-bold text-ink sm:text-lg">Institut de beauté</h3>
              <p className="text-xs leading-relaxed text-ink/55 sm:text-sm">
                Vos envies de bien-être ont besoin d&apos;être assouvies rapidement et
                sereinement. Retrouvez les adresses les plus renommées pour vos
                rituels spa, hammams traditionnels marocains et soins
                dermo-esthétiques.
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
                  alt="Texture vernis"
                  className="h-full w-full object-cover"
                  src={IMG_NAIL}
                />
              </div>
            </div>
            <div className="w-[70vw] max-w-[240px]">
              <div className="aspect-[4/5] overflow-hidden rounded-2xl border border-line bg-primary-light shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="Texture cosmétique"
                  className="h-full w-full object-cover"
                  src={IMG_CREAM}
                />
              </div>
            </div>
            <div className="w-[70vw] max-w-[240px]">
              <div className="aspect-[2/3] overflow-hidden rounded-2xl border border-line bg-primary-light shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="Sérum"
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
                  alt="Texture vernis"
                  className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                  src={IMG_NAIL}
                />
              </div>
            </Reveal>

            <Reveal className="lg:col-span-3" delay={0.15}>
              <div className="aspect-[4/5] overflow-hidden rounded-2xl border border-line bg-primary-light shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="Texture cosmétique"
                  className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                  src={IMG_CREAM}
                />
              </div>
            </Reveal>

            <Reveal className="flex flex-col justify-center px-2 lg:col-span-4 lg:px-6" delay={0.1}>
              <span className="mb-6 h-0.5 w-12 bg-primary" />
              <h2 className="mb-6 text-4xl font-normal tracking-tight text-ink">
                Découvrez nos <br />
                <span className="font-display italic text-primary">Professionnels</span>
              </h2>
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-ink">Institut de beauté</h3>
                <p className="text-sm leading-relaxed text-ink/55">
                  Vos envies de bien-être ont besoin d&apos;être assouvies rapidement et
                  sereinement. Retrouvez les adresses les plus renommées pour vos
                  rituels spa, hammams traditionnels marocains et soins
                  dermo-esthétiques.
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
                  alt="Sérum"
                  className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                  src={IMG_SERUM}
                />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Presse */}
      <section className="border-y border-line/10 bg-institut py-10 text-white sm:py-16">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <Reveal>
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold sm:mb-8 sm:text-[11px] sm:tracking-[0.25em]">
              Presse
            </p>
            <h3 className="mb-8 font-display text-xl font-light tracking-wide text-white sm:mb-12 sm:text-2xl">
              Ils parlent de nous
            </h3>
          </Reveal>
          <MobileAutoCarousel
            hideFrom="md:hidden"
            durationSec={14}
            trackClassName="gap-8 pe-8 items-center opacity-80 sm:gap-10 sm:pe-10"
          >
            <span className="font-display text-lg font-semibold tracking-[0.25em] text-white sm:text-2xl sm:tracking-[0.3em]">
              VOGUE
            </span>
            <span className="font-display text-lg font-semibold tracking-[0.2em] text-line sm:text-2xl sm:tracking-[0.25em]">
              GRAZIA
            </span>
            <span className="font-display text-lg font-bold tracking-[0.3em] text-white sm:text-2xl sm:tracking-[0.35em]">
              ELLE
            </span>
            <span className="font-display text-base lowercase italic tracking-wider text-line sm:text-xl sm:tracking-widest">
              marie claire
            </span>
          </MobileAutoCarousel>

          <div className="mx-auto hidden max-w-4xl items-center justify-center gap-12 opacity-80 md:flex">
            <span className="font-display text-3xl font-semibold tracking-[0.3em] text-white">
              VOGUE
            </span>
            <span className="font-display text-3xl font-semibold tracking-[0.25em] text-line">
              GRAZIA
            </span>
            <span className="font-display text-3xl font-bold tracking-[0.35em] text-white">
              ELLE
            </span>
            <span className="font-display text-2xl lowercase italic tracking-widest text-line">
              marie claire
            </span>
          </div>
        </div>
      </section>

      {/* B2B Stats */}
      <section className="bg-paper py-14 sm:py-24" id="pro">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mb-8 text-left sm:mb-14">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-primary sm:mb-2 sm:text-[11px] sm:tracking-[0.2em]">
              Une forte croissance
            </p>
            <h2 className="text-xl font-normal tracking-tight text-ink sm:text-4xl lg:text-5xl">
              Vous êtes un professionnel de la beauté ?
              <br />
              <span className="font-medium text-primary">
                Découvrez la prise de RDV en ligne !
              </span>
            </h2>
          </Reveal>

          {/* Mobile : carrousel auto des cartes */}
          <MobileAutoCarousel hideFrom="md:hidden" durationSec={22} trackClassName="gap-3 pe-3">
            {STATS.map((stat) => (
              <Link
                key={`m-${stat.value}`}
                href="/professionnel/"
                className="group relative block w-[78vw] max-w-[300px] overflow-hidden rounded-2xl border border-line bg-paper p-5 shadow-sm transition-colors hover:bg-primary-light/40 sm:p-7"
              >
                <div
                  className={`mb-1.5 text-2xl font-semibold tracking-tight sm:mb-2 sm:text-3xl ${
                    stat.gold ? "text-gold" : "text-primary"
                  }`}
                >
                  {stat.value}
                </div>
                <p className="text-xs font-normal leading-relaxed text-ink/55 sm:text-sm">{stat.text}</p>
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-primary/90 px-4 text-center text-xs font-semibold text-white opacity-0 transition duration-200 group-hover:opacity-100 sm:text-sm">
                  Je suis un professionnel
                </span>
              </Link>
            ))}
          </MobileAutoCarousel>

          {/* Desktop : grille 3 colonnes */}
          <RevealStagger className="hidden overflow-hidden rounded-2xl border border-line bg-paper shadow-sm md:grid md:grid-cols-3" stagger={0.06}>
            {STATS.map((stat, i) => (
              <RevealItem key={stat.value} className="h-full">
                <Link
                  href="/professionnel/"
                  className={`group relative flex h-full flex-col border-line p-8 transition-colors hover:bg-primary-light/40 sm:p-10 ${
                    i < 3 ? "border-b" : ""
                  } ${i % 3 !== 2 ? "md:border-r" : ""} ${i >= 3 && i < 5 ? "md:border-b-0 border-b md:border-b-0" : ""} ${
                    i === 3 || i === 4 ? "border-b md:border-b-0" : ""
                  }`}
                >
                  <div
                    className={`mb-2 text-3xl font-semibold tracking-tight sm:text-4xl ${
                      stat.gold ? "text-gold" : "text-primary"
                    }`}
                  >
                    {stat.value}
                  </div>
                  <p className="text-sm font-normal leading-relaxed text-ink/55">{stat.text}</p>
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-primary/90 px-4 text-center text-sm font-semibold text-white opacity-0 transition duration-200 group-hover:opacity-100">
                    Je suis un professionnel
                  </span>
                </Link>
              </RevealItem>
            ))}
          </RevealStagger>
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
                Professionnel &amp; talents
              </span>
              <h2 className="text-xl font-normal leading-snug tracking-tight text-ink sm:text-4xl">
                {SITE.name} recrute et déploie ses équipes pour digitaliser le
                secteur de la beauté au Maroc.
              </h2>
              <p className="text-xs leading-relaxed text-ink/55 sm:text-sm">
                Nous accompagnons chaque gérant de salon, barbier indépendant et
                institut haut de gamme avec un service client basé à Casablanca et
                une assistance dédiée 6j/7.
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gold sm:text-xs">
                Direction Générale — Casablanca
              </p>
              <div className="pt-1 sm:pt-2">
                <Link
                  href="/essai/"
                  className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:scale-[1.03] hover:bg-primary-dark sm:px-7 sm:py-3 sm:text-sm"
                >
                  Découvrir nos offres pro
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Annuaire SEO */}
      <section className="bg-paper py-14 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mb-8 sm:mb-14">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-primary sm:mb-2 sm:text-[11px] sm:tracking-[0.2em]">
              Partout au Maroc
            </p>
            <h2 className="text-xl font-normal tracking-tight text-ink sm:text-4xl">
              Trouvez votre établissement beauté{" "}
              <br className="hidden sm:inline" />
              partout au Maroc
            </h2>
          </Reveal>

          <RevealStagger className="grid grid-cols-2 gap-5 text-[11px] leading-relaxed sm:grid-cols-3 sm:gap-8 sm:text-xs sm:leading-loose md:grid-cols-5" stagger={0.07}>
            {DIRECTORY.map((col) => (
              <RevealItem key={col.title}>
                <h3 className="mb-1 text-xs font-bold text-ink sm:text-sm">{col.title}</h3>
                <p className="mb-2 text-[10px] text-ink/55 sm:mb-3 sm:text-[11px]">{col.subtitle}</p>
                <ul className="space-y-0.5 text-ink/55 sm:space-y-1">
                  {col.links.map((link) => (
                    <li key={link}>
                      <Link href="/#explore" className="transition hover:text-primary">
                        {link}
                      </Link>
                    </li>
                  ))}
                </ul>
              </RevealItem>
            ))}
          </RevealStagger>
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
    </>
  );
}
