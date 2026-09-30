import type { Metadata } from "next";
import { JsonLd } from "@/components/www/JsonLd";
import { PageHero } from "@/components/www/PageHero";
import { faqJsonLd } from "@/lib/seo";
import { FAQ_ITEMS } from "@/lib/site";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: {
    absolute: "FAQ Rappel Beauty · Logiciel pour institut de beauté",
  },
  description:
    "Retrouvez les réponses aux questions fréquentes sur Rappel Beauty : fonctionnalités, tarifs, essai gratuit, réservation en ligne, paiements et gestion des instituts de beauté au Maroc.",
  alternates: { canonical: "/faq/" },
};

export default function FaqPage() {
  return (
    <>
      <JsonLd data={faqJsonLd()} />
      <PageHero
        eyebrow="FAQ"
        title="Questions fréquentes sur Rappel Beauty"
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
