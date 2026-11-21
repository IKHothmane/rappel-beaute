import { CalendarDays, Layers, Monitor, ShoppingCart } from "lucide-react";
import type { WebsiteVariant } from "./WebsitePreview";

/** Les quatre types de site proposés. Partagé par la page marketing et la carte Abonnement de l'application. */
export const WEBSITE_OFFERS: {
  id: WebsiteVariant;
  icon: typeof Monitor;
  title: string;
  description: string;
  features: string[];
  badge?: string;
}[] = [
  {
    id: "vitrine",
    icon: Monitor,
    title: "Site vitrine",
    description: "Présentez votre institut, vos soins, vos tarifs et vos coordonnées.",
    features: [
      "Page d’accueil à votre image",
      "Services et tarifs",
      "Galerie de votre institut",
      "Contact et localisation",
    ],
  },
  {
    id: "rendez-vous",
    icon: CalendarDays,
    title: "Site avec prise de rendez-vous",
    description: "Une vitrine avec réservation en ligne, reliée à votre agenda Rappel Beauty.",
    badge: "Populaire",
    features: [
      "Tout du site vitrine",
      "Réservation en ligne 24h/24",
      "Créneaux issus de votre planning",
      "Messages WhatsApp préparés",
    ],
  },
  {
    id: "boutique",
    icon: ShoppingCart,
    title: "Site e-commerce + RDV",
    description: "Présentez vos produits et permettez la réservation de vos soins.",
    features: [
      "Tout du site avec RDV",
      "Catalogue de produits",
      "Demandes et retrait à l’institut",
      "Connexion aux stocks selon le projet",
    ],
  },
  {
    id: "complet",
    icon: Layers,
    title: "Site complet",
    description:
      "Réunissez votre présentation, vos soins, vos produits et vos avis dans une même vitrine.",
    badge: "Recommandé",
    features: [
      "Présentation complète de l’institut",
      "Réservation en ligne",
      "Catalogue de produits",
      "Avis clients selon les sources disponibles",
      "Connexions à Rappel Beauty définies ensemble",
    ],
  },
];
