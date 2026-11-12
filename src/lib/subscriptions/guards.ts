import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAppSession, type AuthResult } from "@/lib/auth/api-guard";
import {
  canCreateAppointment,
  canCreateCustomer,
  canCreateStaff,
  canUseFeature,
  type LimitCheckResult,
} from "@/lib/subscriptions/limits";
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

async function enforcePlanLimit(
  request: NextRequest,
  limit: PlanLimitKey,
): Promise<AuthResult> {
  const auth = await requireAppSession(request);
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
