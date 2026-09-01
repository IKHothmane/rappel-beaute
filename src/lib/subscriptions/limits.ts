import type { PlanLimitKey } from "@/types/subscription";
import {
  getOrganizationSubscription,
  getSubscriptionUsage,
  isSubscriptionOperational,
} from "@/lib/subscriptions/subscription-service";
import { isFeatureEnabled, type PlanFeatureKey } from "@/lib/subscriptions/features";

export type LimitCheckResult =
  | { ok: true }
  | {
      ok: false;
      code: "LIMIT_REACHED" | "FEATURE_NOT_INCLUDED" | "SUBSCRIPTION_INACTIVE";
      message: string;
      limit?: PlanLimitKey;
      used?: number;
      max?: number | null;
      planCode?: string;
      planName?: string;
    };

export async function assertSubscriptionActive(
  organizationId: string,
): Promise<LimitCheckResult> {
  const sub = await getOrganizationSubscription(organizationId);
  if (!sub) {
    return {
      ok: false,
      code: "SUBSCRIPTION_INACTIVE",
      message: "Aucun abonnement actif.",
    };
  }
  if (!isSubscriptionOperational(sub)) {
    return {
      ok: false,
      code: "SUBSCRIPTION_INACTIVE",
      message: "Votre abonnement n'est pas actif.",
      planCode: sub.planCode,
      planName: sub.planName,
    };
  }
  return { ok: true };
}

export async function canUseFeature(
  organizationId: string,
  feature: PlanFeatureKey,
): Promise<LimitCheckResult> {
  const active = await assertSubscriptionActive(organizationId);
  if (!active.ok) return active;

  const sub = await getOrganizationSubscription(organizationId);
  if (!sub) return active;

  if (!isFeatureEnabled(sub.features, feature)) {
    return {
      ok: false,
      code: "FEATURE_NOT_INCLUDED",
      message: `Cette fonctionnalité est disponible avec le forfait Institut ou supérieur.`,
      planCode: sub.planCode,
      planName: sub.planName,
    };
  }
  return { ok: true };
}

async function checkLimit(
  organizationId: string,
  limit: PlanLimitKey,
): Promise<LimitCheckResult> {
  const active = await assertSubscriptionActive(organizationId);
  if (!active.ok) return active;

  const sub = await getOrganizationSubscription(organizationId);
  const usage = await getSubscriptionUsage(organizationId);
  if (!sub || !usage) {
    return {
      ok: false,
      code: "SUBSCRIPTION_INACTIVE",
      message: "Abonnement introuvable.",
    };
  }

  const bucket =
    limit === "staff"
      ? usage.staff
      : limit === "customers"
        ? usage.customers
        : limit === "appointments"
          ? usage.appointments
          : usage.resources;

  if (bucket.max != null && bucket.used >= bucket.max) {
    const labels: Record<PlanLimitKey, string> = {
      staff: "employées",
      customers: "clientes",
      appointments: "rendez-vous ce mois",
      resources: "ressources",
    };
    return {
      ok: false,
      code: "LIMIT_REACHED",
      message: `Vous avez atteint la limite de ${bucket.max} ${labels[limit]} de votre abonnement ${sub.planName}.`,
      limit,
      used: bucket.used,
      max: bucket.max,
      planCode: sub.planCode,
      planName: sub.planName,
    };
  }
  return { ok: true };
}

export async function canCreateStaff(organizationId: string): Promise<LimitCheckResult> {
  const feat = await canUseFeature(organizationId, "staff");
  if (!feat.ok) return feat;
  return checkLimit(organizationId, "staff");
}

export async function canCreateCustomer(organizationId: string): Promise<LimitCheckResult> {
  const feat = await canUseFeature(organizationId, "customers");
  if (!feat.ok) return feat;
  return checkLimit(organizationId, "customers");
}

export async function canCreateAppointment(organizationId: string): Promise<LimitCheckResult> {
  const feat = await canUseFeature(organizationId, "agenda");
  if (!feat.ok) return feat;
  return checkLimit(organizationId, "appointments");
}

export async function canCreateResource(organizationId: string): Promise<LimitCheckResult> {
  return checkLimit(organizationId, "resources");
}

export async function canUseFeatureByLimit(
  organizationId: string,
  limit: PlanLimitKey,
): Promise<LimitCheckResult> {
  return checkLimit(organizationId, limit);
}
