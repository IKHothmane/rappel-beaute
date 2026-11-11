import { marketingPageMetadata } from "@/lib/seo";
import { DemoLanding } from "@/components/www/EngagementPages";

export const dynamic = "force-static";

export const metadata = marketingPageMetadata({
  title: "Démo interactive du logiciel · Rappel Beauty",
  description: "Explorez les modules de Rappel Beauty à travers les captures du logiciel et demandez une démonstration guidée pour votre institut.",
  canonical: "/demo/",
});

export default function DemoPage() {
  return <DemoLanding />;
}
