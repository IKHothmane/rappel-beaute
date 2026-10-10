import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  notifyOutcome,
  progressIsUseful,
  quotaAllows,
  reviewLinkForInstitute,
  storedSendState,
  walletIdempotencyKey,
  walletMessageAllowed,
  WALLET_NOTIFY_LIMIT,
} from "@/lib/loyalty/google-wallet-rules";

describe("messages Google Wallet", () => {
  it("limite une carte à trois notifications sur 24 heures", () => {
    expect(WALLET_NOTIFY_LIMIT).toBe(3);
    expect(quotaAllows(2)).toBe(true);
    expect(quotaAllows(3)).toBe(false);
  });

  it("n'envoie pas deux fois le même événement", () => {
    expect(walletIdempotencyKey("REWARD_AVAILABLE", "reward-1")).toBe("REWARD_AVAILABLE:reward-1");
    expect(storedSendState("SENT", 1)).toBe("duplicate");
    expect(storedSendState("SKIPPED", 1)).toBe("duplicate");
    expect(storedSendState("FAILED", 3)).toBe("stop");
    expect(storedSendState("FAILED", 1)).toBe("send");
    expect(storedSendState(null, 0)).toBe("send");
  });

  it("réserve la progression aux paliers utiles et au consentement explicite", () => {
    expect(progressIsUseful(5, 10, 5)).toBe(true);
    expect(progressIsUseful(9, 10, 1)).toBe(true);
    expect(progressIsUseful(2, 10, 8)).toBe(false);
    expect(progressIsUseful(10, 10, 0)).toBe(false);
    expect(
      walletMessageAllowed({
        kind: "LOYALTY_PROGRESS",
        revoked: false,
        hasPreference: true,
        loyaltyReward: true,
        loyaltyProgress: false,
        reviewRequest: true,
        rewardExpiry: true,
      }),
    ).toBe("category_off");
    expect(
      walletMessageAllowed({
        kind: "LOYALTY_PROGRESS",
        revoked: false,
        hasPreference: true,
        loyaltyReward: true,
        loyaltyProgress: true,
        reviewRequest: true,
        rewardExpiry: true,
      }),
    ).toBe("send");
  });

  it("n'envoie rien si la cliente a retiré son consentement", () => {
    expect(
      walletMessageAllowed({
        kind: "REWARD_AVAILABLE",
        revoked: true,
        hasPreference: true,
        loyaltyReward: true,
        loyaltyProgress: true,
        reviewRequest: true,
        rewardExpiry: true,
      }),
    ).toBe("no_consent");
  });

  it("n'accepte un lien d'avis que pour l'institut de la carte", () => {
    const link = reviewLinkForInstitute({
      origin: "https://rappelbeauty.com",
      cardSlug: "institut-royal",
      requestSlug: "institut-royal",
      token: "RBREV_ABCDEFGHJKLMNPQRST",
    });
    expect(link).toBe("https://rappelbeauty.com/book/institut-royal/reviews/RBREV_ABCDEFGHJKLMNPQRST/");
    expect(
      reviewLinkForInstitute({
        origin: "https://rappelbeauty.com",
        cardSlug: "institut-royal",
        requestSlug: "autre-institut",
        token: "RBREV_ABCDEFGHJKLMNPQRST",
      }),
    ).toBeNull();
    expect(
      reviewLinkForInstitute({
        origin: "http://rappelbeauty.com",
        cardSlug: "institut-royal",
        requestSlug: "institut-royal",
        token: "RBREV_ABCDEFGHJKLMNPQRST",
      }),
    ).toBeNull();
  });

  it("classe les erreurs API sans les traiter comme un envoi réussi", () => {
    expect(notifyOutcome(200, "APPROVED")).toBe("sent");
    expect(notifyOutcome(409, "APPROVED")).toBe("sent");
    expect(notifyOutcome(404, "APPROVED")).toBe("not_registered");
    expect(notifyOutcome(429, "APPROVED")).toBe("quota");
    expect(notifyOutcome(503, "APPROVED")).toBe("temporary");
    expect(notifyOutcome(200, "UNDER_REVIEW")).toBe("not_published");
  });

  it("laisse l'échec Wallet en dehors du crédit de visite", () => {
    const source = readFileSync("src/lib/loyalty/validation.ts", "utf8");
    const start = source.indexOf("export async function creditVisitIfEligible");
    const credit = source.slice(start);
    const next = credit.indexOf("\nexport async function", 20);
    const body = next > 0 ? credit.slice(0, next) : credit;
    expect(body).toContain("notifyGoogleWallet");
    expect(body).not.toContain("addGoogleWalletTextMessage");
    expect(body).not.toContain("TEXT_AND_NOTIFY");
  });
});
