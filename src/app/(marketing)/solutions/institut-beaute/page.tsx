import type { Metadata } from "next";
import { PageHero } from "@/components/www/PageHero";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Logiciel pour institut de beauté au Maroc",
  description:
    "Rappel Beauté est le logiciel de gestion conçu pour les instituts de beauté marocains : agenda, clientes, stock, caisse.",
};

export default function InstitutBeautePage() {
  return (
    <>
      <PageHero
        eyebrow="Solutions"
        title="Le logiciel d’institut, pas un agenda générique."
        text="Cabines, protocoles, forfaits, WhatsApp de la patronne : Rappel Beauté parle le métier, en MAD, en français, pour le Maroc."
      />
      <article className="container-rb max-w-3xl space-y-6 py-16 text-[15px] leading-relaxed text-ink/75">
        <p>
          Un institut n’est pas un cabinet médical ni un salon de coiffure
          importé. Les durées varient, les cabines se croisent, le stock part
          dans les protocoles, la cliente revient au forfait.
        </p>
        <p>
          Rappel Beauté centralise agenda, fiches, caisse et stock pour que la
          patronne ferme la journée avec des chiffres justes — pas un cahier et
          trois WhatsApp.
        </p>
        <p>
          Plans dès 299 MAD / mois. Essai 14 jours, activation sous 24 h, sans
          carte bancaire.
        </p>
      </article>
    </>
  );
}
