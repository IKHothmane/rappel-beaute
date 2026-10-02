import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/www/Reveal";
import { SeoCloser } from "@/components/www/SeoCloser";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Logiciel de gestion de stock pour institut de beauté",
  description:
    "Gérez les produits et le stock de votre institut de beauté avec Rappel Beauty : produits, fournisseurs, achats, mouvements de stock, alertes et suivi des quantités.",
  alternates: {
    canonical: "/gestion-stock/",
  },
};

const SECTIONS = [
  {
    id: "produits",
    title: "Produits",
    text: "Tenez le catalogue de l'institut : nom, référence, marque, catégorie et unité. Chaque produit a un prix d'achat et, s'il est vendu, un prix de vente.",
  },
  {
    id: "quantites",
    title: "Quantités en stock",
    text: "Voyez le niveau de chaque produit, le seuil minimum et les entrées comme les sorties. La quantité affichée suit les mouvements, elle n'est pas un chiffre saisi à part.",
  },
  {
    id: "achats",
    title: "Achats",
    text: "Enregistrez les fournisseurs, préparez une commande, puis réceptionnez les produits en totalité ou en partie. La réception alimente le stock.",
  },
  {
    id: "mouvements",
    title: "Mouvements de stock",
    text: "Chaque changement laisse une trace : achat, vente, retour, ajustement ou consommation. Les pertes, la casse et les produits expirés sont aussi des mouvements.",
  },
  {
    id: "alertes",
    title: "Alertes",
    text: "Repérez le stock faible, la rupture et les produits dont la date approche ou est dépassée. L'institut voit ce qu'il faut surveiller avant de manquer en cabine.",
  },
  {
    id: "fournisseurs",
    title: "Fournisseurs",
    text: "Gardez le contact du fournisseur, les produits qu'il fournit et l'historique de ses achats, avec le prix d'achat convenu.",
  },
  {
    id: "ventes",
    title: "Ventes et stock",
    text: "Une vente au point de vente retire la quantité vendue du stock. Le comptoir et le stock restent sur les mêmes produits.",
  },
  {
    id: "prestations",
    title: "Produits utilisés pour les prestations",
    text: "Les produits peuvent être liés à un service. Lorsqu'une prestation consomme un produit, le logiciel enregistre une consommation rattachée au rendez-vous.",
  },
  {
    id: "institut",
    title: "Côté institut",
    text: "Sachez ce qui est disponible, relisez les mouvements et anticipez le réapprovisionnement à partir des alertes et des commandes en cours.",
  },
] as const;

export default function GestionStockPage() {
  return (
    <>
      <section className="border-b border-line bg-paper py-14 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <Reveal>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary sm:text-[11px]">
              Stock pour instituts de beauté au Maroc
            </p>
            <h1 className="mt-3 font-display text-3xl font-light leading-tight tracking-tight text-ink sm:text-5xl">
              Gestion de stock pour institut de beauté
            </h1>
            <p className="mt-5 text-sm leading-relaxed text-ink/70 sm:text-lg">
              Produits, fournisseurs, achats, mouvements et alertes, dans le logiciel de
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

      <SeoCloser
        problem="Les crèmes partent en cabine et au comptoir. Le soir, le stock du fichier ne correspond plus à l'étagère, et personne ne sait quelle prestation a consommé le produit."
        solution="Chaque mouvement est écrit : achat, usage en soin, vente, perte. Le niveau affiché se recalcule. Une vente au comptoir retire la quantité."
        useCase="Après un soin du visage, la quantité utilisée est rattachée à la prestation. Le flacon suivant est commandé quand le seuil d'alerte est atteint, pas quand l'étagère est vide."
        faqs={[
          {
            q: "Le stock se met-il à jour quand on vend un produit ?",
            a: "Oui. La vente au point de vente retire la quantité du stock.",
          },
          {
            q: "Peut-on suivre ce qui est utilisé en cabine ?",
            a: "Oui. L'usage pendant une prestation est un mouvement, distinct de la vente au comptoir.",
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
