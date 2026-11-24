import type { TutorialProgress, TutorialStepId } from "./api";

export type TourStepId = Exclude<TutorialStepId, "welcome">;

export type TourStep = {
  id: TourStepId;
  /** Route complète (avec slash final) vers laquelle router.push navigue. */
  route: string;
  /** Chemin normalisé (sans /domains/app, avec slash final) pour savoir si la page est déjà affichée. */
  pathname: string;
  /** Libellé du menu, repris dans la bulle de navigation. */
  navLabel: string;
  /** data-tour du lien de la sidebar (affiché seulement à partir de lg). */
  navTarget: string;
  /** Sélecteurs CSS de la cible sur la page ; le premier visible est surligné (les suivants servent de repli). */
  targets: string[];
  /** Texte de la bulle quand seule une cible de repli (et non la première) est affichée. */
  fallbackDescription?: string;
  /** Libellés de la page « Configuration de l’institut » (une seule source avec le parcours). */
  checklist: { label: string; hint: string; cta: string };
  /** Le forfait doit activer au moins une de ces clés de navigation (même logique que la sidebar). */
  planKeys: string[];
  title: string;
  description: string;
  navDescription: string;
  successText: string;
  /** Condition de réussite calculée depuis la progression métier. */
  done: (progress: TutorialProgress) => boolean;
  /** Étape facultative : « Suivant » suffit à la passer, et elle ne compte pas dans le pourcentage de configuration. */
  optional?: boolean;
};

const tour = (name: string) => `[data-tour="${name}"]`;

export const TOUR_STEPS: readonly TourStep[] = [
  {
    id: "services",
    route: "/services/",
    pathname: "/services/",
    navLabel: "Services",
    navTarget: "nav-services",
    targets: [tour("services-add")],
    planKeys: ["services"],
    title: "Créez votre premier service",
    description:
      "Un service est une prestation que vos clientes pourront réserver : nom, durée et prix. Cliquez sur « Nouveau service » puis renseignez le formulaire. Rien n’est créé tant que vous n’enregistrez pas.",
    navDescription: "Vos prestations se gèrent ici. Ouvrez la page Services pour créer la première.",
    successText: "Bravo, votre premier service est enregistré. Passez à l’étape suivante.",
    checklist: { label: "Créer un service", hint: "Au moins une prestation réservable (nom, durée, prix).", cta: "Ouvrir les services" },
    done: (p) => p.services > 0,
  },
  {
    id: "staff",
    route: "/staff/",
    pathname: "/staff/",
    navLabel: "Équipe & Planning",
    navTarget: "nav-staff",
    targets: [tour("staff-add")],
    planKeys: ["staff", "planning"],
    title: "Ajoutez une employée",
    description:
      "Ajoutez la personne qui réalisera les prestations. Cliquez sur « Ajouter un employé » et complétez sa fiche : elle pourra ensuite recevoir des rendez-vous.",
    navDescription: "Votre équipe se gère ici. Ouvrez la page Équipe & Planning.",
    successText: "Votre première employée est ajoutée. Passez à l’étape suivante.",
    checklist: { label: "Ajouter une employée", hint: "La personne qui réalisera les prestations.", cta: "Ouvrir l’équipe" },
    done: (p) => p.staff > 0,
  },
  {
    id: "planning",
    route: "/staff/?tab=planning",
    pathname: "/staff/",
    navLabel: "Équipe & Planning",
    navTarget: "nav-staff",
    // Le bouton de la fiche (pas le panneau d'édition : l'hôte est en pause tant qu'un panneau est ouvert). Sans
    // employée sélectionnée il n'existe pas : on désigne alors l'onglet Planning.
    targets: [tour("staff-schedule-edit"), tour("staff-planning-tab")],
    planKeys: ["staff", "planning"],
    title: "Définissez ses horaires",
    description:
      "Cliquez sur « Modifier les horaires » puis renseignez les jours et heures de travail de votre employée. Sans horaires, aucun créneau ne peut être proposé en réservation.",
    fallbackDescription:
      "Le bouton « Modifier les horaires » apparaît dès qu’une employée est sélectionnée dans l’onglet Planning. Ajoutez-en une si besoin, puis définissez ses jours et heures de travail : sans horaires, aucun créneau ne peut être proposé en réservation.",
    navDescription: "Les horaires se règlent dans Équipe & Planning, onglet Planning.",
    successText: "Les horaires sont enregistrés : des créneaux peuvent maintenant être proposés.",
    checklist: { label: "Définir des horaires", hint: "Sans horaires, aucun créneau n’est proposé en réservation.", cta: "Ouvrir le planning" },
    done: (p) => p.staffWithSchedule > 0,
  },
  {
    id: "resources",
    route: "/resources/",
    pathname: "/resources/",
    navLabel: "Ressources",
    navTarget: "nav-resources",
    targets: [tour("resources-add")],
    planKeys: ["resources"],
    title: "Ajoutez vos cabines ou équipements",
    description:
      "Étape facultative : si vos prestations utilisent une cabine ou un appareil, créez-le ici pour éviter les doubles réservations. Sinon, cliquez sur « Suivant ».",
    navDescription: "Cabines et équipements se gèrent ici. Cette étape est facultative.",
    successText: "Votre première ressource est enregistrée. Passez à l’étape suivante.",
    checklist: { label: "Ajouter une cabine ou un équipement", hint: "Facultatif : évite les doubles réservations de cabines.", cta: "Ouvrir les ressources" },
    done: (p) => p.resources > 0,
    optional: true,
  },
  {
    id: "agenda",
    route: "/agenda/",
    pathname: "/agenda/",
    navLabel: "Agenda",
    navTarget: "nav-agenda",
    targets: ['[data-agenda-tour="create"]'],
    planKeys: ["agenda"],
    title: "Découvrez votre agenda",
    description:
      "C’est ici que vous prenez vos rendez-vous. Cliquez sur « Nouveau rendez-vous » pour ajouter le premier, ou lancez la visite détaillée pour découvrir le formulaire sans rien enregistrer.",
    navDescription: "Vos rendez-vous s’organisent dans l’Agenda. Ouvrez-le pour terminer la visite.",
    successText: "Votre premier rendez-vous est enregistré. La configuration de base est terminée.",
    checklist: { label: "Enregistrer le premier rendez-vous", hint: "Votre agenda est prêt dès qu’un rendez-vous existe.", cta: "Ouvrir l’agenda" },
    done: (p) => p.appointments > 0,
  },
];

/** Étapes que le forfait permet d’afficher (même règle de verrouillage que la sidebar). */
export function applicableSteps(isNavEnabled: (key: string) => boolean): TourStep[] {
  return TOUR_STEPS.filter((step) => step.planKeys.some((key) => isNavEnabled(key)));
}

export function isTourStepId(value: string | null | undefined): value is TourStepId {
  return TOUR_STEPS.some((step) => step.id === value);
}
