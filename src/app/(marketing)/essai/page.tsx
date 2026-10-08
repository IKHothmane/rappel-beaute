import type { Metadata } from "next";
import { ProfessionnelSignup } from "@/components/www/professionnel-signup";
import { marketingPageMetadata } from "@/lib/seo";
import { PUBLIC_OFFER } from "@/lib/site";

export const dynamic = "force-static";

export const metadata: Metadata = marketingPageMetadata({
  title: "Essayez Rappel Beauty gratuitement",
  description: `${PUBLIC_OFFER.trialDays} jours gratuits pour tester Rappel Beauty, sans carte bancaire et sans engagement. Logiciel de gestion pour institut de beauté au Maroc.`,
  canonical: "/essai/",
});

export default function EssaiPage() {
  return <ProfessionnelSignup heading="Essayez Rappel Beauty gratuitement" />;
}
