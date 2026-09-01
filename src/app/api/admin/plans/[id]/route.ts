import type { NextRequest } from "next/server";
import { adminError, adminJson, requireAdmin } from "@/lib/admin/api-helpers";
import { countSubscriptionsUsingPlan, getPlanById, updatePlan } from "@/lib/subscriptions/plans";
import { writePlatformAuditLog } from "@/lib/db/platform-audit";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const plan = await getPlanById(id);
  if (!plan) return adminError("Plan introuvable.", 404);
  const usedBy = await countSubscriptionsUsingPlan(id);
  return adminJson({ plan, usedBy });
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const before = await getPlanById(id);
  if (!before) return adminError("Plan introuvable.", 404);

  const body = (await request.json()) as Record<string, unknown>;
  const plan = await updatePlan(id, {
    name: body.name != null ? String(body.name) : undefined,
    description: body.description != null ? String(body.description) : undefined,
    price: body.price != null ? Number(body.price) : undefined,
    maxStaff: body.maxStaff != null ? Number(body.maxStaff) : undefined,
    maxCustomers: body.maxCustomers != null ? Number(body.maxCustomers) : undefined,
    maxAppointmentsPerMonth:
      body.maxAppointmentsPerMonth != null ? Number(body.maxAppointmentsPerMonth) : undefined,
    maxResources: body.maxResources != null ? Number(body.maxResources) : undefined,
    active: body.active != null ? Boolean(body.active) : undefined,
    features: body.features as Record<string, boolean> | undefined,
  });

  await writePlatformAuditLog({
    platformUserId: auth.session.id,
    platformUserName: `${auth.session.firstName} ${auth.session.lastName}`,
    entityType: "Plan",
    entityId: id,
    action: "PLAN_UPDATED",
    before: { price: before.price, active: before.active },
    after: { price: plan?.price, active: plan?.active },
  });

  return adminJson({ plan });
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const used = await countSubscriptionsUsingPlan(id);
  if (used > 0) {
    await updatePlan(id, { active: false });
    return adminJson({ ok: true, deactivated: true, message: "Plan désactivé (utilisé par des abonnements)." });
  }
  await updatePlan(id, { active: false });
  return adminJson({ ok: true, deactivated: true });
}
