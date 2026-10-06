import type { NextRequest } from "next/server";
import { adminError, adminJson, requireAdmin } from "@/lib/admin/api-helpers";
import {
  changeSubscriptionPlan,
  extendSubscriptionPeriod,
  fetchAdminSubscription,
  grantDemoTrial,
  grantFreePeriod,
  listSubscriptionHistory,
  setSubscriptionPaid,
  setSubscriptionPeriodEnd,
  setSubscriptionPrice,
  setSubscriptionStatus,
} from "@/lib/db/admin-subscriptions";
import { getPlanByCode, getPlanById, listPlans } from "@/lib/subscriptions/plans";
import type { SubscriptionStatus } from "@/types/subscription";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const item = await fetchAdminSubscription(id);
  if (!item) return adminError("Abonnement introuvable.", 404);

  const [history, plans] = await Promise.all([
    listSubscriptionHistory(id, item.organizationId),
    listPlans(true),
  ]);

  return adminJson({ item, history, plans });
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const body = (await request.json()) as { status?: SubscriptionStatus; reason?: string };
  if (!body.status) return adminError("Statut requis.", 400);

  try {
    await setSubscriptionStatus(
      auth.session,
      id,
      body.status,
      "SUBSCRIPTION_STATUS_CHANGED",
      body.reason,
    );
    return adminJson({ ok: true });
  } catch {
    return adminError("Mise à jour impossible.", 500);
  }
}

export async function POST(request: NextRequest, ctx: Ctx) {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const body = (await request.json()) as {
    action?: string;
    planId?: string;
    planCode?: string;
    months?: number;
    days?: number;
    periodEnd?: string;
    paid?: boolean;
    price?: number;
    reason?: string;
    applyAt?: "now" | "next_period";
  };

  try {
    if (body.action === "change-plan") {
      let planId = body.planId;
      if (!planId && body.planCode) {
        const plan = await getPlanByCode(body.planCode);
        planId = plan?.id;
      }
      if (!planId) return adminError("Plan requis.", 400);
      const plan = await getPlanById(planId);
      if (!plan?.active) return adminError("Plan invalide.", 400);
      await changeSubscriptionPlan(auth.session, id, planId, {
        applyAt: body.applyAt ?? "now",
      });
      return adminJson({ ok: true });
    }
    if (body.action === "suspend") {
      await setSubscriptionStatus(
        auth.session,
        id,
        "PAUSED",
        "SUBSCRIPTION_SUSPENDED",
        body.reason,
      );
      return adminJson({ ok: true });
    }
    if (body.action === "reactivate") {
      await setSubscriptionStatus(auth.session, id, "ACTIVE", "SUBSCRIPTION_REACTIVATED");
      return adminJson({ ok: true });
    }
    if (body.action === "cancel") {
      await setSubscriptionStatus(
        auth.session,
        id,
        "CANCELLED",
        "SUBSCRIPTION_CANCELLED",
        body.reason,
      );
      return adminJson({ ok: true });
    }
    if (body.action === "extend") {
      const result = await extendSubscriptionPeriod(auth.session, id, body.months ?? 1);
      return adminJson({ ok: true, ...result });
    }
    if (body.action === "set-paid") {
      if (typeof body.paid !== "boolean") return adminError("Indiquez si l’abonnement est payé.", 400);
      await setSubscriptionPaid(auth.session, id, body.paid);
      return adminJson({ ok: true });
    }
    if (body.action === "set-price") {
      const price = typeof body.price === "number" ? body.price : Number(body.price);
      if (!Number.isFinite(price) || price < 0 || price > 1_000_000) {
        return adminError("Indiquez un prix en dirhams, entre 0 et 1 000 000.", 400);
      }
      try {
        const result = await setSubscriptionPrice(auth.session, id, price);
        return adminJson({ ok: true, ...result });
      } catch (error) {
        if (error instanceof Error && error.message === "NOT_FOUND") {
          return adminError("Abonnement introuvable.", 404);
        }
        throw error;
      }
    }
    if (body.action === "set-period") {
      const raw = typeof body.periodEnd === "string" ? body.periodEnd : "";
      const periodEnd = new Date(raw);
      if (!raw || Number.isNaN(periodEnd.getTime())) {
        return adminError("Date de fin invalide.", 400);
      }
      const result = await setSubscriptionPeriodEnd(auth.session, id, periodEnd);
      return adminJson({ ok: true, ...result });
    }
    if (body.action === "demo-trial") {
      const days = body.days ?? 7;
      const result = await grantDemoTrial(auth.session, id, days);
      return adminJson({ ok: true, ...result });
    }
    if (body.action === "grant-trial") {
      const days = body.days ?? 30;
      const result = await grantFreePeriod(
        auth.session,
        id,
        days,
        body.reason?.trim() || "Offre commerciale",
      );
      return adminJson({ ok: true, ...result });
    }
    if (body.action === "reminder") {
      const item = await fetchAdminSubscription(id);
      if (!item) return adminError("Abonnement introuvable.", 404);
      const message = [
        `Bonjour,`,
        ``,
        `Votre abonnement Rappel Beauty (${item.planName}) pour ${item.organizationName}`,
        `expire le ${new Date(item.currentPeriodEnd).toLocaleDateString("fr-FR")}.`,
        ``,
        `Merci de renouveler pour conserver l'accès.`,
      ].join("\n");
      return adminJson({ ok: true, messageTemplate: message });
    }
    return adminError("Action invalide.", 400);
  } catch (e) {
    console.error("[POST /api/admin/subscriptions/:id]", e);
    return adminError("Action impossible.", 500);
  }
}
