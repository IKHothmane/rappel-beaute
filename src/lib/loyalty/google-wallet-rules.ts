import { publicReviewPath } from "@/lib/reviews/public-review";

export const WALLET_NOTIFY_LIMIT = 3;
export const WALLET_MESSAGE_KINDS = [
  "REWARD_AVAILABLE",
  "REWARD_EXPIRY",
  "LOYALTY_PROGRESS",
  "REVIEW_REQUEST",
] as const;

export type WalletMessageKind = (typeof WALLET_MESSAGE_KINDS)[number];

export type WalletNotifyDecision =
  | "send"
  | "no_consent"
  | "category_off"
  | "quota"
  | "duplicate"
  | "not_useful"
  | "not_published"
  | "unconfigured"
  | "wrong_organization";

export function walletIdempotencyKey(kind: WalletMessageKind, entityId: string) {
  return `${kind}:${entityId}`;
}

export function progressIsUseful(cycle: number, visitsPerReward: number, remaining: number) {
  if (visitsPerReward <= 1 || cycle <= 0) return false;
  if (remaining === 1) return true;
  return cycle === Math.ceil(visitsPerReward / 2) && remaining > 1;
}

export function walletMessageAllowed(input: {
  kind: WalletMessageKind;
  revoked: boolean;
  hasPreference: boolean;
  loyaltyReward: boolean;
  loyaltyProgress: boolean;
  reviewRequest: boolean;
  rewardExpiry: boolean;
}): WalletNotifyDecision {
  if (input.revoked) return "no_consent";
  if (input.kind === "LOYALTY_PROGRESS") {
    return input.hasPreference && input.loyaltyProgress ? "send" : "category_off";
  }
  if (!input.hasPreference) return "send";
  if (input.kind === "REWARD_AVAILABLE" && !input.loyaltyReward) return "category_off";
  if (input.kind === "REWARD_EXPIRY" && !input.rewardExpiry) return "category_off";
  if (input.kind === "REVIEW_REQUEST" && !input.reviewRequest) return "category_off";
  return "send";
}

export function quotaAllows(sentInLast24Hours: number) {
  return sentInLast24Hours < WALLET_NOTIFY_LIMIT;
}

export function storedSendState(
  status: "SENT" | "SKIPPED" | "FAILED" | "PENDING" | null,
  attemptCount: number,
): "send" | "duplicate" | "stop" {
  if (status === "SENT" || status === "SKIPPED") return "duplicate";
  if (status === "FAILED" && attemptCount >= 3) return "stop";
  return "send";
}

export function reviewLinkForInstitute(input: {
  origin: string;
  cardSlug: string;
  requestSlug: string;
  token: string;
}) {
  if (!input.cardSlug || input.cardSlug !== input.requestSlug) return null;
  if (!input.token.startsWith("RBREV_")) return null;
  let base: URL;
  try {
    base = new URL(input.origin);
  } catch {
    return null;
  }
  if (base.protocol !== "https:") return null;
  const path = publicReviewPath(input.cardSlug, input.token);
  const url = new URL(path, base);
  if (url.origin !== base.origin) return null;
  if (!url.pathname.startsWith(`/book/${encodeURIComponent(input.cardSlug)}/reviews/`)) return null;
  return url.toString();
}

export function notifyOutcome(status: number, reviewStatus: string | null): WalletNotifyDecision | "sent" | "not_registered" | "temporary" {
  if (reviewStatus && reviewStatus.toUpperCase() !== "APPROVED") return "not_published";
  if (status === 404) return "not_registered";
  if (status === 409) return "sent";
  if (status === 429) return "quota";
  if (status >= 500) return "temporary";
  if (status >= 200 && status < 300) return "sent";
  return "temporary";
}
