import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/www/Reveal";
import { SeoCloser } from "@/components/www/SeoCloser";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Logiciel de caisse pour institut de beauté",
  description:
    "Gérez la caisse et les ventes de votre institut de beauté avec Rappel Beauty : encaissements, paiements, dépenses, ventes de produits, facturation et suivi financier.",
  alternates: {
    canonical: "/caisse/",
  },
};

const SECTIONS = [
  {
    id: "caisse",
    title: "Caisse",
    text: "Ouvrez la caisse, enregistrez les encaissements de la journée, les entrées et les sorties, puis clôturez la session. Le suivi reste attaché à cette journée.",
  },
  {
    id: "ventes",
    title: "Ventes",
    text: "Une vente peut regrouper une prestation et des produits. Le total reprend ce qui a été encaissé, sans mélanger le soin et le comptoir dans deux outils.",
  },
  {
    id: "paiements",
    title: "Paiements",
    text: "Les règlements se font à l'institut : espèces, carte, virement, chèque ou carte cadeau. Chaque paiement, acompte ou remboursement reste dans l'historique.",
  },
  {
    id: "depenses",
    title: "Dépenses",
    text: "Enregistrez les dépenses de l'institut, par exemple le loyer, les charges ou un achat, et suivez les sorties. Une dépense en espèces est aussi visible dans la caisse.",
  },
  {
    id: "facturation",
    title: "Facturation",
    text: "Émettez les factures liées aux opérations de l'institut et retrouvez-les dans l'historique. Le numéro est attribué par le logiciel.",
  },
  {
    id: "pos",
    title: "Vente de produits",
    text: "Au point de vente, choisissez les produits, constituez le panier et encaissez. La quantité vendue est retirée du stock.",
  },
  {
    id: "commissions",
    title: "Commissions",
    text: "Les prestations terminées peuvent être rattachées à l'employée concernée. L'institut suit les commissions dues, sans les compter sur un rendez-vous annulé ou un absent.",
  },
  {
    id: "suivi",
    title: "Suivi financier",
    text: "L'application réunit le chiffre d'affaires, les paiements et les dépenses de l'institut. Les indicateurs reprennent les opérations enregistrées, pas une estimation à part.",
  },
  {
    id: "institut",
    title: "Côté institut",
    text: "Centralisez les encaissements, relisez les ventes et gardez une vue des opérations financières au même endroit que l'agenda et les clientes.",
  },
] as const;

export default function CaissePage() {
  return (
    <>
      <section className="border-b border-line bg-paper py-14 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <Reveal>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary sm:text-[11px]">
              Caisse pour instituts de beauté au Maroc
            </p>
            <h1 className="mt-3 font-display text-3xl font-light leading-tight tracking-tight text-ink sm:text-5xl">
              Caisse pour institut de beauté
            </h1>
            <p className="mt-5 text-sm leading-relaxed text-ink/70 sm:text-lg">
              Encaissements, paiements, dépenses, factures et ventes de produits, dans le logiciel
              de l&apos;institut.
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
              {section.id === "pos" ? (
                <p className="mt-4">
                  <Link
                    href="/gestion-stock/"
                    className="text-sm font-semibold text-primary hover:text-primary-dark"
                  >
                    Découvrir la gestion du stock
                  </Link>
                </p>
              ) : null}
            </section>
          </Reveal>
        ))}
      </div>

      <SeoCloser
        problem="Le soin est noté sur l'agenda, le produit vendu sur un ticket à part, et la dépense du jour sur un papier. Le chiffre de la journée ne se reconstitue pas."
        solution="La caisse de Rappel Beauty réunit encaissements, ventes, dépenses et factures de l'institut. Les clientes paient à l'institut, pas en ligne."
        useCase="En fin de journée, la responsable clôture la caisse : prestations encaissées, produits vendus et dépenses en espèces sont dans la même session."
        faqs={[
          {
            q: "Les clientes paient-elles sur le site ?",
            a: "Non. Le règlement se fait à l'institut : espèces, carte, virement, chèque ou carte cadeau.",
          },
          {
            q: "Une vente de produit met-elle à jour le stock ?",
            a: "Oui. La quantité vendue au comptoir est retirée du stock.",
          },
        ]}
      />
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
