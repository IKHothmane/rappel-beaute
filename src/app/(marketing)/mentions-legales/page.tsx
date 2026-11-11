import { marketingPageMetadata } from "@/lib/seo";
import { LegalMentions } from "@/components/www/LegalMentions";
import "./mentions-legales.css";

export const dynamic = "force-static";

export const metadata = marketingPageMetadata({
  title: "Mentions légales · Rappel Beauty",
  description: "Mentions légales Rappel Beauté : éditeur, ICE, RC, hébergeur.",
  canonical: "/mentions-legales/",
});

export default function MentionsLegalesPage() {
  return <LegalMentions />;
}
