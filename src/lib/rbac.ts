export type AppRole =
  | "OWNER"
  | "MANAGER"
  | "STAFF"
  | "CASHIER"
  | "ACCOUNTANT";

const APP_ROLES: AppRole[] = ["OWNER", "MANAGER", "STAFF", "CASHIER", "ACCOUNTANT"];

export function isAppRole(role: string | undefined | null): role is AppRole {
  return Boolean(role && APP_ROLES.includes(role as AppRole));
}

export type AccessLevel = "write" | "read" | "limited" | "none";

export type AppFeature =
  | "agenda"
  | "customers"
  | "services"
  | "staff"
  | "resources"
  | "stock"
  | "cash-register"
  | "expenses"
  | "commissions"
  | "loyalty"
  | "promotions"
  | "whatsapp"
  | "reactivation"
  | "marketing"
  | "reviews"
  | "analytics"
  | "settings";

/** Matrice V1 — permissions métier par rôle */
export const FEATURE_ACCESS: Record<AppRole, Record<AppFeature, AccessLevel>> = {
  OWNER: {
    agenda: "write",
    customers: "write",
    services: "write",
    staff: "write",
    resources: "write",
    stock: "write",
    "cash-register": "write",
    expenses: "write",
    commissions: "write",
    loyalty: "write",
    promotions: "write",
    whatsapp: "write",
    reactivation: "write",
    marketing: "write",
    reviews: "write",
    analytics: "write",
    settings: "write",
  },
  MANAGER: {
    agenda: "write",
    customers: "write",
    services: "write",
    staff: "write",
    resources: "write",
    stock: "write",
    "cash-register": "write",
    expenses: "write",
    commissions: "read",
    loyalty: "write",
    promotions: "write",
    whatsapp: "write",
    reactivation: "write",
    marketing: "write",
    reviews: "write",
    analytics: "write",
    settings: "limited",
  },
  STAFF: {
    agenda: "write",
    customers: "limited",
    services: "read",
    staff: "read",
    resources: "read",
    stock: "none",
    "cash-register": "none",
    expenses: "none",
    commissions: "limited",
    loyalty: "read",
    promotions: "read",
    whatsapp: "limited",
    reactivation: "limited",
    marketing: "limited",
    reviews: "limited",
    analytics: "limited",
    settings: "none",
  },
  CASHIER: {
    agenda: "none",
    customers: "read",
    services: "read",
    staff: "limited",
    resources: "none",
    stock: "none",
    "cash-register": "write",
    expenses: "limited",
    commissions: "none",
    loyalty: "limited",
    promotions: "limited",
    whatsapp: "none",
    reactivation: "none",
    marketing: "none",
    reviews: "none",
    analytics: "limited",
    settings: "none",
  },
  ACCOUNTANT: {
    agenda: "read",
    customers: "read",
    services: "read",
    staff: "read",
    resources: "read",
    stock: "read",
    "cash-register": "read",
    expenses: "read",
    commissions: "read",
    loyalty: "read",
    promotions: "read",
    whatsapp: "none",
    reactivation: "none",
    marketing: "read",
    reviews: "read",
    analytics: "write",
    settings: "none",
  },
};

export const ROLE_LABEL: Record<AppRole, string> = {
  OWNER: "Propriétaire",
  MANAGER: "Responsable",
  STAFF: "Employée",
  CASHIER: "Caisse",
  ACCOUNTANT: "Comptable",
};

/** Visibilité sidebar — dérivée de la matrice + modules transverses */
export const ROLE_NAV: Record<AppRole, string[]> = {
  OWNER: ["*"],
  MANAGER: ["*"],
  STAFF: [
    "dashboard",
    "agenda",
    "customers",
    "staff",
    "resources",
    "commissions",
    "loyalty",
    "promotions",
    "whatsapp",
    "reactivation",
    "marketing",
    "reviews",
    "analytics",
    "notifications",
    "profile",
    "security",
  ],
  CASHIER: [
    "dashboard",
    "customers",
    "cash-register",
    "payments",
    "invoices",
    "expenses",
    "loyalty",
    "promotions",
    "gift-cards",
    "analytics",
    "notifications",
    "profile",
    "security",
  ],
  ACCOUNTANT: [
    "dashboard",
    "agenda",
    "customers",
    "staff",
    "products",
    "stock",
    "inventory",
    "cash-register",
    "payments",
    "expenses",
    "invoices",
    "commissions",
    "loyalty",
    "promotions",
    "gift-cards",
    "analytics",
    "reports",
    "notifications",
    "profile",
    "security",
  ],
};

