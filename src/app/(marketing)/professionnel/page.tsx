import { ProfessionnelRequest } from "@/components/professional/ProfessionnelRequest";
import { marketingPageMetadata } from "@/lib/seo";
import { PUBLIC_OFFER } from "@/lib/site";

export const dynamic = "force-static";

export const metadata = marketingPageMetadata({
  title: "Je suis un professionnel · Rappel Beauty",
  description: `Logiciel pour instituts de beauté au Maroc. Essai ${PUBLIC_OFFER.trialDays} jours, sans engagement et sans carte bancaire.`,
  canonical: "/professionnel/",
});

export default function ProfessionnelPage() {
  return <ProfessionnelRequest />;
}
