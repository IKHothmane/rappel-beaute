import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Headset, Heart, MapPin, ShieldCheck, Sparkles, Star } from "lucide-react";
import { HomeFeatureCards } from "@/components/www/HomeFeatureCards";
import { HomeHero } from "@/components/www/HomeHero";
import { HomeProductSections } from "@/components/www/HomeProductSections";
import { HomeReveal as Reveal } from "@/components/www/HomeReveal";
import { PricingSection } from "@/components/www/PricingSection";
import { marketingPageMetadata } from "@/lib/seo";
import { formatPrice, PUBLIC_OFFER } from "@/lib/site";

export const dynamic = "force-static";

export const metadata: Metadata = marketingPageMetadata({
  title: "Rappel Beauty – Logiciel de gestion pour institut de beauté au Maroc",
  description: `Rappel Beauty est le logiciel de gestion pour instituts de beauté au Maroc : rendez-vous, clientes, équipe, stock, caisse, fidélité et réservation en ligne. Essai gratuit ${PUBLIC_OFFER.trialDays} jours.`,
  canonical: "/",
});

const EXTRA_FEATURES = [
  {
    title: "Fidélité",
    text: "Cartes de fidélité, passages et récompenses pour encourager les clientes à revenir.",
    src: "/marketing/screen-fidelite.png",
    alt: "Carte de fidélité Rappel Beauty",
    href: "/fidelite/",
    width: 1536,
    height: 1024,
  },
  {
    title: "Services & prestations",
    text: "Organisez le catalogue des soins, leurs durées et leurs tarifs en MAD.",
    src: "/marketing/screen-services.png",
    alt: "Services et prestations Rappel Beauty sur ordinateur",
    href: "/fonctionnalites/#services",
    width: 1536,
    height: 1024,
  },
  {
    title: "Stock & produits",
    text: "Suivez les quantités, les mouvements et les alertes de stock bas.",
    src: "/marketing/screen-stock.png",
    alt: "Stock et produits Rappel Beauty sur ordinateur",
    href: "/gestion-stock/",
    width: 1536,
    height: 1024,
  },
] as const;

const FAQ = [
  {
    q: "Puis-je essayer Rappel Beauty gratuitement ?",
    a: `Oui, pendant ${PUBLIC_OFFER.trialDays} jours, sans carte bancaire. L'essai ne devient pas un abonnement tant que vous ne choisissez pas une formule.`,
  },
  {
    q: "Y a-t-il un engagement ?",
    a: "Non. Aucune durée minimale n'est imposée.",
  },
  {
    q: "Combien coûte Rappel Beauty ?",
    a: `${PUBLIC_OFFER.monthlyPrice} DH par mois, ou ${formatPrice(PUBLIC_OFFER.annualPrice)} DH par an. La formule annuelle économise ${formatPrice(PUBLIC_OFFER.annualSavings)} DH par rapport à douze mensualités.`,
  },
  {
    q: "Est-ce que le logiciel fonctionne sur téléphone ?",
    a: "Oui, Rappel Beauty s'utilise dans le navigateur. Rien à installer depuis un store.",
  },
  {
    q: "WhatsApp envoie-t-il les messages automatiquement ?",
    a: "Non. Rappel Beauty prépare les confirmations, rappels ou relances. Une personne de l'institut envoie elle-même le message depuis WhatsApp.",
  },
  {
    q: "Un autre institut peut-il voir mes données ?",
    a: "Non. La connexion est en HTTPS, et chaque institut ne voit que son espace.",
  },
  {
    q: "La réservation en ligne est-elle incluse ?",
    a: "Oui. L'institut publie sa page : services, durées et créneaux issus du planning. Le rendez-vous arrive dans le même agenda.",
  },
  {
    q: "Puis-je changer de formule plus tard ?",
    a: "Vous choisissez le mois ou l'année à l'inscription. La formule reste sans engagement.",
  },
] as const;

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

