import type { Metadata } from "next";
import { PageHero } from "@/components/www/PageHero";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "WhatsApp manuel pour instituts de beauté",
  description:
    "Rappels et confirmations WhatsApp sans bot : préparez, envoyez, marquez. Aucune API Business en V1.",
};

export default function WhatsappPage() {
  return (
    <>
      <PageHero
        eyebrow="WhatsApp V1.3"
        title="Le message est prêt. C’est vous qui envoyez."
        text="Aucun bot. Aucune API Business. Rappel Beauté prépare le texte, ouvre wa.me, vous validez l’envoi."
      />
      <article className="container-rb grid max-w-4xl gap-6 py-16 md:grid-cols-3">
        {[
          ["Préparez", "Confirmation, rappel, demande d’avis : le modèle se remplit tout seul dans la file « À envoyer »."],
          ["Envoyez", "Un clic ouvre WhatsApp avec le texte. Vous envoyez depuis le numéro de l’institut."],
          ["Marquez", "Statut SENT uniquement après votre geste. Pas de faux « lu » ou « répondu »."],
        ].map(([t, d]) => (
          <div key={t} className="surface p-6">
            <h2 className="font-display text-xl font-semibold">{t}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/65">{d}</p>
          </div>
        ))}
      </article>
    </>
  );
}
