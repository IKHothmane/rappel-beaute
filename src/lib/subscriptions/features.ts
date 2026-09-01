import type { AppFeature } from "@/lib/rbac";
import type { PlanFeatureKey, PlanFeatures } from "@/types/subscription";

export type { PlanFeatureKey };

export const DEFAULT_PLAN_FEATURES: PlanFeatures = {
  agenda: false,
  customers: false,
  services: false,
  staff: false,
  booking: false,
  whatsappManual: false,
  inventory: false,
  purchases: false,
  cashRegister: false,
  invoices: false,
  expenses: false,
  commissions: false,
  loyalty: false,
  marketing: false,
  reviews: false,
  analytics: false,
  multiSite: false,
  api: false,
  automation: false,
  ai: false,
};

export function parsePlanFeatures(raw: unknown): PlanFeatures {
  const base = { ...DEFAULT_PLAN_FEATURES };
  if (!raw || typeof raw !== "object") return base;
  for (const key of Object.keys(DEFAULT_PLAN_FEATURES) as PlanFeatureKey[]) {
    if (key in (raw as Record<string, unknown>)) {
      base[key] = (raw as Record<string, unknown>)[key] === true;
    }
  }
  return base;
}

/** Mapping feature app (RBAC) → feature plan (abonnement) */
export const APP_FEATURE_TO_PLAN: Partial<Record<AppFeature, PlanFeatureKey>> = {
  agenda: "agenda",
  customers: "customers",
  services: "services",
  staff: "staff",
  resources: "staff",
  stock: "inventory",
  "cash-register": "cashRegister",
  expenses: "expenses",
  commissions: "commissions",
  loyalty: "loyalty",
  promotions: "marketing",
  marketing: "marketing",
  reviews: "reviews",
  analytics: "analytics",
  whatsapp: "whatsappManual",
  reactivation: "marketing",
};

export function planFeatureForAppFeature(feature: AppFeature): PlanFeatureKey | null {
  return APP_FEATURE_TO_PLAN[feature] ?? null;
}

export function isFeatureEnabled(features: PlanFeatures, key: PlanFeatureKey): boolean {
  return features[key] === true;
}

export const STARTER_INCLUDED_FEATURES: PlanFeatureKey[] = [
  "agenda",
  "customers",
  "services",
  "staff",
  "booking",
  "whatsappManual",
];

export const INSTITUT_EXTRA_FEATURES: PlanFeatureKey[] = [
  "inventory",
  "purchases",
  "cashRegister",
  "invoices",
  "expenses",
  "commissions",
  "loyalty",
  "marketing",
  "reviews",
  "analytics",
];
