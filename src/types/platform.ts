import type { PlanCode, SubscriptionStatus } from "@/types/subscription";

export type { PlanCode, SubscriptionStatus };
export type SubscriptionPlan = PlanCode;
export { PLAN_LABEL } from "@/types/subscription";

export type PlatformRole = "SUPER_ADMIN" | "SUPPORT";

export type OrganizationStatus = "ACTIVE" | "SUSPENDED" | "ARCHIVED";

export type CreateOrganizationInput = {
  name: string;
  slug: string;
  phone: string;
  email: string;
  address?: string | null;
  city?: string | null;
  owner: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
  };
  plan: PlanCode;
};

export type OrganizationListItem = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  phone: string | null;
  email: string | null;
  status: OrganizationStatus;
  plan: PlanCode | null;
  ownerName: string | null;
  ownerEmail: string | null;
  createdAt: string;
  mrr: number;
  usersCount: number;
  subscriptionStatus: SubscriptionStatus | null;
  renewAt: string | null;
};

export type PlatformDashboardStats = {
  orgs: number;
  orgsActive: number;
  orgsDelta: number;
  users: number;
  usersDelta: number;
  mrr: number;
  arr: number;
  activeSubs: number;
  rdv: number;
  customers: number;
};

export type PlatformAnalytics = PlatformDashboardStats & {
  planShare: Record<PlanCode, number>;
  mrrSeries: { label: string; value: number }[];
  mrrGrowthPercent: number;
  arpu: number;
  services: number;
  customersTotal: number;
  staffTotal: number;
};

export type PlatformBillingLine = {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationCity: string | null;
  organizationPhone: string | null;
  amount: number;
  plan: PlanCode;
  periodStart: string;
  periodEnd: string | null;
  status: string;
};

export type PlatformBillingUnpaid = {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationCity: string | null;
  organizationPhone: string | null;
  amount: number;
  dueAt: string;
  attemptsHint: string;
  statusLabel: string;
};

export type PlatformBillingSnapshot = {
  mrr: number;
  arr: number;
  mrrGrowthPercent: number;
  activeSubs: number;
  mrrSeries: { label: string; value: number }[];
  /** Proxy encaissement (MRR actifs − impayés) — pas de ledger SaaS */
  collected: number;
  collectedGrowthPercent: number;
  pastDueAmount: number;
  pastDueCount: number;
  collectionRate: number;
  fleet: {
    total: number;
    active: number;
    trial: number;
    cancelledThisMonth: number;
    suspended: number;
    expiringSoon: number;
  };
  movements: {
    newThisMonth: number;
    newMrr: number;
    churnThisMonth: number;
    churnMrr: number;
    netMrr: number;
  };
  renewals: {
    todayCount: number;
    todayAmount: number;
    next7Count: number;
    next7Amount: number;
    next30Count: number;
    next30Amount: number;
  };
  cityMrr: { city: string; mrr: number; pct: number }[];
  unpaid: PlatformBillingUnpaid[];
  history: {
    label: string;
    mrr: number;
    collected: number;
    pastDue: number;
    rate: number;
  }[];
  planShare: Record<PlanCode, number>;
  lines: PlatformBillingLine[];
};

export type PlatformOrgUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  status: string;
  organizationId: string | null;
  organizationName: string | null;
  organizationCity: string | null;
  createdAt: string;
  mustChangePassword: boolean;
  sessionVersion: number;
  accountKind: "ORG" | "PLATFORM";
  lastLoginAt: string | null;
};

export type PlatformUsersKpis = {
  total: number;
  active: number;
  disabled: number;
  thisMonth: number;
  inactive: number;
  onlineToday: number;
  watchlist: number;
  orgsCount: number;
  roleShare: Record<string, number>;
};

export type SupportSessionListItem = {
  id: string;
  organizationId: string;
  organizationName: string;
  platformUserName: string;
  reason: string | null;
  startedAt: string;
  endedAt: string | null;
  open: boolean;
};

export const PLATFORM_ROLE_LABEL: Record<PlatformRole, string> = {
  SUPER_ADMIN: "Super administrateur",
  SUPPORT: "Support",
};

export const ORG_USER_ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super administrateur",
  OWNER: "Propriétaire",
  MANAGER: "Responsable",
  STAFF: "Employée",
  CASHIER: "Caisse",
  ACCOUNTANT: "Comptable",
};

export const PLATFORM_AUDIT_ACTION_LABEL: Record<string, string> = {
  ORGANIZATION_CREATED: "Institut créé",
  ORGANIZATION_SUSPENDED: "Institut suspendu",
  ORGANIZATION_REACTIVATED: "Institut réactivé",
  ORGANIZATION_ARCHIVED: "Institut archivé",
  USER_DISABLED: "Utilisateur désactivé",
  USER_REACTIVATED: "Utilisateur réactivé",
  USER_DELETED: "Utilisateur soft-supprimé",
  USER_UPDATED: "Utilisateur modifié",
  USER_ROLE_CHANGED: "Rôle modifié",
  USER_PASSWORD_RESET: "Mot de passe réinitialisé",
  USER_SESSIONS_INVALIDATED: "Sessions invalidées",
  OWNER_ACCESS_RESET: "Accès propriétaire réinitialisé",
  SUBSCRIPTION_PLAN_CHANGED: "Formule modifiée",
  SUBSCRIPTION_STATUS_CHANGED: "Statut abonnement modifié",
  SUBSCRIPTION_CHANGED: "Plan abonnement modifié",
  SUBSCRIPTION_PLAN_CHANGE_SCHEDULED: "Changement de plan planifié",
  SUBSCRIPTION_SUSPENDED: "Abonnement suspendu",
  SUBSCRIPTION_REACTIVATED: "Abonnement réactivé",
  SUBSCRIPTION_CANCELLED: "Abonnement annulé",
  SUBSCRIPTION_EXTENDED: "Abonnement prolongé",
  SUBSCRIPTION_TRIAL_GRANTED: "Période gratuite accordée",
  SUBSCRIPTION_CREATED: "Abonnement créé",
  SUPPORT_SESSION_STARTED: "Session assistance démarrée",
  SUPPORT_SESSION_ENDED: "Session assistance terminée",
  PLATFORM_LOGIN: "Connexion plateforme",
  PLATFORM_LOGOUT: "Déconnexion plateforme",
  LOGIN: "Connexion",
};

export function platformAuditActionLabel(action: string): string {
  return PLATFORM_AUDIT_ACTION_LABEL[action] ?? action.replace(/_/g, " ");
}

export type OrganizationDetail = OrganizationListItem & {
  address: string | null;
  ownerPhone: string | null;
  stats: {
    customers: number;
    appointments: number;
    revenue: number;
    products: number;
    staff: number;
  };
  subscription: {
    id: string;
    plan: PlanCode;
    price: number;
    status: SubscriptionStatus;
    startAt: string;
    renewAt: string;
  } | null;
};
