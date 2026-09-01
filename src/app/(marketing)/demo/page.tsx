import type { Metadata } from "next";
import { LeadForm } from "@/components/www/LeadForm";
import { PageHero } from "@/components/www/PageHero";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Demander une démo",
  description: "Demandez une démonstration Rappel Beauté pour votre institut.",
};

export default function DemoPage() {
  return (
    <>
      <PageHero
        eyebrow="Démo"
        title="20 minutes, votre institut à l’écran."
        text="Nom, institut, ville, téléphone. On vous rappelle pour caler le créneau."
      />
      <div className="container-rb max-w-xl py-16">
        <LeadForm kind="DEMO" />
      </div>
    </>
  );
}
