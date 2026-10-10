import { randomUUID } from "crypto";
import { pool } from "@/lib/db/pool";
import { logger } from "@/lib/logger";
import { publicAppOrigin } from "@/lib/site";
import { googleWalletConfigured } from "@/lib/loyalty/wallet-config";
import { addGoogleWalletTextMessage, googleWalletClassReviewStatus } from "@/lib/loyalty/google-wallet";
import {
  notifyOutcome,
  progressIsUseful,
  quotaAllows,
  reviewLinkForInstitute,
  storedSendState,
  walletIdempotencyKey,
  walletMessageAllowed,
  type WalletMessageKind,
} from "@/lib/loyalty/google-wallet-rules";

type Candidate = {
  kind: WalletMessageKind;
  entityId: string;
  header: string;
  body: string;
};

type CardContext = {
  cardId: string;
  organizationId: string;
  customerId: string;
  slug: string;
  cycle: number;
  visitsPerReward: number;
  remaining: number;
  latestEventId: string | null;
  revoked: boolean;
  hasPreference: boolean;
  loyaltyReward: boolean;
  loyaltyProgress: boolean;
  reviewRequest: boolean;
  rewardExpiry: boolean;
};

async function loadCardContext(token: string): Promise<CardContext | null> {
  const { rows } = await pool.query<{
    cardId: string;
    organizationId: string;
    customerId: string;
    slug: string;
    visits: number;
    visitsPerReward: number;
    latestEventId: string | null;
    revokedAt: Date | null;
    consentedAt: Date | null;
    loyaltyReward: boolean | null;
    loyaltyProgress: boolean | null;
    reviewRequest: boolean | null;
    rewardExpiry: boolean | null;
  }>(
    `SELECT lc.id AS "cardId", lc."organizationId", lc."customerId", o.slug,
            COALESCE((
              SELECT SUM(e.points) FROM "LoyaltyEvent" e
              WHERE e."loyaltyCardId" = lc.id AND e.type = 'VISIT'
            ), 0)::int AS visits,
            GREATEST(COALESCE(lp."visitsPerReward", 10), 1)::int AS "visitsPerReward",
            (
              SELECT e.id FROM "LoyaltyEvent" e
              WHERE e."loyaltyCardId" = lc.id AND e.type = 'VISIT' AND e.points > 0
              ORDER BY e."validatedAt" DESC LIMIT 1
            ) AS "latestEventId",
            p."revokedAt", p."consentedAt", p."loyaltyReward", p."loyaltyProgress",
            p."reviewRequest", p."rewardExpiry"
     FROM "LoyaltyCard" lc
     JOIN "Organization" o ON o.id = lc."organizationId" AND o.status = 'ACTIVE'
     LEFT JOIN "LoyaltyProgram" lp ON lp."organizationId" = lc."organizationId"
     LEFT JOIN "NotificationPreference" p
       ON p."organizationId" = lc."organizationId" AND p."customerId" = lc."customerId"
     WHERE lc."publicToken" = $1 AND lc.status = 'ACTIVE'`,
    [token.trim().toUpperCase()],
  );
  const row = rows[0];
  if (!row) return null;
  const threshold = row.visitsPerReward;
  const cycle = row.visits > 0 && row.visits % threshold === 0 ? threshold : row.visits % threshold;
  const remaining = cycle === 0 ? threshold : threshold - cycle;
  return {
    cardId: row.cardId,
    organizationId: row.organizationId,
    customerId: row.customerId,
    slug: row.slug,
    cycle,
    visitsPerReward: threshold,
    remaining,
    latestEventId: row.latestEventId,
    revoked: Boolean(row.revokedAt),
    hasPreference: Boolean(row.consentedAt),
    loyaltyReward: Boolean(row.loyaltyReward),
    loyaltyProgress: Boolean(row.loyaltyProgress),
    reviewRequest: Boolean(row.reviewRequest),
    rewardExpiry: Boolean(row.rewardExpiry),
  };
}

