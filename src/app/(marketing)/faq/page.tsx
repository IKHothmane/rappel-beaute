import type { Metadata } from "next";
import { JsonLd } from "@/components/www/JsonLd";
import { PageHero } from "@/components/www/PageHero";
import { faqJsonLd, marketingPageMetadata } from "@/lib/seo";
import { FAQ_ITEMS, formatPrice, PUBLIC_OFFER } from "@/lib/site";

export const dynamic = "force-static";

export const metadata: Metadata = marketingPageMetadata({
  title: "FAQ Rappel Beauty · Logiciel pour institut de beauté",
  description: `Rappel Beauty : ${PUBLIC_OFFER.monthlyPrice} DH/mois ou ${formatPrice(PUBLIC_OFFER.annualPrice)} DH/an, essai ${PUBLIC_OFFER.trialDays} jours sans carte bancaire. Fonctionnement, réservation en ligne et gestion d'un institut de beauté au Maroc.`,
  canonical: "/faq/",
});

export default function FaqPage() {
  return (
    <>
      <JsonLd data={faqJsonLd()} />
      <PageHero
        eyebrow="FAQ"
        title="FAQ Rappel Beauty"
        text="Fonctionnalités, tarifs, essai gratuit, réservation en ligne et paiements à l'institut."
      />
      <div className="container-rb max-w-3xl space-y-4 py-16">
        {FAQ_ITEMS.map((item) => (
          <details key={item.q} className="surface group p-5">
            <summary className="cursor-pointer font-display text-lg font-semibold">
              {item.q}
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-ink/70">{item.a}</p>
          </details>
        ))}
      </div>
    </>
  );
}
