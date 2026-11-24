"use client";

import { PageGuide } from "@/components/services/guide-runner";
import { RESOURCES_STEPS, RESOURCES_TOUR_ATTR, RESOURCE_SERVICES_FLAG } from "@/components/resources/resources-guide-steps";

export type ResourcesGuideProps = {
  canWrite: boolean;
  /** Au moins une prestation active peut être associée à une ressource (champ « Prestations associées »). */
  hasServiceOptions: boolean;
  /** Ouvre (true) ou ferme (false) le formulaire de création en démonstration. */
  onDemoChange: (open: boolean) => void;
  /** Visite active (dès la prise du verrou, jusqu'à la fin) : la page refuse alors toute écriture, sélection et tiroir réel. */
  onActiveChange?: (active: boolean) => void;
  /** Prestations associables, indicateurs et rendez-vous chargés : la visite les attend quelques secondes au plus, sans bloquer. */
  dataReady?: boolean;
};

/** Bouton « Tutoriel » de la page Ressources (présent dans les versions mobile et large). */
export function ResourcesGuide({ canWrite, hasServiceOptions, onDemoChange, onActiveChange, dataReady }: ResourcesGuideProps) {
  return (
    <PageGuide
      lockId="resources-guide"
      attr={RESOURCES_TOUR_ATTR}
      rootTarget="res-root"
      steps={RESOURCES_STEPS}
      canWrite={canWrite}
      prepare={() => ({ [RESOURCE_SERVICES_FLAG]: hasServiceOptions })}
      onDemoChange={(demo) => onDemoChange(demo !== null)}
      onActiveChange={onActiveChange}
      ready={dataReady}
    />
  );
}
