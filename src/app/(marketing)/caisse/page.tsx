import { marketingPageMetadata } from "@/lib/seo";
import Link from "next/link";
import { Reveal } from "@/components/www/Reveal";
import { ReceiptView } from "@/components/www/ProductViews";
import { SeoCloser } from "@/components/www/SeoCloser";
import { PUBLIC_OFFER } from "@/lib/site";

export const dynamic = "force-static";

export const metadata = marketingPageMetadata({
  title: "Logiciel de caisse pour institut de beauté · Rappel Beauty",
  description:
    "Caisse et ventes de votre institut : encaissements, paiements, dépenses, produits et suivi financier.",
  canonical: "/caisse/",
});

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
      <section className="border-b border-line bg-paper py-[var(--vt-space-3p5rem)] sm:py-[var(--vt-space-5rem)]">
        <div className="mx-auto max-w-[var(--vt-size-48rem)] px-[var(--vt-space-1rem)] text-center sm:px-[var(--vt-space-1p5rem)]">
          <Reveal>
            <p className="text-[length:var(--vt-text-10px)] font-bold uppercase tracking-[0.18em] text-primary sm:text-[length:var(--vt-text-11px)]">
              Caisse pour instituts de beauté au Maroc
            </p>
            <h1 className="mt-[var(--vt-space-0p75rem)] font-display text-[length:var(--vt-fs-h1)] leading-[var(--vt-lh-h1)] tracking-tight text-ink">
              Caisse pour institut de beauté
            </h1>
            <p className="mt-[var(--vt-space-1p25rem)] text-[length:var(--vt-fs-lead)] leading-[var(--vt-lh-lead)] text-ink/70">
              Encaissements, paiements, dépenses, factures et ventes de produits, dans le logiciel
              de l&apos;institut.
            </p>
            <div className="mt-[var(--vt-space-2rem)] flex flex-col items-center justify-center gap-[var(--vt-space-0p75rem)] sm:flex-row">
              <Link
                href="/professionnel/"
                className="inline-flex items-center justify-center rounded-lg bg-primary px-[var(--vt-space-1p5rem)] py-[var(--vt-space-0p75rem)] text-[length:var(--vt-text-0p875rem)]/[var(--vt-line-1p25rem)] font-semibold text-white shadow-sm transition hover:bg-primary-dark"
              >
                Essayer gratuitement {PUBLIC_OFFER.trialDays} jours
              </Link>
              <Link
                href="/fonctionnalites/"
                className="inline-flex items-center justify-center rounded-lg border border-line bg-white px-[var(--vt-space-1p5rem)] py-[var(--vt-space-0p75rem)] text-[length:var(--vt-text-0p875rem)]/[var(--vt-line-1p25rem)] font-semibold text-ink transition hover:border-primary/40"
              >
                Voir toutes les fonctionnalités
              </Link>
            </div>
            <p className="mt-[var(--vt-space-1rem)] text-[length:var(--vt-text-0p75rem)]/[var(--vt-line-1rem)] text-ink/55 sm:text-[length:var(--vt-text-0p875rem)]/[var(--vt-line-1p25rem)]">
              Sans engagement · {PUBLIC_OFFER.trialDays} jours gratuits · Sans carte bancaire
            </p>
          </Reveal>
        </div>
      </section>
      <section className="bg-institut px-[var(--vt-space-1rem)] py-[var(--vt-space-3rem)] sm:px-[var(--vt-space-1p5rem)]">
        <ReceiptView />
      </section>

      <div className="mx-auto max-w-[var(--vt-size-48rem)] space-y-[var(--vt-space-2rem)] px-[var(--vt-space-1rem)] py-[var(--vt-space-3rem)] sm:space-y-[var(--vt-space-3rem)] sm:px-[var(--vt-space-1p5rem)] sm:py-[var(--vt-space-4rem)]">
        {SECTIONS.map((section, index) => (
          <Reveal key={section.id}>
            <section
              id={section.id}
              className={`scroll-mt-28 ${index === 0 ? "" : "border-t border-line pt-[var(--vt-space-2rem)] sm:pt-[var(--vt-space-3rem)]"}`}
            >
              <h2 className="font-display text-[length:var(--vt-text-1p5rem)]/[var(--vt-line-2rem)] font-light text-ink sm:text-[length:var(--vt-text-1p875rem)]/[var(--vt-line-2p25rem)]">
                {section.title}
              </h2>
              <p className="mt-[var(--vt-space-1rem)] text-[length:var(--vt-text-0p875rem)]/[var(--vt-line-1p25rem)] leading-[var(--vt-leading-1p625)] text-ink/70 sm:text-[length:var(--vt-text-1rem)]/[var(--vt-line-1p5rem)]">
                {section.text}
              </p>
              {section.id === "pos" ? (
                <p className="mt-[var(--vt-space-1rem)]">
                  <Link
                    href="/gestion-stock/"
                    className="text-[length:var(--vt-text-0p875rem)]/[var(--vt-line-1p25rem)] font-semibold text-primary hover:text-primary-dark"
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
      <section className="vt-on-dark bg-institut py-[var(--vt-space-3p5rem)] text-center text-white sm:py-[var(--vt-space-5rem)]">
        <div className="mx-auto max-w-[var(--vt-size-42rem)] px-[var(--vt-space-1rem)]">
          <h2 className="font-display text-[length:var(--vt-fs-h2)] leading-[var(--vt-lh-h2)]">
            Essayez Rappel Beauty pendant {PUBLIC_OFFER.trialDays} jours
          </h2>
          <p className="mt-[var(--vt-space-1rem)] text-[length:var(--vt-text-0p875rem)]/[var(--vt-line-1p25rem)] text-white/75 sm:text-[length:var(--vt-text-1rem)]/[var(--vt-line-1p5rem)]">
            Sans engagement et sans carte bancaire.
          </p>
          <Link
            href="/professionnel/"
            className="mt-[var(--vt-space-1p5rem)] inline-flex items-center justify-center rounded-lg bg-primary px-[var(--vt-space-1p5rem)] py-[var(--vt-space-0p75rem)] text-[length:var(--vt-text-0p875rem)]/[var(--vt-line-1p25rem)] font-semibold text-white transition hover:bg-primary-dark"
          >
            Essayer gratuitement {PUBLIC_OFFER.trialDays} jours
          </Link>
        </div>
      </section>
    </>
  );
}
