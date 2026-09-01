import type { Metadata } from "next";
import { PageHero } from "@/components/www/PageHero";
import { FAQ_ITEMS } from "@/lib/site";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Questions fréquentes sur Rappel Beauté : essai, WhatsApp, photos, plans, connexion.",
};

export default function FaqPage() {
  return (
    <>
      <PageHero
        eyebrow="FAQ"
        title="Les questions qu’on nous pose vraiment."
        text="Essai, WhatsApp, photos clientes, multi-sites, connexion unique."
      />
      <div className="container-rb max-w-3xl space-y-4 py-16">
        {FAQ_ITEMS.map((item) => (
          <details key={item.q} className="surface group p-5">
            <summary className="cursor-pointer font-display text-lg font-semibold">
              {item.q}
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-ink/70">{item.a}</p>
          </details>
        ))}
      </div>
    </>
  );
}
