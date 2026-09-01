import type { Metadata } from "next";
import { PageHero } from "@/components/www/PageHero";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Traitement des données personnelles Rappel Beauté — loi 09-08, CNDP. Aucune photo cliente en V1.",
};

export default function ConfidentialitePage() {
  return (
    <>
      <PageHero
        eyebrow="Loi 09-08"
        title="Politique de confidentialité"
        text="Rappel Beauté traite des données d’identification pour les demandes de démo et d’essai. Les données métier d’institut n’apparaissent pas sur cette vitrine."
      />
      <article className="container-rb max-w-3xl space-y-8 py-16 text-sm leading-relaxed text-ink/75">
        <section>
          <h2 className="font-display text-xl font-semibold text-ink">Responsable de traitement</h2>
          <p className="mt-2">
            Rappel Beauté, contact@rappelbeaute.ma. Déclaration CNDP : à déposer
            avant le traitement opérationnel des fiches clientes en production.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl font-semibold text-ink">Données collectées sur la vitrine</h2>
          <p className="mt-2">
            Formulaires démo / essai / contact : nom, institut, ville, téléphone,
            e-mail, message, plan souhaité. Finalité : recontact et activation
            d’accès sous 24 h. Base : mesures précontractuelles.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl font-semibold text-ink">Photos clientes</h2>
          <p className="mt-2">
            Aucune photo cliente n’est collectée ni stockée en V1, ni sur la
            vitrine, ni dans l’application institut.
          </p>
        </section>
        <section id="cookies">
          <h2 className="font-display text-xl font-semibold text-ink">Cookies</h2>
          <p className="mt-2">
            La politique cookies est distincte de cette page et sera publiée
            avant production (mesure d’audience, session de connexion). En V1.2
            vitrine locale : cookies techniques de développement uniquement
            (sélecteur de domaine <code className="font-mono text-xs">__host</code>
            ).
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl font-semibold text-ink">Vos droits</h2>
          <p className="mt-2">
            Accès, rectification, opposition, suppression dans les limites de la
            loi 09-08. Demande : contact@rappelbeaute.ma. Recours possible auprès
            de la CNDP.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl font-semibold text-ink">Durée et isolation</h2>
          <p className="mt-2">
            Les leads vitrine ne sont pas mélangés aux données métier. En
            application, chaque institut est isolé (organizationId + RLS).
          </p>
        </section>
      </article>
    </>
  );
}