const NAV_FEATURE: Record<string, AppFeature | null> = {
  agenda: "agenda",
  customers: "customers",
  services: "services",
  staff: "staff",
  resources: "resources",
  inventory: "stock",
  products: "stock",
  stock: "stock",
  purchases: "stock",
  suppliers: "stock",
  "cash-register": "cash-register",
  payments: "cash-register",
  invoices: "cash-register",
  expenses: "expenses",
  commissions: "commissions",
  loyalty: "loyalty",
  promotions: "promotions",
  "gift-cards": "promotions",
  whatsapp: "whatsapp",
  reactivation: "reactivation",
  marketing: "marketing",
  reviews: "reviews",
  analytics: "analytics",
  reports: "analytics",
  settings: "settings",
  users: "settings",
};

export function getFeatureAccess(role: AppRole, feature: AppFeature): AccessLevel {
  return FEATURE_ACCESS[role][feature] ?? "none";
}

export function canReadFeature(role: AppRole, feature: AppFeature): boolean {
  const level = getFeatureAccess(role, feature);
  return level === "read" || level === "write" || level === "limited";
}

export function canWriteFeature(role: AppRole, feature: AppFeature): boolean {
  return getFeatureAccess(role, feature) === "write";
}

/** STAFF : écriture limitée (pas marketing / champs admin) */
export function canWriteFeatureLimited(role: AppRole, feature: AppFeature): boolean {
  const level = getFeatureAccess(role, feature);
  return level === "write" || level === "limited";
}

export function canEditCustomerMarketing(role: AppRole): boolean {
  return getFeatureAccess(role, "customers") === "write";
}

/** Modification des prix de prestations — OWNER / MANAGER uniquement */
export function canEditServicePrice(role: AppRole): boolean {
  return getFeatureAccess(role, "services") === "write";
}

export function canWriteStaff(role: AppRole): boolean {
  return getFeatureAccess(role, "staff") === "write";
}

export function canWriteResources(role: AppRole): boolean {
  return getFeatureAccess(role, "resources") === "write";
}

export function canWriteStock(role: AppRole): boolean {
  return getFeatureAccess(role, "stock") === "write";
}

export function canWriteCashRegister(role: AppRole): boolean {
  return getFeatureAccess(role, "cash-register") === "write";
}

export function canWriteExpenses(role: AppRole): boolean {
  return getFeatureAccess(role, "expenses") === "write";
}

/** Création : OWNER/MANAGER (write) + CASHIER (limited) */
export function canCreateExpense(role: AppRole): boolean {
  const level = getFeatureAccess(role, "expenses");
  return level === "write" || level === "limited";
}

export function canArchiveExpense(role: AppRole): boolean {
  return getFeatureAccess(role, "expenses") === "write";
}

/** Remboursement : OWNER/MANAGER libre ; CASHIER jusqu'à REFUND_CASHIER_MAX */
export function canCreateRefund(role: AppRole, amount: number): boolean {
  if (role === "OWNER" || role === "MANAGER") return true;
  if (role === "CASHIER") return amount <= 200;
  return false;
}

/** Commissions employées — édition OWNER uniquement ; MANAGER lecture */
export function canEditStaffCommissions(role: AppRole): boolean {
  return role === "OWNER";
}

export function canViewStaffCommissions(role: AppRole): boolean {
  return canReadFeature(role, "commissions");
}

/** Module /commissions — OWNER write ; MANAGER/ACCOUNTANT read ; STAFF limited (soi) */
export function canWriteCommissions(role: AppRole): boolean {
  return getFeatureAccess(role, "commissions") === "write";
}

