import type { AppRole } from "@/lib/rbac";

export type AIMessageRole = "USER" | "ASSISTANT" | "SYSTEM" | "TOOL";

export type AIToolName =
  | "getRevenue"
  | "getDashboard"
  | "getCustomers"
  | "getCustomerStats"
  | "getAppointments"
  | "getStaffPerformance"
  | "getInventory"
  | "getMarketingStats"
  | "getLoyaltyStats"
  | "getReviewStats"
  | "searchCustomers"
  | "searchServices";

/** Contexte IA — organizationId uniquement depuis la session (jamais le body) */
export type AIRequestContext = {
  organizationId: string;
  userId: string;
  role: AppRole;
  planCode: string | null;
  userDisplayName: string;
};

export type AIToolResult = {
  ok: boolean;
  tool: AIToolName;
  /** Données métier réelles (jamais inventées) */
  data?: unknown;
  error?: string;
  /** Confirmation humaine requise pour actions futures */
  requiresConfirmation?: boolean;
};

export type AIChatMessage = {
  role: AIMessageRole;
  content: string;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
};

export type AIConversationSummary = {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
};

export type AIConversationDetail = AIConversationSummary & {
  messages: AIChatMessage[];
};

export type AIUsageSnapshot = {
  periodKey: string;
  messageCount: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCostMad: number;
  maxMessages: number | null;
  remainingMessages: number | null;
};

export type AIDashboardInsight = {
  /** Période d'analyse affichée */
  periodLabel: string;
  /** true si aucune activité / KPI à zéro */
  empty: boolean;
  /** Toujours issu des KPI analytics — jamais inventé */
  kpis: {
    revenue: number;
    revenuePrevious: number;
    revenueChangePercent: number | null;
    customersDelta: number | null;
    customersNew: number;
    inactiveCustomers: number;
    lowStockCount: number;
    noShowRate: number | null;
    topServiceName: string | null;
    topServiceRevenueShare: number | null;
    /** Alias compat */
    revenueMonth: number;
    revenuePrevMonth: number;
    inactiveCustomers60d: number;
  };
  bullets: string[];
  opportunities: { text: string; href: string }[];
  disclaimer: string;
};

export type AIRecommendation = {
  id: string;
  title: string;
  detail: string;
  /** Module existant à ouvrir (jamais exécution auto) */
  actionHref: string;
  actionLabel: string;
};

export type AIMessageKind =
  | "inactive"
  | "birthday"
  | "post_visit"
  | "confirmation"
  | "reactivation"
  | "promotion";

export type AIMessageTone = "professional" | "warm" | "short";
export type AIMessageLanguage = "fr" | "darija" | "ar";

/** Attribution Analytics / booking public — source unique, jamais inventée */
export const AI_MARKETING_ATTRIBUTION = "ai_marketing" as const;

export const AI_MESSAGE_KINDS: AIMessageKind[] = [
  "inactive",
  "birthday",
  "post_visit",
  "confirmation",
  "reactivation",
  "promotion",
];

export const AI_MESSAGE_KIND_LABEL: Record<AIMessageKind, string> = {
  inactive: "Relance inactive",
  birthday: "Anniversaire",
  post_visit: "Post-prestation",
  confirmation: "Confirmation RDV",
  reactivation: "Réactivation",
  promotion: "Promotion",
};

export const AI_MESSAGE_TONE_LABEL: Record<AIMessageTone, string> = {
  professional: "Professionnel",
  warm: "Chaleureux",
  short: "Court",
};

export const AI_MESSAGE_LANGUAGE_LABEL: Record<AIMessageLanguage, string> = {
  fr: "Français",
  darija: "Darija",
  ar: "Arabe",
};

export type AIGenerateMessageInput = {
  kind: AIMessageKind;
  /** Consigne libre optionnelle (ex. offre du jour) */
  objective?: string;
  tone?: AIMessageTone;
  language?: AIMessageLanguage;
  promotion?: string | null;
  channel?: "whatsapp" | "sms" | "email";
  customerId?: string | null;
  appointmentId?: string | null;
  variantCount?: number;
};

/** Faits envoyés au modèle — jamais téléphone, e-mail, notes, CA, LTV */
export type AIMessageLlmFacts = {
  firstName: string;
  lastService: string | null;
  lastVisitDate: string | null;
  recommendedService: string | null;
  appointmentDate: string | null;
  appointmentTime: string | null;
  organizationName: string;
  promotion: string | null;
  bookingUrl: string | null;
  kind: AIMessageKind;
  tone: AIMessageTone;
  language: AIMessageLanguage;
  objective: string | null;
};

export type AIMessagePersonalization = {
  firstName: string;
  lastService: string | null;
  lastVisitDate: string | null;
  recommendedService: string | null;
  appointmentDate: string | null;
  appointmentTime: string | null;
};

export type AIGenerateMessageResult = {
  variants: string[];
  kind: AIMessageKind;
  tone: AIMessageTone;
  language: AIMessageLanguage;
  personalization: AIMessagePersonalization | null;
  bookingUrl: string | null;
  customer: {
    id: string;
    firstName: string;
    hasPhone: boolean;
    marketingWhatsapp: boolean;
  } | null;
  disclaimer: string;
};

export type AICommitWhatsAppInput = {
  customerId: string;
  message: string;
  kind: AIMessageKind;
  appointmentId?: string | null;
  /** Si vrai, envoie le message directement au client via l'API Meta sans ouvrir WhatsApp Web */
  sendDirect?: boolean;
};

export type AIProviderChatInput = {
  systemPrompt: string;
  messages: { role: "user" | "assistant" | "system"; content: string }[];
  /** Résumés tools déjà exécutés (données réelles) */
  toolContext?: string;
  temperature?: number;
};

export type AIProviderChatOutput = {
  content: string;
  promptTokens: number;
  completionTokens: number;
  provider: string;
};

export type AIChatResult = {
  conversationId: string;
  reply: string;
  toolsUsed: string[];
  provider: string;
  /** Faits KPI utilisés (pour UI sources) */
  sources: { tool: string; ok: boolean; label: string }[];
  fallback: boolean;
};

/** Quotas messages / mois par plan (V1) */
export const AI_MONTHLY_MESSAGE_LIMIT: Record<string, number | null> = {
  STARTER: 0,
  INSTITUT: 100,
  PREMIUM: 500,
};

export const AI_RATE_LIMIT = { limit: 20, windowMs: 60_000 } as const;
