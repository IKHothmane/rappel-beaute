"use client";

import { PageGuide } from "@/components/services/guide-runner";
import { SERVICES_STEPS, SERVICES_TOUR_ATTR, SERVICE_FORM_FLAG } from "@/components/services/services-guide-steps";

export type ServicesGuideProps = {
  canWrite: boolean;
  /** Charge les options du formulaire (lecture seule). Renvoie faux si le formulaire ne peut pas être présenté. */
  prepareForm: () => Promise<boolean>;
  /** Ouvre (true) ou ferme (false) le formulaire de création en démonstration. */
  onDemoChange: (open: boolean) => void;
  /** Visite active (dès la prise du verrou, jusqu'à la fin) : la page refuse alors toute écriture et tout tiroir réel. */
  onActiveChange?: (active: boolean) => void;
  /** Analytique du mois chargée : la visite l'attend quelques secondes au plus, sans bloquer. */
  dataReady?: boolean;
};

/** Bouton « Tutoriel » de la page Services (présent dans les versions mobile et large). */
export function ServicesGuide({ canWrite, prepareForm, onDemoChange, onActiveChange, dataReady }: ServicesGuideProps) {
  return (
    <PageGuide
      lockId="services-guide"
      attr={SERVICES_TOUR_ATTR}
      rootTarget="svc-root"
      steps={SERVICES_STEPS}
      canWrite={canWrite}
      prepare={async () => ({ [SERVICE_FORM_FLAG]: await prepareForm() })}
      onDemoChange={(demo) => onDemoChange(demo !== null)}
      onActiveChange={onActiveChange}
      ready={dataReady}
    />
  );
}
