import type { Metadata } from "next";
import { PageHero } from "@/components/www/PageHero";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Gestion de stock institut de beauté",
  description:
    "Stock en ledger append-only pour instituts : achats, usage cabine, pertes. Alertes rupture. Plan Institut et Premium.",
};

export default function GestionStockPage() {
  return (
    <>
      <PageHero
        eyebrow="Stock"
        title="Le stock n’est plus un chiffre qu’on invente le soir."
        text="Chaque mouvement est écrit : achat, usage, vente, perte. Le niveau affiché se recalcule. Impossible d’écraser l’historique."
      />
      <article className="container-rb max-w-3xl space-y-6 py-16 text-[15px] leading-relaxed text-ink/75">
        <p>
          Les crèmes partent en cabine, pas seulement en rayon. Rappel Beauté
          lie la consommation à la prestation terminée, avec traçabilité
          (qui, quand, combien, pourquoi).
        </p>
        <p>
          Fournisseurs et achats suivent le même journal. Module inclus dès le
          plan Institut (499 MAD).
        </p>
      </article>
    </>
  );
}
