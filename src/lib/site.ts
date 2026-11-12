export const SITE = {
  name: "Rappel Beauty",
  version: "V1.2",
  url: "https://rappelbeauty.com",
  appUrl: "https://app.rappelbeauty.com",
  tagline: "Le logiciel de gestion pensé pour les instituts de beauté.",
  email: "contact@rappelbeauty.com",
  phone: "06 91 56 72 46",
  phoneInternational: "+212691567246",
} as const;

/**
 * Origine des liens (e-mails, WhatsApp, reset).
 * Staging Railway a NODE_ENV=production : ne pas retomber sur rappelbeauty.com.
 * Définir NEXT_PUBLIC_APP_URL (URL Railway ou domaine staging).
 */
export function publicAppOrigin(): string {
  const configured = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.APP_BASE_URL ||
    ""
  ).replace(/\/$/, "");
  const isLoopback = /localhost|127\.0\.0\.1/i.test(configured);
  // En prod, ne jamais exposer localhost (QR / Wallet / e-mails).
  if (configured && !isLoopback) return configured;
  if (appEnvironment() === "staging") return configured && !isLoopback ? configured : "";
  if (process.env.NODE_ENV === "production") return SITE.appUrl;
  return configured || "http://localhost:3000";
}

/** Staging Railway garde NODE_ENV=production. L'environnement métier vient d'APP_ENV ou de l'URL. */
export function appEnvironment(): string {
  const explicit = process.env.APP_ENV?.trim();
  if (explicit) return explicit;
  const origin = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "";
  if (/staging|\.up\.railway\.app/i.test(origin)) return "staging";
  return process.env.NODE_ENV ?? "unknown";
}

/** Connexion sur l’hôte courant (Railway staging inclus), pas le domaine public. */
export const APP_LOGIN_HREF = "/connexion/";

