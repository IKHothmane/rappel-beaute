export const SITE = {
  name: "Rappel Beauty",
  version: "V1.2",
  url: "https://www.rappelbeauty.com",
  appUrl: "https://app.rappelbeauty.com",
  tagline: "Le logiciel de gestion pensé pour les instituts de beauté.",
  email: "contact@rappelbeauty.com",
  phone: "+212 5 22 00 00 00",
} as const;

/** Connexion SaaS — jamais sur le site www (marketing) */
export const APP_LOGIN_HREF =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "")
    ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/login/`
    : process.env.NODE_ENV === "production"
      ? `${SITE.appUrl}/login/`
      : "/login/?__host=app";

/**
 * Architecture marketing figée — 12 pages.
 * Prix plans (vérité unique avec moteur abonnement) : 299 / 499 / 899 MAD.
 */
export const MARKETING_PAGES = [
  { path: "/", group: "nav" },
  { path: "/fonctionnalites/", group: "nav" },
  { path: "/tarifs/", group: "nav" },
  { path: "/a-propos/", group: "nav" },
  { path: "/essai/", group: "conversion" },
  { path: "/professionnel/", group: "conversion" },
  { path: "/connexion/", group: "conversion" },
  { path: "/demo/", group: "conversion" },
  { path: "/contact/", group: "conversion" },
  { path: "/faq/", group: "seo" },
  { path: "/whatsapp/", group: "seo" },
  { path: "/solutions/institut-beaute/", group: "seo" },
  { path: "/mentions-legales/", group: "legal" },
  { path: "/confidentialite/", group: "legal" },
] as const;

export const NAV = [
  { href: "/", label: "Accueil" },
  { href: "/fonctionnalites/", label: "Fonctionnalités" },
  { href: "/tarifs/", label: "Tarifs" },
  { href: "/a-propos/", label: "À propos" },
] as const;

export const FEATURES = [
  {
    id: "rdv",
    title: "Rendez-vous",
    href: "/fonctionnalites/#rdv",
    text: "Planning staff et cabines sans double-réservation. La base refuse le chevauchement.",
  },
  {
    id: "clientes",
    title: "Clientes",
    href: "/fonctionnalites/#clientes",
    text: "Fiches, historique, notes et fidélité — sans photos clientes en V1.",
  },
  {
    id: "caisse",
    title: "Caisse & paiements",
    href: "/fonctionnalites/#caisse",
    text: "Encaissements, tickets et historique immuable. Montants en Decimal, jamais en Float.",
  },
  {
    id: "stock",
    title: "Stock",
    href: "/fonctionnalites/#stock",
    text: "Ledger des mouvements, alertes rupture, fournisseurs et bons d’achat.",
  },
  {
    id: "fidelite",
    title: "Fidélité",
    href: "/fonctionnalites/#fidelite",
    text: "Points, forfaits, promotions. Campagnes WhatsApp préparées, envoi humain.",
  },
  {
    id: "whatsapp",
    title: "WhatsApp",
    href: "/fonctionnalites/#whatsapp",
    text: "Messages préparés, envoi manuel via wa.me. Aucun bot en V1.",
  },
  {
    id: "avis",
    title: "Avis",
    href: "/fonctionnalites/#avis",
    text: "Demandes d’avis après RDV, suivi des retours clientes.",
  },
  {
    id: "analytics",
    title: "Analytics & rapports",
    href: "/fonctionnalites/#analytics",
    text: "CA, taux de remplissage, top services. Décisions sur des chiffres justes.",
  },
] as const;

/** Vérité prix = moteur Plan (prisma) : STARTER 299 · INSTITUT 499 · PREMIUM 899 */
export const PLANS = [
  {
    id: "starter",
    code: "STARTER" as const,
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
      "Réservation en ligne",
      "Assistance par e-mail",
    ],
  },
  {
    id: "institut",
    code: "INSTITUT" as const,
    name: "Institut",
    price: 499,
    quota: "300 RDV / mois",
    sites: "1 site",
    popular: true,
    share: "recommandé",
    variant: "dark" as const,
    features: [
      "Tout Starter",
      "Stock, achats, caisse",
      "Fidélité & marketing",
      "Avis & analytics",
      "Rôles employée / caisse",
    ],
  },
  {
    id: "premium",
    code: "PREMIUM" as const,
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
    q: "Rappel Beauty envoie-t-il des WhatsApp tout seul ?",
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
    a: "Un e-mail = un compte Rappel Beauty. Vous vous connectez sur app.rappelbeauty.com — l’espace institut. Le site www est uniquement commercial (pas de login marketing).",
  },
  {
    q: "Les données restent-elles isolées par institut ?",
    a: "Chaque institut est isolé (organizationId + RLS PostgreSQL). Un institut ne voit jamais les clientes, RDV ou caisse d’un autre.",
  },
] as const;
