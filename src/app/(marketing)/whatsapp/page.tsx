import { PageHero } from "@/components/www/PageHero";
import { marketingPageMetadata } from "@/lib/seo";

export const dynamic = "force-static";

export const metadata = marketingPageMetadata({
  title: "WhatsApp pour instituts de beauté · Rappel Beauty",
  description:
    "Rappels et confirmations WhatsApp envoyés depuis le numéro de l'institut.",
  canonical: "/whatsapp/",
});

export default function WhatsappPage() {
  return (
    <>
      <PageHero
        eyebrow="WhatsApp"
        title="Le message part depuis le numéro de l’institut."
        text="Rappel Beauté prépare le texte. Un clic sur Envoyer le transmet par WhatsApp, depuis le numéro enregistré pour cet institut."
      />
      <article className="container-rb grid max-w-4xl gap-6 py-16 md:grid-cols-3">
        {[
          ["Préparez", "Confirmation, rappel, demande d’avis : le modèle se remplit dans la file « À envoyer »."],
          ["Envoyez", "Un clic sur Envoyer transmet le message. Il part du numéro WhatsApp de l’institut."],
          ["Suivez", "Le message passe en envoyé une fois l’envoi accepté."],
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
