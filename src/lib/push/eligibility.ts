import { localPhoneDigits } from "@/lib/validation/customer";

export const PUSH_CATEGORIES = [
  "LOYALTY_REWARD",
  "LOYALTY_PROGRESS",
  "REVIEW_REQUEST",
  "REWARD_EXPIRY",
  "OFFER",
] as const;

export type PushCategory = (typeof PUSH_CATEGORIES)[number];

export type PushPreferences = {
  loyaltyReward: boolean;
  loyaltyProgress: boolean;
  reviewRequest: boolean;
  rewardExpiry: boolean;
  offers: boolean;
};

export type PushConsent = PushPreferences & {
  consentedAt: Date | null;
  revokedAt: Date | null;
};

/** La permission du navigateur n'est demandée que sur un clic explicite. */
export const REQUEST_PERMISSION_ON_LOAD = false;

const CARD_TOKEN = /^RBLOY_[A-Z2-9]{8,32}$/;

export function cardTokenFromClient(body: Record<string, unknown>): string | null {
  const token = typeof body.cardToken === "string" ? body.cardToken.trim().toUpperCase() : "";
  if (!CARD_TOKEN.test(token)) return null;
  return token;
}

export function publicPushBody(input: unknown): {
  cardToken: string | null;
  endpoint: unknown;
  p256dh: unknown;
  auth: unknown;
  expirationTime: unknown;
  preferences: unknown;
} {
  const row = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  return {
    cardToken: cardTokenFromClient(row),
    endpoint: row.endpoint,
    p256dh: row.p256dh,
    auth: row.auth,
    expirationTime: row.expirationTime,
    preferences: row.preferences,
  };
}

export function preferencesOnEnable(input: unknown): PushPreferences {
  const row =
    input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const present = (key: string) => Object.prototype.hasOwnProperty.call(row, key);
  return {
    loyaltyReward: present("loyaltyReward") ? row.loyaltyReward === true : true,
    loyaltyProgress: row.loyaltyProgress === true,
    reviewRequest: present("reviewRequest") ? row.reviewRequest === true : true,
    rewardExpiry: present("rewardExpiry") ? row.rewardExpiry === true : true,
    offers: row.offers === true,
  };
}

export function validPushEndpoint(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== "string" || endpoint.length < 20 || endpoint.length > 2000) return false;
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validPushKey(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{16,200}$/.test(value);
}

export function subscriptionExpiration(value: unknown, now: Date): Date | null | "expired" {
  if (value == null || value === "") return null;
  const time = typeof value === "number" ? value : typeof value === "string" ? Date.parse(value) : NaN;
  if (!Number.isFinite(time)) return "expired";
  const date = new Date(time);
  if (date.getTime() <= now.getTime()) return "expired";
  return date;
}

export type BrowserPermission = "default" | "granted" | "denied" | "unsupported";

export function permissionDecision(
  permission: BrowserPermission,
  userGesture: boolean,
): "prompt" | "granted" | "denied" | "blocked" {
  if (!userGesture || REQUEST_PERMISSION_ON_LOAD) return "blocked";
  if (permission === "denied" || permission === "unsupported") return "denied";
  if (permission === "granted") return "granted";
  return "prompt";
}

export function categoryEnabled(consent: PushConsent | null, category: PushCategory): boolean {
  if (!consent?.consentedAt || consent.revokedAt) return false;
  if (category === "LOYALTY_REWARD") return consent.loyaltyReward;
  if (category === "LOYALTY_PROGRESS") return consent.loyaltyProgress;
  if (category === "REVIEW_REQUEST") return consent.reviewRequest;
  if (category === "REWARD_EXPIRY") return consent.rewardExpiry;
  return consent.offers;
}

export type DeliveryDecision =
  | "send"
  | "no_consent"
  | "category_off"
  | "subscription_revoked"
  | "subscription_expired"
  | "wrong_organization"
  | "duplicate"
  | "ineligible"
  | "offer_without_marketing";

export function decideDelivery(input: {
  eventOrganizationId: string;
  subscriptionOrganizationId: string;
  category: PushCategory;
  eligible: boolean;
  alreadySent: boolean;
  consent: PushConsent | null;
  subscriptionRevoked: boolean;
  subscriptionExpired: boolean;
  marketingOptIn: boolean;
}): DeliveryDecision {
  if (input.eventOrganizationId !== input.subscriptionOrganizationId) return "wrong_organization";
  if (!input.eligible) return "ineligible";
  if (input.alreadySent) return "duplicate";
  if (!input.consent?.consentedAt || input.consent.revokedAt) return "no_consent";
  if (!categoryEnabled(input.consent, input.category)) return "category_off";
  if (input.category === "OFFER" && !input.marketingOptIn) return "offer_without_marketing";
  if (input.subscriptionRevoked) return "subscription_revoked";
  if (input.subscriptionExpired) return "subscription_expired";
  return "send";
}

export function pushGoneStatus(statusCode: number | undefined): boolean {
  return statusCode === 404 || statusCode === 410;
}

export function deliveryAfterAttempts(
  results: Array<"sent" | "gone" | "retry">,
  previousError: string | null,
): "SENT" | "PENDING" | "FAILED" {
  if (results.includes("sent")) return "SENT";
  if (results.includes("retry")) return previousError ? "FAILED" : "PENDING";
  return "FAILED";
}

const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000];
export const PUSH_MAX_ATTEMPTS = 5;

export function phonesMatch(stored: string, given: string): boolean {
  const left = localPhoneDigits(stored);
  const right = localPhoneDigits(given);
  if (left.length < 8 || right.length < 8) return false;
  return left === right;
}

export type PushGrant = {
  organizationId: string;
  customerId: string;
  expiresAt: Date;
  revokedAt: Date | null;
};

export function grantAllowsCard(
  grant: PushGrant | null,
  card: { organizationId: string; customerId: string } | null,
  now: Date,
): "ok" | "missing" | "mismatch" | "expired" {
  if (!grant || !card) return "missing";
  if (grant.revokedAt || grant.expiresAt.getTime() <= now.getTime()) return "expired";
  if (grant.organizationId !== card.organizationId || grant.customerId !== card.customerId) return "mismatch";
  return "ok";
}

export function canClaimDelivery(
  row: { status: string; scheduledFor: Date; nextAttemptAt: Date; lockedUntil: Date | null },
  now: Date,
): boolean {
  if (row.status !== "PENDING") return false;
  if (row.scheduledFor.getTime() > now.getTime()) return false;
  if (row.nextAttemptAt.getTime() > now.getTime()) return false;
  if (row.lockedUntil && row.lockedUntil.getTime() > now.getTime()) return false;
  return true;
}

export function nextDeliveryState(input: {
  results: Array<"sent" | "gone" | "retry">;
  attemptCount: number;
  consent: DeliveryDecision;
}): { status: "SENT" | "PENDING" | "FAILED" | "SKIPPED"; delayMs: number | null } {
  if (input.consent !== "send") return { status: "SKIPPED", delayMs: null };
  if (input.results.includes("sent")) return { status: "SENT", delayMs: null };
  if (input.results.includes("retry") && input.attemptCount < PUSH_MAX_ATTEMPTS) {
    const delay = RETRY_DELAYS_MS[Math.min(Math.max(input.attemptCount - 1, 0), RETRY_DELAYS_MS.length - 1)] ?? 60_000;
    return { status: "PENDING", delayMs: delay };
  }
  return { status: "FAILED", delayMs: null };
}
