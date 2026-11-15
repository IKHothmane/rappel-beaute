import type { PoolClient } from "pg";
import { writePlatformAuditLog } from "@/lib/db/platform-audit";
import { withTransaction } from "@/lib/db/transaction";
import { addMonths } from "@/lib/subscriptions/subscription-service";
import type { PlatformSessionUser } from "@/lib/auth/types";
import type { SubscriptionStatus } from "@/types/subscription";

export type PeriodPaymentInput = {
  quick: "" | "m1" | "y1" | "t15";
  paid: boolean;
  price: number;
  periodEnd: string;
};

/** A manually typed end date may be at most this far in the past / future. */
export const MANUAL_PERIOD_END_MAX_PAST_DAYS = 366;
export const MANUAL_PERIOD_END_MAX_FUTURE_YEARS = 10;

const DAY_MS = 86_400_000;

/** Throws INVALID_DATE when a manual end date is unreasonable. */
export function assertReasonablePeriodEnd(end: Date, now: Date = new Date()): void {
  if (Number.isNaN(end.getTime())) throw new Error("INVALID_DATE");
  const min = now.getTime() - MANUAL_PERIOD_END_MAX_PAST_DAYS * DAY_MS;
  const maxDate = new Date(now);
  maxDate.setUTCFullYear(maxDate.getUTCFullYear() + MANUAL_PERIOD_END_MAX_FUTURE_YEARS);
  if (end.getTime() < min || end.getTime() > maxDate.getTime()) throw new Error("INVALID_DATE");
}

/**
 * Throws INVALID_DATE when the end precedes the period start. The database enforces
 * currentPeriodEnd >= currentPeriodStart (CHECK): refuse earlier so the caller gets a 400, not a 23514.
 */
export function assertPeriodEndNotBeforeStart(start: Date, end: Date): void {
  if (end.getTime() < start.getTime()) throw new Error("INVALID_DATE");
}

type SubscriptionPaymentSnapshot = {
  paid: boolean;
  paidAt?: string | null;
  priceSnapshot: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
};

/**
 * Paid/unpaid audit event, inside the caller's transaction. `after` is self-contained (amount,
 * currency, period): the payment history never depends on the subscription's current price.
 */
export async function writePaymentChangedAudit(
  client: PoolClient,
  base: {
    platformUserId: string; platformUserName: string; organizationId: string; entityId: string;
  },
  before: { paid: boolean; paidAt: Date | null },
  after: SubscriptionPaymentSnapshot & Record<string, unknown>,
) {
  await writePlatformAuditLog({
    ...base, client, entityType: "Subscription",
    action: after.paid ? "SUBSCRIPTION_MARKED_PAID" : "SUBSCRIPTION_MARKED_UNPAID",
    before: { paid: before.paid, paidAt: before.paidAt?.toISOString() ?? null },
    after,
  });
}

