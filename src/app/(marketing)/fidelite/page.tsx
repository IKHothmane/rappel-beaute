import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/www/Reveal";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Logiciel de fidélité pour institut de beauté",
  description:
    "Fidélisez les clientes de votre institut de beauté avec Rappel Beauty : programme de fidélité, suivi des avantages, historique et intégration avec les rendez-vous et les ventes.",
  alternates: {
    canonical: "/fidelite/",
  },
};

const SECTIONS = [
  {
    id: "programme",
    title: "Programme de fidélité",
    text: "L'institut active son programme et définit comment les points sont attribués. Les avantages prévus peuvent être une remise ou une prestation offerte.",
  },
  {
    id: "avantages",
    title: "Suivi des avantages",
    text: "Chaque cliente a un solde de points et un niveau. Elle peut utiliser ses points pour un avantage prévu par l'institut, lorsque le solde le permet.",
  },
  {
    id: "historique",
    title: "Historique de fidélité",
    text: "Les gains, les utilisations, les ajustements et les expirations restent rattachés à la cliente. L'historique ne se résume pas à un total.",
  },
  {
    id: "fiche",
    title: "Clientes et fidélité",
    text: "La fiche cliente montre le solde, le niveau et les derniers mouvements. Le statut fidélité se consulte au même endroit que l'historique des soins.",
  },
  {
    id: "rendez-vous",
    title: "Rendez-vous et prestations",
    text: "La fidélité suit l'activité réellement encaissée. Un rendez-vous annulé ou un absent ne crée pas de points tant qu'aucun paiement n'est enregistré.",
  },
  {
    id: "ventes",
    title: "Ventes et fidélité",
    text: "Les paiements des prestations et des produits vendus au comptoir alimentent les points, selon les règles du programme. Un remboursement retire les points correspondants.",
  },
  {
    id: "offres",
    title: "Cartes cadeaux et forfaits",
    text: "Les cartes cadeaux et les forfaits sont des outils à part : une carte a un solde utilisable au règlement, un forfait suit les séances restantes. Ils apparaissent sur la fiche, à côté du programme de points.",
  },
  {
    id: "institut",
    title: "Suivi côté institut",
    text: "Consultez les avantages, suivez leur utilisation et ajustez le programme : règle d'attribution, niveaux et récompenses actives.",
  },
  {
    id: "relation",
    title: "Une expérience plus personnalisée",
    text: "La fiche réunit visites, notes et fidélité. L'institut s'appuie sur ces informations pour suivre la relation avec chaque cliente.",
  },
] as const;

export default function FidelitePage() {
  return (
    <>
      <section className="border-b border-line bg-paper py-14 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <Reveal>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary sm:text-[11px]">
              Fidélité pour instituts de beauté au Maroc
            </p>
            <h1 className="mt-3 font-display text-3xl font-light leading-tight tracking-tight text-ink sm:text-5xl">
              Fidélisez vos clientes simplement
            </h1>
            <p className="mt-5 text-sm leading-relaxed text-ink/70 sm:text-lg">
              Un programme de points lié aux paiements, aux fiches clientes et aux ventes de
              l&apos;institut.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/essai/"
                className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark"
              >
                Essayer gratuitement 7 jours
              </Link>
              <Link
                href="/fonctionnalites/"
                className="inline-flex items-center justify-center rounded-full border border-line bg-white px-6 py-3 text-sm font-semibold text-ink transition hover:border-primary/40"
              >
                Voir toutes les fonctionnalités
              </Link>
            </div>
            <p className="mt-4 text-xs text-ink/55 sm:text-sm">
              Sans engagement · 7 jours gratuits · Sans carte bancaire
            </p>
          </Reveal>
        </div>
      </section>

      <div className="mx-auto max-w-3xl space-y-14 px-4 py-14 sm:px-6 sm:py-20">
        {SECTIONS.map((section, index) => (
          <Reveal key={section.id}>
            <section
              id={section.id}
              className={`scroll-mt-28 ${index === 0 ? "" : "border-t border-line pt-14"}`}
            >
              <h2 className="font-display text-2xl font-light text-ink sm:text-3xl">{section.title}</h2>
              <p className="mt-4 text-sm leading-relaxed text-ink/70 sm:text-base">{section.text}</p>
              {section.id === "fiche" ? (
                <p className="mt-4">
                  <Link
                    href="/gestion-clientes/"
                    className="text-sm font-semibold text-primary hover:text-primary-dark"
                  >
                    Découvrir la gestion des clientes
                  </Link>
                </p>
              ) : null}
              {section.id === "ventes" ? (
                <p className="mt-4">
                  <Link
                    href="/caisse/"
                    className="text-sm font-semibold text-primary hover:text-primary-dark"
                  >
                    Découvrir la gestion de la caisse
                  </Link>
                </p>
              ) : null}
            </section>
          </Reveal>
        ))}
      </div>

      <section className="bg-institut py-14 text-center text-white sm:py-20">
        <div className="mx-auto max-w-2xl px-4">
          <h2 className="font-display text-2xl font-light sm:text-4xl">
            Essayez Rappel Beauty pendant 7 jours
          </h2>
          <p className="mt-4 text-sm text-white/75 sm:text-base">
            Sans engagement et sans carte bancaire.
          </p>
          <Link
            href="/essai/"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark"
          >
            Essayer gratuitement 7 jours
          </Link>
        </div>
      </section>
    </>
  );
}
