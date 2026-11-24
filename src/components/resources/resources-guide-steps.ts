import type { GuideStep } from "@/components/services/guide-core";

/** Attribut posé sur les zones de la page Ressources (versions mobile et large) et du formulaire. */
export const RESOURCES_TOUR_ATTR = "data-resources-tour";
/** Formulaire de création ouvert en démonstration pendant la visite (aucune écriture). */
export const RESOURCE_FORM_DEMO = "resource-form";
/** Indicateur : au moins une prestation active peut être associée à la ressource. */
export const RESOURCE_SERVICES_FLAG = "services";

/**
 * Étapes d'après les zones réellement affichées : les versions mobile/tablette (< 1024 px) et large portent les mêmes
 * repères, la visite retrouve à chaque étape celle qui est visible. Les champs du formulaire sont ceux du vrai formulaire.
 */
export const RESOURCES_STEPS: readonly GuideStep[] = [
  {
    id: "res-intro", target: "res-intro", intro: true,
    title: "Découvrir vos ressources",
    description: "Les ressources sont vos salles, cabines, fauteuils et équipements : l’agenda s’en sert pour éviter les doubles réservations. Nous allons parcourir cette page, puis ouvrir le formulaire pour vous montrer comment en ajouter une. Aucune ressource ne sera créée ni modifiée pendant cette démonstration.",
    readOnlyDescription: "Les ressources sont vos salles, cabines, fauteuils et équipements : l’agenda s’en sert pour éviter les doubles réservations. Nous allons parcourir cette page : indicateurs, recherche, filtres et fiches. Cette visite ne modifie aucune donnée.",
  },
  {
    id: "res-collision", target: "res-collision",
    title: "Anti-collision de l’agenda",
    description: "L’agenda bloque les doubles réservations d’une même ressource ainsi que les créneaux en maintenance.",
  },
  {
    id: "res-metrics", target: "res-metrics",
    title: "L’état de vos espaces",
    description: "Ces indicateurs donnent le nombre de ressources, celles qui sont disponibles, celles en cours d’utilisation et les maintenances prévues.",
    mobileDescription: "Ces indicateurs donnent le nombre de ressources, celles qui sont libres ou en soin en ce moment, et le chiffre d’affaires du mois (masqué selon vos droits).",
  },
  {
    id: "res-search", target: "res-search",
    title: "Rechercher une ressource",
    description: "Saisissez un nom, un emplacement, une note ou le nom d’une prestation pour retrouver une ressource. Le raccourci Ctrl+K (⌘+K sur Mac) place le curseur dans cette zone.",
    mobileDescription: "Saisissez un nom, un emplacement, une note ou le nom d’une prestation pour retrouver une ressource. La liste se met à jour au fil de la frappe.",
  },
  {
    id: "res-filters", target: "res-filters",
    title: "Filtrer par type",
    description: "Affichez toutes les ressources, ou seulement un type (cabine, salle, fauteuil, table, machine, équipement…) parmi ceux de votre catalogue. Ces filtres restent inchangés pendant la visite.",
  },
  {
    id: "res-list", target: "res-list",
    title: "Parcourir la liste",
    description: "Chaque carte présente une ressource : disponibilité du moment, type et nombre de prestations associées.",
    mobileDescription: "Chaque carte présente une ressource : disponibilité du moment, type, emplacement s’il est renseigné, rendez-vous du jour et capacité.",
  },
  {
    id: "res-card", target: "res-card",
    title: "Une carte de ressource",
    description: "Voici la première ressource de votre liste. Cliquez sur une carte pour afficher sa fiche détaillée. Aucune ressource n’est modifiée pendant cette visite.",
    mobileDescription: "Voici la première ressource de votre liste. Le bouton Voir la fiche affiche son détail et Planning ouvre le planning de l’équipe. Aucune ressource n’est modifiée pendant cette visite.",
  },
  {
    id: "res-card-status", target: "res-card-status",
    title: "Disponibilité en direct",
    description: "Cette pastille indique si la ressource est disponible, occupée en soin, bientôt libérée, en maintenance ou inactive, d’après les rendez-vous de l’agenda.",
  },
  {
    id: "res-card-edit", target: "res-card-edit", write: true,
    title: "Modifier une ressource",
    description: "Modifier rouvre le formulaire pré-rempli pour changer le nom, le type ou les prestations associées.",
    mobileDescription: "Le bouton ⋯ ouvre un menu : Modifier, Désactiver ou Réactiver la ressource, ou la Supprimer.",
  },
  {
    id: "res-focus", target: "res-focus",
    title: "La fiche de la ressource",
    description: "Ce panneau détaille la ressource sélectionnée : disponibilité, rendez-vous du jour, rendez-vous en cours ou à venir, timeline de la journée et prestations associées.",
  },
  {
    id: "res-focus-actions", target: "res-focus-actions", write: true,
    title: "Modifier ou planifier une maintenance",
    description: "Modifier ouvre le formulaire de la ressource. Planifier ouvre le panneau de maintenance, qui bloque le créneau de la ressource dans l’agenda pendant l’intervention. La maintenance n’est pas ouverte pendant cette visite.",
  },
  {
    id: "res-maintenance", target: "res-maintenance", write: true,
    title: "Planifier une maintenance",
    description: "Le bouton Maintenance ouvre le panneau d’intervention de la ressource sélectionnée : le créneau est bloqué dans l’agenda pendant l’intervention. Il n’est pas ouvert pendant cette visite.",
  },
  {
    id: "res-add", target: "res-add", write: true, opens: true,
    title: "Ajouter une ressource",
    description: "Ce bouton ouvre le formulaire de création. Cliquez sur Voir le formulaire pour le découvrir en mode démonstration.",
  },
  {
    id: "res-form-name", target: "res-form-name", write: true, from: "res-add", demo: RESOURCE_FORM_DEMO,
    title: "Nom de la ressource",
    description: "Obligatoire. Donnez un nom qui permet de la reconnaître dans l’agenda, par exemple « Cabine Privilège 3 ».",
  },
  {
    id: "res-form-type", target: "res-form-type", write: true, from: "res-add", demo: RESOURCE_FORM_DEMO,
    title: "Type",
    description: "Choisissez la nature de la ressource : cabine (par défaut), salle, fauteuil, table, machine, équipement ou autre. Quand une photo du catalogue existe pour ce type, elle s’affiche en haut du formulaire.",
  },
  {
    id: "res-form-services", target: "res-form-services", write: true, from: "res-add", demo: RESOURCE_FORM_DEMO, needs: RESOURCE_SERVICES_FLAG,
    title: "Prestations associées",
    description: "Cochez les prestations qui se déroulent dans cette ressource. Elles viennent de votre catalogue de services actifs.",
  },
  {
    id: "res-form-save", target: "res-form-save", write: true, from: "res-add", demo: RESOURCE_FORM_DEMO,
    title: "Enregistrer la ressource",
    description: "En utilisation normale, cliquez sur Créer la ressource après avoir saisi le nom. Le bouton est désactivé ici : Terminer ferme simplement la démonstration. L’option Ressource active n’apparaît qu’en modification d’une ressource existante.",
  },
];
