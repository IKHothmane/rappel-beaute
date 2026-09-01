import type { NextRequest } from "next/server";
import { adminError, adminJson, requireAdmin } from "@/lib/admin/api-helpers";
import { getOrganizationById, updateSubscription } from "@/lib/db/admin-organizations";
import type { SubscriptionPlan } from "@/types/platform";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const org = await getOrganizationById(id);
  if (!org) return adminError("Institut introuvable.", 404);
  return adminJson({ subscription: org.subscription });
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const body = (await request.json()) as { plan?: string };
  const plan = body.plan as SubscriptionPlan | undefined;
  if (!plan || !["STARTER", "INSTITUT", "PREMIUM"].includes(plan)) {
    return adminError("Plan invalide.", 400);
  }

  try {
    await updateSubscription(auth.session, id, plan);
    const org = await getOrganizationById(id);
    return adminJson({ subscription: org?.subscription ?? null });
  } catch (e) {
    if (e instanceof Error && e.message === "SUB_NOT_FOUND") {
      return adminError("Abonnement introuvable.", 404);
    }
    return adminError("Mise à jour impossible.", 500);
  }
}
