import type { NextRequest } from "next/server";
import {
  requireFeatureRead,
  requireFeatureWriteLimited,
  stripOrganizationId,
  type AppAuthResult,
} from "@/lib/auth/api-guard";
import { getOrganizationSubscription } from "@/lib/subscriptions/subscription-service";
import type { AIRequestContext } from "@/types/ai";

export async function requireAIRead(request: NextRequest): Promise<AppAuthResult> {
  return requireFeatureRead(request, "ai");
}

/** STAFF/CASHIER limited OK — les tools finance restent bloqués */
export async function requireAIWrite(request: NextRequest): Promise<AppAuthResult> {
  return requireFeatureWriteLimited(request, "ai");
}

export async function buildAIContext(
  auth: Extract<AppAuthResult, { ok: true }>,
): Promise<AIRequestContext> {
  const sub = await getOrganizationSubscription(auth.session.organizationId);
  return {
    organizationId: auth.session.organizationId,
    userId: auth.session.id,
    role: auth.session.role,
    planCode: sub?.planCode ?? null,
    userDisplayName: `${auth.session.firstName} ${auth.session.lastName}`.trim(),
  };
}

/** Empêche l'injection d'organizationId depuis le body */
export function sanitizeAIBody(body: Record<string, unknown>) {
  return stripOrganizationId(body);
}
