import type { Metadata } from "next";
import { ContactForm } from "@/components/www/ContactForm";
import { PageHero } from "@/components/www/PageHero";
import { SITE } from "@/lib/site";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contacter Rappel Beauté pour une démo, un essai ou une question.",
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Écrivez-nous. On répond aux patronnes."
        text="Démo, essai, partenariat presse. Pas de chatbot."
      />
      <div className="container-rb grid gap-10 py-16 md:grid-cols-[1fr_1.2fr]">
        <aside className="space-y-4 text-sm">
          <p>
            <span className="block font-mono text-[10px] uppercase tracking-widest text-ink/40">
              E-mail
            </span>
            <a href={`mailto:${SITE.email}`} className="mt-1 text-primary">
              {SITE.email}
            </a>
          </p>
          <p>
            <span className="block font-mono text-[10px] uppercase tracking-widest text-ink/40">
              Téléphone
            </span>
            <span className="mt-1 block">{SITE.phone}</span>
          </p>
          <p className="text-ink/60">
            Maroc · français · MAD. Pour une démo, le formulaire dédié est plus
            rapide.
          </p>
        </aside>
        <ContactForm />
      </div>
    </>
  );
}
