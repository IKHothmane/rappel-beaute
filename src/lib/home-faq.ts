import { formatPrice, PUBLIC_OFFER } from "@/lib/site";

export const HOME_FAQS = [
  {
    question: "Les rappels WhatsApp partent-ils tout seuls ?",
    answer: "Non, et c’est volontaire. Rappel Beauty prépare le message ; une personne de l’institut l’ouvre dans WhatsApp et l’envoie elle-même. Vos clientes le reçoivent depuis le numéro habituel de l’institut.",
    icon: "MessageCircle",
  },
  {
    question: "Puis-je essayer Rappel Beauty gratuitement ?",
    answer: `Oui, pendant ${PUBLIC_OFFER.trialDays} jours, sans carte bancaire. L’essai ne devient pas un abonnement tant que vous ne choisissez pas une formule.`,
    icon: "Gift",
  },
  {
    question: "Y a-t-il un engagement ?",
    answer: "La formule mensuelle est sans engagement. Vous gardez le contrôle de votre abonnement.",
    icon: "Handshake",
  },
  {
    question: "Combien coûte Rappel Beauty ?",
    answer: `Rappel Beauty propose une formule tout inclus à ${formatPrice(PUBLIC_OFFER.monthlyPrice)} DH par mois ou ${formatPrice(PUBLIC_OFFER.annualPrice)} DH par an. Consultez la section Tarifs pour choisir votre période de facturation.`,
    icon: "CreditCard",
  },
  {
    question: "Faut-il installer quelque chose ?",
    answer: "Non. Rappel Beauty fonctionne directement dans votre navigateur sur ordinateur, tablette ou smartphone. Une connexion Internet suffit.",
    icon: "Laptop",
  },
  {
    question: "Combien d’utilisateurs sont inclus ?",
    answer: "La formule est conçue pour votre équipe, sans frais supplémentaires par praticienne. Vous pouvez attribuer des rôles et des autorisations adaptés.",
    icon: "Users",
  },
  {
    question: "Un autre institut peut-il voir mes données ?",
    answer: "Non. Chaque institut dispose de son propre espace et les accès sont contrôlés selon les rôles des utilisateurs.",
    icon: "ShieldCheck",
  },
  {
    question: "La réservation en ligne est-elle incluse ?",
    answer: "Oui. La réservation en ligne fait partie des fonctionnalités de Rappel Beauty, avec la gestion de l’agenda, des clientes et des rendez-vous.",
    icon: "CalendarDays",
  },
] as const;
