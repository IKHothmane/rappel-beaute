import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EssaiForm } from "@/components/www/EssaiForm";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Je suis un professionnel",
  description:
    "Vous dirigez un institut de beauté ? Demandez votre essai Rappel Beauté 14 jours — accès activé sous 24 h.",
};

export default function ProfessionnelPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-line bg-[radial-gradient(ellipse_at_top_left,_rgba(227,28,95,0.10),_transparent_50%),linear-gradient(180deg,#FFFBF9_0%,#FDEAF0_100%)]">
        <div className="pointer-events-none absolute inset-0 bg-grain opacity-70" />
        <div className="container-rb relative py-16 md:py-20">
          <p className="eyebrow">Professionnels</p>
          <h1 className="mt-3 max-w-3xl font-display text-3xl font-semibold tracking-tight sm:text-4xl md:text-[2.75rem] md:leading-tight">
            Je suis un professionnel
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-ink/70">
            Agenda, caisse, stock et WhatsApp manuel — pensés pour les instituts
            au Maroc. Demandez votre essai 14 jours, sans carte bancaire.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/connexion/" className="btn-ghost">
              Déjà un compte ? Se connecter
            </Link>
            <Link href="/demo/" className="btn-ghost">
              Demander une démo
            </Link>
          </div>
        </div>
      </section>
      <div className="container-rb max-w-xl py-16">
        <Suspense fallback={<div className="surface h-96 animate-pulse" />}>
          <EssaiForm />
        </Suspense>
      </div>
    </>
  );
}
