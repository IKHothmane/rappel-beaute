import { randomUUID } from "crypto";
import { pool } from "@/lib/db/pool";
import { logger } from "@/lib/logger";
import {
  decideDelivery,
  grantAllowsCard,
  nextDeliveryState,
  phonesMatch,
  preferencesOnEnable,
  pushGoneStatus,
  subscriptionExpiration,
  validPushEndpoint,
  validPushKey,
  type PushGrant,
  type PushPreferences,
} from "@/lib/push/eligibility";
import { vapidCredentials, vapidPublicConfig } from "@/lib/push/vapid";

type CardBinding = {
  organizationId: string;
  customerId: string;
  phone: string;
  marketingOptIn: boolean;
};

type PushClient = {
  setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
  sendNotification(
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: string,
  ): Promise<unknown>;
};

let vapidReady = false;

async function loadCard(token: string): Promise<CardBinding | null> {
  const { rows } = await pool.query<CardBinding>(
    `SELECT lc."organizationId", lc."customerId", c.phone,
            (c."marketingWhatsapp" OR c."marketingEmail" OR c."marketingSms") AS "marketingOptIn"
     FROM "LoyaltyCard" lc
     JOIN "Organization" o ON o.id = lc."organizationId" AND o.status = 'ACTIVE'
     JOIN "Customer" c ON c.id = lc."customerId" AND c."deletedAt" IS NULL
     WHERE lc."publicToken" = $1 AND lc.status = 'ACTIVE'`,
    [token],
  );
  return rows[0] ?? null;
}

export async function customerPushStatus(token: string, grant: PushGrant | null) {
  const card = await loadCard(token);
  if (!card) return null;
  const configured = vapidPublicConfig().configured;
  if (grantAllowsCard(grant, card, new Date()) !== "ok") {
    return { configured, authorized: false as const };
  }
  const prefs = await pool.query<{
    loyaltyReward: boolean;
    loyaltyProgress: boolean;
    reviewRequest: boolean;
    rewardExpiry: boolean;
    offers: boolean;
    revokedAt: Date | null;
  }>(
    `SELECT "loyaltyReward", "loyaltyProgress", "reviewRequest", "rewardExpiry", offers, "revokedAt"
     FROM "NotificationPreference"
     WHERE "organizationId" = $1 AND "customerId" = $2`,
    [card.organizationId, card.customerId],
  );
  const subs = await pool.query<{ active: number }>(
    `SELECT COUNT(*)::int AS active
     FROM "WebPushSubscription"
     WHERE "organizationId" = $1 AND "customerId" = $2 AND "revokedAt" IS NULL
       AND ("expirationTime" IS NULL OR "expirationTime" > NOW())`,
    [card.organizationId, card.customerId],
  );
  const preference = prefs.rows[0] ?? null;
  return {
    configured,
    authorized: true as const,
    subscribed: (subs.rows[0]?.active ?? 0) > 0 && !preference?.revokedAt,
    preferences: preference
      ? {
          loyaltyReward: preference.loyaltyReward,
          loyaltyProgress: preference.loyaltyProgress,
          reviewRequest: preference.reviewRequest,
          rewardExpiry: preference.rewardExpiry,
          offers: preference.offers,
        }
      : preferencesOnEnable(undefined),
  };
}

export async function authorizeCustomerPush(token: string, phone: string): Promise<
  { ok: true; grantToken: string } | { ok: false; reason: "not_found" | "phone" }
