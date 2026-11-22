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
  SUBSCRIPTION_STATUSES,
} from "@/lib/db/admin-subscriptions";
import { readJsonObject } from "@/lib/admin/read-json-object";
import { notifyPeriodChange, snapshotPeriod } from "@/lib/subscriptions/period-change-notice";
import { getPlanByCode, getPlanById, listPlans } from "@/lib/subscriptions/plans";
import type { SubscriptionStatus } from "@/types/subscription";
import { platformRoute } from "@/lib/http/route-scope";
import { saveSubscriptionPeriodPayment, type PeriodPaymentInput } from "@/lib/db/subscription-period-payment";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Exécute une modification de période puis prévient le propriétaire et l'équipe par e-mail (seulement si la fin de
 * période ou le statut ont changé). L'e-mail ne fait jamais échouer l'action déjà enregistrée.
 */
async function withPeriodNotice<T extends object>(
  actor: { firstName: string; lastName: string },
  subscriptionId: string,
  action: string,
  run: () => Promise<T>,
): Promise<T & { emailNotice: string }> {
  const before = await snapshotPeriod(subscriptionId);
  const result = await run();
  const notice = await notifyPeriodChange({
    subscriptionId, action, before, actorName: `${actor.firstName} ${actor.lastName}`.trim(),
  });
  // `emailNotice` : phrase affichée à l'équipe (ce qui est parti, ou pourquoi rien n'est parti).
  return { ...result, emailNotice: notice.message };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:?\d{2})?)?$/;

/** Domain errors thrown by the services, mapped to the right HTTP answer. */
function mapSubscriptionError(error: unknown, fallback: string) {
  const code = error instanceof Error ? error.message : "";
  if (code === "NOT_FOUND") return adminError("Abonnement introuvable.", 404);
  if (code === "INVALID_DATE") return adminError("Date de fin invalide, hors limites ou antérieure au début de la période.", 400);
  if (code === "INVALID_PRICE") return adminError("Prix invalide.", 400);
  if (code === "INVALID_INPUT") return adminError("Valeur invalide.", 400);
  if (code === "PLAN_NOT_FOUND") return adminError("Plan invalide.", 400);
  console.error("[admin/subscriptions/:id]", error);
  return adminError(fallback, 500);
}

export const GET = platformRoute(async function GET(request: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const item = await fetchAdminSubscription(id);
  if (!item) return adminError("Abonnement introuvable.", 404);

  const [history, plans] = await Promise.all([
    listSubscriptionHistory(id, item.organizationId),
    listPlans(true),
  ]);

  return adminJson({ item, history, plans });
});

export const PATCH = platformRoute(async function PATCH(request: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const body = await readJsonObject(request);
  if (!body) return adminError("Corps JSON invalide.", 400);
  if (typeof body.status !== "string" || !body.status) return adminError("Statut requis.", 400);
  if (!SUBSCRIPTION_STATUSES.includes(body.status as SubscriptionStatus)) return adminError("Statut invalide.", 400);
  if (body.reason !== undefined && (typeof body.reason !== "string" || body.reason.length > 500)) {
    return adminError("Motif invalide.", 400);
  }

  try {
    await setSubscriptionStatus(
      auth.session,
      id,
      body.status as SubscriptionStatus,
      "SUBSCRIPTION_STATUS_CHANGED",
      body.reason as string | undefined,
    );
    return adminJson({ ok: true });
  } catch (error) {
    return mapSubscriptionError(error, "Mise à jour impossible.");
  }
});

export const POST = platformRoute(async function POST(request: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const raw = await readJsonObject(request);
  if (!raw) return adminError("Corps JSON invalide.", 400);
  if (raw.reason !== undefined && (typeof raw.reason !== "string" || raw.reason.length > 500)) {
    return adminError("Motif invalide.", 400);
  }
  const body = raw as {
    action?: string;
    quick?: string;
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
    if (body.action === "save-period") {
      if (typeof body.paid !== "boolean") return adminError("Sélectionnez Payé ou Non payé.", 400);
      if (typeof body.price !== "number" || !Number.isFinite(body.price) || body.price < 0 || body.price > 1_000_000) {
        return adminError("Prix invalide.", 400);
      }
      if (typeof body.quick !== "string" || !["", "m1", "y1", "t15"].includes(body.quick)) return adminError("Période invalide.", 400);
      // The typed date only matters without a quick option; its range is checked against the stored
      // period inside the transaction (an untouched far-past date must stay saveable for a price/payment edit).
      if (body.quick === "" && (typeof body.periodEnd !== "string" || !ISO_DATE.test(body.periodEnd) || Number.isNaN(new Date(body.periodEnd).getTime()))) {
        return adminError("Date de fin invalide.", 400);
      }
      const result = await withPeriodNotice(auth.session, id, "Période, prix ou paiement modifié", () =>
        saveSubscriptionPeriodPayment(auth.session, id, {
          quick: body.quick as PeriodPaymentInput["quick"], paid: body.paid as boolean, price: body.price as number,
          periodEnd: typeof body.periodEnd === "string" ? body.periodEnd : "",
        }),
      );
      return adminJson({ ok: true, ...result });
    }
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
      const result = await withPeriodNotice(auth.session, id, `Période prolongée de ${body.months ?? 1} mois`, () =>
        extendSubscriptionPeriod(auth.session, id, body.months ?? 1),
      );
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
      const result = await setSubscriptionPrice(auth.session, id, price);
      return adminJson({ ok: true, ...result });
    }
    if (body.action === "set-period") {
      const rawEnd = typeof body.periodEnd === "string" ? body.periodEnd : "";
      const periodEnd = new Date(rawEnd);
      if (!rawEnd || !ISO_DATE.test(rawEnd) || Number.isNaN(periodEnd.getTime())) {
        return adminError("Date de fin invalide.", 400);
      }
      const result = await withPeriodNotice(auth.session, id, "Date de fin de période modifiée", () =>
        setSubscriptionPeriodEnd(auth.session, id, periodEnd),
      );
      return adminJson({ ok: true, ...result });
    }
    if (body.action === "demo-trial") {
      const days = body.days ?? 7;
      const result = await withPeriodNotice(auth.session, id, `Essai de démonstration de ${days} jours`, () =>
        grantDemoTrial(auth.session, id, days),
      );
      return adminJson({ ok: true, ...result });
    }
    if (body.action === "grant-trial") {
      const days = body.days ?? 30;
      const result = await withPeriodNotice(auth.session, id, `Période offerte de ${days} jours`, () =>
        grantFreePeriod(auth.session, id, days, body.reason?.trim() || "Offre commerciale"),
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
  } catch (error) {
    return mapSubscriptionError(error, "Action impossible.");
  }
});
