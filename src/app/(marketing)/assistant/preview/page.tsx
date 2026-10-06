import Script from "next/script";
import { ensurePreviewWidget } from "@/lib/db/assistant-session";

export const dynamic = "force-dynamic";

export default async function AssistantPreviewPage() {
  await ensurePreviewWidget();
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-serif text-3xl text-ink">Aperçu du widget</h1>
      <p className="mt-4 text-sm leading-6 text-ink/70">
        Cette page charge le script public. L&apos;assistant s&apos;ouvre en bas à droite, après
        vérification du domaine. Le catalogue de l&apos;institut s&apos;affiche dans le widget.
        Le rendez-vous est proposé dans le widget, puis enregistré seulement après confirmation.
        Une phrase comme « je veux une manucure lundi à 9h » est interprétée, puis traitée par les mêmes outils.
      </p>
      <Script data-public-id="pub_preview" src="/assistant.js" strategy="afterInteractive" />
    </main>
  );
}
