import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/www/PageHero";
import { FEATURES } from "@/lib/site";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Fonctionnalités",
  description:
    "Agenda, clientes, stock, caisse, fidélité et analytics pour instituts de beauté au Maroc.",
};

const DETAILS = [
  {
    id: "agenda",
    title: "Agenda intelligent",
    lead: "Le planning tient la journée — sans double-réservation.",
    points: [
      "Vue jour / semaine par employée et par cabine.",
      "Contrainte EXCLUDE PostgreSQL : le chevauchement est refusé en base.",
      "Statuts clairs : confirmé, en cours, terminé, annulé, no-show.",
      "Rappel WhatsApp préparé, envoi à la main.",
    ],
  },
  {
    id: "clientes",
    title: "Gestion clientes",
    lead: "La mémoire de l’institut, sans photos en V1.",
    points: [
      "Fiche : coordonnées, historique RDV, notes internes.",
      "Aucune photo cliente stockée en V1.",
      "Fidélité et forfaits sur la même fiche.",
      "Recherche rapide au secrétariat.",
    ],
  },
  {
    id: "stock",
    title: "Stock & Achats",
    lead: "Un ledger, pas un chiffre qu’on écrase.",
    points: [
      "Mouvements append-only : achat, vente, usage, perte.",
      "Le stock affiché est un cache recalculable.",
      "Fournisseurs, commandes, alertes de rupture.",
      "Consommation liée à la prestation terminée.",
    ],
  },
  {
    id: "caisse",
    title: "Caisse & Paiements",
    lead: "Chaque dirham a une trace. Rien n’est réécrit.",
    points: [
      "Montants en Decimal — jamais de Float.",
      "Paiement = historique immuable. Correction via remboursement.",
      "Tickets / reçus, clôture de caisse.",
      "Numérotation des factures côté serveur, pas au navigateur.",
    ],
  },
  {
    id: "fidelite",
    title: "Fidélité & Marketing",
    lead: "Faire revenir sans spammer, sans bot.",
    points: [
      "Points, forfaits, promotions, cartes cadeaux.",
      "Campagnes : le message est préparé, vous envoyez.",
      "Aucun envoi WhatsApp automatique en V1.",
      "Avis clientes demandés après la prestation — toujours à la main.",
    ],
  },
  {
    id: "analytics",
    title: "Analytics & Rapports",
    lead: "Le CA du jour, le remplissage, les services qui portent.",
    points: [
      "Tableau de bord du matin pour la patronne.",
      "Rapports exportables (rôle ACCOUNTANT inclus).",
      "Multi-sites consolidé sur Premium.",
      "Les chiffres suivent la caisse, pas un tableur parallèle.",
    ],
  },
] as const;

export default function FonctionnalitesPage() {
  return (
    <>
      <PageHero
        eyebrow="Fonctionnalités"
        title="Six modules, un institut qui tient."
        text="Chaque bloc ci-dessous a une ancre. Partagez le lien à votre équipe."
      />
      <div className="container-rb flex flex-wrap gap-2 py-8">
        {FEATURES.map((f) => (
          <a
            key={f.id}
            href={`#${f.id}`}
            className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink/70 hover:border-primary/40 hover:text-primary"
          >
            {f.title}
          </a>
        ))}
      </div>
      <div className="container-rb space-y-16 pb-24">
        {DETAILS.map((block) => (
          <section key={block.id} id={block.id} className="scroll-mt-28">
            <h2 className="font-display text-2xl font-semibold md:text-3xl">{block.title}</h2>
            <p className="mt-2 text-ink/65">{block.lead}</p>
            <ul className="mt-6 space-y-2">
              {block.points.map((p) => (
                <li key={p} className="text-sm leading-relaxed text-ink/80">
                  {p}
                </li>
              ))}
            </ul>
            <p className="mt-4">
              <Link href="/demo/" className="text-sm font-semibold text-primary">
                Voir dans une démo →
              </Link>
            </p>
          </section>
        ))}
      </div>
    </>
  );
}