async function candidatesFor(card: CardContext): Promise<Candidate[]> {
  const found: Candidate[] = [];
  const rewards = await pool.query<{ id: string; name: string; expiresAt: Date | null }>(
    `SELECT id, name, "expiresAt"
     FROM "LoyaltyVisitReward"
     WHERE "loyaltyCardId" = $1 AND status = 'AVAILABLE'`,
    [card.cardId],
  );
  for (const reward of rewards.rows) {
    found.push({
      kind: "REWARD_AVAILABLE",
      entityId: reward.id,
      header: "Récompense disponible",
      body: `Votre récompense « ${reward.name} » est prête.`,
    });
    if (
      reward.expiresAt &&
      reward.expiresAt.getTime() > Date.now() &&
      reward.expiresAt.getTime() <= Date.now() + 3 * 86_400_000
    ) {
      const day = reward.expiresAt.toLocaleDateString("fr-FR", { timeZone: "Africa/Casablanca" });
      found.push({
        kind: "REWARD_EXPIRY",
        entityId: reward.id,
        header: "Récompense bientôt expirée",
        body: `Votre récompense « ${reward.name} » expire le ${day}.`,
      });
    }
  }
  const reviews = await pool.query<{ id: string; publicToken: string; slug: string }>(
    `SELECT rr.id, rr."publicToken", o.slug
     FROM "ReviewRequest" rr
     JOIN "Organization" o ON o.id = rr."organizationId"
     JOIN "Appointment" a ON a.id = rr."appointmentId" AND a.status = 'COMPLETED'
     WHERE rr."organizationId" = $1 AND rr."customerId" = $2
       AND rr.status IN ('PENDING', 'SENT')
       AND rr."tokenExpiresAt" > NOW()
       AND rr."scheduledFor" <= NOW()
       AND NOT EXISTS (SELECT 1 FROM "Review" rv WHERE rv."appointmentId" = rr."appointmentId")
     ORDER BY rr."scheduledFor" DESC
     LIMIT 1`,
    [card.organizationId, card.customerId],
  );
  const review = reviews.rows[0];
  if (review) {
    const link = reviewLinkForInstitute({
      origin: publicAppOrigin(),
      cardSlug: card.slug,
      requestSlug: review.slug,
      token: review.publicToken,
    });
    if (link) {
      found.push({
        kind: "REVIEW_REQUEST",
        entityId: review.id,
        header: "Donner mon avis",
        body: `Dites-nous comment s'est passé votre rendez-vous. ${link}`,
      });
    }
  }
  if (card.latestEventId && progressIsUseful(card.cycle, card.visitsPerReward, card.remaining)) {
    found.push({
      kind: "LOYALTY_PROGRESS",
      entityId: card.latestEventId,
      header: "Carte fidélité",
      body: `Votre carte est à ${card.cycle}/${card.visitsPerReward} passages.`,
    });
  }
  return found;
}

async function remember(
  card: CardContext,
  candidate: Candidate,
  status: "SENT" | "SKIPPED" | "FAILED" | "PENDING",
  error: string | null,
) {
  const key = walletIdempotencyKey(candidate.kind, candidate.entityId);
  await pool.query(
    `INSERT INTO "GoogleWalletMessage" (
       id, "organizationId", "customerId", "loyaltyCardId", kind, "idempotencyKey",
       header, body, status, "attemptCount", error, "sentAt", "createdAt"
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,1,$10,CASE WHEN $9 = 'SENT' THEN NOW() ELSE NULL END,NOW())
     ON CONFLICT ("organizationId", "idempotencyKey") DO UPDATE SET
       status = EXCLUDED.status,
       "attemptCount" = "GoogleWalletMessage"."attemptCount" + 1,
       error = EXCLUDED.error,
       "sentAt" = CASE WHEN EXCLUDED.status = 'SENT' THEN NOW() ELSE "GoogleWalletMessage"."sentAt" END`,
    [
      randomUUID(),
      card.organizationId,
      card.customerId,
      card.cardId,
      candidate.kind,
      key,
      candidate.header,
      candidate.body,
      status,
      error,
    ],
  );
}

