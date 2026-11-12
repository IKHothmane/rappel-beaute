import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/www/PageHero";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Ressources",
  description: "FAQ, guides et pages métier Rappel Beauté pour instituts de beauté.",
  robots: { index: false, follow: true },
};

const LINKS = [
  { href: "/faq/", title: "FAQ", text: "Essai, WhatsApp, photos, plans, connexion." },
  {
    href: "/fonctionnalites/",
    title: "Fonctionnalités",
    text: "Tout ce que le logiciel fait pour votre institut.",
  },
  {
    href: "/whatsapp/",
    title: "WhatsApp",
    text: "Le message part depuis le numéro de l’institut.",
  },
  { href: "/contact/", title: "Contact", text: "Une question hors formulaire d’essai." },
];

export default function RessourcesPage() {
  return (
    <>
      <PageHero
        eyebrow="Ressources"
        title="Les réponses à vos questions, au même endroit."
        text="FAQ, fonctionnalités, WhatsApp : retrouvez ici l’essentiel pour bien démarrer."
      />
      <div className="container-rb grid gap-[var(--vt-space-1rem)] py-[var(--vt-space-4rem)] sm:grid-cols-2">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="surface p-[var(--vt-space-1p5rem)] transition hover:border-primary/30"
          >
            <h2 className="font-display text-[length:var(--vt-text-1p25rem)]/[var(--vt-line-1p75rem)] font-semibold">{l.title}</h2>
            <p className="mt-[var(--vt-size-0p5rem)] text-[length:var(--vt-text-0p875rem)]/[var(--vt-line-1p25rem)] text-ink/65">{l.text}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
