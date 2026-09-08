import type { PlanFeatureKey } from "@/types/subscription";

/** Clé de navigation sidebar → feature plan requise (null = toujours accessible) */
export const NAV_PLAN_FEATURE: Record<string, PlanFeatureKey | null> = {
  dashboard: null,
  agenda: "agenda",
  planning: "agenda",
  customers: "customers",
  services: "services",
  staff: "staff",
  resources: "staff",
  products: "inventory",
  stock: "inventory",
  suppliers: "inventory",
  purchases: "purchases",
  "cash-register": "cashRegister",
  pos: "cashRegister",
  payments: "cashRegister",
  invoices: "invoices",
  expenses: "expenses",
  commissions: "commissions",
  loyalty: "loyalty",
  promotions: "marketing",
  "gift-cards": "marketing",
  whatsapp: "whatsappManual",
  "waiting-list": "agenda",
  reactivation: "marketing",
  "post-visit": "marketing",
  marketing: "marketing",
  reviews: "reviews",
  analytics: "analytics",
  reports: "analytics",
  notifications: null,
  support: null,
  ai: "ai",
  settings: null,
  profile: null,
  security: null,
};

export function pathnameToNavKey(pathname: string): string | null {
  const path = pathname.replace(/^\/domains\/app/, "").replace(/\/$/, "") || "/";
  if (path === "/" || path.startsWith("/dashboard")) return "dashboard";
  const segment = path.split("/").filter(Boolean)[0];
  if (!segment) return "dashboard";
  const map: Record<string, string> = {
    agenda: "agenda",
    planning: "agenda",
    customers: "customers",
    services: "services",
    staff: "staff",
    resources: "resources",
    products: "products",
    stock: "stock",
    suppliers: "suppliers",
    purchases: "purchases",
    "cash-register": "cash-register",
    pos: "pos",
    payments: "payments",
    invoices: "invoices",
    expenses: "expenses",
    commissions: "commissions",
    loyalty: "loyalty",
    promotions: "promotions",
    "gift-cards": "gift-cards",
    whatsapp: "whatsapp",
    "waiting-list": "waiting-list",
    reactivation: "reactivation",
    "post-visit": "post-visit",
    marketing: "marketing",
    reviews: "reviews",
    analytics: "analytics",
    reports: "reports",
    notifications: "notifications",
    support: "support",
    ai: "ai",
    settings: "settings",
    profile: "profile",
    security: "security",
  };
  return map[segment] ?? null;
}

export function isPlanFeatureEnabled(
  features: Record<string, boolean> | null | undefined,
  navKey: string,
): boolean {
  // POS = caisse + stock (pas de 2ᵉ feature plan dédiée)
  if (navKey === "pos") {
    if (!features) return true;
    return features.cashRegister === true && features.inventory === true;
  }
  const required = NAV_PLAN_FEATURE[navKey];
  if (!required) return true;
  if (!features) return true;
  return features[required] === true;
}