export async function deliverWalletMessagesForToken(token: string) {
  if (!googleWalletConfigured()) return { sent: 0 };
  const card = await loadCardContext(token);
  if (!card) return { sent: 0 };
  const sentCount = await pool.query<{ total: number }>(
    `SELECT COUNT(*)::int AS total
     FROM "GoogleWalletMessage"
     WHERE "loyaltyCardId" = $1 AND status = 'SENT' AND "sentAt" > NOW() - interval '24 hours'`,
    [card.cardId],
  );
  let remainingQuota = quotaAllows(sentCount.rows[0]?.total ?? 0)
    ? 3 - (sentCount.rows[0]?.total ?? 0)
    : 0;
  const reviewStatus = remainingQuota > 0 ? await googleWalletClassReviewStatus() : null;
  let sent = 0;
  for (const candidate of await candidatesFor(card)) {
    const key = walletIdempotencyKey(candidate.kind, candidate.entityId);
    const existing = await pool.query<{ status: "SENT" | "SKIPPED" | "FAILED" | "PENDING"; attemptCount: number }>(
      `SELECT status, "attemptCount" FROM "GoogleWalletMessage"
       WHERE "organizationId" = $1 AND "idempotencyKey" = $2`,
      [card.organizationId, key],
    );
    const stored = storedSendState(existing.rows[0]?.status ?? null, existing.rows[0]?.attemptCount ?? 0);
    if (stored !== "send") continue;
    const consent = walletMessageAllowed({ kind: candidate.kind, ...card });
    if (consent !== "send") {
      await remember(card, candidate, "SKIPPED", consent);
      continue;
    }
    if (remainingQuota <= 0) continue;
    if (reviewStatus && reviewStatus.toUpperCase() !== "APPROVED") return { sent };
    let httpStatus = 0;
    try {
      httpStatus = await addGoogleWalletTextMessage(token, {
        id: key,
        header: candidate.header,
        body: candidate.body,
      });
    } catch (error) {
      logger.warn("google wallet message failed", { status: 0 });
      await remember(card, candidate, "FAILED", error instanceof Error ? error.message.slice(0, 120) : "temporary");
      continue;
    }
    const outcome = notifyOutcome(httpStatus, reviewStatus);
    if (outcome === "sent") {
      await remember(card, candidate, "SENT", null);
      sent += 1;
      remainingQuota -= 1;
      continue;
    }
    if (outcome === "quota" || outcome === "not_published" || outcome === "not_registered") {
      await remember(card, candidate, "SKIPPED", outcome);
      if (outcome === "quota") remainingQuota = 0;
      continue;
    }
    await remember(card, candidate, "FAILED", `http_${httpStatus}`);
  }
  return { sent };
}

export async function deliverDueWalletMessages() {
  if (!googleWalletConfigured()) return { sent: 0, cards: 0 };
  const { rows } = await pool.query<{ publicToken: string }>(
    `SELECT lc."publicToken"
     FROM "LoyaltyCard" lc
     WHERE lc.status = 'ACTIVE'
       AND (
         EXISTS (
           SELECT 1 FROM "LoyaltyVisitReward" r
           WHERE r."loyaltyCardId" = lc.id AND r.status = 'AVAILABLE'
             AND NOT EXISTS (
               SELECT 1 FROM "GoogleWalletMessage" m
               WHERE m."loyaltyCardId" = lc.id
                 AND m."idempotencyKey" = 'REWARD_AVAILABLE:' || r.id
                 AND m.status IN ('SENT', 'SKIPPED')
             )
         )
         OR EXISTS (
           SELECT 1 FROM "ReviewRequest" rr
           WHERE rr."customerId" = lc."customerId" AND rr."organizationId" = lc."organizationId"
             AND rr.status IN ('PENDING', 'SENT') AND rr."scheduledFor" <= NOW()
             AND NOT EXISTS (
               SELECT 1 FROM "GoogleWalletMessage" m
               WHERE m."idempotencyKey" = 'REVIEW_REQUEST:' || rr.id
                 AND m.status IN ('SENT', 'SKIPPED')
             )
         )
       )
     LIMIT 20`,
  );
  let sent = 0;
  for (const row of rows) {
    try {
      const result = await deliverWalletMessagesForToken(row.publicToken);
      sent += result.sent;
    } catch {
      logger.warn("google wallet card skipped");
    }
  }
  return { sent, cards: rows.length };
}

const globalState = globalThis as { googleWalletTimer?: ReturnType<typeof setInterval> };

export function startGoogleWalletNotifier() {
  if (globalState.googleWalletTimer) return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const tick = () => {
    void deliverDueWalletMessages().catch(() => {
      logger.warn("google wallet tick failed");
    });
  };
  const starter = setTimeout(tick, 20_000);
  starter.unref?.();
  globalState.googleWalletTimer = setInterval(tick, 60_000);
  globalState.googleWalletTimer.unref?.();
}
