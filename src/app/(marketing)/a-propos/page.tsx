import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/www/Reveal";
import { SITE } from "@/lib/site";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "À propos — Le logiciel d'excellence pour instituts au Maroc",
  description:
    "Rappel Beauté naît d’un constat simple : les outils importés parlent mal le métier, la caisse en MAD et WhatsApp. Fait pour les instituts du Maroc.",
};

const IMG_ATELIER =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBMz86RbBst2uEKW0W6aJCA_J2kvT2tULe700qf0jqyT28soEeagVbEjtrA1w9rWDFCZBkBIc5VV5yHpZvLcIlikKPb5BW58fLp-Q0KwvF6ZMXJvd7kHEIHusLemKkjgT1Nn4czy-KMk7vyjeZ3hTeZcq-1Ubqun9W0JQwmFgWLnmuOaKz4lQEEngJAoyN8g-PNv4T5vvbt1FVXSBFGXDJkLKMKn7W056yAclfaa6q-uWzEyS1pihUsuA";

const WA_HREF = `https://wa.me/${SITE.phone.replace(/\D/g, "")}`;

const METRICS = [
  {
    value: "24+",
    label: "Instituts partenaires à Casablanca, Rabat & Marrakech",
    tone: "text-ink",
  },
  {
    value: "4.9",
    suffix: true,
    label: "Satisfaction des patronnes de salons marocains",
    tone: "text-ink",
  },
  {
    value: "+35 000",
    label: "Rendez-vous honorés sans double-réservation",
    tone: "text-primary",
  },
  {
    value: "100% MAD",
    label: "Caisse immuable, tickets & support WhatsApp 7j/7",
    tone: "text-ink",
  },
] as const;

const PILLARS = [
  {
    n: "01",
    badge: "Origine & Quotidien",
    badgeTone: "text-gold",
    nBg: "bg-primary-light text-primary border-primary/15",
    title: "Histoire : Du carnet manuscrit au geste d'excellence",
    p1: "Trop de patronnes d'instituts au Maroc tiennent encore l'agenda sur des cahiers volants, recalculent leur caisse le soir sur une calculette avec appréhension, et relancent leurs clientes tard le soir depuis leur numéro personnel WhatsApp.",
    p2: "Rappel Beauté réunit ces trois gestes fondamentaux dans un logiciel hébergé de haute facture : chiffré en Dirhams (MAD), intuitif pour les esthéticiennes sur tablette, et taillé sur-mesure pour Casablanca, Rabat, Marrakech et l’ensemble du Royaume.",
  },
  {
    n: "02",
    badge: "Clarté Opérationnelle",
    badgeTone: "text-primary",
    nBg: "bg-[#FBF5E9] text-gold border-gold/30",
    title: "Mission : Rendre la journée limpide et sans friction",
    p1: "Rendre la journée immédiatement lisible pour la gérante : qui est en cabine en ce moment précis, quel praticien génère le plus de satisfaction, ce qui a été effectivement encaissé (espèces, TPE, virement) et quel sérum précieux commence à manquer en réserve.",
    p2: "Pas d'usines à gaz inutiles : zéro robot de discussion artificiel, respect absolu de la vie privée des clientes sans photos en V1, et conformité marocaine conforme aux exigences de la Loi 09-08 (CNDP).",
  },
  {
    n: "03",
    badge: "Proximité Locale",
    badgeTone: "text-ink/55",
    nBg: "bg-primary-light/60 text-ink border-line",
    title: "Équipe & Engagement : Le produit d'abord, l'accompagnement toujours",
    p1: "Nous privilégions l’excellence du code et l’adéquation métier avant tout discours marketing. Notre équipe rassemble des ingénieurs marocains et des expertes ayant dirigé des instituts sur l'axe Casa-Rabat.",
    p2: "Lorsque vous rejoignez Rappel Beauté, vous ne parlez pas à une boîte vocale européenne distante : notre support est disponible en français et en darija directement via WhatsApp pour sécuriser chaque transition d'agenda.",
  },
] as const;

