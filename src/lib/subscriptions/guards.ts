import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { AppFeature } from "@/lib/rbac";
import { requireAppSession, type AuthResult } from "@/lib/auth/api-guard";
import { isAppSession } from "@/lib/auth/types";
import {
  canCreateAppointment,
  canCreateCustomer,
  canCreateStaff,
  canUseFeature,
  type LimitCheckResult,
} from "@/lib/subscriptions/limits";
import { planFeatureForAppFeature, type PlanFeatureKey } from "@/lib/subscriptions/features";
import type { PlanLimitKey } from "@/types/subscription";

type LimitDenied = Extract<LimitCheckResult, { ok: false }>;

function limitResponse(check: LimitDenied) {
  return NextResponse.json(
    {
      error: check.message,
      code: check.code,
      limit: check.limit,
      used: check.used,
      max: check.max,
      planCode: check.planCode,
      planName: check.planName,
    },
    { status: 403 },
  );
}

export function requirePlanFeature(
  request: NextRequest,
  feature: PlanFeatureKey,
): AuthResult | { ok: false; response: NextResponse } {
  const auth = requireAppSession(request);
  if (!auth.ok) return auth;
  return { ok: true, session: auth.session, _feature: feature } as AuthResult & {
    _feature: PlanFeatureKey;
  };
}

export async function enforcePlanFeature(
  request: NextRequest,
  feature: PlanFeatureKey,
): Promise<AuthResult> {
  const auth = requireAppSession(request);
  if (!auth.ok) return auth;

  const check = await canUseFeature(auth.session.organizationId, feature);
  if (!check.ok) {
    return { ok: false, response: limitResponse(check) };
  }
  return auth;
}

export async function enforceAppFeatureWithPlan(
  request: NextRequest,
  appFeature: AppFeature,
  rbacAuth: AuthResult,
): Promise<AuthResult> {
  if (!rbacAuth.ok) return rbacAuth;
  if (!isAppSession(rbacAuth.session)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Accès réservé aux instituts." }, { status: 403 }),
    };
  }
  const planFeature = planFeatureForAppFeature(appFeature);
  if (!planFeature) return rbacAuth;
  const check = await canUseFeature(rbacAuth.session.organizationId, planFeature);
  if (!check.ok) {
    return { ok: false, response: limitResponse(check) };
  }
  return rbacAuth;
}

export async function enforcePlanLimit(
  request: NextRequest,
  limit: PlanLimitKey,
): Promise<AuthResult> {
  const auth = requireAppSession(request);
  if (!auth.ok) return auth;

  const check =
    limit === "staff"
      ? await canCreateStaff(auth.session.organizationId)
      : limit === "customers"
        ? await canCreateCustomer(auth.session.organizationId)
        : limit === "appointments"
          ? await canCreateAppointment(auth.session.organizationId)
          : await canUseFeature(auth.session.organizationId, "staff");

  if (!check.ok) {
    return { ok: false, response: limitResponse(check) };
  }
  return auth;
}

export async function enforceCreateStaff(request: NextRequest): Promise<AuthResult> {
  return enforcePlanLimit(request, "staff");
}

export async function enforceCreateCustomer(request: NextRequest): Promise<AuthResult> {
  return enforcePlanLimit(request, "customers");
}

export async function enforceCreateAppointment(request: NextRequest): Promise<AuthResult> {
  return enforcePlanLimit(request, "appointments");
}

/** Pour usage public booking — vérifie limites sans session app */
export async function enforcePublicBookingLimits(organizationId: string): Promise<LimitCheckResult> {
  const booking = await canUseFeature(organizationId, "booking");
  if (!booking.ok) return booking;
  return canCreateAppointment(organizationId);
}
