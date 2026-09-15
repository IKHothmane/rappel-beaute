export type ChatLine = {
  role: "user" | "assistant";
  content: string;
  sources?: { tool: string; ok: boolean; label: string }[];
  streaming?: boolean;
  fallback?: boolean;
  at?: string;
};

export const QUICK_PROMPTS = [
  {
    emoji: "💰",
    label: "Analyser mon CA",
    prompt: "Analyse mon chiffre d’affaires de ce mois et compare-le au mois précédent.",
  },
  {
    emoji: "📅",
    label: "Optimiser planning",
    prompt: "Où est la tension sur le planning cette semaine, et que recommandes-tu ?",
  },
  {
    emoji: "👥",
    label: "Clientes à relancer",
    prompt: "Quelles clientes sont inactives et devraient être relancées ?",
  },
  {
    emoji: "📦",
    label: "Ruptures de stock",
    prompt: "Quels produits sont en rupture ou sous le stock minimum ?",
  },
  {
    emoji: "📣",
    label: "Campagne WhatsApp",
    prompt: "Propose une relance WhatsApp pour les clientes inactives, sans envoyer le message.",
  },
  {
    emoji: "📈",
    label: "Rapport de gestion",
    prompt: "Fais un bilan de gestion synthétique : CA, RDV, stock et clientes à relancer.",
  },
] as const;

export const FAST_PROMPTS = [
  { emoji: "📊", label: "Panier moyen", prompt: "Quel est le panier moyen ce mois ?" },
  { emoji: "⚠️", label: "Risques no-show", prompt: "Quelles clientes risquent un no-show ?" },
  { emoji: "⭐", label: "Top de l’équipe", prompt: "Quelles sont les meilleures performances de l’équipe ce mois-ci ?" },
  { emoji: "🧾", label: "Clôture journée", prompt: "Fais le bilan de clôture de journée" },
] as const;