const VALUES = [
  {
    title: "Vérité Caisse en Dirhams",
    text: "Calcul précis de la ventilation espèces, TPE bancaire et acomptes. Aucun flou en fin de mois : chaque prestation effectuée correspond à un flux comptable net et vérifiable.",
    icon: (
      <path
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.75"
      />
    ),
  },
  {
    title: "L'Humain avant le Robot",
    text: "Les clientes de beauté exigent de la considération. Le logiciel formule et pré-remplit les rappels WhatsApp en un clic, mais c'est vous qui gardez le ton chaleureux propre à votre salon.",
    icon: (
      <path
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.75"
      />
    ),
  },
  {
    title: "Souveraineté & Respect CNDP",
    text: "Vos fiches clientes, numéros et historiques de prestations restent strictement votre propriété exclusive. Aucune revente de données, hébergement sécurisé conforme aux lois locales.",
    icon: (
      <path
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.75"
      />
    ),
  },
] as const;

export default function AProposPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-rose-aurora pb-20 pt-16 sm:pt-24">
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="mb-6 inline-flex items-center space-x-2 rounded-full border border-primary/20 bg-white/90 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-primary shadow-sm">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              <span>Notre histoire &amp; notre vision Maroc</span>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-14">
            <Reveal className="lg:col-span-7">
              <h1 className="mb-6 font-display text-4xl font-semibold leading-[1.12] text-ink sm:text-5xl lg:text-6xl">
                Fait pour les instituts du Maroc.
                <br />
                <span className="font-normal italic text-primary">
                  Pensé pour leur sérénité.
                </span>
              </h1>
              <p className="mb-8 max-w-2xl text-lg font-normal leading-relaxed text-ink/55 sm:text-xl">
                {SITE.name} naît d’un constat simple sur le terrain : les logiciels importés
                ignorent le rythme réel des salons marocains, les subtilités de la caisse en
                Dirhams et l&apos;usage central de WhatsApp. Nous avons bâti la référence locale.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href="/demo/"
                  className="rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-white shadow-soft transition-all hover:bg-primary-dark"
                >
                  Demander une démo gratuite
                </Link>
                <a
                  href="#notre-histoire"
                  className="rounded-full border border-line bg-white px-6 py-3.5 text-sm font-semibold text-ink transition-all hover:border-primary/30 hover:bg-primary-light"
                >
                  Découvrir nos valeurs
                </a>
              </div>
              <div className="mt-10 flex items-center space-x-4 border-t border-line/80 pt-8">
                <div className="flex -space-x-2">
                  {["CA", "RA", "MA"].map((c, i) => (
                    <span
                      key={c}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold text-ink ring-2 ring-white ${
                        i === 0 ? "bg-amber-100" : i === 1 ? "bg-rose-100" : "bg-pink-200"
                      }`}
                    >
                      {c}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-ink/55">
                  Déjà adopté par les gérantes d&apos;établissements à{" "}
                  <strong className="font-semibold text-ink">
                    Casablanca, Rabat &amp; Marrakech
                  </strong>
                  .
                </p>
              </div>
            </Reveal>

            <Reveal className="lg:col-span-5" delay={0.1} x={20}>
              <div className="relative">
                <div className="absolute -inset-2 rounded-[26px] bg-gradient-to-tr from-primary/20 to-gold/15 opacity-70 blur-xl" />
                <div className="relative rounded-[26px] border border-line bg-white p-3 shadow-soft sm:p-3.5">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-[18px] sm:aspect-auto">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={`Équipe et partenaires ${SITE.name} — session à Casablanca`}
                      className="h-full w-full object-cover transition-transform duration-700 ease-out hover:scale-[1.02] sm:max-h-[320px]"
                      src={IMG_ATELIER}
                    />
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-xl border border-white/60 bg-white/85 p-3 shadow-sm backdrop-blur-md">
                      <div className="flex items-center space-x-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="text-xs font-semibold text-ink">
                          Atelier Partenaire — Casablanca
                        </span>
                      </div>
                      <span className="text-[11px] font-medium text-ink/55">
                        Cliniques &amp; Salons 2026
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-3 pb-1 pt-3 text-[11px] font-medium text-ink/55">
                    <span>Conçu avec et pour les praticiennes</span>
                    <span className="font-bold text-gold">100% MAD &amp; CNDP</span>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Metrics */}
      <section className="border-y border-line bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="grid grid-cols-2 gap-8 text-center md:grid-cols-4 md:divide-x md:divide-line/70">
              {METRICS.map((m) => (
                <div key={m.label} className="px-3">
                  {"suffix" in m && m.suffix ? (
                    <div className="mb-1 flex items-center justify-center space-x-1">
                      <span className={`font-display text-3xl font-semibold sm:text-4xl ${m.tone}`}>
                        {m.value}
                      </span>
                      <span className="text-xl font-bold text-amber-500">★</span>
                      <span className="self-end pb-1 text-xs font-medium text-ink/55">/ 5</span>
                    </div>
                  ) : (
                    <p className={`mb-1 font-display text-3xl font-semibold sm:text-4xl ${m.tone}`}>
                      {m.value}
                    </p>
                  )}
                  <p className="text-xs font-medium text-ink/55 sm:text-sm">{m.label}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Pillars */}
      <section className="relative bg-paper py-24" id="notre-histoire">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto mb-20 max-w-2xl text-center">
            <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-primary">
              Notre Manifeste
            </span>
            <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
              Les Trois Vérités de {SITE.name}
            </h2>
            <div className="mx-auto mt-4 h-0.5 w-16 rounded-full bg-primary" />
          </Reveal>

          <div className="space-y-16">
            {PILLARS.map((p, i) => (
              <Reveal key={p.n} delay={i * 0.06}>
                <article className="rounded-[18px] border border-line bg-white p-8 shadow-sm transition-shadow duration-300 hover:shadow-soft sm:p-12">
                  <div className="flex flex-col gap-6 md:flex-row md:items-start">
                    <div
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border font-display text-2xl font-semibold ${p.nBg}`}
                    >
                      {p.n}
                    </div>
                    <div>
                      <span
                        className={`mb-1 block text-xs font-bold uppercase tracking-wider ${p.badgeTone}`}
                      >
                        {p.badge}
                      </span>
                      <h3 className="mb-4 font-display text-2xl font-semibold text-ink sm:text-3xl">
                        {p.title}
                      </h3>
                      <p className="mb-4 text-base font-normal leading-relaxed text-ink/80 sm:text-lg">
                        {p.p1}
                      </p>
                      <p className="text-sm leading-relaxed text-ink/55 sm:text-base">{p.p2}</p>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="border-t border-line bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto mb-16 max-w-2xl text-center">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-gold">
              Nos Principes Inviolables
            </span>
            <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
              Pourquoi les salons les plus raffinés nous font confiance
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {VALUES.map((v, i) => (
              <Reveal key={v.title} delay={i * 0.07}>
                <div className="rounded-[18px] border border-line/90 bg-paper p-8 transition-colors duration-200 hover:border-primary/40">
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-white text-primary shadow-sm">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {v.icon}
                    </svg>
                  </div>
                  <h4 className="mb-3 font-display text-xl font-semibold text-ink">{v.title}</h4>
                  <p className="text-sm leading-relaxed text-ink/55">{v.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-institut py-20 text-white" id="demande-demo">
        <div className="pointer-events-none absolute right-1/4 top-0 h-96 w-96 rounded-full bg-primary/25 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-gold/15 blur-2xl" />
        <div className="relative z-10 mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <Reveal>
            <span className="mb-4 inline-block rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-gold">
              Rejoignez les instituts partenaires
            </span>
            <h2 className="mb-6 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Prête à offrir à votre institut la clarté qu&apos;il mérite ?
            </h2>
            <p className="mx-auto mb-10 max-w-2xl text-base font-light leading-relaxed text-white/70 sm:text-lg">
              Bénéficiez de 14 jours d&apos;essai sans engagement. Notre équipe marocaine effectue
              avec vous le paramétrage de vos prestations et la reprise de votre fichier clientes.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/essai/"
                className="w-full rounded-full bg-primary px-8 py-4 text-center text-sm font-bold text-white shadow-soft transition-all hover:bg-primary-dark sm:w-auto"
              >
                Démarrer l&apos;essai 14 jours sans carte
              </Link>
              <a
                href={WA_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center space-x-2 rounded-full border border-white/20 bg-white/10 px-8 py-4 text-center text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 sm:w-auto"
              >
                <span>Échanger sur WhatsApp</span>
                <span className="rounded bg-emerald-500 px-1.5 py-0.5 font-mono text-xs text-white">
                  En ligne
                </span>
              </a>
            </div>
            <p className="mt-6 text-xs text-white/45">
              Configuration sur-mesure · Aucun frais caché · Formules transparentes dès 299 MAD /
              mois
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
