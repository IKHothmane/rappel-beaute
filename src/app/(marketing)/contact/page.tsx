import { marketingPageMetadata } from "@/lib/seo";
import { ContactLanding } from "@/components/www/EngagementPages";

export const dynamic = "force-static";

export const metadata = marketingPageMetadata({
  title: "Contact Rappel Beauty · Logiciel pour institut de beauté",
  description:
    "Contactez Rappel Beauty pour une question sur le logiciel de gestion des instituts de beauté au Maroc.",
  canonical: "/contact/",
});

export default function ContactPage() {
  return <ContactLanding />;
}
