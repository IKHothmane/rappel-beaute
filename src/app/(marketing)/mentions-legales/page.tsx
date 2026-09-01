import type { Metadata } from "next";
import { PageHero } from "@/components/www/PageHero";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Mentions légales Rappel Beauté : éditeur, ICE, RC, hébergeur.",
};

export default function MentionsLegalesPage() {
  return (
    <>
      <PageHero
        eyebrow="Légal"
        title="Mentions légales"
        text="Informations obligatoires au Maroc. Les numéros d’immatriculation seront complétés avant commercialisation."
      />
      <article className="container-rb max-w-3xl space-y-8 py-16 text-sm leading-relaxed text-ink/75">
        <section>
          <h2 className="font-display text-xl font-semibold text-ink">Éditeur</h2>
          <p className="mt-2">
            Rappel Beauté — logiciel de gestion pour instituts de beauté.
            Forme juridique, capital social, siège : à compléter à
            l’immatriculation.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl font-semibold text-ink">ICE / RC / IF / CNSS</h2>
          <ul className="mt-2 space-y-1">
            <li>ICE : en cours d’attribution</li>
            <li>RC : en cours d’immatriculation</li>
            <li>Identifiant fiscal : en cours</li>
            <li>CNSS : en cours</li>
          </ul>
        </section>
        <section>
          <h2 className="font-display text-xl font-semibold text-ink">Directeur de publication</h2>
          <p className="mt-2">Le représentant légal de Rappel Beauté.</p>
        </section>
        <section>
          <h2 className="font-display text-xl font-semibold text-ink">Hébergeur</h2>
          <p className="mt-2">
            Vitrine V1.2 servie en local / SSG. L’hébergeur de production
            (nom, adresse, contact) sera indiqué ici avant mise en ligne sur
            www.rappelbeaute.ma.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl font-semibold text-ink">Contact</h2>
          <p className="mt-2">
            contact@rappelbeaute.ma — voir aussi la page{" "}
            <a href="/contact/" className="text-primary">
              Contact
            </a>
            .
          </p>
        </section>
      </article>
    </>
  );
}
