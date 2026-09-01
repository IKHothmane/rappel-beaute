export const SITE = {
  name: "Rappel Beauté",
  version: "V1.2",
  url: "https://www.rappelbeaute.ma",
  tagline: "Le logiciel de gestion n°1 des instituts de beauté au Maroc.",
  email: "contact@rappelbeaute.ma",
  phone: "+212 5 22 00 00 00",
} as const;

export const NAV = [
  { href: "/", label: "Accueil" },
  { href: "/fonctionnalites/", label: "Fonctionnalités" },
  { href: "/tarifs/", label: "Tarifs" },
  { href: "/a-propos/", label: "À propos" },
  { href: "/ressources/", label: "Ressources" },
] as const;

export const FEATURES = [
  {
    id: "agenda",
    title: "Agenda intelligent",
    href: "/fonctionnalites/#agenda",
    text: "Planning staff et cabines sans double-réservation. La base refuse le chevauchement.",
  },
  {
    id: "clientes",
    title: "Gestion clientes",
    href: "/fonctionnalites/#clientes",
    text: "Fiches, historique, notes et fidélité — sans photos clientes en V1.",
  },
  {
    id: "stock",
    title: "Stock & Achats",
    href: "/fonctionnalites/#stock",
    text: "Ledger des mouvements, alertes rupture, fournisseurs et bons d’achat.",
  },
  {
    id: "caisse",
    title: "Caisse & Paiements",
    href: "/fonctionnalites/#caisse",
    text: "Encaissements, tickets et historique immuable. Montants en Decimal, jamais en Float.",
  },
  {
    id: "fidelite",
    title: "Fidélité & Marketing",
    href: "/fonctionnalites/#fidelite",
    text: "Points, forfaits, promotions. Campagnes WhatsApp préparées, envoi humain.",
  },
  {
    id: "analytics",
    title: "Analytics & Rapports",
    href: "/fonctionnalites/#analytics",
    text: "CA, taux de remplissage, top services. Décisions sur des chiffres justes.",
  },
] as const;

export const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: 299,
    quota: "150 RDV / mois",
    sites: "1 site",
    popular: false,
    variant: "light" as const,
    features: [
      "Agenda & disponibilités",
      "Fiches clientes",
      "WhatsApp manuel assisté",
      "1 utilisatrice propriétaire",
      "Assistance par e-mail",
    ],
  },
  {
    id: "institut",
    name: "Institut",
    price: 499,
    quota: "300 RDV / mois",
    sites: "1 site",
    popular: true,
    share: "80 %",
    variant: "dark" as const,
    features: [
      "Tout Starter",
      "Stock, achats, caisse",
      "Fidélité & marketing",
      "Analytics & rapports",
      "Rôles employée / caisse",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: 899,
    quota: "RDV illimités",
    sites: "Multi-sites",
    popular: false,
    variant: "rose" as const,
    features: [
      "Tout Institut",
      "RDV illimités",
      "Multi-sites consolidé",
      "Priorité support",
      "Onboarding dédié",
    ],
  },
] as const;

export const CITIES = [
  "Casablanca",
  "Rabat",
  "Marrakech",
  "Tanger",
  "Fès",
  "Agadir",
  "Meknès",
  "Oujda",
  "Tétouan",
  "Autre",
] as const;

export const FAQ_ITEMS = [
  {
    q: "L’essai de 14 jours est-il vraiment gratuit ?",
    a: "Oui, sans carte bancaire. Vous remplissez une demande d’essai : votre accès est activé sous 24 h par notre équipe. Pas de création de compte en libre-service en V1.",
  },
  {
    q: "Rappel Beauté envoie-t-il des WhatsApp tout seul ?",
    a: "Non. V1 est 100 % manuel assisté : le logiciel prépare le message, vous l’envoyez via wa.me, puis vous marquez « envoyé ». Aucun bot, aucune API Business.",
  },
  {
    q: "Mes photos clientes sont-elles stockées ?",
    a: "Non. Aucune photo cliente en V1. Les fiches restent textuelles (identité, historique, notes, fidélité).",
  },
  {
    q: "Puis-je gérer plusieurs instituts ?",
    a: "Le plan Premium (899 MAD) ouvre le multi-sites. Starter et Institut couvrent un site.",
  },
  {
    q: "Comment fonctionne la connexion ?",
    a: "Un e-mail = un compte Rappel Beauté. Vous vous connectez sur rappelbeaute.ma/login. Le serveur ouvre l’espace institut ou l’espace admin — jamais les deux.",
  },
  {
    q: "Les données restent-elles au Maroc / isolées par institut ?",
    a: "Chaque institut est isolé (organizationId + RLS PostgreSQL). Un institut ne voit jamais les clientes, RDV ou caisse d’un autre.",
  },
] as const;
