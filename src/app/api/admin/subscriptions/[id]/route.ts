import type { NextRequest } from "next/server";
import { adminError, adminJson, requireAdmin } from "@/lib/admin/api-helpers";
import {
  changeSubscriptionPlan,
  extendSubscriptionPeriod,
  setSubscriptionStatus,
} from "@/lib/db/admin-subscriptions";
import { getPlanById } from "@/lib/subscriptions/plans";
import type { SubscriptionStatus } from "@/types/subscription";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const body = (await request.json()) as { status?: SubscriptionStatus };
  if (!body.status) return adminError("Statut requis.", 400);

  try {
    await setSubscriptionStatus(auth.session, id, body.status, "SUBSCRIPTION_STATUS_CHANGED");
    return adminJson({ ok: true });
  } catch {
    return adminError("Mise à jour impossible.", 500);
  }
}

export async function POST(request: NextRequest, ctx: Ctx) {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const body = (await request.json()) as { action?: string; planId?: string; months?: number };

  try {
    if (body.action === "change-plan" && body.planId) {
      const plan = await getPlanById(body.planId);
      if (!plan?.active) return adminError("Plan invalide.", 400);
      await changeSubscriptionPlan(auth.session, id, body.planId);
      return adminJson({ ok: true });
    }
    if (body.action === "suspend") {
      await setSubscriptionStatus(auth.session, id, "PAUSED", "SUBSCRIPTION_SUSPENDED");
      return adminJson({ ok: true });
    }
    if (body.action === "reactivate") {
      await setSubscriptionStatus(auth.session, id, "ACTIVE", "SUBSCRIPTION_REACTIVATED");
      return adminJson({ ok: true });
    }
    if (body.action === "cancel") {
      await setSubscriptionStatus(auth.session, id, "CANCELLED", "SUBSCRIPTION_CANCELLED");
      return adminJson({ ok: true });
    }
    if (body.action === "extend") {
      await extendSubscriptionPeriod(auth.session, id, body.months ?? 1);
      return adminJson({ ok: true });
    }
    return adminError("Action invalide.", 400);
  } catch {
    return adminError("Action impossible.", 500);
  }
}
