import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/www/PageHero";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Ressources",
  description: "FAQ, guides et pages métier Rappel Beauté pour instituts de beauté.",
};

const LINKS = [
  { href: "/faq/", title: "FAQ", text: "Essai, WhatsApp, photos, plans, connexion." },
  { href: "/fonctionnalites/", title: "Fonctionnalités", text: "Les 6 modules, avec ancres." },
  { href: "/whatsapp/", title: "WhatsApp manuel", text: "Préparez, envoyez, marquez. Aucun bot." },
  { href: "/blog/", title: "Blog", text: "Articles à venir — placeholder V1." },
  { href: "/contact/", title: "Contact", text: "Une question hors formulaire d’essai." },
];

export default function RessourcesPage() {
  return (
    <>
      <PageHero
        eyebrow="Ressources"
        title="Le centre d’aide viendra. Les pages utiles sont déjà là."
        text="Blog et documentation API : placeholders V1. En attendant, FAQ et pages métier."
      />
      <div className="container-rb grid gap-4 py-16 sm:grid-cols-2">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="surface p-6 transition hover:border-primary/30">
            <h2 className="font-display text-xl font-semibold">{l.title}</h2>
            <p className="mt-2 text-sm text-ink/65">{l.text}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
