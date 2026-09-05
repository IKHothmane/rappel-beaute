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
  amount: number;
  plan: PlanCode;
  periodStart: string;
  status: string;
};

export type PlatformBillingSnapshot = {
  mrr: number;
  arr: number;
  mrrGrowthPercent: number;
  activeSubs: number;
  mrrSeries: { label: string; value: number }[];
  planShare: Record<PlanCode, number>;
  lines: PlatformBillingLine[];
};

export type PlatformOrgUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  organizationId: string;
  organizationName: string;
  createdAt: string;
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
  OWNER_ACCESS_RESET: "Accès propriétaire réinitialisé",
  SUBSCRIPTION_PLAN_CHANGED: "Formule modifiée",
  SUBSCRIPTION_STATUS_CHANGED: "Statut abonnement modifié",
  SUPPORT_SESSION_STARTED: "Session assistance démarrée",
  SUPPORT_SESSION_ENDED: "Session assistance terminée",
  PLATFORM_LOGIN: "Connexion plateforme",
  PLATFORM_LOGOUT: "Déconnexion plateforme",
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