export const NAV = [
  { href: "/", label: "Accueil" },
  { href: "/fonctionnalites/", label: "Fonctionnalités" },
  { href: "/creation-site-web/", label: "Création de site web" },
  { href: "/tarifs/", label: "Tarifs" },
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
    text: "Messages préparés, puis envoyés depuis le numéro WhatsApp de l’institut.",
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

/** Formule affichée sur la vitrine et dans le SEO. Une seule source. */
const MONTHLY_PRICE = 599;
const ANNUAL_PRICE = 5990;

export const PUBLIC_OFFER = {
  name: "Rappel Beauty",
  monthlyPrice: MONTHLY_PRICE,
  annualPrice: ANNUAL_PRICE,
  /** 599 × 12 − 5 990 = 1 198 DH */
  annualSavings: MONTHLY_PRICE * 12 - ANNUAL_PRICE,
  /** Alias historique : même valeur que monthlyPrice. */
  price: MONTHLY_PRICE,
  /** Alias historique : même valeur que annualPrice. */
  yearlyPrice: ANNUAL_PRICE,
  currency: "MAD" as const,
  trialDays: 15,
  noCard: true,
  noCommitment: true,
} as const;

/** « 7 990 » pour l'affichage public. */
export function formatPrice(amount: number): string {
  return amount.toLocaleString("fr-FR");
}

/** Villes proposées à l’inscription, regroupées par région. */
export const CITY_GROUPS = [
  {
    region: "Casablanca-Settat",
    cities: ["Berrechid", "Bouskoura", "Casablanca", "Dar Bouazza", "El Jadida", "Mohammedia", "Settat"],
  },
  {
    region: "Rabat-Salé-Kénitra",
    cities: ["Kénitra", "Khémisset", "Rabat", "Salé", "Skhirate", "Témara"],
  },
  {
    region: "Tanger-Tétouan-Al Hoceïma",
    cities: ["Al Hoceïma", "Asilah", "Chefchaouen", "Fnideq", "Larache", "M'diq", "Martil", "Tanger", "Tétouan"],
  },
  {
    region: "Fès-Meknès",
    cities: ["Fès", "Ifrane", "Meknès", "Sefrou", "Taza"],
  },
  {
    region: "Marrakech-Safi",
    cities: ["Essaouira", "Marrakech", "Safi"],
  },
  {
    region: "Souss-Massa",
    cities: ["Agadir", "Aït Melloul", "Inezgane", "Taroudant", "Tiznit"],
  },
  {
    region: "L’Oriental",
    cities: ["Berkane", "Nador", "Oujda"],
  },
  {
    region: "Béni Mellal-Khénifra",
    cities: ["Béni Mellal", "Khénifra", "Khouribga"],
  },
  {
    region: "Drâa-Tafilalet",
    cities: ["Errachidia", "Ouarzazate"],
  },
  {
    region: "Régions sahariennes",
    cities: ["Dakhla", "Laâyoune"],
  },
] as const

export const CITIES = [...CITY_GROUPS.flatMap((group) => group.cities), "Autre"] as const

export type FaqCategory = "general" | "agenda" | "clientes" | "produits" | "site" | "tarifs" | "securite" | "support";

/** Shared by the FAQ interface and its structured data. */
export const FAQ_ITEMS = [
  { id: "presentation", category: "general", q: "Qu’est-ce que Rappel Beauty ?", a: "Rappel Beauty est un logiciel de gestion pour les instituts de beauté au Maroc. Il réunit vos rendez-vous, vos clientes, votre équipe, vos services, vos produits, votre caisse, la fidélité et la réservation en ligne." },
  { id: "essai", category: "tarifs", q: "Puis-je tester la plateforme gratuitement ?", a: `Oui. Vous disposez de ${PUBLIC_OFFER.trialDays} jours d’essai gratuit, sans carte bancaire et sans obligation de continuer. Vous pouvez découvrir le logiciel avec les informations de votre institut.` },
  { id: "reservation-site", category: "site", q: "Comment fonctionne la réservation en ligne ?", a: "Votre page de réservation présente vos services, leurs durées et les créneaux disponibles selon votre planning. La réservation rejoint le même agenda que les rendez-vous pris à l’accueil.", href: "/reservation-en-ligne/", linkLabel: "Découvrir la réservation en ligne" },
  { id: "vente-produits", category: "produits", q: "Puis-je vendre mes produits en ligne ?", a: "Vous pouvez présenter vos produits et permettre des demandes de retrait à l’institut. Le règlement se fait à l’institut." },
  { id: "donnees", category: "securite", q: "Un autre institut peut-il voir mes données ?", a: "Non. Chaque institut dispose de son propre espace. Les accès aux informations sont contrôlés selon les rôles et les autorisations des utilisateurs." },
  { id: "prix", category: "tarifs", q: "Combien coûte Rappel Beauty ?", a: `Rappel Beauty coûte ${formatPrice(PUBLIC_OFFER.monthlyPrice)} DH par mois ou ${formatPrice(PUBLIC_OFFER.annualPrice)} DH par an. La formule annuelle permet d’économiser ${formatPrice(PUBLIC_OFFER.annualSavings)} DH par rapport à douze mensualités.`, href: "/tarifs/", linkLabel: "Consulter les tarifs" },
  { id: "engagement", category: "tarifs", q: "Y a-t-il un engagement ?", a: "La formule mensuelle est sans engagement. Vous gardez le contrôle de votre abonnement. Vous pouvez consulter les formules ou contacter notre équipe pour une question sur votre situation." },
  { id: "accompagnement", category: "support", q: "Comment se passe l’accompagnement ?", a: "Le support en français est inclus. Notre équipe peut répondre à vos questions sur l’utilisation du logiciel et vous aider à prendre en main votre espace.", href: "/contact/", linkLabel: "Contacter notre équipe" },
  { id: "agenda", category: "agenda", q: "Comment organiser mes rendez-vous et mes cabines ?", a: "L’agenda affiche les rendez-vous par jour, sur trois jours, par semaine ou par mois. Chaque rendez-vous indique la cliente, le service, la praticienne et, si elle est assignée, la cabine. Vous pouvez ajuster l’horaire, la prestation et les notes.", href: "/gestion-rendez-vous/", linkLabel: "Découvrir l’agenda" },
  { id: "conflits", category: "agenda", q: "Le logiciel évite-t-il les doubles réservations ?", a: "Oui. Deux rendez-vous qui se chevauchent pour une même praticienne ou une même cabine assignée ne peuvent pas être enregistrés. Les créneaux proposés en ligne tiennent compte du même planning." },
  { id: "whatsapp", category: "agenda", q: "Les rappels WhatsApp sont-ils automatiques ?", a: "Non. Le logiciel prépare le message, puis une personne de l’institut le relit et l’envoie depuis le numéro WhatsApp de l’établissement. Il n’y a pas d’envoi automatique de rappels WhatsApp, SMS ou e-mail dans ce fonctionnement.", href: "/whatsapp/", linkLabel: "Comprendre WhatsApp assisté" },
  { id: "attente", category: "agenda", q: "Puis-je gérer une liste d’attente ?", a: "Oui. Lorsqu’une cliente souhaite un soin sans créneau disponible, vous pouvez la suivre dans la liste d’attente. Si une place se libère, l’institut peut préparer un message WhatsApp et l’envoyer lui-même." },
  { id: "fiches-clientes", category: "clientes", q: "Quelles informations retrouve-t-on dans une fiche cliente ?", a: "La fiche regroupe les coordonnées, l’historique des rendez-vous et des soins, ainsi que les notes utiles au suivi de la cliente. Les fiches sont textuelles, sans photo cliente en V1.", href: "/gestion-clientes/", linkLabel: "Découvrir la gestion des clientes" },
  { id: "fidelite", category: "clientes", q: "Comment fonctionne la fidélité ?", a: "Le programme de fidélité suit les paiements enregistrés. Les points, forfaits et cartes cadeaux vous aident à suivre la relation avec vos clientes. Un rendez-vous annulé ou une absence ne crée pas de points sans règlement.", href: "/fidelite/", linkLabel: "Découvrir la fidélité" },
  { id: "stock", category: "produits", q: "Puis-je suivre mon stock et mes achats ?", a: "Oui. Vous pouvez gérer les produits, les quantités, les mouvements de stock, les achats et les fournisseurs, y compris les produits consommés pendant les soins.", href: "/gestion-stock/", linkLabel: "Découvrir la gestion du stock" },
  { id: "paiement-clientes", category: "produits", q: "Où les clientes paient-elles leurs prestations et leurs produits ?", a: "Les clientes règlent directement à l’institut. Les paiements au comptoir peuvent être enregistrés en espèces, par carte, virement, chèque ou carte cadeau. Rappel Beauty n’encaisse pas les prestations à la place de l’institut." },
  { id: "marketplace", category: "site", q: "Rappel Beauty est-il une marketplace ?", a: "Non. Chaque institut dispose de son propre espace de gestion et peut publier sa propre page de réservation. Vos clientes réservent auprès de vous, pas dans un catalogue qui mélange plusieurs salons." },
  { id: "installation", category: "support", q: "Faut-il installer une application ?", a: "Non. Rappel Beauty fonctionne dans votre navigateur, sur ordinateur, tablette ou smartphone. Une connexion Internet suffit pour accéder à votre espace." },
  { id: "equipe", category: "support", q: "Combien d’utilisateurs sont inclus ?", a: "La formule est conçue pour votre équipe, sans frais supplémentaires par praticienne. Vous pouvez attribuer des rôles et des autorisations adaptés aux personnes qui utilisent le logiciel." },
  { id: "formule", category: "tarifs", q: "Que comprend la formule ?", a: "La formule donne accès aux fonctionnalités de gestion de Rappel Beauty : rendez-vous, clientes, équipe, services, stock, caisse, fidélité, réservation en ligne et outils de pilotage." },
  { id: "carte-bancaire", category: "tarifs", q: "Faut-il une carte bancaire pour essayer ?", a: `Non. L’essai gratuit de ${PUBLIC_OFFER.trialDays} jours ne nécessite pas de carte bancaire.` },
  { id: "maroc", category: "general", q: "Rappel Beauty est-il adapté aux instituts au Maroc ?", a: "Oui. Les prix et la caisse sont en dirhams, les clientes règlent directement à l’institut et chaque établissement peut disposer de sa propre page publique de réservation." },
  { id: "photos", category: "securite", q: "Les photos des clientes sont-elles utilisées ?", a: "Non. Aucune photo cliente n’est utilisée dans les fiches en V1. Les informations de suivi restent textuelles." },
  { id: "autorisations", category: "securite", q: "Puis-je limiter les accès de mon équipe ?", a: "Oui. Les rôles et autorisations permettent d’adapter les accès à chaque utilisateur de votre institut, selon ses responsabilités." },
] as const satisfies readonly { id: string; category: FaqCategory; q: string; a: string; href?: string; linkLabel?: string }[];
