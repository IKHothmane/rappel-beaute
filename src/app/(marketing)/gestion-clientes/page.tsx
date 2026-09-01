import type { Metadata } from "next";
import { PageHero } from "@/components/www/PageHero";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Gestion des clientes institut de beauté",
  description:
    "Fiches clientes, historique et fidélité pour instituts au Maroc. Aucune photo cliente en V1.",
};

export default function GestionClientesPage() {
  return (
    <>
      <PageHero
        eyebrow="Clientes"
        title="La cliente revient. Sa fiche aussi."
        text="Historique des RDV, notes, forfaits et points — sans photos en V1. La vie privée d’abord, la loi 09-08 ensuite."
      />
      <article className="container-rb max-w-3xl space-y-6 py-16 text-[15px] leading-relaxed text-ink/75">
        <p>
          Au secrétariat, on cherche un prénom, un téléphone, un forfait. Pas
          un album. Rappel Beauté ne stocke aucune photo cliente en V1.
        </p>
        <p>
          Isolation multi-tenant : l’institut d’à côté n’a jamais accès à vos
          fiches. Soft delete : on archive, on n’efface pas l’histoire.
        </p>
      </article>
    </>
  );
}
