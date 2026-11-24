import type { GuideStep } from "@/components/services/guide-core";

/** Attribut posé sur les zones de la page Services (versions mobile et large) et du formulaire. */
export const SERVICES_TOUR_ATTR = "data-services-tour";
/** Formulaire de création ouvert en démonstration pendant la visite (aucune écriture). */
export const SERVICE_FORM_DEMO = "service-form";
/** Indicateur : le formulaire a pu être préparé (options chargées). */
export const SERVICE_FORM_FLAG = "form";

/**
 * Étapes d'après les zones réellement affichées : les versions mobile/tablette (< 1024 px) et large portent les mêmes
 * repères, la visite retrouve à chaque étape celle qui est visible. Les champs du formulaire sont ceux du vrai formulaire.
 */
export const SERVICES_STEPS: readonly GuideStep[] = [
  {
    id: "svc-intro", target: "svc-intro", intro: true,
    title: "Découvrir vos services",
    description: "Nous allons parcourir votre catalogue de prestations, puis ouvrir le formulaire pour vous montrer comment ajouter un service. Aucun service ne sera créé ni modifié pendant cette démonstration.",
    readOnlyDescription: "Nous allons parcourir votre catalogue de prestations : indicateurs, recherche, filtres et cartes de services. Cette visite ne modifie aucune donnée.",
  },
  {
    id: "svc-metrics", target: "svc-metrics",
    title: "Suivre le catalogue en un coup d’œil",
    description: "Ces indicateurs résument le nombre de prestations, celles qui sont actives, les réservations du mois, le chiffre d’affaires et le panier moyen. Certains montants peuvent être masqués selon vos droits.",
    mobileDescription: "Ces indicateurs résument le catalogue (avec le nombre de services en ligne), les réservations du mois, le chiffre d’affaires des prestations et le panier moyen. Certains montants peuvent être masqués selon vos droits.",
  },
  {
    id: "svc-search", target: "svc-search",
    title: "Rechercher un service",
    description: "Saisissez un nom, une catégorie, une description ou le nom d’une employée pour retrouver une prestation. La liste se met à jour au fil de la frappe.",
    mobileDescription: "Saisissez un nom, une description ou le nom d’une employée pour retrouver une prestation. La liste se met à jour au fil de la frappe.",
  },
  {
    id: "svc-categories", target: "svc-categories",
    title: "Filtrer par catégorie",
    description: "Chaque bouton regroupe les prestations d’une même catégorie, avec leur nombre. Tous affiche l’ensemble du catalogue. Ces filtres restent inchangés pendant la visite.",
  },
  {
    id: "svc-status", target: "svc-status",
    title: "Filtrer par état",
    description: "Tous, Actifs ou Inactifs : n’affichez que les services proposés à la réservation, ou ceux que vous avez désactivés. Ces filtres restent inchangés pendant la visite.",
  },
  {
    id: "svc-list", target: "svc-list",
    title: "Parcourir le catalogue",
    description: "Chaque carte présente une prestation : état, nom, catégorie, durée, prix et employées qui la réalisent.",
  },
  {
    id: "svc-card", target: "svc-card",
    title: "Une carte de service",
    description: "Voici le premier service de votre catalogue. Nous allons détailler ses éléments, un par un.",
  },
  {
    id: "svc-card-status", target: "svc-card-status",
    title: "Actif ou inactif",
    description: "Un service actif est proposé dans l’agenda et à la réservation. Un service inactif reste enregistré mais n’est plus proposé aux clientes.",
    mobileDescription: "En ligne : le service est proposé dans l’agenda et à la réservation. Hors ligne : il reste enregistré mais n’est plus proposé aux clientes.",
  },
  {
    id: "svc-card-meta", target: "svc-card-meta",
    title: "Durée et prix",
    description: "La durée fixe la place du soin dans l’agenda ; le prix est exprimé en MAD.",
  },
  {
    id: "svc-card-staff", target: "svc-card-staff",
    title: "Employées du service",
    description: "Les pastilles donnent les initiales des employées qui réalisent ce soin. Le texte « Aucune employée assignée » s’affiche quand personne n’est cochée.",
    mobileDescription: "Cette ligne indique les rendez-vous terminés ce mois-ci pour ce soin et, à droite, les initiales des employées qui le réalisent.",
  },
  {
    id: "svc-card-edit", target: "svc-card-edit",
    title: "Actions du service",
    description: "Modifier rouvre le formulaire pré-rempli avec les informations du service. Aucun service n’est modifié pendant cette visite.",
    readOnlyDescription: "Votre rôle consulte le catalogue en lecture seule : la modification des services est réservée aux profils autorisés.",
  },
  {
    id: "svc-card-menu", target: "svc-card-menu", write: true,
    title: "Activer, désactiver ou supprimer",
    description: "Le bouton ⋯ ouvre un menu : Modifier, Désactiver ou Réactiver le service, ou le Supprimer. Un service supprimé disparaît du catalogue, mais les rendez-vous déjà pris conservent le nom du soin.",
    mobileDescription: "L’interrupteur active ou désactive le service d’un geste. Le bouton ⋮ ouvre un menu : Modifier, Désactiver ou Réactiver, ou Supprimer. Un service supprimé disparaît du catalogue, mais les rendez-vous déjà pris conservent le nom du soin.",
  },
  {
    id: "svc-add", target: "svc-add", write: true, opens: true, needs: "form",
    title: "Ajouter un service",
    description: "Ce bouton ouvre le formulaire de création. Cliquez sur Voir le formulaire pour le découvrir en mode démonstration.",
  },
  {
    id: "svc-form-name", target: "svc-form-name", write: true, from: "svc-add", demo: SERVICE_FORM_DEMO,
    title: "Nom du service",
    description: "Obligatoire. Choisissez un soin dans la liste de suggestions ou saisissez votre propre nom. Quand le nom correspond à un soin du catalogue, sa photo du catalogue s’affiche lorsqu’elle existe.",
  },
  {
    id: "svc-form-description", target: "svc-form-description", write: true, from: "svc-add", demo: SERVICE_FORM_DEMO,
    title: "Description",
    description: "Facultative. Décrivez la prestation en quelques lignes (500 caractères au maximum). Sur ordinateur, elle s’affiche sur la carte du service.",
  },
  {
    id: "svc-form-price", target: "svc-form-price", write: true, from: "svc-add", demo: SERVICE_FORM_DEMO,
    title: "Prix",
    description: "Obligatoire. Saisissez le prix en dirhams (MAD), en chiffres uniquement.",
  },
  {
    id: "svc-form-duration", target: "svc-form-duration", write: true, from: "svc-add", demo: SERVICE_FORM_DEMO,
    title: "Durée",
    description: "Obligatoire. Choisissez une durée rapide (de 15 à 120 minutes) ou saisissez le nombre de minutes. Elle détermine la place du soin dans l’agenda.",
  },
  {
    id: "svc-form-staff", target: "svc-form-staff", write: true, from: "svc-add", demo: SERVICE_FORM_DEMO,
    title: "Employées",
    description: "Cochez les employées de l’institut qui réalisent ce soin. Elles pourront alors se voir attribuer ses rendez-vous.",
  },
  {
    id: "svc-form-products", target: "svc-form-products", write: true, from: "svc-add", demo: SERVICE_FORM_DEMO,
    title: "Produits consommés",
    description: "Facultatif. Ajoutez les produits de votre stock utilisés par ce soin, avec la quantité consommée. S’il n’y a encore aucun produit, vous pouvez en créer dans la page Produits.",
  },
  {
    id: "svc-form-status", target: "svc-form-status", write: true, from: "svc-add", demo: SERVICE_FORM_DEMO,
    title: "Statut du service",
    description: "Actif : le soin est proposé dans l’agenda et à la réservation. Inactif : il reste enregistré mais n’est plus proposé. Un nouveau service est actif par défaut.",
  },
  {
    id: "svc-form-save", target: "svc-form-save", write: true, from: "svc-add", demo: SERVICE_FORM_DEMO,
    title: "Enregistrer le service",
    description: "En utilisation normale, cliquez sur Créer le service une fois le nom, le prix et la durée renseignés. Le bouton est désactivé ici : Terminer ferme simplement la démonstration, sans rien enregistrer.",
  },
];