export function canCloseCommissionPeriod(role: AppRole): boolean {
  return role === "OWNER";
}

export function canExportCommissions(role: AppRole): boolean {
  return (
    getFeatureAccess(role, "commissions") === "write" ||
    getFeatureAccess(role, "commissions") === "read" ||
    role === "ACCOUNTANT"
  );
}

export function canWriteLoyalty(role: AppRole): boolean {
  return getFeatureAccess(role, "loyalty") === "write";
}

/** Caisse peut utiliser / voir récompenses (limited) */
export function canRedeemLoyalty(role: AppRole): boolean {
  const level = getFeatureAccess(role, "loyalty");
  return level === "write" || level === "limited";
}

export function canWritePromotions(role: AppRole): boolean {
  return getFeatureAccess(role, "promotions") === "write";
}

export function canReadWhatsapp(role: AppRole): boolean {
  return canReadFeature(role, "whatsapp");
}

/** Envoi / marquer envoyé — OWNER, MANAGER, STAFF */
export function canSendWhatsapp(role: AppRole): boolean {
  const level = getFeatureAccess(role, "whatsapp");
  return level === "write" || level === "limited";
}

/** Modèles WhatsApp — OWNER / MANAGER */
export function canWriteWhatsappTemplates(role: AppRole): boolean {
  return getFeatureAccess(role, "whatsapp") === "write";
}

export function canReadReactivation(role: AppRole): boolean {
  return canReadFeature(role, "reactivation");
}

export function canSendReactivation(role: AppRole): boolean {
  const level = getFeatureAccess(role, "reactivation");
  return level === "write" || level === "limited";
}

export function canWriteReactivationSettings(role: AppRole): boolean {
  return getFeatureAccess(role, "reactivation") === "write";
}

export function canReadMarketing(role: AppRole): boolean {
  return canReadFeature(role, "marketing");
}

export function canWriteCampaigns(role: AppRole): boolean {
  return getFeatureAccess(role, "marketing") === "write";
}

export function canPrepareCampaigns(role: AppRole): boolean {
  const level = getFeatureAccess(role, "marketing");
  return level === "write" || level === "limited";
}

export function canReadReviews(role: AppRole): boolean {
  return canReadFeature(role, "reviews");
}

export function canSendReviews(role: AppRole): boolean {
  const level = getFeatureAccess(role, "reviews");
  return level === "write" || level === "limited";
}

export function canManageReviewSettings(role: AppRole): boolean {
  return getFeatureAccess(role, "reviews") === "write";
}

export type AnalyticsScope = "full" | "staff_self" | "cash_only";

export function getAnalyticsScope(role: AppRole): AnalyticsScope | null {
  const level = getFeatureAccess(role, "analytics");
  if (level === "none") return null;
  if (level === "write" || level === "read") return "full";
  if (role === "STAFF") return "staff_self";
  if (role === "CASHIER") return "cash_only";
  return null;
}

export function canReadAnalytics(role: AppRole): boolean {
  return getAnalyticsScope(role) !== null;
}

export function canEditStaffLeaves(role: AppRole): boolean {
  return getFeatureAccess(role, "staff") === "write";
}

/** STAFF voit performance limitée (sans CA détaillé) */
export function canViewStaffPerformanceFull(role: AppRole): boolean {
  return getFeatureAccess(role, "staff") === "write" || role === "ACCOUNTANT";
}

export function canAccessNav(role: AppRole | string | undefined, navKey: string): boolean {
  if (!isAppRole(role)) return false;
  const allowed = ROLE_NAV[role];
  if (!allowed) return false;
  if (allowed.includes("*")) return true;
  if (allowed.includes(navKey)) return true;

  const feature = NAV_FEATURE[navKey];
  if (!feature) return allowed.includes(navKey);
  return canReadFeature(role, feature);
}

/** @deprecated Utiliser canAccessNav — conservé pour compatibilité temporaire */
export function canAccess(role: AppRole, key: string) {
  return canAccessNav(role, key);
}
