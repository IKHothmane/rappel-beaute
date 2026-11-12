import ModulesSection from "@/components/home/ModulesSection";
import PilotageSection from "@/components/home/PilotageSection";
import FreeTrialSection from "@/components/home/FreeTrialSection";
import type { Metadata } from "next";
import PanoramicSpreadHero from "@/components/ui/panoramic-spread-hero";
import PricingSection from "@/components/sections/PricingSection";
import ApplicationShowcase from "@/components/sections/ApplicationShowcase";
import MoroccoPaymentsSection from "@/components/sections/MoroccoPaymentsSection";
import WhatsAppSection from "@/components/sections/WhatsAppSection";
import { Ico, type IcoName } from "@/components/www/home/Ico";
import { JsonLd } from "@/components/www/JsonLd";
import { faqPageJsonLd, marketingPageMetadata } from "@/lib/seo";
import { PUBLIC_OFFER } from "@/lib/site";
import { HOME_FAQS } from "@/lib/home-faq";
import FaqSection from "@/components/sections/FaqSection";
import "./home.css";

export const dynamic = "force-static";

export const metadata: Metadata = marketingPageMetadata({
  title: "Rappel Beauty – Logiciel de gestion pour institut de beauté au Maroc",
  description: `Rappel Beauty est le logiciel de gestion pour instituts de beauté au Maroc : rendez-vous, clientes, équipe, stock, caisse, fidélité et réservation en ligne. Essai gratuit ${PUBLIC_OFFER.trialDays} jours.`,
  canonical: "/",
});

// Les deux entrées centrales (index 3 et 4) sont au sommet de la pile au chargement.
const HERO_IMAGES = [
  { src: "/site/rappelbeauty-clientes-pc-reel.webp", alt: "Fiches clientes dans Rappel Beauty" },
  {
    src: "/site/rappelbeauty-produits-stock-pc-reel.webp",
    alt: "Produits et stock dans Rappel Beauty",
  },
  { src: "/site/rappelbeauty-caisse-pc-reel.webp", alt: "Caisse et paiements dans Rappel Beauty" },
  {
    src: "/site/rappelbeauty-agenda-pc-complet-2200x1270.webp",
    alt: "Agenda de la semaine dans Rappel Beauty",
  },
  {
    src: "/site/rappelbeauty-dashboard-pc-reel.webp",
    alt: "Tableau de bord Rappel Beauty : chiffre d’affaires, rendez-vous et caisse",
  },
  {
    src: "/site/rappelbeauty-fidelite-pc-reel.webp",
    alt: "Programme de fidélité dans Rappel Beauty",
  },
  {
    src: "/site/rappelbeauty-analytics-pc-reel.webp",
    alt: "Analyses et statistiques dans Rappel Beauty",
  },
  {
    src: "/site/rappelbeauty-planning-pc-reel.webp",
    alt: "Planning de l’équipe dans Rappel Beauty",
  },
] as const;

const BENEFITS: readonly { icon: IcoName; title: string; text: string }[] = [
  { icon: "handset", title: "Rappels WhatsApp", text: "Un message prêt pour chaque rendez-vous" },
  { icon: "cash", title: "Caisse rapprochée", text: "Espèces, carte et virement chaque soir" },
  { icon: "box", title: "Stock suivi", text: "Alertes avant la rupture" },
  { icon: "gift", title: "Fidélité QR", text: "Sans application à installer" },
];

export default function HomePage() {
  return (
    <div className="hm">
      <JsonLd data={faqPageJsonLd(HOME_FAQS)} />

      <PanoramicSpreadHero
        className="hm-pano"
        stageClassName="hm-pano-stage"
        images={HERO_IMAGES}
        eyebrow="Logiciel de gestion · Instituts de beauté au Maroc"
        title={
          <>
            Le logiciel des instituts de beauté <em>qui veulent grandir</em>
          </>
        }
        description="Agenda, caisse, stock, équipe et fidélité réunis dans un seul logiciel. Moins de rendez-vous oubliés, une caisse juste chaque soir et une vision claire de ce que rapporte votre institut."
      />

      <div className="benefits">
        <h2 className="sr-only">Les points forts de Rappel Beauty</h2>
        <div className="wrap">
          {BENEFITS.map((b) => (
            <div className="benefit" key={b.title}>
              <span className="ic">
                <Ico name={b.icon} />
              </span>
              <div>
                <h3>{b.title}</h3>
                <p>{b.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ApplicationShowcase />

      <WhatsAppSection />

      <ModulesSection />

      <MoroccoPaymentsSection />

      <PilotageSection />

      <PricingSection />

      <FaqSection />

      <FreeTrialSection />
    </div>
  );
}
