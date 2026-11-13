export const BLOG_CATEGORIES = [
  {
    id: "logiciel",
    label: "Choisir son logiciel",
    href: "/fonctionnalites/",
    linkLabel: "Découvrir les fonctionnalités",
  },
  {
    id: "rendez-vous",
    label: "Agenda & rendez-vous",
    href: "/gestion-rendez-vous/",
    linkLabel: "Organiser les rendez-vous",
  },
  {
    id: "whatsapp",
    label: "WhatsApp & communication",
    href: "/whatsapp/",
    linkLabel: "Découvrir les rappels WhatsApp",
  },
  {
    id: "site-web",
    label: "Site web & réservation",
    href: "/reservation-en-ligne/",
    linkLabel: "Découvrir la réservation en ligne",
  },
  {
    id: "fidelite",
    label: "Clientes & fidélité",
    href: "/fidelite/",
    linkLabel: "Découvrir la fidélité digitale",
  },
  {
    id: "stock",
    label: "Stock & achats",
    href: "/gestion-stock/",
    linkLabel: "Découvrir la gestion du stock",
  },
  {
    id: "caisse",
    label: "Caisse & rentabilité",
    href: "/caisse/",
    linkLabel: "Découvrir la caisse",
  },
  {
    id: "equipe",
    label: "Équipe & organisation",
    href: "/fonctionnalites/#equipe",
    linkLabel: "Organiser le planning de l’équipe",
  },
  {
    id: "developpement",
    label: "Développer son institut",
    href: "/creation-site-web/",
    linkLabel: "Créer le site de votre institut",
  },
  {
    id: "donnees",
    label: "Données & bonnes pratiques",
    href: "/confidentialite/",
    linkLabel: "Lire notre politique de confidentialité",
  },
  {
    id: "seo-local",
    label: "SEO local & Google Maps",
    href: "/reservation-en-ligne/",
    linkLabel: "Relier la découverte de l’institut à la réservation",
  },
] as const;
export function blogCategory(id: string) {
  return BLOG_CATEGORIES.find((category) => category.id === id) ?? BLOG_CATEGORIES[0];
}
