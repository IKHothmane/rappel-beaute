import type { GuideStep } from "@/components/services/guide-core";

/** Attribut posé sur les zones de la page Produits & Stock (versions mobile et large) et du formulaire. */
export const PRODUCTS_TOUR_ATTR = "data-products-tour";
/** Formulaire de création ouvert en démonstration pendant la visite (aucune écriture). */
export const PRODUCT_FORM_DEMO = "product-form";

/**
 * Étapes d'après les zones réellement affichées. Les versions mobile/tablette (< 1024 px) et large ne portent pas toutes
 * les mêmes repères (ordre et contenu diffèrent) : une étape dont la zone n'est pas affichée est écartée, la visite retrouve
 * à chaque étape la version visible. Les champs du formulaire sont exactement ceux du vrai formulaire de création.
 */
export const PRODUCTS_STEPS: readonly GuideStep[] = [
  {
    id: "prd-intro", target: "prd-intro", intro: true,
    title: "Découvrir Produits & Stock",
    description: "Nous allons parcourir votre catalogue et vos niveaux de stock, puis ouvrir le formulaire pour vous montrer comment ajouter un produit. Aucun produit ni aucun mouvement de stock ne sera créé ou modifié pendant cette démonstration.",
    readOnlyDescription: "Nous allons parcourir votre catalogue et vos niveaux de stock : indicateurs, recherche, filtres, fiches produit. Cette visite ne modifie aucune donnée.",
  },
  {
    id: "prd-metrics", target: "prd-metrics",
    title: "Suivre le stock en un coup d’œil",
    description: "Ces indicateurs donnent le nombre de références, celles en stock, celles sous le seuil, les ruptures et la valeur du stock. « Sous le seuil » et « Ruptures » sont cliquables : ils filtrent le catalogue sur ces produits.",
    lockedDescription: "Ces indicateurs donnent le nombre de références, celles en stock, celles sous le seuil et les ruptures. La valeur du stock est masquée pour votre rôle. « Sous le seuil » et « Ruptures » sont cliquables : ils filtrent le catalogue.",
  },
  {
    id: "prd-charts", target: "prd-charts",
    title: "Évaluation et répartition",
    description: "Le premier graphique montre la valeur du stock par catégorie ; le second, la répartition des références entre les catégories de produits.",
    lockedDescription: "Le premier graphique (valeur du stock) est masqué pour votre rôle ; le second montre la répartition des références entre les catégories de produits.",
  },
  {
    id: "prd-kpis-m", target: "prd-kpis-m",
    title: "Suivre le stock en un coup d’œil",
    description: "Ces indicateurs donnent la valeur du stock, le chiffre d’affaires de la revente en caisse, le nombre de produits en stock normal et ceux sous le seuil. Certains montants peuvent être masqués selon vos droits.",
  },
  {
    id: "prd-insight-m", target: "prd-insight-m",
    title: "L’insight du catalogue",
    description: "Une phrase de synthèse : le produit le plus vendu en caisse ce mois-ci ou, à défaut, le produit le plus urgent à réapprovisionner.",
  },
  {
    id: "prd-tabs", target: "prd-tabs",
    title: "Les espaces de la page",
    description: "Catalogue : les fiches produit. Stock : les niveaux de chaque produit. Mouvements : le journal des entrées et sorties. Inventaire : le contrôle du stock réel (les écarts créent des ajustements). Alertes : les produits sous le seuil, en rupture ou proches de la péremption. Depuis l’onglet Catalogue, la visite présente aussi le détail des fiches produit.",
  },
  {
    id: "prd-links-m", target: "prd-links-m",
    title: "Achats, fournisseurs et mouvements",
    description: "Ces raccourcis ouvrent le catalogue, les achats en cours, vos fournisseurs et le journal des mouvements de stock.",
  },
  {
    id: "prd-categories", target: "prd-categories",
    title: "Filtrer par catégorie",
    description: "Chaque bouton regroupe les produits d’une même catégorie, avec leur nombre. Tous affiche l’ensemble du catalogue. Ces filtres restent inchangés pendant la visite.",
  },
  {
    id: "prd-search", target: "prd-search",
    title: "Rechercher un produit",
    description: "Saisissez un nom, une référence (SKU), une marque ou un fournisseur pour retrouver un produit. Le raccourci Ctrl+K (⌘K sur Mac) place le curseur dans ce champ.",
    mobileDescription: "Saisissez un nom, une référence (SKU) ou une marque pour retrouver un produit. La liste se met à jour au fil de la frappe.",
  },
  {
    id: "prd-categories-m", target: "prd-categories-m",
    title: "Filtrer par catégorie",
    description: "Chaque bouton regroupe les produits d’une même catégorie, avec leur nombre. Tous affiche l’ensemble du catalogue. Ces filtres restent inchangés pendant la visite.",
  },
  {
    id: "prd-usage", target: "prd-usage",
    title: "Filtrer par usage",
    description: "Revente boutique, consommable cabine ou hybride : n’affichez que les produits vendus aux clientes, ceux utilisés en soin, ou ceux qui servent aux deux.",
  },
  {
    id: "prd-stock-filter", target: "prd-stock-filter",
    title: "Filtrer par niveau de stock",
    description: "En stock, Stock bas, Rupture, Expire bientôt ou Expiré : repérez d’un coup les produits à réapprovisionner ou à écouler.",
  },
  {
    id: "prd-supplier", target: "prd-supplier",
    title: "Filtrer par fournisseur",
    description: "Ce filtre apparaît dès que vos produits viennent de plusieurs fournisseurs. Il ne garde que ceux d’un même fournisseur.",
  },
  {
    id: "prd-view", target: "prd-view",
    title: "Tableau ou cartes",
    description: "Basculez entre la vue tableau (colonnes Produit, Catégorie, Stock, Achat, Vente et Marge) et la vue cartes.",
  },
  {
    id: "prd-filters-m", target: "prd-filters-m",
    title: "Filtrer par usage et par stock",
    description: "Revente, Cabine ou Hybride filtrent selon l’usage du produit ; Stock bas et Rupture ne gardent que les produits à réapprovisionner. Un second appui retire le filtre. Ces filtres restent inchangés pendant la visite.",
  },
  {
    id: "prd-switch-m", target: "prd-switch-m",
    title: "Liste ou fiche",
    description: "Liste affiche les produits sous forme de cartes. Fiche ouvre le détail du produit sélectionné : stock, prix, prestations liées, fournisseurs et derniers mouvements. Touchez un produit pour l’ouvrir.",
  },
  {
    id: "prd-list", target: "prd-list",
    title: "Parcourir le catalogue",
    description: "Chaque ligne présente un produit : nom et référence, catégorie, niveau de stock avec son état, puis prix d’achat, prix de vente et marge. Cliquez sur une ligne pour afficher sa fiche à droite.",
    mobileDescription: "Chaque carte présente un produit : nom, catégorie, référence, état du stock, quantité, prix de vente et marge.",
  },
  {
    id: "prd-card", target: "prd-card",
    title: "Un produit",
    description: "Voici le premier produit de votre catalogue. Nous allons détailler ses éléments, un par un.",
  },
  {
    id: "prd-card-stock", target: "prd-card-stock",
    title: "Niveau de stock et état",
    description: "La quantité en stock est comparée au seuil minimum, avec une barre de remplissage et un état : En stock, Stock bas (sous le seuil), Rupture (stock épuisé), Expire bientôt ou Expiré.",
    mobileDescription: "Cette ligne donne la quantité en stock et le seuil minimum, puis l’usage du produit. Le badge au-dessus indique l’état : En stock, Stock bas, Rupture, Expire bientôt ou Expiré.",
  },
  {
    id: "prd-card-prices", target: "prd-card-prices",
    title: "Prix et marge",
    description: "Prix d’achat, prix de vente et marge. La marge s’affiche en rouge lorsqu’elle passe sous 25 %.",
    mobileDescription: "Le prix de vente et la marge du produit. La marge s’affiche en rouge sous 25 % ; un produit sans prix de vente est signalé comme consommable.",
  },
  {
    id: "prd-card-moves", target: "prd-card-moves",
    title: "Entrée et sortie de stock",
    description: "Entrée augmente le stock, Sortie le diminue : un formulaire demande la quantité, puis un mouvement est enregistré dans le journal. Aucun mouvement n’est créé pendant cette visite.",
    readOnlyDescription: "Votre rôle consulte le stock en lecture seule : Voir la fiche ouvre le détail du produit, sans pouvoir modifier les quantités.",
  },
  {
    id: "prd-card-menu", target: "prd-card-menu", write: true,
    title: "Actions du produit",
    description: "Le bouton ⋯ ouvre un menu : Modifier (formulaire pré-rempli), Désactiver ou Réactiver le produit, ou Supprimer. Un produit supprimé disparaît du catalogue. Aucun produit n’est modifié pendant cette visite.",
  },
  {
    id: "prd-focus", target: "prd-focus",
    title: "La fiche produit",
    description: "Cliquer sur un produit affiche ici sa fiche : nom, référence, marque, catégorie, usage et état du stock.",
  },
  {
    id: "prd-focus-edit", target: "prd-focus-edit", write: true,
    title: "Modifier la fiche",
    description: "Le crayon rouvre le formulaire pré-rempli avec les informations du produit. Aucun produit n’est modifié pendant cette visite.",
  },
  {
    id: "prd-focus-stock", target: "prd-focus-stock",
    title: "Stock disponible",
    description: "La quantité en stock aujourd’hui, le seuil minimum et la barre de remplissage. Sous le seuil, le produit passe en Stock bas.",
  },
  {
    id: "prd-focus-actions", target: "prd-focus-actions",
    title: "Entrée, sortie et commande",
    description: "Entrée augmente le stock d’une unité, Sortie le diminue d’une unité, chacune enregistrée comme mouvement d’ajustement. Commande ouvre la page Achats pour réapprovisionner. Aucun mouvement n’est créé pendant cette visite.",
    readOnlyDescription: "Votre rôle consulte le stock en lecture seule : le bouton Voir les mouvements ouvre le journal des mouvements de stock.",
  },
  {
    id: "prd-focus-prices", target: "prd-focus-prices",
    title: "Achat, vente et marge",
    description: "Le prix d’achat, le prix de vente et la marge qui en résulte. La marge s’affiche en rouge lorsqu’elle passe sous 25 %.",
  },
  {
    id: "prd-focus-services", target: "prd-focus-services",
    title: "Prestations liées",
    description: "Les soins qui consomment ce produit, avec la quantité utilisée à chaque prestation. Ce lien se règle dans le formulaire de chaque service.",
  },
  {
    id: "prd-focus-suppliers", target: "prd-focus-suppliers",
    title: "Fournisseurs",
    description: "Les fournisseurs enregistrés pour ce produit (le fournisseur préféré est marqué d’une étoile), avec leur prix d’achat quand votre rôle le permet. Un clic ouvre la fiche du fournisseur.",
  },
  {
    id: "prd-focus-movements", target: "prd-focus-movements",
    title: "Derniers mouvements",
    description: "Les cinq derniers mouvements de ce produit : type, date, auteur et quantité (en vert à l’entrée, en rouge à la sortie). Le journal complet est dans l’espace Mouvements.",
  },
  {
    id: "prd-add", target: "prd-add", write: true, opens: true,
    title: "Ajouter un produit",
    description: "Ce bouton ouvre le formulaire de création. Cliquez sur Voir le formulaire pour le découvrir en mode démonstration.",
  },
  {
    id: "prd-form-name", target: "prd-form-name", write: true, from: "prd-add", demo: PRODUCT_FORM_DEMO,
    title: "Nom du produit",
    description: "Obligatoire. Saisissez le nom tel que vous voulez le retrouver, par exemple « Sérum 30 ml ». La référence (SKU) est générée automatiquement à la création.",
  },
  {
    id: "prd-form-purchase", target: "prd-form-purchase", write: true, from: "prd-add", demo: PRODUCT_FORM_DEMO,
    title: "Prix d’achat",
    description: "Le prix auquel vous achetez une unité, en dirhams (MAD). Il sert à valoriser le stock et à calculer la marge. Les boutons − et + ajustent le montant de 1, vous pouvez aussi le saisir avec une virgule.",
  },
  {
    id: "prd-form-sale", target: "prd-form-sale", write: true, from: "prd-add", demo: PRODUCT_FORM_DEMO,
    title: "Prix de vente",
    description: "Facultatif. Le prix auquel vous revendez le produit, en dirhams (MAD). Laissez-le vide pour un produit uniquement utilisé en soin : aucune marge n’est alors calculée.",
  },
  {
    id: "prd-form-min", target: "prd-form-min", write: true, from: "prd-add", demo: PRODUCT_FORM_DEMO,
    title: "Stock minimum",
    description: "Le seuil d’alerte : lorsque la quantité en stock descend à ce niveau, le produit passe en Stock bas.",
  },
  {
    id: "prd-form-max", target: "prd-form-max", write: true, from: "prd-add", demo: PRODUCT_FORM_DEMO,
    title: "Stock maximum",
    description: "Facultatif. La quantité que vous souhaitez ne pas dépasser : elle sert de repère pour la barre de remplissage du stock.",
  },
  {
    id: "prd-form-initial", target: "prd-form-initial", write: true, from: "prd-add", demo: PRODUCT_FORM_DEMO,
    title: "Stock initial",
    description: "Facultatif, à la création uniquement. La quantité déjà en rayon ou en cabine : elle crée un premier mouvement de type Achat dans le journal.",
  },
  {
    id: "prd-form-supplier", target: "prd-form-supplier", write: true, from: "prd-add", demo: PRODUCT_FORM_DEMO,
    title: "Fournisseur",
    description: "Facultatif. Indiquez le nom du fournisseur : il s’affiche sur la fiche du produit et permet de filtrer le catalogue par fournisseur.",
  },
  {
    id: "prd-form-save", target: "prd-form-save", write: true, from: "prd-add", demo: PRODUCT_FORM_DEMO,
    title: "Enregistrer le produit",
    description: "En utilisation normale, cliquez sur Créer le produit une fois le nom renseigné. Le bouton est désactivé ici : Terminer ferme simplement la démonstration, sans rien enregistrer.",
  },
];