/** Save the period, payment status and audit records together. */
export async function saveSubscriptionPeriodPayment(actor: PlatformSessionUser, id: string, input: PeriodPaymentInput) {
  return withTransaction(async (client) => {
    const { rows } = await client.query<{
      organizationId: string; currentPeriodStart: Date; currentPeriodEnd: Date;
      trialEndsAt: Date | null; status: SubscriptionStatus; priceSnapshot: string;
      currencySnapshot?: string; paid: boolean; paidAt: Date | null;
    }>('SELECT * FROM "Subscription" WHERE id = $1 FOR UPDATE', [id]);
    const sub = rows[0];
    if (!sub) throw new Error("NOT_FOUND");
    const now = new Date();
    const trial = input.quick === "t15";
    const base = sub.currentPeriodEnd < now ? now : sub.currentPeriodEnd;
    const manual = !input.quick;
    const end = trial ? new Date(now.getTime() + 15 * DAY_MS)
      : input.quick ? addMonths(base, input.quick === "y1" ? 12 : 1) : new Date(input.periodEnd);
    const endChanged = end.getTime() !== sub.currentPeriodEnd.getTime();
    if (manual && endChanged) {
      assertReasonablePeriodEnd(end, now);
      assertPeriodEndNotBeforeStart(sub.currentPeriodStart, end);
    }
    if (!Number.isFinite(input.price) || input.price < 0 || input.price > 1_000_000) throw new Error("INVALID_PRICE");
    const price = Math.round(input.price * 100) / 100;
    // A typed date on a cancelled/expired subscription brings it back, as the old period editor did.
    // A save that leaves the date untouched (price/payment only) never resurrects it.
    const reactivated = manual && endChanged && end.getTime() > now.getTime()
      && (sub.status === "EXPIRED" || sub.status === "CANCELLED");
    const status: SubscriptionStatus = trial ? "TRIAL" : input.quick ? "ACTIVE" : reactivated ? "ACTIVE" : sub.status;
    const clearCancelled = status === "ACTIVE" || status === "TRIAL";
    const paidChanged = input.paid !== Boolean(sub.paid);
    const currency = sub.currencySnapshot ?? "MAD";
    const periodStart = trial ? now : sub.currentPeriodStart;
    await client.query(
      `UPDATE "Subscription" SET "currentPeriodEnd"=$2, "currentPeriodStart"=$3,
       "trialEndsAt"=$4, status=$5, "priceSnapshot"=$6, paid=$7::boolean,
       "paidAt"=CASE WHEN NOT $7::boolean THEN NULL WHEN paid THEN COALESCE("paidAt", NOW()) ELSE NOW() END,
       "cancelledAt"=CASE WHEN $8::boolean THEN NULL ELSE "cancelledAt" END, "updatedAt"=NOW() WHERE id=$1`,
      [id, end, periodStart, trial ? end : sub.trialEndsAt, status, price, input.paid, clearCancelled],
    );
    if (trial) {
      await client.query(`UPDATE "Organization" SET status='ACTIVE', "updatedAt"=NOW() WHERE id=$1 AND status != 'ARCHIVED'`, [sub.organizationId]);
    }
    const audit = {
      client, platformUserId: actor.id,
      platformUserName: `${actor.firstName} ${actor.lastName}`.trim(),
      organizationId: sub.organizationId, entityType: "Subscription", entityId: id,
    };
    if (input.quick || endChanged || status !== sub.status) {
      await writePlatformAuditLog({ ...audit,
        action: trial ? "SUBSCRIPTION_TRIAL_GRANTED" : input.quick ? "SUBSCRIPTION_EXTENDED" : "SUBSCRIPTION_PERIOD_CHANGED",
        before: { currentPeriodEnd: sub.currentPeriodEnd.toISOString(), status: sub.status },
        after: { currentPeriodEnd: end.toISOString(), status, quick: input.quick },
      });
    }
    if (price !== Number(sub.priceSnapshot)) {
      await writePlatformAuditLog({ ...audit, action: "SUBSCRIPTION_PRICE_CHANGED",
        before: { priceSnapshot: Number(sub.priceSnapshot) }, after: { priceSnapshot: price },
      });
    }
    // Only a real paid/unpaid transition is a payment event. A price or period change alone is not.
    if (paidChanged) {
      await writePaymentChangedAudit(
        client,
        { platformUserId: actor.id, platformUserName: audit.platformUserName, organizationId: sub.organizationId, entityId: id },
        { paid: sub.paid, paidAt: sub.paidAt },
        {
          paid: input.paid,
          priceSnapshot: price,
          currency,
          // For a renewal the payment covers [previous expiry (or now if lapsed), new end].
          periodStart: (input.quick && !trial ? base : periodStart).toISOString(),
          periodEnd: end.toISOString(),
          quick: input.quick,
        },
      );
    }
    return { newEnd: end.toISOString(), paid: input.paid };
  });
}
