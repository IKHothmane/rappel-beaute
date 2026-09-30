import type { Metadata } from "next";
import { EssaiForm } from "@/components/www/EssaiForm";
import { PageHero } from "@/components/www/PageHero";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Demande d’essai 7 jours",
  description:
    "Essai Rappel Beauty 7 jours sans carte bancaire. Accès activé sous 24 h.",
  alternates: { canonical: "/essai/" },
};

export default function EssaiPage() {
  return (
    <>
      <PageHero
        eyebrow="Essai 7 jours"
        title="Votre accès sera activé sous 24 h."
        text="Sans carte bancaire. Pas d’inscription libre : notre équipe crée le compte institut, puis vous recevez vos identifiants."
      />
      <div className="container-rb max-w-xl py-16">
        <EssaiForm />
      </div>
    </>
  );
}
