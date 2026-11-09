import type { Metadata } from "next";
import Link from "next/link";
import { marketingPageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

export const dynamic = "force-static";

export const metadata: Metadata = marketingPageMetadata({
  title: "À propos de Rappel Beauty · Logiciel institut de beauté au Maroc",
  description:
    "Rappel Beauty est le logiciel SaaS de gestion pour les instituts de beauté au Maroc : rendez-vous, clientes, équipe, stock, caisse et réservation en ligne.",
  canonical: "/a-propos/",
});

const WA_HREF = `https://wa.me/${SITE.phoneInternational.replace(/\D/g, "")}`;

const STORY = [
  {
    title: "Du cahier au logiciel",
    paragraphs: [
      "Trop de gérantes d'instituts au Maroc tiennent encore l'agenda sur des cahiers volants, recalculent leur caisse le soir à la calculette et relancent leurs clientes depuis leur numéro WhatsApp personnel.",
      "Rappel Beauty réunit ces gestes dans un seul logiciel, avec une caisse en dirhams, utilisable au quotidien dans l'institut.",
    ],
  },
  {
    title: "Une journée lisible",
    paragraphs: [
      "La gérante voit les rendez-vous en cours, l'équipe, ce qui a été encaissé et les produits dont le stock baisse.",
      "Les fiches clientes restent textuelles, sans photo en V1. Le logiciel est conçu pour respecter la Loi 09-08 (CNDP).",
    ],
  },
  {
    title: "Pas de promesse chiffrée",
    paragraphs: [
      "Nous décrivons ce que l'institut peut faire : rendez-vous, clientes, équipe, stock, caisse, fidélité et réservation en ligne.",
      "WhatsApp reste assisté. Le logiciel prépare le message et une personne de l'institut l'envoie.",
    ],
  },
] as const;

const PRINCIPLES = [
  {
    title: "Une caisse en dirhams",
    text: "Espèces, carte et acomptes sont ventilés. Chaque prestation correspond à un encaissement que vous pouvez vérifier.",
  },
  {
    title: "Le ton reste le vôtre",
    text: "Le logiciel pré-remplit les rappels WhatsApp. Vous les relisez et gardez la façon de parler de votre institut.",
  },
  {
    title: "Vos données restent les vôtres",
    text: "Fiches, numéros et historiques appartiennent à l'institut. Aucune revente de données.",
  },
] as const;

export default function AProposPage() {
  return (
    <>
      <section className="border-b border-ink/15 bg-paper">
        <div className="container-rb py-14 md:py-24">
          <h1 className="max-w-4xl font-display text-4xl font-light leading-[1.08] tracking-tight text-ink sm:text-6xl">
            Rappel Beauty remplace le cahier, la calculette et les messages envoyés le soir.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink/75">
            {SITE.name} est un logiciel de gestion conçu pour les instituts de beauté au Maroc :
            rendez-vous, clientes, équipe, stock, caisse et réservation en ligne.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/professionnel/" className="btn-primary">
              Demander une démo gratuite
            </Link>
            <a href="#notre-histoire" className="btn-ghost">
              Notre histoire
            </a>
          </div>
        </div>
      </section>

      <section id="notre-histoire" className="container-rb scroll-mt-24 py-16 md:py-24">
        {STORY.map((block) => (
          <article
            key={block.title}
            className="grid gap-4 border-t border-ink/15 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16"
          >
            <h2 className="font-display text-3xl font-light tracking-tight text-ink">{block.title}</h2>
            <div className="space-y-4 text-lg leading-relaxed text-ink/75">
              {block.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="border-y border-ink/15 bg-white">
        <div className="container-rb py-16 md:py-24">
          <h2 className="font-display text-3xl font-light tracking-tight text-ink sm:text-[2.75rem]">
            Ce qui guide le produit
          </h2>
          <dl className="mt-10 grid gap-10 md:grid-cols-3">
            {PRINCIPLES.map((principle) => (
              <div key={principle.title}>
                <dt className="font-semibold text-ink">{principle.title}</dt>
                <dd className="mt-2 leading-relaxed text-ink/70">{principle.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section id="demande-demo" className="bg-primary text-white">
        <div className="container-rb flex flex-col gap-8 py-16 md:flex-row md:items-end md:justify-between md:py-20">
          <h2 className="max-w-2xl font-display text-4xl font-light leading-tight tracking-tight sm:text-5xl">
            Testez-le quinze jours dans votre institut.
          </h2>
          <div className="flex shrink-0 flex-wrap gap-3">
            <Link
              href="/professionnel/"
              className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-3 text-sm font-semibold text-ink hover:bg-paper"
            >
              Démarrer l&apos;essai
            </Link>
            <a
              href={WA_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-lg border border-white px-5 py-3 text-sm font-semibold text-white"
            >
              Échanger sur WhatsApp
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
