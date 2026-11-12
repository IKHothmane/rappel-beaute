import type { Metadata } from "next";
import { JsonLd } from "@/components/www/JsonLd";
import { FaqExplorer } from "@/components/www/FaqExplorer";
import { faqJsonLd, marketingPageMetadata } from "@/lib/seo";
import { formatPrice, PUBLIC_OFFER } from "@/lib/site";
import "./faq.css";

export const dynamic = "force-static";
export const metadata: Metadata = marketingPageMetadata({
  title: "FAQ Rappel Beauty · Vos questions, nos réponses",
  description: `Réponses Rappel Beauty : agenda, clientes, stock, réservation, sécurité et abonnement. ${formatPrice(PUBLIC_OFFER.monthlyPrice)} DH/mois, essai ${PUBLIC_OFFER.trialDays} jours.`,
  canonical: "/faq/",
});

export default function FaqPage() {
  return (
    <>
      <JsonLd data={faqJsonLd()} />
      <FaqExplorer />
    </>
  );
}
