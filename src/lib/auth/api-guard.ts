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
import { getUserSessionState } from "@/lib/db/users";

export type AuthResult =
  | { ok: true; session: SessionUser }
  | { ok: false; response: NextResponse };

export type AppAuthResult =
  | { ok: true; session: AppSessionUser }
  | { ok: false; response: NextResponse };

const MUST_CHANGE_PASSWORD_ALLOWLIST = [
  "/api/auth/change-password",
  "/api/auth/logout",
  "/api/auth/session",
];

function isMustChangePasswordAllowed(pathname: string): boolean {
  const path = pathname.endsWith("/") && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
  return MUST_CHANGE_PASSWORD_ALLOWLIST.some(
    (p) => path === p || path.startsWith(`${p}/`),
  );
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

/**
 * Session institut validée contre la DB (sessionVersion + mustChangePassword).
 */
export async function requireAppSession(request: NextRequest): Promise<AppAuthResult> {
  const auth = requireSession(request);
  if (!auth.ok) return auth;
  if (!isAppSession(auth.session)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Accès réservé aux instituts." }, { status: 403 }),
    };
  }

  const state = await getUserSessionState(auth.session.id);
  if (!state || state.status !== "ACTIVE") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Session expirée." }, { status: 401 }),
    };
  }

  const jwtVersion = auth.session.sessionVersion ?? 0;
  if (jwtVersion !== state.sessionVersion) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Session invalidée. Reconnectez-vous.", code: "SESSION_REVOKED" },
        { status: 401 },
      ),
    };
  }

  const session: AppSessionUser = {
    ...auth.session,
    mustChangePassword: state.mustChangePassword,
    sessionVersion: state.sessionVersion,
  };

  if (state.mustChangePassword && !isMustChangePasswordAllowed(request.nextUrl.pathname)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "Vous devez changer votre mot de passe avant de continuer.",
          code: "MUST_CHANGE_PASSWORD",
        },
        { status: 403 },
      ),
    };
  }

  return { ok: true, session };
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
): Promise<{ ok: false; response: NextResponse } | null> {
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
): Promise<AppAuthResult> {
  const auth = await requireAppSession(request);
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
): Promise<AppAuthResult> {
  const auth = await requireAppSession(request);
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
): Promise<AppAuthResult> {
  const auth = await requireAppSession(request);
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

/**
 * POS Produits (41.23) : RBAC caisse + plan cashRegister + plan inventory.
 */
export async function requirePosRead(request: NextRequest): Promise<AppAuthResult> {
  const auth = await requireFeatureRead(request, "cash-register");
  if (!auth.ok) return auth;
  const inv = await canUseFeature(auth.session.organizationId, "inventory");
  if (!inv.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: inv.message,
          code: inv.code,
          planCode: inv.planCode,
          planName: inv.planName,
        },
        { status: 403 },
      ),
    };
  }
  return auth;
}

export async function requirePosWrite(request: NextRequest): Promise<AppAuthResult> {
  const auth = await requireFeatureWrite(request, "cash-register");
  if (!auth.ok) return auth;
  const inv = await canUseFeature(auth.session.organizationId, "inventory");
  if (!inv.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: inv.message,
          code: inv.code,
          planCode: inv.planCode,
          planName: inv.planName,
        },
        { status: 403 },
      ),
    };
  }
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