function TrialButton({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/professionnel/"
      className={
        light
          ? "rb-button inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-ink shadow-sm"
          : "rb-button inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-pink-900/15 hover:bg-primary-dark"
      }
    >
      Essayer gratuitement {PUBLIC_OFFER.trialDays} jours <span aria-hidden="true">→</span>
    </Link>
  );
}

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <HomeHero />

      <section className="border-b border-pink-100 bg-[#fff8fb]">
        <ul className="mx-auto grid max-w-6xl grid-cols-2 gap-x-4 gap-y-5 px-4 py-6 sm:grid-cols-3 sm:px-6 lg:grid-cols-6 lg:gap-x-3 lg:px-8">
          {[
            { icon: Sparkles, label: "Gestion centralisée" },
            { icon: Star, label: "Pensé pour les instituts" },
            { icon: MapPin, label: "Adapté au Maroc" },
            { icon: Heart, label: "Fidélité cliente" },
            { icon: Headset, label: "Support en français" },
            { icon: ShieldCheck, label: "Espace sécurisé" },
          ].map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-[0_8px_20px_-12px_rgba(186,0,73,0.8)] ring-1 ring-pink-100">
                <Icon size={16} strokeWidth={2} aria-hidden="true" />
              </span>
              <span className="text-[13px] font-medium leading-4 text-ink/80">{label}</span>
            </li>
          ))}
        </ul>
      </section>

      <HomeFeatureCards />

      <HomeProductSections />

      <section id="croissance" className="scroll-mt-24 bg-[#fff8fb] py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                  Les outils du quotidien
                </p>
                <h2 className="mt-3 font-display text-3xl font-light text-ink sm:text-4xl">
                  Les détails qui font gagner du temps.
                </h2>
                <p className="mt-3 text-sm leading-7 text-ink/65 sm:text-base">
                  Fidélité, prestations et stock, sans disperser les informations de l&apos;institut.
                </p>
              </div>
              <TrialButton />
            </div>
          </Reveal>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {EXTRA_FEATURES.map((item, index) => (
              <Reveal key={item.title} delay={index * 100}>
                <Link
                  href={item.href}
                  className="rb-feature-card group block h-full overflow-hidden rounded-2xl border border-line bg-white"
                >
                  {"src" in item ? (
                    <div className="overflow-hidden bg-[#fff8fb]">
                      <Image
                        src={item.src}
                        alt={item.alt}
                        width={item.width}
                        height={item.height}
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="h-auto w-full object-contain transition duration-700 group-hover:scale-[1.02]"
                      />
                    </div>
                  ) : null}
                  <div className="p-5">
                    <h3 className="font-display text-2xl text-ink">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-ink/65">{item.text}</p>
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                      En savoir plus <span aria-hidden="true">→</span>
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden border-y border-line bg-white py-14 sm:py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
          <Reveal>
            <div className="min-w-0 max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                Réservation en ligne
              </p>
              <h2 className="mt-3 font-display text-3xl font-light leading-tight text-ink sm:text-4xl">
                Attirez plus de clientes grâce à la{" "}
                <span className="text-primary">réservation en ligne.</span>
              </h2>
              <p className="mt-4 text-sm leading-7 text-ink/65 sm:text-base">
                Offrez à vos clientes la possibilité de découvrir vos prestations et de réserver
                leur rendez-vous facilement, depuis leur téléphone, à tout moment.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-ink/75">
                {[
                  "Une page de réservation personnalisée à l'image de votre institut",
                  "Vos prestations, tarifs et durées clairement présentés",
                  "Les disponibilités accessibles en ligne",
                  "Un contact WhatsApp pour faciliter les échanges",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-0.5 text-primary" aria-hidden="true">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/book/institut-royal/booking/"
                className="rb-button mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-dark"
              >
                Voir un exemple de réservation
                <span aria-hidden="true">→</span>
              </Link>
              <p className="mt-4 text-xs leading-5 text-ink/50">
                Vos clientes réservent en ligne et règlent directement auprès de votre institut.
              </p>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <figure className="rb-visual relative min-w-0">
              <div className="pointer-events-none absolute inset-8 rounded-full bg-pink-200/40 blur-3xl" />
              <Image
                src="/marketing/reservation-en-ligne.png"
                alt="Réservation en ligne pour un institut de beauté"
                width={1536}
                height={1024}
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="relative h-auto w-full object-contain"
              />
            </figure>
          </Reveal>
        </div>
      </section>

      <PricingSection />

      <section className="bg-[#fff8fb] py-14 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <Reveal>
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                Besoin de précisions ?
              </p>
              <h2 className="mt-3 font-display text-3xl font-light text-ink sm:text-4xl">
                Questions fréquentes
              </h2>
            </div>
          </Reveal>
          <div className="mt-8 grid gap-3 md:grid-cols-2">
            {FAQ.map((item, index) => (
              <Reveal key={item.q} delay={(index % 2) * 70}>
                <details className="rb-faq group h-full rounded-xl border border-line bg-white px-4 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-ink">
                    {item.q}
                    <span className="rb-faq-icon flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#fce7ef] text-primary">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-ink/65">{item.a}</p>
                </details>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <p className="mt-6 text-center text-sm text-ink/60">
              <Link href="/faq/" className="font-semibold text-primary hover:text-primary-dark">Toutes les questions</Link>
              {" · "}
              <Link href="/demo/" className="font-semibold text-primary hover:text-primary-dark">Démo</Link>
              {" · "}
              <Link href="/contact/" className="font-semibold text-primary hover:text-primary-dark">Contact</Link>
              {" · "}
              <Link href="/mentions-legales/" className="font-semibold text-primary hover:text-primary-dark">Mentions légales</Link>
              {" · "}
              <Link href="/confidentialite/" className="font-semibold text-primary hover:text-primary-dark">Confidentialité</Link>
            </p>
          </Reveal>
        </div>
      </section>

      <section className="rb-final-cta relative isolate overflow-hidden bg-institut py-14 text-center text-white sm:py-20">
        <div className="pointer-events-none absolute -left-20 -top-28 -z-10 h-72 w-72 rounded-full border border-white/15" />
        <div className="pointer-events-none absolute -bottom-44 -right-20 -z-10 h-96 w-96 rounded-full border border-white/15" />
        <Reveal>
          <div className="mx-auto max-w-3xl px-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/65">
              Rappel Beauty
            </p>
            <h2 className="mt-3 font-display text-3xl font-light sm:text-5xl">
              Prête à simplifier la gestion de votre institut ?
            </h2>
            <p className="mt-4 text-sm text-white/75 sm:text-base">
              {PUBLIC_OFFER.trialDays} jours gratuits, sans carte bancaire et sans engagement.
            </p>
            <div className="mt-7">
              <TrialButton light />
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
