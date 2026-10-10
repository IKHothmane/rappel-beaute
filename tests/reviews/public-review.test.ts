import { describe, expect, it } from "vitest";
import { evaluateReviewSubmission, publicReviewPath, PUBLIC_REVIEW_TOKEN } from "@/lib/reviews/public-review";

const now = new Date("2026-10-10T12:00:00.000Z");
const future = new Date("2026-11-10T12:00:00.000Z");
const past = new Date("2026-09-01T12:00:00.000Z");

function base(overrides: Partial<Parameters<typeof evaluateReviewSubmission>[0]> = {}) {
  return evaluateReviewSubmission({
    slugOrganizationId: "org-a",
    request: {
      organizationId: "org-a",
      customerId: "cus-1",
      status: "SENT",
      tokenExpiresAt: future,
      hasReview: false,
    },
    appointment: { organizationId: "org-a", customerId: "cus-1", status: "COMPLETED" },
    rating: 5,
    comment: "Accueil excellent et soin très doux.",
    now,
    ...overrides,
  });
}

describe("avis publics", () => {
  it("accepte un avis valide", () => {
    expect(base().ok).toBe(true);
  });

  it("refuse un institut différent", () => {
    const result = base({
      slugOrganizationId: "org-b",
      appointment: { organizationId: "org-b", customerId: "cus-1", status: "COMPLETED" },
    });
    expect(result).toEqual({ ok: false, code: "ORG_MISMATCH" });
  });

  it("refuse un rendez-vous d'une autre cliente", () => {
    const result = base({
      appointment: { organizationId: "org-a", customerId: "cus-2", status: "COMPLETED" },
    });
    expect(result).toEqual({ ok: false, code: "ORG_MISMATCH" });
  });

  it("refuse un jeton expiré", () => {
    const result = base({
      request: {
        organizationId: "org-a",
        customerId: "cus-1",
        status: "SENT",
        tokenExpiresAt: past,
        hasReview: false,
      },
    });
    expect(result).toEqual({ ok: false, code: "TOKEN_EXPIRED" });
  });

  it("refuse un second avis pour le même rendez-vous", () => {
    const result = base({
      request: {
        organizationId: "org-a",
        customerId: "cus-1",
        status: "SENT",
        tokenExpiresAt: future,
        hasReview: true,
      },
    });
    expect(result).toEqual({ ok: false, code: "DUPLICATE" });
  });

  it("refuse un rendez-vous non terminé ou une demande annulée", () => {
    expect(
      base({ appointment: { organizationId: "org-a", customerId: "cus-1", status: "CONFIRMED" } }),
    ).toEqual({ ok: false, code: "NOT_ELIGIBLE" });
    expect(
      base({
        request: {
          organizationId: "org-a",
          customerId: "cus-1",
          status: "CANCELLED",
          tokenExpiresAt: future,
          hasReview: false,
        },
      }),
    ).toEqual({ ok: false, code: "NOT_ELIGIBLE" });
  });

  it("refuse une note hors 1 à 5 et un commentaire trop court", () => {
    expect(base({ rating: 0 })).toEqual({ ok: false, code: "RATING_INVALID" });
    expect(base({ rating: 6 })).toEqual({ ok: false, code: "RATING_INVALID" });
    expect(base({ rating: 4.5 })).toEqual({ ok: false, code: "RATING_INVALID" });
    expect(base({ comment: "court" })).toEqual({ ok: false, code: "COMMENT_INVALID" });
  });

  it("construit un lien sans identifiant cliente", () => {
    const path = publicReviewPath("institut-royal", "RBREV_ABCDEFGHJKLMNPQRST");
    expect(path).toBe("/book/institut-royal/reviews/RBREV_ABCDEFGHJKLMNPQRST/");
    expect(path.includes("cus-")).toBe(false);
    expect(PUBLIC_REVIEW_TOKEN.test("RBREV_ABCDEFGHJKLMNPQRST")).toBe(true);
    expect(PUBLIC_REVIEW_TOKEN.test("customer_123")).toBe(false);
  });
});
