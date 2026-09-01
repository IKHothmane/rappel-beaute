export type PlanCode = "STARTER" | "INSTITUT" | "PREMIUM";

export type SubscriptionStatus =
  | "TRIAL"
  | "ACTIVE"
  | "PAST_DUE"
  | "PAUSED"
  | "CANCELLED"
  | "EXPIRED";

export type BillingInterval = "MONTHLY" | "YEARLY";

/** Clés de fonctionnalités configurables par plan (JSONB) */
export type PlanFeatureKey =
  | "agenda"
  | "customers"
  | "services"
  | "staff"
  | "booking"
  | "whatsappManual"
  | "inventory"
  | "purchases"
  | "cashRegister"
  | "invoices"
  | "expenses"
  | "commissions"
  | "loyalty"
  | "marketing"
  | "reviews"
  | "analytics"
  | "multiSite"
  | "api"
  | "automation"
  | "ai";

export type PlanFeatures = Record<PlanFeatureKey, boolean>;

export type PlanLimitKey = "staff" | "customers" | "appointments" | "resources";

export type PlanDto = {
  id: string;
  code: PlanCode;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  billingInterval: BillingInterval;
  maxStaff: number | null;
  maxCustomers: number | null;
  maxAppointmentsPerMonth: number | null;
  maxResources: number | null;
  trialDays: number;
  active: boolean;
  features: PlanFeatures;
};

export type SubscriptionDto = {
  id: string;
  organizationId: string;
  planId: string;
  planCode: PlanCode;
  planName: string;
  status: SubscriptionStatus;
  priceSnapshot: number;
  currencySnapshot: string;
  startedAt: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelledAt: string | null;
  trialEndsAt: string | null;
  features: PlanFeatures;
  limits: {
    maxStaff: number | null;
    maxCustomers: number | null;
    maxAppointmentsPerMonth: number | null;
    maxResources: number | null;
  };
};

export type UsageDto = {
  staff: { used: number; max: number | null };
  customers: { used: number; max: number | null };
  appointments: { used: number; max: number | null; periodStart: string; periodEnd: string };
  resources: { used: number; max: number | null };
};

export const TRIAL_DAYS_DEFAULT = 14;

export const PLAN_LABEL: Record<PlanCode, string> = {
  STARTER: "Starter",
  INSTITUT: "Institut",
  PREMIUM: "Premium",
};

export const APPOINTMENT_COUNT_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "ARRIVED",
  "IN_PROGRESS",
  "COMPLETED",
  "NO_SHOW",
] as const;

export const PLAN_FEATURE_LABELS: Record<PlanFeatureKey, string> = {
  agenda: "Agenda",
  customers: "Clientes",
  services: "Services",
  staff: "Employées",
  booking: "Réservation en ligne",
  whatsappManual: "WhatsApp assisté",
  inventory: "Stock",
  purchases: "Achats",
  cashRegister: "Caisse",
  invoices: "Factures",
  expenses: "Dépenses",
  commissions: "Commissions",
  loyalty: "Fidélité",
  marketing: "Marketing",
  reviews: "Avis",
  analytics: "Analytics",
  multiSite: "Multi-sites",
  api: "API",
  automation: "Automatisation",
  ai: "IA",
};
