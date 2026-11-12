import { marketingPageMetadata } from "@/lib/seo";
import { LegalMentions } from "@/components/www/LegalMentions";
import "./mentions-legales.css";

export const dynamic = "force-static";

export const metadata = marketingPageMetadata({
  title: "Mentions légales · Rappel Beauty",
  description:
    "Mentions légales de Rappel Beauty : éditeur du site, ICE, RC, hébergeur et informations de contact.",
  canonical: "/mentions-legales/",
});

export default function MentionsLegalesPage() {
  return <LegalMentions />;
}
