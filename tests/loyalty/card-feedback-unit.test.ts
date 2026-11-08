import { beforeEach, describe, expect, it, vi } from "vitest";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/lib/db/pool", () => ({ pool: { query } }));
vi.mock("@/lib/db/reviews", () => ({ getOrCreateReviewSettings: vi.fn() }));

import { getLoyaltyCardReviewStaff, saveLoyaltyCardProfile, submitLoyaltyCardFeedback } from "@/lib/loyalty/card-review";
import { listInstituteReviews, listPublishedReviews } from "@/lib/reviews/public-review";

const feedback = {
  cardToken: "RBLOY_ABCDEFGH",
  firstName: "Sara", lastName: "Amrani", phone: "0612345678",
  rating: 4, comment: "Très bon accueil", staffId: "staff_1", staffRating: 2,
};

beforeEach(() => {
  query.mockReset();
  query.mockImplementation(async (sql: string) => {
    if (sql.includes('FROM "LoyaltyCard" lc')) return { rows: [{ customerId: "customer_1", organizationId: "org_1" }] };
    if (sql.includes('SELECT id FROM "Staff"')) return { rows: [{ id: "staff_1" }] };
    return { rows: [] };
  });
});

describe("Loyalty card feedback with staff ratings", () => {
  it("returns the full institute review history without merging the same client's reviews", async () => {
    const rows = Array.from({ length: 100 }, (_, index) => ({ id: `review_${index}`, rating: 4, comment: `Avis ${index}`, status: "PENDING", createdAt: new Date(), firstName: "Sara", lastName: "Amrani", phone: "0612345678", serviceName: "Carte fidélité", reportReason: null }));
    query.mockResolvedValueOnce({ rows });
    const reviews = await listInstituteReviews("org_1");
    expect(reviews).toHaveLength(100);
    expect(new Set(reviews.map((review) => review.id)).size).toBe(100);
    expect(query.mock.calls[0][0]).not.toMatch(/LIMIT|DISTINCT/);
    expect(query.mock.calls[0][1]).toEqual(["org_1"]);
  });

  it("keeps all published reviews in the public list", async () => {
    const rows = Array.from({ length: 50 }, (_, index) => ({ id: `review_${index}`, rating: null, comment: `Avis ${index}`, createdAt: new Date(), firstName: "Sara", serviceName: "Carte fidélité", organizationName: "Institut" }));
    query.mockResolvedValueOnce({ rows });
    const result = await listPublishedReviews("institut");
    expect(result.reviews).toHaveLength(50);
    expect(query.mock.calls[0][0]).toContain("r.status = 'PUBLISHED'");
    expect(query.mock.calls[0][0]).not.toMatch(/LIMIT|DISTINCT/);
  });

  it("saves multiple employee scores in the same atomic statement as the review", async () => {
    query.mockImplementation(async (sql: string, parameters: unknown[]) => {
      if (sql.includes('FROM "LoyaltyCard" lc')) return { rows: [{ customerId: "customer_1", organizationId: "org_1" }] };
      if (sql.includes('SELECT id FROM "Staff"')) return { rows: [{ id: parameters[0] }] };
      return { rows: [] };
    });
    const scores = [{ staffId: "staff_1", rating: 5 }, { staffId: "staff_2", rating: 3 }];
    expect(await submitLoyaltyCardFeedback({ ...feedback, staffRatings: scores })).toEqual({ ok: true });
    const insert = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO "Review"'));
    expect(JSON.parse(insert?.[1].at(-1))).toEqual(scores);
    expect(insert?.[0]).toContain('WITH saved_review AS');
    expect(insert?.[0]).toContain('INSERT INTO "ReviewStaffRating"');
    expect(insert?.[0]).toContain('ON CONFLICT ("reviewId", "staffId") DO UPDATE');
  });

  it("rejects a selection containing an employee from another institute before any writes", async () => {
    query.mockImplementation(async (sql: string, parameters: unknown[]) => {
      if (sql.includes('FROM "LoyaltyCard" lc')) return { rows: [{ customerId: "customer_1", organizationId: "org_1" }] };
      if (sql.includes('SELECT id FROM "Staff"')) return { rows: parameters[0] === "staff_1" ? [{ id: "staff_1" }] : [] };
      return { rows: [] };
    });
    expect((await submitLoyaltyCardFeedback({ ...feedback, staffRatings: [{ staffId: "staff_1", rating: 5 }, { staffId: "foreign", rating: 4 }] })).ok).toBe(false);
    expect(query.mock.calls.some(([sql]) => /INSERT|UPDATE/.test(sql))).toBe(false);
  });

  it("rejects duplicate employees and out-of-range multi-selection ratings", async () => {
    for (const staffRatings of [[{ staffId: "staff_1" }, { staffId: "staff_1" }], [{ staffId: "staff_1", rating: 6 }]]) {
      expect((await submitLoyaltyCardFeedback({ ...feedback, staffRatings })).ok).toBe(false);
    }
    expect(query).not.toHaveBeenCalled();
  });

  it("keeps stars optional for every selected employee", async () => {
    expect(await submitLoyaltyCardFeedback({ ...feedback, rating: undefined, comment: "", staffRatings: [{ staffId: "staff_1" }] })).toEqual({ ok: true });
    const insert = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO "Review"'));
    expect(JSON.parse(insert?.[1].at(-1))).toEqual([{ staffId: "staff_1", rating: null }]);
  });

  it("allows a written review without a name, phone or star rating", async () => {
    expect(await submitLoyaltyCardFeedback({ cardToken: feedback.cardToken, firstName: "", lastName: "", phone: "", comment: "Merci à l’équipe." })).toEqual({ ok: true });
    const insert = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO "Review"'));
    expect(insert?.[1].slice(0, -1)).toEqual([expect.any(String), "org_1", "customer_1", null, "Merci à l’équipe.", null, null]);
    expect(query.mock.calls.find(([sql]) => sql.includes('UPDATE "Customer"'))?.[0]).toContain('COALESCE(NULLIF($2');
  });

  it("accepts an entirely empty form without creating an empty review", async () => {
    expect(await submitLoyaltyCardFeedback({ cardToken: feedback.cardToken, firstName: "", lastName: "", phone: "", comment: "" })).toEqual({ ok: true });
    expect(query.mock.calls.some(([sql]) => sql.includes('INSERT INTO "Review"'))).toBe(false);
  });

  it("allows an employee rating without an institute rating", async () => {
    expect(await submitLoyaltyCardFeedback({ ...feedback, rating: undefined, comment: "" })).toEqual({ ok: true });
    const insert = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO "Review"'));
    expect(insert?.[1].slice(-5, -1)).toEqual([null, "", "staff_1", 2]);
  });

  it("does not require a staff rating when an employee is selected", async () => {
    expect(await submitLoyaltyCardFeedback({ ...feedback, staffRating: undefined })).toEqual({ ok: true });
    const insert = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO "Review"'));
    expect(insert?.[1].slice(-3, -1)).toEqual(["staff_1", null]);
  });

  it("allows saving the card without filling the profile", async () => {
    expect((await saveLoyaltyCardProfile({ cardToken: feedback.cardToken, firstName: "", lastName: "", phone: "" })).ok).toBe(true);
  });

  it.each(["1234567", "+33 6 12 34 56 78", "+212 (612) 345-678"])("accepts flexible phone formats without truncation: %s", async (phone) => {
    expect(await submitLoyaltyCardFeedback({ ...feedback, phone })).toEqual({ ok: true });
    const update = query.mock.calls.find(([sql]) => sql.includes('UPDATE "Customer"'));
    const expected = `${phone.trim().startsWith("+") ? "+" : ""}${phone.replace(/\D/g, "")}`;
    expect(update?.[1][3]).toBe(expected);
  });

  it.each([
    { firstName: "A".repeat(81) },
    { lastName: "B".repeat(81) },
    { phone: "1".repeat(33) },
    { comment: "C".repeat(801) },
    { phone: "pas un numéro" },
  ])("rejects oversized or invalid fields before writing: %o", async (input) => {
    expect((await submitLoyaltyCardFeedback({ ...feedback, ...input })).ok).toBe(false);
    expect(query).not.toHaveBeenCalled();
  });

  it("stores the institute score and the selected employee score separately", async () => {
    expect(await submitLoyaltyCardFeedback(feedback)).toEqual({ ok: true });
    const insert = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO "Review"'));
    expect(insert?.[1].slice(0, -1)).toEqual([expect.any(String), "org_1", "customer_1", 4, "Très bon accueil", "staff_1", 2]);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('"organizationId" = $2'), ["staff_1", "org_1"]);
  });

  it.each([0, 6, 2.5, NaN])("rejects an invalid staff rating %s without writes", async (staffRating) => {
    expect((await submitLoyaltyCardFeedback({ ...feedback, staffRating })).ok).toBe(false);
    expect(query).not.toHaveBeenCalled();
  });

  it("rejects staff outside the institute or no longer eligible before updating the profile", async () => {
    query.mockResolvedValueOnce({ rows: [{ customerId: "customer_1", organizationId: "org_1" }] }).mockResolvedValueOnce({ rows: [] });
    expect((await submitLoyaltyCardFeedback(feedback)).ok).toBe(false);
    expect(query.mock.calls.some(([sql]) => /INSERT|UPDATE/.test(sql))).toBe(false);
  });

  it("keeps employee feedback optional", async () => {
    expect(await submitLoyaltyCardFeedback({ ...feedback, staffId: undefined, staffRating: undefined })).toEqual({ ok: true });
    const insert = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO "Review"'));
    expect(insert?.[1].slice(-3, -1)).toEqual([null, null]);
  });

  it("retains both scores when attaching feedback to a completed appointment", async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM "LoyaltyCard" lc')) return { rows: [{ customerId: "customer_1", organizationId: "org_1" }] };
      if (sql.includes('SELECT id FROM "Staff"')) return { rows: [{ id: "staff_1" }] };
      if (sql.includes('FROM "Appointment" a')) return { rows: [{ id: "appointment_1" }] };
      return { rows: [] };
    });
    expect(await submitLoyaltyCardFeedback(feedback)).toEqual({ ok: true });
    const insert = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO "Review"'));
    expect(insert?.[1].slice(0, -1)).toEqual([expect.any(String), "org_1", "customer_1", "appointment_1", 4, "Très bon accueil", "staff_1", 2]);
  });

  it("keeps successive reviews from the same client as separate entries", async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM "LoyaltyCard" lc')) return { rows: [{ customerId: "customer_1", organizationId: "org_1" }] };
      if (sql.includes('SELECT id FROM "Staff"')) return { rows: [{ id: "staff_1" }] };
      if (sql.includes('SELECT id, status::text AS status')) return { rows: [{ id: "review_1", status: "PENDING" }] };
      return { rows: [] };
    });
    expect(await submitLoyaltyCardFeedback(feedback)).toEqual({ ok: true });
    expect(await submitLoyaltyCardFeedback({ ...feedback, comment: "Deuxième visite, merci." })).toEqual({ ok: true });
    const inserts = query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO "Review"'));
    expect(inserts).toHaveLength(2);
    expect(inserts[0][1][0]).not.toBe(inserts[1][1][0]);
    expect(inserts[0][1][4]).toBe("Très bon accueil");
    expect(inserts[1][1][4]).toBe("Deuxième visite, merci.");
    expect(query.mock.calls.some(([sql]) => sql.includes('UPDATE "Review"'))).toBe(false);
  });

  it("rejects a rating without an employee", async () => {
    expect((await submitLoyaltyCardFeedback({ ...feedback, staffId: "" })).ok).toBe(false);
    expect(query).not.toHaveBeenCalled();
  });

  it("lists only names and IDs scoped through the card's institute", async () => {
    query.mockResolvedValueOnce({ rows: [{ id: "staff_1", name: "Lina Amrani" }] });
    expect(await getLoyaltyCardReviewStaff(feedback.cardToken)).toEqual([{ id: "staff_1", name: "Lina Amrani" }]);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('lc."organizationId" = st."organizationId"'), [feedback.cardToken]);
    expect(query.mock.calls[0][0]).toContain("st.status IN ('ACTIVE', 'ON_LEAVE')");
  });
});
