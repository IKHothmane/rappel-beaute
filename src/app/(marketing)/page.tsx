import Link from "next/link";
import type { Metadata } from "next";
import { HomeSearch } from "@/components/www/HomeSearch";
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
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDFhUzBzZyEDmlRWBfs132JbWm6oPBjQ_j55gAPJ-fHbMaUXWnD9SFVHdN_PvLcWlUL133kBM3qj2FkYn06AP3XO3mJO8TcCseN-tmE9jIzeVZ0vbWniAMVjsUcDYkVZ5MRBIcCSBy2WEhKMAjyoYCgqaX9L5eH87MxirsyXB-Lm7P9ZnSS8a4DFg2wbSh4sGh-whiTwqJbAc0fUzdobPh29GYX32tLLflX_REso12068rZNhbzDQ6K-A";

const POPULAR_CITIES = [
  "Casablanca Gauthier",
  "Rabat Agdal",
  "Marrakech Guéliz",
  "Tanger Malabata",
];

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
      {/* Hero */}
      <section className="relative flex min-h-[640px] items-center justify-center overflow-hidden bg-institut text-white lg:min-h-[720px]">
        <div className="absolute inset-0 z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt=""
            className="h-full w-full scale-105 object-cover object-center brightness-75"
            src={HERO_IMG}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-institut/90 via-institut/50 to-institut/70" />
        </div>

        <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-4 py-20 text-center sm:px-6 lg:px-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-gold">
            La référence beauté au Maroc
          </p>
          <h1 className="mb-3 font-display text-4xl font-light tracking-tight text-white sm:text-6xl md:text-7xl">
            Réservez en beauté
          </h1>
          <p className="mb-10 flex items-center justify-center space-x-3 text-sm font-normal tracking-wide text-white/90 sm:text-base">
            <span>Simple</span>
            <span className="inline-block h-1 w-1 rounded-full bg-primary" />
            <span>Immédiat</span>
            <span className="inline-block h-1 w-1 rounded-full bg-primary" />
            <span>24h/24 &amp; 7j/7</span>
          </p>

          <HomeSearch />

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-white/80">
            <span className="font-medium text-gold">Populaires :</span>
            {POPULAR_CITIES.map((city) => (
              <Link
                key={city}
                href="/#explore"
                className="rounded-full border border-line/20 bg-institut/50 px-3 py-1 text-white backdrop-blur-sm transition hover:bg-primary/30"
              >
                {city}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Découvrir les professionnels */}
      <section className="overflow-hidden bg-paper py-24" id="explore">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
            <div className="hidden lg:col-span-3 lg:block">
              <div className="aspect-[3/4] overflow-hidden rounded-2xl border border-line bg-primary-light shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="Texture vernis"
                  className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                  src={IMG_NAIL}
                />
              </div>
            </div>

            <div className="lg:col-span-3">
              <div className="aspect-[4/5] overflow-hidden rounded-2xl border border-line bg-primary-light shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="Texture cosmétique"
                  className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                  src={IMG_CREAM}
                />
              </div>
            </div>

            <div className="flex flex-col justify-center px-2 lg:col-span-4 lg:px-6">
              <span className="mb-6 h-0.5 w-12 bg-primary" />
              <h2 className="mb-6 text-3xl font-normal tracking-tight text-ink sm:text-4xl">
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
            </div>

            <div className="hidden lg:col-span-2 lg:block">
              <div className="aspect-[2/3] overflow-hidden rounded-2xl border border-line bg-primary-light shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="Sérum"
                  className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                  src={IMG_SERUM}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Presse */}
      <section className="border-y border-line/10 bg-institut py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="mb-8 text-[11px] font-semibold uppercase tracking-[0.25em] text-gold">
            Presse
          </p>
          <h3 className="mb-12 font-display text-2xl font-light tracking-wide text-white">
            Ils parlent de nous
          </h3>
          <div className="mx-auto grid max-w-4xl grid-cols-2 items-center justify-items-center gap-8 opacity-80 md:grid-cols-4 md:gap-12">
            <span className="font-display text-2xl font-semibold tracking-[0.3em] text-white md:text-3xl">
              VOGUE
            </span>
            <span className="font-display text-2xl font-semibold tracking-[0.25em] text-line md:text-3xl">
              GRAZIA
            </span>
            <span className="font-display text-2xl font-bold tracking-[0.35em] text-white md:text-3xl">
              ELLE
            </span>
            <span className="font-display text-xl lowercase italic tracking-widest text-line md:text-2xl">
              marie claire
            </span>
          </div>
        </div>
      </section>

      {/* B2B Stats */}
      <section className="bg-paper py-24" id="pro">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 text-left">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
              Une forte croissance
            </p>
            <h2 className="text-3xl font-normal tracking-tight text-ink sm:text-4xl lg:text-5xl">
              Vous êtes un professionnel de la beauté ?
              <br />
              <span className="font-medium text-primary">
                Découvrez la prise de RDV en ligne !
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-line bg-paper shadow-sm md:grid-cols-3">
            {STATS.map((stat, i) => (
              <div
                key={stat.value}
                className={`border-line p-8 transition-colors hover:bg-primary-light/40 sm:p-10 ${
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
              </div>
            ))}
          </div>

          <div className="mt-10">
            <Link href="/essai/" className="btn-primary">
              Je suis un professionnel
            </Link>
          </div>
        </div>
      </section>

      {/* Équipe */}
      <section className="border-y border-line bg-primary-light/30 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <div className="overflow-hidden rounded-2xl border border-line shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={`Équipe ${SITE.name}`}
                  className="h-80 w-full object-cover contrast-110 grayscale sm:h-96"
                  src={IMG_TEAM}
                />
              </div>
            </div>
            <div className="space-y-6 lg:col-span-6">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                Professionnel &amp; talents
              </span>
              <h2 className="text-3xl font-normal leading-snug tracking-tight text-ink sm:text-4xl">
                {SITE.name} recrute et déploie ses équipes pour digitaliser le
                secteur de la beauté au Maroc.
              </h2>
              <p className="text-sm leading-relaxed text-ink/55">
                Nous accompagnons chaque gérant de salon, barbier indépendant et
                institut haut de gamme avec un service client basé à Casablanca et
                une assistance dédiée 6j/7.
              </p>
              <p className="text-xs font-semibold uppercase tracking-wider text-gold">
                Direction Générale — Casablanca
              </p>
              <div className="pt-2">
                <Link
                  href="/essai/"
                  className="inline-flex items-center justify-center rounded-full bg-primary px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark"
                >
                  Découvrir nos offres pro
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Annuaire SEO */}
      <section className="bg-paper py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
              Partout au Maroc
            </p>
            <h2 className="text-3xl font-normal tracking-tight text-ink sm:text-4xl">
              Trouvez votre établissement beauté{" "}
              <br className="hidden sm:inline" />
              partout au Maroc
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-8 text-xs leading-loose sm:grid-cols-3 md:grid-cols-5">
            {DIRECTORY.map((col) => (
              <div key={col.title}>
                <h3 className="mb-1 text-sm font-bold text-ink">{col.title}</h3>
                <p className="mb-3 text-[11px] text-ink/55">{col.subtitle}</p>
                <ul className="space-y-1 text-ink/55">
                  {col.links.map((link) => (
                    <li key={link}>
                      <Link href="/#explore" className="transition hover:text-primary">
                        {link}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-line bg-primary-light/20 py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
              FAQ
            </p>
            <h2 className="font-display text-3xl font-light text-ink">
              Les questions fréquentes
            </h2>
          </div>

          <div className="space-y-4">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group cursor-pointer rounded-xl border border-line bg-paper p-5 transition-all hover:border-primary/40 hover:shadow-sm"
              >
                <summary className="flex items-center justify-between text-sm font-medium text-ink transition-colors group-hover:text-primary sm:text-base">
                  <span>{item.q}</span>
                  <span className="ml-4 transform text-primary transition-transform group-open:rotate-180">
                    <svg
                      className="h-5 w-5"
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
                <p className="mt-4 text-xs leading-relaxed text-ink/55 sm:text-sm">{item.a}</p>
              </details>
            ))}
          </div>

          <p className="mt-8 text-center text-sm text-ink/55">
            Plus de réponses sur notre{" "}
            <Link href="/faq/" className="font-semibold text-primary hover:text-primary-dark">
              page FAQ
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  );
}
