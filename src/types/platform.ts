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
