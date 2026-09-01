import type { Metadata } from "next";
import { Suspense } from "react";
import { EssaiForm } from "@/components/www/EssaiForm";
import { PageHero } from "@/components/www/PageHero";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Demande d’essai 14 jours",
  description:
    "Essai Rappel Beauté 14 jours sans carte bancaire. Accès activé sous 24 h.",
};

export default function EssaiPage() {
  return (
    <>
      <PageHero
        eyebrow="Essai 14 jours"
        title="Votre accès sera activé sous 24 h."
        text="Sans carte bancaire. Pas d’inscription libre : notre équipe crée le compte institut, puis vous recevez vos identifiants."
      />
      <div className="container-rb max-w-xl py-16">
        <Suspense fallback={<div className="surface h-96 animate-pulse" />}>
          <EssaiForm />
        </Suspense>
      </div>
    </>
  );
}
