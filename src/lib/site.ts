export const SITE = {
  name: "Rappel Beauty",
  version: "V1.2",
  url: "https://rappelbeauty.com",
  appUrl: "https://app.rappelbeauty.com",
  tagline: "Le logiciel de gestion pensé pour les instituts de beauté.",
  email: "contact@rappelbeauty.com",
  phone: "+212 6 19 44 03 75",
} as const;

/** Connexion SaaS — jamais sur le site www (marketing) */
export const APP_LOGIN_HREF =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "")
    ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/connexion/`
    : process.env.NODE_ENV === "production"
      ? `${SITE.appUrl}/connexion/`
      : "/connexion/";

/** URL absolue de connexion — e-mails transactionnels (préremplissage optionnel). */
export function absoluteAppLoginUrl(opts?: {
  email?: string;
  password?: string;
}): string {
  const fromEnv = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_BASE_URL ||
    ""
  ).replace(/\/$/, "");
  const base =
    fromEnv ||
    (process.env.NODE_ENV === "production" ? SITE.appUrl : "http://localhost:3000");
  const url = new URL(`${base}/connexion/`);
  if (opts?.email?.trim()) url.searchParams.set("email", opts.email.trim().toLowerCase());
  if (opts?.password) url.searchParams.set("password", opts.password);
  return url.toString();
}

/**
 * Architecture marketing figée — 12 pages.
 * Formule publique unique : 599 DH / mois, ou 5999 DH / an. Essai 7 jours.
 */
export const MARKETING_PAGES = [
  { path: "/", group: "nav" },
  { path: "/fonctionnalites/", group: "nav" },
  { path: "/tarifs/", group: "nav" },
  { path: "/instituts/", group: "nav" },
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
  { href: "/instituts/", label: "Instituts" },
  { href: "/a-propos/", label: "À propos" },
] as const;

export const FEATURES = [
  {
    id: "rdv",
    title: "Rendez-vous",
    href: "/gestion-rendez-vous/",
    text: "Planning staff et cabines sans double-réservation. La base refuse le chevauchement.",
  },
  {
    id: "clientes",
    title: "Clientes",
    href: "/gestion-clientes/",
    text: "Fiches, historique, notes et fidélité — sans photos clientes en V1.",
  },
  {
    id: "caisse",
    title: "Caisse & paiements",
    href: "/caisse/",
    text: "Encaissements, tickets et historique immuable. Montants en Decimal, jamais en Float.",
  },
  {
    id: "stock",
    title: "Stock",
    href: "/gestion-stock/",
    text: "Ledger des mouvements, alertes rupture, fournisseurs et bons d’achat.",
  },
  {
    id: "fidelite",
    title: "Fidélité",
    href: "/fidelite/",
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

/** Formule affichée sur la vitrine. /tarifs/ peut surcharger le prix via PlatformConfig. */
export const PUBLIC_OFFER = {
  name: "Rappel Beauty",
  price: 599,
  yearlyPrice: 5999,
  currency: "MAD",
  trialDays: 7,
} as const;

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
    q: "Quel logiciel utiliser pour gérer un institut de beauté au Maroc ?",
    a: "Rappel Beauty est un logiciel SaaS conçu pour les instituts de beauté au Maroc. Il permet de gérer les rendez-vous, clientes, équipe, services, produits, stock, caisse, ventes, fidélité et réservation en ligne depuis une seule plateforme.",
  },
  {
    q: "Qu'est-ce que Rappel Beauty ?",
    a: "Rappel Beauty est un logiciel de gestion pour les instituts de beauté au Maroc. Il sert à gérer les rendez-vous, les clientes, l'équipe, les services, le stock, la caisse, la fidélité et la réservation en ligne.",
  },
  {
    q: "Combien coûte Rappel Beauty ?",
    a: `Rappel Beauty coûte ${PUBLIC_OFFER.price} DH par mois ou ${PUBLIC_OFFER.yearlyPrice.toLocaleString("fr-FR")} DH par an. Une période d'essai gratuite de ${PUBLIC_OFFER.trialDays} jours est proposée, sans engagement et sans carte bancaire.`,
  },
  {
    q: "Que comprend la formule ?",
    a: "La formule donne accès aux fonctionnalités de gestion proposées par Rappel Beauty pour les instituts de beauté : rendez-vous, clientes, équipe, services, stock, caisse, fidélité, réservation en ligne et outils de pilotage.",
  },
  {
    q: "Combien de temps dure l'essai gratuit ?",
    a: `L'essai gratuit dure ${PUBLIC_OFFER.trialDays} jours.`,
  },
  {
    q: "Faut-il une carte bancaire pour essayer ?",
    a: "Non. L'essai gratuit de 7 jours ne nécessite pas de carte bancaire.",
  },
  {
    q: "Y a-t-il un engagement ?",
    a: "Non. La formule est sans engagement.",
  },
  {
    q: "Les clientes paient-elles Rappel Beauty ?",
    a: "Non. Rappel Beauty est le logiciel utilisé par l'institut. Les clientes règlent directement leurs prestations auprès de l'institut.",
  },
  {
    q: "Comment fonctionne la réservation en ligne ?",
    a: "Chaque institut peut publier sa page : services, durées et créneaux issus du planning. La cliente réserve auprès de l'institut, et le rendez-vous arrive dans le même agenda.",
  },
  {
    q: "Où les clientes paient-elles leurs prestations ?",
    a: "Les clientes paient directement à l'institut. Les règlements se font au comptoir : espèces, carte, virement, chèque ou carte cadeau.",
  },
  {
    q: "Rappel Beauty est-il une marketplace ?",
    a: "Non. Rappel Beauty est un logiciel SaaS destiné aux instituts de beauté. Chaque institut dispose de son propre espace de gestion et peut avoir sa propre page publique de réservation.",
  },
  {
    q: "Comment fonctionne WhatsApp avec Rappel Beauty ?",
    a: "Rappel Beauty propose actuellement un fonctionnement WhatsApp manuel assisté : le logiciel prépare le message et l'utilisateur l'envoie manuellement via WhatsApp.",
  },
  {
    q: "Les photos des clientes sont-elles utilisées ?",
    a: "Non. Aucune photo cliente en V1. Les fiches restent textuelles.",
  },
] as const;