> {
  const card = await loadCard(token);
  if (!card) return { ok: false, reason: "not_found" };
  if (!phonesMatch(card.phone, phone)) return { ok: false, reason: "phone" };
  const { newGrantToken, hashGrantToken, GRANT_TTL_MS } = await import("@/lib/push/grant");
  const grantToken = newGrantToken();
  await pool.query(
    `INSERT INTO "PushAccessGrant" (id, "organizationId", "customerId", "tokenHash", "expiresAt", "createdAt")
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [randomUUID(), card.organizationId, card.customerId, hashGrantToken(grantToken), new Date(Date.now() + GRANT_TTL_MS)],
  );
  return { ok: true, grantToken };
}

export async function subscribeCustomerPush(input: {
  token: string;
  endpoint: unknown;
  p256dh: unknown;
  auth: unknown;
  expirationTime: unknown;
  preferences: unknown;
  grant: PushGrant | null;
  now?: Date;
}): Promise<"ok" | "not_found" | "forbidden" | "invalid" | "expired"> {
  const card = await loadCard(input.token);
  if (!card) return "not_found";
  if (grantAllowsCard(input.grant, card, input.now ?? new Date()) !== "ok") return "forbidden";
  if (!validPushEndpoint(input.endpoint) || !validPushKey(input.p256dh) || !validPushKey(input.auth)) {
    return "invalid";
  }
  const expiration = subscriptionExpiration(input.expirationTime, input.now ?? new Date());
  if (expiration === "expired") return "expired";
  const prefs = preferencesOnEnable(input.preferences);
  await pool.query(
    `INSERT INTO "NotificationPreference" (
       id, "organizationId", "customerId",
       "loyaltyReward", "loyaltyProgress", "reviewRequest", "rewardExpiry", offers,
       "consentedAt", "revokedAt", "createdAt", "updatedAt"
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NULL,NOW(),NOW())
     ON CONFLICT ("organizationId", "customerId") DO UPDATE SET
       "loyaltyReward" = EXCLUDED."loyaltyReward",
       "loyaltyProgress" = EXCLUDED."loyaltyProgress",
       "reviewRequest" = EXCLUDED."reviewRequest",
       "rewardExpiry" = EXCLUDED."rewardExpiry",
       offers = EXCLUDED.offers,
       "consentedAt" = COALESCE("NotificationPreference"."consentedAt", NOW()),
       "revokedAt" = NULL,
       "updatedAt" = NOW()`,
    [
      randomUUID(),
      card.organizationId,
      card.customerId,
      prefs.loyaltyReward,
      prefs.loyaltyProgress,
      prefs.reviewRequest,
      prefs.rewardExpiry,
      prefs.offers,
    ],
  );
  await pool.query(
    `INSERT INTO "WebPushSubscription" (
       id, "organizationId", "customerId", endpoint, p256dh, auth, "expirationTime",
       "revokedAt", "failureCount", "createdAt", "updatedAt"
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,NULL,0,NOW(),NOW())
     ON CONFLICT (endpoint) DO UPDATE SET
       "organizationId" = EXCLUDED."organizationId",
       "customerId" = EXCLUDED."customerId",
       p256dh = EXCLUDED.p256dh,
       auth = EXCLUDED.auth,
       "expirationTime" = EXCLUDED."expirationTime",
       "revokedAt" = NULL,
       "failureCount" = 0,
       "updatedAt" = NOW()`,
    [randomUUID(), card.organizationId, card.customerId, input.endpoint, input.p256dh, input.auth, expiration],
  );
  await dispatchDueCustomerPushes(card.organizationId, card.customerId);
  return "ok";
}

export async function unsubscribeCustomerPush(token: string, grant: PushGrant | null): Promise<"ok" | "not_found" | "forbidden"> {
  const card = await loadCard(token);
  if (!card) return "not_found";
  if (grantAllowsCard(grant, card, new Date()) !== "ok") return "forbidden";
  await pool.query(
    `UPDATE "NotificationPreference"
     SET "revokedAt" = NOW(), "updatedAt" = NOW()
     WHERE "organizationId" = $1 AND "customerId" = $2`,
    [card.organizationId, card.customerId],
  );
  await pool.query(
    `UPDATE "WebPushSubscription"
     SET "revokedAt" = NOW(), "updatedAt" = NOW()
     WHERE "organizationId" = $1 AND "customerId" = $2 AND "revokedAt" IS NULL`,
    [card.organizationId, card.customerId],
  );
  return "ok";
}

export async function updateCustomerPushPreferences(
  token: string,
  preferences: PushPreferences,
  grant: PushGrant | null,
): Promise<"ok" | "not_found" | "forbidden" | "inactive"> {
  const card = await loadCard(token);
  if (!card) return "not_found";
  if (grantAllowsCard(grant, card, new Date()) !== "ok") return "forbidden";
  const { rowCount } = await pool.query(
    `UPDATE "NotificationPreference"
     SET "loyaltyReward" = $3, "loyaltyProgress" = $4, "reviewRequest" = $5,
         "rewardExpiry" = $6, offers = $7, "updatedAt" = NOW()
     WHERE "organizationId" = $1 AND "customerId" = $2
       AND "consentedAt" IS NOT NULL AND "revokedAt" IS NULL`,
    [
      card.organizationId,
      card.customerId,
      preferences.loyaltyReward,
      preferences.loyaltyProgress,
      preferences.reviewRequest,
      preferences.rewardExpiry,
      preferences.offers,
    ],
  );
  return (rowCount ?? 0) > 0 ? "ok" : "inactive";
}

const LIVE_SUBSCRIPTION = `
  EXISTS (
    SELECT 1 FROM "WebPushSubscription" s
    WHERE s."organizationId" = p."organizationId"
      AND s."customerId" = p."customerId"
      AND s."revokedAt" IS NULL
      AND (s."expirationTime" IS NULL OR s."expirationTime" > NOW())
  )`;

async function enqueueDue(organizationId: string, customerId: string | null) {
  const args = [organizationId, customerId];
  await pool.query(
    `INSERT INTO "CustomerPushDelivery" (
       id, "organizationId", "customerId", category, "idempotencyKey", title, body, url, status, "scheduledFor", "createdAt"
     )
     SELECT gen_random_uuid()::text, r."organizationId", r."customerId", 'LOYALTY_REWARD',
            'reward:' || r.id, 'Récompense disponible',
            'Votre récompense « ' || r.name || ' » est prête.',
            '/carte/' || lc."publicToken" || '/',
            'PENDING', NOW(), NOW()
     FROM "LoyaltyVisitReward" r
     JOIN "NotificationPreference" p
       ON p."organizationId" = r."organizationId" AND p."customerId" = r."customerId"
     JOIN "LoyaltyCard" lc ON lc.id = r."loyaltyCardId"
     WHERE r."organizationId" = $1
       AND ($2::text IS NULL OR r."customerId" = $2)
       AND r.status = 'AVAILABLE'
       AND p."consentedAt" IS NOT NULL AND p."revokedAt" IS NULL AND p."loyaltyReward" = true
       AND ${LIVE_SUBSCRIPTION}
     ON CONFLICT ("organizationId", "idempotencyKey") DO NOTHING`,
    args,
  );
  await pool.query(
    `INSERT INTO "CustomerPushDelivery" (
       id, "organizationId", "customerId", category, "idempotencyKey", title, body, url, status, "scheduledFor", "createdAt"
     )
     SELECT gen_random_uuid()::text, e."organizationId", e."customerId", 'LOYALTY_PROGRESS',
            'visit:' || e.id, 'Carte fidélité',
            'Votre carte avance : ' ||
              CASE
                WHEN mod(v.visits, GREATEST(COALESCE(lp."visitsPerReward", 10), 1)) = 0 THEN GREATEST(COALESCE(lp."visitsPerReward", 10), 1)
                ELSE mod(v.visits, GREATEST(COALESCE(lp."visitsPerReward", 10), 1))
              END
              || '/' || GREATEST(COALESCE(lp."visitsPerReward", 10), 1) || ' passages.',
            '/carte/' || lc."publicToken" || '/',
            'PENDING', e."validatedAt", NOW()
     FROM "LoyaltyEvent" e
     JOIN "NotificationPreference" p
       ON p."organizationId" = e."organizationId" AND p."customerId" = e."customerId"
     JOIN "LoyaltyCard" lc ON lc.id = e."loyaltyCardId"
     LEFT JOIN "LoyaltyProgram" lp ON lp."organizationId" = e."organizationId"
     JOIN LATERAL (
       SELECT COALESCE(SUM(e2.points), 0)::int AS visits
       FROM "LoyaltyEvent" e2
       WHERE e2."loyaltyCardId" = e."loyaltyCardId" AND e2.type = 'VISIT' AND e2."validatedAt" <= e."validatedAt"
     ) v ON true
     WHERE e."organizationId" = $1
       AND ($2::text IS NULL OR e."customerId" = $2)
       AND e.type = 'VISIT' AND e.points > 0
       AND e."validatedAt" >= p."consentedAt"
       AND p."revokedAt" IS NULL AND p."loyaltyProgress" = true
       AND ${LIVE_SUBSCRIPTION}
     ON CONFLICT ("organizationId", "idempotencyKey") DO NOTHING`,
    args,
  );
  await pool.query(
    `INSERT INTO "CustomerPushDelivery" (
       id, "organizationId", "customerId", category, "idempotencyKey", title, body, url, status, "scheduledFor", "createdAt"
     )
     SELECT gen_random_uuid()::text, rr."organizationId", rr."customerId", 'REVIEW_REQUEST',
            'review:' || rr.id, 'Donner mon avis',
            'Votre rendez-vous est terminé. Dites-nous comment il s''est passé.',
            '/book/' || o.slug || '/reviews/' || rr."publicToken" || '/',
            'PENDING', rr."scheduledFor", NOW()
     FROM "ReviewRequest" rr
     JOIN "Organization" o ON o.id = rr."organizationId"
     JOIN "Appointment" a ON a.id = rr."appointmentId" AND a.status = 'COMPLETED'
     JOIN "NotificationPreference" p
       ON p."organizationId" = rr."organizationId" AND p."customerId" = rr."customerId"
     WHERE rr."organizationId" = $1
       AND ($2::text IS NULL OR rr."customerId" = $2)
       AND rr.status IN ('PENDING', 'SENT')
       AND rr."tokenExpiresAt" > NOW()
       AND rr."scheduledFor" <= NOW()
       AND NOT EXISTS (SELECT 1 FROM "Review" rv WHERE rv."appointmentId" = rr."appointmentId")
       AND p."consentedAt" IS NOT NULL AND p."revokedAt" IS NULL AND p."reviewRequest" = true
       AND ${LIVE_SUBSCRIPTION}
     ON CONFLICT ("organizationId", "idempotencyKey") DO NOTHING`,
    args,
  );
  await pool.query(
    `INSERT INTO "CustomerPushDelivery" (
       id, "organizationId", "customerId", category, "idempotencyKey", title, body, url, status, "scheduledFor", "createdAt"
     )
     SELECT gen_random_uuid()::text, r."organizationId", r."customerId", 'REWARD_EXPIRY',
            'expiry:' || r.id, 'Récompense bientôt expirée',
            'Votre récompense « ' || r.name || ' » expire bientôt.',
            '/carte/' || lc."publicToken" || '/',
            'PENDING', r."expiresAt" - interval '3 days', NOW()
     FROM "LoyaltyVisitReward" r
     JOIN "NotificationPreference" p
       ON p."organizationId" = r."organizationId" AND p."customerId" = r."customerId"
     JOIN "LoyaltyCard" lc ON lc.id = r."loyaltyCardId"
     WHERE r."organizationId" = $1
       AND ($2::text IS NULL OR r."customerId" = $2)
       AND r.status = 'AVAILABLE'
       AND r."expiresAt" IS NOT NULL
       AND r."expiresAt" > NOW()
       AND r."expiresAt" <= NOW() + interval '3 days'
       AND p."consentedAt" IS NOT NULL AND p."revokedAt" IS NULL AND p."rewardExpiry" = true
       AND ${LIVE_SUBSCRIPTION}
     ON CONFLICT ("organizationId", "idempotencyKey") DO NOTHING`,
    args,
  );
  await pool.query(
    `INSERT INTO "CustomerPushDelivery" (
       id, "organizationId", "customerId", category, "idempotencyKey", title, body, url, status, "scheduledFor", "createdAt"
     )
     SELECT gen_random_uuid()::text, pr."organizationId", p."customerId", 'OFFER',
            'offer:' || pr.id || ':' || p."customerId",
            'Offre de l''institut',
            pr.name,
            '/book/' || o.slug || '/',
            'PENDING', GREATEST(COALESCE(pr."startsAt", pr."createdAt"), p."consentedAt"), NOW()
     FROM "Promotion" pr
     JOIN "Organization" o ON o.id = pr."organizationId"
     JOIN "NotificationPreference" p ON p."organizationId" = pr."organizationId"
     JOIN "Customer" c ON c.id = p."customerId"
     WHERE pr."organizationId" = $1
       AND ($2::text IS NULL OR p."customerId" = $2)
       AND pr.status = 'ACTIVE' AND pr."deletedAt" IS NULL
       AND (pr."customerId" IS NULL OR pr."customerId" = p."customerId")
       AND (pr."startsAt" IS NULL OR pr."startsAt" <= NOW())
       AND (pr."endsAt" IS NULL OR pr."endsAt" > NOW())
       AND pr."createdAt" >= p."consentedAt"
       AND p."revokedAt" IS NULL AND p.offers = true
       AND (c."marketingWhatsapp" OR c."marketingEmail" OR c."marketingSms")
       AND ${LIVE_SUBSCRIPTION}
     ON CONFLICT ("organizationId", "idempotencyKey") DO NOTHING`,
    args,
  );
}

async function pushClient(): Promise<PushClient | null> {
  const creds = vapidCredentials();
  if (!creds) return null;
  const mod = (await import("web-push")) as { default?: PushClient } & PushClient;
  const client = mod.default ?? mod;
  if (!vapidReady) {
    client.setVapidDetails(creds.subject, creds.publicKey, creds.privateKey);
    vapidReady = true;
  }
  return client;
}

async function sendToSubscription(
  client: PushClient,
  sub: { id: string; endpoint: string; p256dh: string; auth: string },
  payload: string,
): Promise<"sent" | "gone" | "retry"> {
  try {
    await client.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payload,
    );
    return "sent";
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (pushGoneStatus(statusCode)) {
      await pool.query(
        `UPDATE "WebPushSubscription" SET "revokedAt" = NOW(), "updatedAt" = NOW() WHERE id = $1`,
        [sub.id],
      );
      return "gone";
    }
    await pool.query(
      `UPDATE "WebPushSubscription"
       SET "failureCount" = "failureCount" + 1, "updatedAt" = NOW()
       WHERE id = $1`,
      [sub.id],
    );
    logger.warn("customer push send failed", { status: statusCode ?? 0 });
    return "retry";
  }
}

export async function dispatchDueCustomerPushes(organizationId: string, customerId?: string) {
  const scope = customerId ?? null;
  await pool.query(
    `UPDATE "WebPushSubscription"
     SET "revokedAt" = NOW(), "updatedAt" = NOW()
     WHERE "organizationId" = $1 AND "revokedAt" IS NULL
       AND "expirationTime" IS NOT NULL AND "expirationTime" <= NOW()
       AND ($2::text IS NULL OR "customerId" = $2)`,
    [organizationId, scope],
  );
  await enqueueDue(organizationId, scope);
  const client = await pushClient();
  if (!client) return { sent: 0, configured: false };

  const pending = await pool.query<{
    id: string;
    title: string;
    body: string;
    url: string | null;
    customerId: string;
    organizationId: string;
    category: "LOYALTY_REWARD" | "LOYALTY_PROGRESS" | "REVIEW_REQUEST" | "REWARD_EXPIRY" | "OFFER";
    attemptCount: number;
  }>(
    `WITH picked AS (
       SELECT id FROM "CustomerPushDelivery"
       WHERE "organizationId" = $1 AND status = 'PENDING'
         AND "scheduledFor" <= NOW()
         AND "nextAttemptAt" <= NOW()
         AND ("lockedUntil" IS NULL OR "lockedUntil" <= NOW())
         AND ($2::text IS NULL OR "customerId" = $2)
       ORDER BY "nextAttemptAt" ASC
       LIMIT 40
       FOR UPDATE SKIP LOCKED
     )
     UPDATE "CustomerPushDelivery" d
     SET "lockedUntil" = NOW() + interval '2 minutes',
         "attemptCount" = "attemptCount" + 1
     FROM picked
     WHERE d.id = picked.id
     RETURNING d.id, d.title, d.body, d.url, d."customerId", d."organizationId", d.category, d."attemptCount"`,
    [organizationId, scope],
  );

  let sent = 0;
  for (const row of pending.rows) {
    const consentRow = await pool.query<{
      loyaltyReward: boolean | null;
      loyaltyProgress: boolean | null;
      reviewRequest: boolean | null;
      rewardExpiry: boolean | null;
      offers: boolean | null;
      consentedAt: Date | null;
      revokedAt: Date | null;
      marketingOptIn: boolean;
    }>(
      `SELECT p."loyaltyReward", p."loyaltyProgress", p."reviewRequest", p."rewardExpiry", p.offers,
              p."consentedAt", p."revokedAt",
              (c."marketingWhatsapp" OR c."marketingEmail" OR c."marketingSms") AS "marketingOptIn"
       FROM "Customer" c
       LEFT JOIN "NotificationPreference" p
         ON p."customerId" = c.id AND p."organizationId" = c."organizationId"
       WHERE c.id = $1 AND c."organizationId" = $2`,
      [row.customerId, row.organizationId],
    );
    const pref = consentRow.rows[0];
    const decision = decideDelivery({
      eventOrganizationId: row.organizationId,
      subscriptionOrganizationId: row.organizationId,
      category: row.category,
      eligible: true,
      alreadySent: false,
      consent: pref?.consentedAt
        ? {
            consentedAt: pref.consentedAt,
            revokedAt: pref.revokedAt,
            loyaltyReward: Boolean(pref.loyaltyReward),
            loyaltyProgress: Boolean(pref.loyaltyProgress),
            reviewRequest: Boolean(pref.reviewRequest),
            rewardExpiry: Boolean(pref.rewardExpiry),
            offers: Boolean(pref.offers),
          }
        : null,
      subscriptionRevoked: false,
      subscriptionExpired: false,
      marketingOptIn: Boolean(pref?.marketingOptIn),
    });
    const subs = await pool.query<{ id: string; endpoint: string; p256dh: string; auth: string }>(
      `SELECT id, endpoint, p256dh, auth
       FROM "WebPushSubscription"
       WHERE "organizationId" = $1 AND "customerId" = $2 AND "revokedAt" IS NULL
         AND ("expirationTime" IS NULL OR "expirationTime" > NOW())`,
      [row.organizationId, row.customerId],
    );
    const results: Array<"sent" | "gone" | "retry"> = [];
    if (decision === "send") {
      const payload = JSON.stringify({
        title: row.title,
        body: row.body,
        url: row.url && row.url.startsWith("/") ? row.url : "/",
      });
      if (subs.rows.length === 0) results.push("retry");
      for (const sub of subs.rows) {
        results.push(await sendToSubscription(client, sub, payload));
      }
    }
    const outcome = nextDeliveryState({
      results,
      attemptCount: Number(row.attemptCount),
      consent: decision,
    });
    if (outcome.status === "SENT") sent += 1;
    await pool.query(
      `UPDATE "CustomerPushDelivery"
       SET status = $2::"CustomerPushStatus",
           "sentAt" = CASE WHEN $2 = 'SENT' THEN NOW() ELSE NULL END,
           "lockedUntil" = NULL,
           "nextAttemptAt" = CASE WHEN $3::int IS NULL THEN "nextAttemptAt" ELSE NOW() + ($3::int * interval '1 millisecond') END,
           error = $4
       WHERE id = $1`,
      [row.id, outcome.status, outcome.delayMs, outcome.status === "PENDING" ? "temporary" : outcome.status === "SENT" ? null : decision],
    );
  }
  return { sent, configured: true };
}

export async function dispatchAllDueCustomerPushes() {
  const { rows } = await pool.query<{ organizationId: string }>(
    `SELECT DISTINCT "organizationId"
     FROM "WebPushSubscription"
     WHERE "revokedAt" IS NULL`,
  );
  let sent = 0;
  for (const row of rows) {
    const result = await dispatchDueCustomerPushes(row.organizationId);
    sent += result.sent;
  }
  return { sent, organizations: rows.length, agendaRequired: false as const };
}
