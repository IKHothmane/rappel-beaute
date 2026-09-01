import type { Metadata } from "next";
import { PageHero } from "@/components/www/PageHero";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "À propos",
  description: "Rappel Beauté : logiciel marocain pour instituts de beauté.",
};

export default function AProposPage() {
  return (
    <>
      <PageHero
        eyebrow="À propos"
        title="Fait pour les instituts du Maroc."
        text="Rappel Beauté naît d’un constat simple : les outils importés parlent mal le métier, la caisse et WhatsApp."
      />
      <article className="container-rb max-w-3xl space-y-10 py-16">
        <section>
          <h2 className="font-display text-2xl font-semibold">Histoire</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-ink/75">
            Trop de patronnes tiennent encore l’agenda sur papier, la caisse sur
            calculatrice, les clientes sur un groupe WhatsApp. Rappel Beauté
            réunit ces trois gestes dans un logiciel hébergé, chiffré en MAD,
            pensé pour Casablanca, Rabat, Marrakech et le reste du Royaume.
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl font-semibold">Mission</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-ink/75">
            Rendre la journée lisible : qui est en cabine, ce qui a été encaissé,
            ce qui manque en stock. Sans bot, sans photo cliente en V1, sans
            création de compte en libre-service.
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl font-semibold">Équipe</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-ink/75">
            L’équipe sera présentée ici avant le lancement commercial. En V1,
            cet espace reste un placeholder volontaire — le produit d’abord.
          </p>
        </section>
      </article>
    </>
  );
}
