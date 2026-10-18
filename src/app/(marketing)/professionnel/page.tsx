import { ProfessionnelSignup } from "@/components/www/professionnel-signup";
import { marketingPageMetadata } from "@/lib/seo";
import { PUBLIC_OFFER } from "@/lib/site";

export const dynamic = "force-static";

export const metadata = marketingPageMetadata({
  title: "Je suis un professionnel · Rappel Beauty",
  description: `Rappel Beauty est le logiciel de gestion pour les instituts de beauté au Maroc : rendez-vous, clientes, stock, caisse et réservation en ligne. Essai ${PUBLIC_OFFER.trialDays} jours, sans engagement et sans carte bancaire.`,
  canonical: "/professionnel/",
});

export default function ProfessionnelPage() {
  return <ProfessionnelSignup />;
}
