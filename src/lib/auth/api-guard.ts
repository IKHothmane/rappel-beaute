import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import {
  isAppSession,
  isPlatformSession,
  type AppSessionUser,
  type PlatformSessionUser,
  type SessionUser,
} from "@/lib/auth/types";
import {
  canReadFeature,
  canWriteFeature,
  canWriteFeatureLimited,
  type AppFeature,
} from "@/lib/rbac";
import { canUseFeature } from "@/lib/subscriptions/limits";
import { planFeatureForAppFeature } from "@/lib/subscriptions/features";
import type { PlanFeatureKey } from "@/types/subscription";

export type AuthResult =
  | { ok: true; session: SessionUser }
  | { ok: false; response: NextResponse };

type AppAuthResult =
  | { ok: true; session: AppSessionUser }
  | { ok: false; response: NextResponse };

function requireAppSessionNarrowed(request: NextRequest): AppAuthResult {
  const auth = requireAppSession(request);
  if (!auth.ok) return auth;
  if (!isAppSession(auth.session)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Accès réservé aux instituts." }, { status: 403 }),
    };
  }
  return { ok: true, session: auth.session };
}

export function requireSession(request: NextRequest): AuthResult {
  const session = getSessionFromRequest(request);
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Non authentifié." }, { status: 401 }),
    };
  }
  return { ok: true, session };
}

export function requireAppSession(request: NextRequest): AuthResult {
  const auth = requireSession(request);
  if (!auth.ok) return auth;
  if (!isAppSession(auth.session)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Accès réservé aux instituts." }, { status: 403 }),
    };
  }
  return auth;
}

export function requirePlatformSession(
  request: NextRequest,
): AuthResult & { session?: PlatformSessionUser } {
  const auth = requireSession(request);
  if (!auth.ok) return auth;
  if (!isPlatformSession(auth.session)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Accès réservé à la plateforme." }, { status: 403 }),
    };
  }
  return { ok: true, session: auth.session };
}

async function enforcePlanForAppFeature(
  organizationId: string,
  feature: AppFeature,
  planOverride?: PlanFeatureKey,
): Promise<AuthResult | null> {
  const planFeature = planOverride ?? planFeatureForAppFeature(feature);
  if (!planFeature) return null;

  const check = await canUseFeature(organizationId, planFeature);
  if (!check.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: check.message,
          code: check.code,
          planCode: check.planCode,
          planName: check.planName,
          limit: check.limit,
          used: check.used,
          max: check.max,
        },
        { status: 403 },
      ),
    };
  }
  return null;
}

export async function requireFeatureRead(
  request: NextRequest,
  feature: AppFeature,
  planOverride?: PlanFeatureKey,
): Promise<AuthResult> {
  const auth = requireAppSessionNarrowed(request);
  if (!auth.ok) return auth;
  if (!canReadFeature(auth.session.role, feature)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Accès refusé." }, { status: 403 }),
    };
  }
  const planBlock = await enforcePlanForAppFeature(
    auth.session.organizationId,
    feature,
    planOverride,
  );
  if (planBlock) return planBlock;
  return auth;
}

export async function requireFeatureWrite(
  request: NextRequest,
  feature: AppFeature,
  planOverride?: PlanFeatureKey,
): Promise<AuthResult> {
  const auth = requireAppSessionNarrowed(request);
  if (!auth.ok) return auth;
  if (!canWriteFeature(auth.session.role, feature)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Accès refusé." }, { status: 403 }),
    };
  }
  const planBlock = await enforcePlanForAppFeature(
    auth.session.organizationId,
    feature,
    planOverride,
  );
  if (planBlock) return planBlock;
  return auth;
}

export async function requireFeatureWriteLimited(
  request: NextRequest,
  feature: AppFeature,
  planOverride?: PlanFeatureKey,
): Promise<AuthResult> {
  const auth = requireAppSessionNarrowed(request);
  if (!auth.ok) return auth;
  if (!canWriteFeatureLimited(auth.session.role, feature)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Accès refusé." }, { status: 403 }),
    };
  }
  const planBlock = await enforcePlanForAppFeature(
    auth.session.organizationId,
    feature,
    planOverride,
  );
  if (planBlock) return planBlock;
  return auth;
}

export function stripOrganizationId<T extends Record<string, unknown>>(body: T): Omit<T, "organizationId"> {
  const { organizationId: _ignored, ...rest } = body;
  return rest;
}

export function stripAdminForbiddenKeys<T extends Record<string, unknown>>(
  body: T,
): Omit<T, "organizationId" | "id" | "status" | "price" | "plan"> {
  const { organizationId: _o, id: _i, status: _s, price: _p, plan: _pl, ...rest } = body;
  return rest;
}
