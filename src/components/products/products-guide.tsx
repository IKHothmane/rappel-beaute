"use client";

import { PageGuide } from "@/components/services/guide-runner";
import { PRODUCTS_STEPS, PRODUCTS_TOUR_ATTR } from "@/components/products/products-guide-steps";

export type ProductsGuideProps = {
  canWrite: boolean;
  /** Le rôle ne voit pas les montants (valeur du stock, chiffre d'affaires) : texte alternatif des étapes concernées. */
  financeLocked: boolean;
  /** Ouvre (true) ou ferme (false) le formulaire de création en démonstration : aucune écriture. */
  onDemoChange: (open: boolean) => void;
};

const prepare = () => ({});

/** Bouton « Tutoriel » de la page Produits & Stock (présent dans les versions mobile et large). */
export function ProductsGuide({ canWrite, financeLocked, onDemoChange }: ProductsGuideProps) {
  return (
    <PageGuide
      lockId="products-guide"
      attr={PRODUCTS_TOUR_ATTR}
      rootTarget="prd-root"
      steps={PRODUCTS_STEPS}
      canWrite={canWrite}
      locked={financeLocked}
      prepare={prepare}
      onDemoChange={(demo) => onDemoChange(demo !== null)}
    />
  );
}
