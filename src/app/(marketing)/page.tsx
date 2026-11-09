import Link from "next/link";
import type { Metadata } from "next";
import { HomeHero } from "@/components/www/HomeHero";
import { HomeProductSections } from "@/components/www/HomeProductSections";
import { PricingSection } from "@/components/www/PricingSection";
import { ModuleIndex } from "@/components/www/ProductShot";
import { marketingPageMetadata } from "@/lib/seo";
import { formatPrice, PUBLIC_OFFER } from "@/lib/site";

export const dynamic = "force-static";

export const metadata: Metadata = marketingPageMetadata({
  title: "Rappel Beauty – Logiciel de gestion pour institut de beauté au Maroc",
  description: `Rappel Beauty est le logiciel de gestion pour instituts de beauté au Maroc : rendez-vous, clientes, équipe, stock, caisse, fidélité et réservation en ligne. Essai gratuit ${PUBLIC_OFFER.trialDays} jours.`,
  canonical: "/",
});

const MORE_MODULES = [
  { title: "Prestations", text: "Catalogue des soins, durées et tarifs en MAD.", href: "/fonctionnalites/#services" },
  { title: "Équipe", text: "Planning, disponibilités et commissions.", href: "/fonctionnalites/#equipe" },
  { title: "Stock", text: "Quantités, mouvements et alertes de stock bas.", href: "/gestion-stock/" },
  { title: "Fidélité", text: "Cartes, passages et récompenses pour faire revenir les clientes.", href: "/fidelite/" },
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

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <HomeHero />

      <section className="container-rb py-16 md:py-24">
        <p className="max-w-4xl font-display text-3xl font-light leading-snug tracking-tight text-ink sm:text-[2.75rem] sm:leading-[1.2]">
          L&apos;agenda est dans un cahier, les clientes dans WhatsApp, le stock dans un fichier et
          la caisse dans un autre outil. Le soir, personne ne retrouve la même journée.
        </p>
      </section>

      <HomeProductSections />

      <section className="border-t border-ink/15">
        <div className="container-rb py-16 md:py-24">
          <h2 className="mb-6 font-semibold text-ink">Aussi dans le logiciel</h2>
          <ModuleIndex items={MORE_MODULES} />
        </div>
      </section>

      <PricingSection />

      <section className="container-rb grid gap-8 py-16 md:py-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16">
        <div>
          <h2 className="font-display text-3xl font-light tracking-tight text-ink sm:text-[2.75rem] sm:leading-tight">
            Questions fréquentes
          </h2>
          <Link href="/faq/" className="mt-4 inline-block font-semibold text-primary underline-offset-4 hover:underline">
            Toutes les questions <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="border-t border-ink/15">
          {FAQ.map((item) => (
            <details key={item.q} className="rb-faq border-b border-ink/15">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold text-ink">
                {item.q}
                <span className="rb-faq-icon shrink-0 text-xl font-normal leading-none text-primary" aria-hidden="true">
                  +
                </span>
              </summary>
              <p className="max-w-2xl pb-5 leading-relaxed text-ink/70">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="bg-primary text-white">
        <div className="container-rb flex flex-col gap-8 py-16 md:flex-row md:items-end md:justify-between md:py-20">
          <div>
            <h2 className="max-w-2xl font-display text-4xl font-light leading-tight tracking-tight sm:text-5xl">
              Essayez-le sur une vraie semaine de rendez-vous.
            </h2>
            <p className="mt-4 text-lg text-white/85">
              {PUBLIC_OFFER.trialDays} jours gratuits, sans carte bancaire et sans engagement.
            </p>
          </div>
          <Link
            href="/professionnel/"
            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:bg-paper"
          >
            Essayer gratuitement {PUBLIC_OFFER.trialDays} jours
          </Link>
        </div>
      </section>
    </>
  );
}
