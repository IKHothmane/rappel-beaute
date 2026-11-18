import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { query, consumeDimensions, saveProfile, submitFeedback, getLoyaltyCardSession } = vi.hoisted(() => ({
  query: vi.fn(),
  consumeDimensions: vi.fn(),
  saveProfile: vi.fn(),
  submitFeedback: vi.fn(),
  getLoyaltyCardSession: vi.fn(),
}));
const { issueLoyaltyCard } = vi.hoisted(() => ({ issueLoyaltyCard: vi.fn() }));

vi.mock("@/lib/db/pool", () => ({ pool: { query } }));
vi.mock("@/lib/logger", () => ({ logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock("@/lib/loyalty/cards", () => ({
  issueLoyaltyCard,
  newLoyaltyId: (prefix: string) => `${prefix}_x`,
  newPublicToken: () => "RBLOY_ABCDEFGH",
}));
vi.mock("@/lib/rate-limit", () => ({ consumeDimensions }));
vi.mock("@/lib/http/route-scope", () => ({ publicRoute: <T>(handler: T) => handler }));
vi.mock("@/lib/loyalty/customer-session", () => ({ getLoyaltyCardSession }));

// Les routes sont testées avec la couche métier simulée (la logique SQL est couverte plus bas, sur les vraies fonctions).
vi.mock("@/lib/loyalty/card-review", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/loyalty/card-review")>();
  return { ...actual, saveLoyaltyCardProfile: saveProfile, submitLoyaltyCardFeedback: submitFeedback };
});

import { parseMarketingWhatsappConsent } from "@/lib/loyalty/card-review";
import { JOIN_QR_LIMIT_PER_HOUR, joinCreationRateLimits } from "@/lib/loyalty/join-qr";
import { POST as profileRoute } from "@/app/api/public/loyalty-card/profile/route";
import { POST as feedbackRoute } from "@/app/api/public/loyalty-card/feedback/route";

// Le vrai module join-qr (non simulé) pour tester la requête SQL du formulaire.
const realReview = () => vi.importActual<typeof import("@/lib/loyalty/card-review")>("@/lib/loyalty/card-review");
const realJoin = () => vi.importActual<typeof import("@/lib/loyalty/join-qr")>("@/lib/loyalty/join-qr");

const TOKEN = "RBLOY_ABCDEFGH";
const JOIN = "RBJOIN_ABCDEFGH";
const PHONE = "+212 6 12 34 56 78";
const AUDIT_JSON = { source: "loyalty-card", consent: "whatsapp" };

function post(url: string, body: unknown) {
  return new NextRequest(`https://example.test${url}`, {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.7" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("parseMarketingWhatsappConsent", () => {
  it("accepts only strict booleans and treats absent/null as not provided", () => {
    expect(parseMarketingWhatsappConsent(true)).toEqual({ ok: true, value: true });
    expect(parseMarketingWhatsappConsent(false)).toEqual({ ok: true, value: false });
    expect(parseMarketingWhatsappConsent(undefined)).toEqual({ ok: true, value: false });
    expect(parseMarketingWhatsappConsent(null)).toEqual({ ok: true, value: false });
    for (const bad of ["true", "on", "1", 1, 0, {}, [], [true]]) expect(parseMarketingWhatsappConsent(bad)).toEqual({ ok: false });
  });
});

function cardLookup(sql: string) {
  return sql.includes('FROM "LoyaltyCard" lc') && sql.includes('lc.id AS "cardId"');
}
const isConsentUpdate = (sql: string) => sql.includes('"marketingWhatsapp" = TRUE');
const stillExists = (sql: string) => /^\s*SELECT 1 FROM "Customer" WHERE id/.test(sql);

describe("WhatsApp consent on the card profile and feedback", () => {
  beforeEach(() => {
    query.mockReset();
    query.mockImplementation(async (sql: string) => {
      if (cardLookup(sql)) return { rows: [{ cardId: "card_1", customerId: "cust_1", organizationId: "org_1" }] };
      if (sql.includes('UPDATE "Customer"')) return { rows: [{ id: "cust_1" }] };
      return { rows: [] };
    });
  });

  const profile = { cardToken: TOKEN, firstName: "Sara", lastName: "Amrani", phone: PHONE };

  it("sets marketingWhatsapp and writes the audit proof in the same single statement when consent is true with a valid phone", async () => {
    const { saveLoyaltyCardProfile, submitLoyaltyCardFeedback } = await realReview();
    expect(await saveLoyaltyCardProfile({ ...profile, marketingWhatsappConsent: true })).toMatchObject({ ok: true });
    const writes = query.mock.calls.filter(([sql]) => /UPDATE "Customer"|INSERT INTO "AuditLog"/.test(sql));
    expect(writes).toHaveLength(1); // fiche + audit : une seule instruction, donc atomique
    const [sql, params] = writes[0];
    expect(sql).toContain('"marketingWhatsapp" = TRUE');
    expect(sql).toContain('INSERT INTO "AuditLog"');
    expect(sql).toContain("FOR UPDATE");
    expect(sql).toContain("prev.was = FALSE"); // pas de doublon d'audit si déjà consentie
    expect(sql).toContain("other.id <> $1"); // même garde de conflit que sans consentement
    expect(params.slice(0, 5)).toEqual(["cust_1", "Sara", "Amrani", "0612345678", "org_1"]);
    expect(JSON.parse(params[7])).toEqual(AUDIT_JSON);
    expect(JSON.stringify(params.slice(6))).not.toMatch(/0612345678|Sara|Amrani|212/);
  });

  it.each([undefined, false])("never touches the consent when it is %s (no removal, no grant)", async (value) => {
    const { saveLoyaltyCardProfile, submitLoyaltyCardFeedback } = await realReview();
    await saveLoyaltyCardProfile({ ...profile, marketingWhatsappConsent: value });
    expect(query.mock.calls.some(([sql]) => isConsentUpdate(sql) || sql.includes("marketingWhatsapp") || sql.includes('"AuditLog"'))).toBe(false);
  });

  it("ignores consent when no phone is saved in the same request", async () => {
    const { saveLoyaltyCardProfile, submitLoyaltyCardFeedback } = await realReview();
    await saveLoyaltyCardProfile({ ...profile, phone: "", marketingWhatsappConsent: true });
    expect(query.mock.calls.some(([sql]) => sql.includes("marketingWhatsapp") || sql.includes('"AuditLog"'))).toBe(false);
  });

  it("does not apply the consent and writes no consent audit on PHONE_ALREADY_KNOWN", async () => {
    const { saveLoyaltyCardProfile, submitLoyaltyCardFeedback } = await realReview();
    query.mockImplementation(async (sql: string) => {
      if (cardLookup(sql)) return { rows: [{ cardId: "card_1", customerId: "cust_1", organizationId: "org_1" }] };
      if (isConsentUpdate(sql)) return { rows: [] }; // garde de conflit : upd vide, donc audit vide
      if (stillExists(sql)) return { rows: [{ "?column?": 1 }] };
      return { rows: [] };
    });
    const result = await saveLoyaltyCardProfile({ ...profile, marketingWhatsappConsent: true });
    expect(result).toMatchObject({ ok: false, code: "PHONE_ALREADY_KNOWN" });
    const consentSql = query.mock.calls.filter(([sql]) => isConsentUpdate(sql));
    expect(consentSql).toHaveLength(1);
    // L'audit de consentement dérive de `upd` (vide en cas de conflit) : jamais d'INSERT indépendant.
    expect(consentSql[0][0]).toContain("FROM upd JOIN prev");
    const standalone = query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO "AuditLog"') && !isConsentUpdate(sql));
    expect(standalone.every(([, params]) => params[4] === "PHONE_ALREADY_KNOWN")).toBe(true);
  });

  it("also applies the guarded consent from the feedback form, before creating the review", async () => {
    const { saveLoyaltyCardProfile, submitLoyaltyCardFeedback } = await realReview();
    expect(await submitLoyaltyCardFeedback({ ...profile, rating: 5, comment: "Super", marketingWhatsappConsent: true })).toEqual({ ok: true });
    const order = query.mock.calls.map(([sql]) => (isConsentUpdate(sql) ? "consent" : sql.includes('INSERT INTO "Review"') ? "review" : ""));
    expect(order.indexOf("consent")).toBeGreaterThanOrEqual(0);
    expect(order.indexOf("consent")).toBeLessThan(order.indexOf("review"));
  });

  it("does not create the review nor the consent on a phone conflict in the feedback form", async () => {
    const { saveLoyaltyCardProfile, submitLoyaltyCardFeedback } = await realReview();
    query.mockImplementation(async (sql: string) => {
      if (cardLookup(sql)) return { rows: [{ cardId: "card_1", customerId: "cust_1", organizationId: "org_1" }] };
      if (isConsentUpdate(sql)) return { rows: [] };
      if (stillExists(sql)) return { rows: [{ "?column?": 1 }] };
      return { rows: [] };
    });
    const result = await submitLoyaltyCardFeedback({ ...profile, rating: 5, comment: "Super", marketingWhatsappConsent: true });
    expect(result).toMatchObject({ ok: false, code: "PHONE_ALREADY_KNOWN" });
    expect(query.mock.calls.some(([sql]) => sql.includes('INSERT INTO "Review"'))).toBe(false);
  });
});

describe("WhatsApp consent on the join form (enrollFromJoinQr)", () => {
  const form = { token: JOIN, firstName: "Sara", lastName: "Amrani", phone: PHONE };

  beforeEach(() => {
    query.mockReset();
    issueLoyaltyCard.mockReset();
    issueLoyaltyCard.mockResolvedValue({ publicToken: "RBLOY_NEWCARD2" });
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM "LoyaltyJoinQr"') && sql.includes("q.token")) {
        return { rows: [{ token: JOIN, organizationName: "Institut", programName: "P", visitsPerReward: 5, rewardLabel: "R", active: true }] };
      }
      if (sql.includes('SELECT "organizationId" FROM "LoyaltyJoinQr"') || sql.includes("app_public_loyalty_join_institute")) return { rows: [{ organizationId: "org_1" }] };
      if (sql.includes('SELECT id, "organizationId" FROM "LoyaltyJoinQr"')) return { rows: [{ id: "qr_1", organizationId: "org_1" }] };
      return { rows: [] };
    });
  });

  it("creates the customer with marketingWhatsapp = true and the audit row in one statement when ticked", async () => {
    const { enrollFromJoinQr } = await realJoin();
    await enrollFromJoinQr({ ...form, marketingWhatsappConsent: true });
    const inserts = query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO "Customer"'));
    expect(inserts).toHaveLength(1);
    const [sql, params] = inserts[0];
    expect(sql).toContain('INSERT INTO "AuditLog"');
    expect(params[6]).toBe(true);
    expect(JSON.parse(params[8])).toEqual(AUDIT_JSON);
    expect(JSON.stringify(params.slice(6))).not.toMatch(/0612345678|Sara|Amrani/);
  });

  it.each([undefined, false, "true" as unknown as boolean])("keeps marketingWhatsapp false when consent is %s", async (value) => {
    const { enrollFromJoinQr } = await realJoin();
    await enrollFromJoinQr({ ...form, marketingWhatsappConsent: value });
    const insert = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO "Customer"'));
    expect(insert?.[1][6]).toBe(false); // le SQL n'écrit l'audit que si $7 est vrai
    expect(insert?.[0]).toContain("WHERE $7::boolean");
  });

  it("does not write any consent on PHONE_ALREADY_KNOWN (existing customer or unique-index race)", async () => {
    const { enrollFromJoinQr } = await realJoin();
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM "LoyaltyJoinQr"') && sql.includes("q.token")) {
        return { rows: [{ token: JOIN, organizationName: "I", programName: "P", visitsPerReward: 5, rewardLabel: "R", active: true }] };
      }
      if (sql.includes('SELECT "organizationId" FROM "LoyaltyJoinQr"') || sql.includes("app_public_loyalty_join_institute")) return { rows: [{ organizationId: "org_1" }] };
      if (sql.includes('SELECT id, "organizationId" FROM "LoyaltyJoinQr"')) return { rows: [{ id: "qr_1", organizationId: "org_1" }] };
      if (sql.includes('FROM "Customer"') && sql.includes("ANY($2::text[])")) return { rows: [{ id: "cust_old" }] };
      return { rows: [] };
    });
    await expect(enrollFromJoinQr({ ...form, marketingWhatsappConsent: true })).rejects.toThrow("PHONE_ALREADY_KNOWN");
    expect(query.mock.calls.some(([sql]) => sql.includes('INSERT INTO "Customer"') || sql.includes("marketingWhatsapp"))).toBe(false);
    query.mockClear();
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM "LoyaltyJoinQr"') && sql.includes("q.token")) {
        return { rows: [{ token: JOIN, organizationName: "I", programName: "P", visitsPerReward: 5, rewardLabel: "R", active: true }] };
      }
      if (sql.includes('SELECT "organizationId" FROM "LoyaltyJoinQr"') || sql.includes("app_public_loyalty_join_institute")) return { rows: [{ organizationId: "org_1" }] };
      if (sql.includes('SELECT id, "organizationId" FROM "LoyaltyJoinQr"')) return { rows: [{ id: "qr_1", organizationId: "org_1" }] };
      if (sql.includes('INSERT INTO "Customer"')) throw Object.assign(new Error("dup"), { code: "23505" });
      return { rows: [] };
    });
    await expect(enrollFromJoinQr({ ...form, marketingWhatsappConsent: true })).rejects.toThrow("PHONE_ALREADY_KNOWN");
    expect(issueLoyaltyCard).not.toHaveBeenCalled();
  });

  it("removes the consent proof together with the orphan customer when the card cannot be issued", async () => {
    const { enrollFromJoinQr } = await realJoin();
    issueLoyaltyCard.mockRejectedValue(new Error("boom"));
    await expect(enrollFromJoinQr({ ...form, marketingWhatsappConsent: true })).rejects.toThrow("boom");
    expect(query.mock.calls.some(([sql]) => sql.includes('DELETE FROM "AuditLog"'))).toBe(true);
    expect(query.mock.calls.some(([sql]) => sql.includes('DELETE FROM "Customer"'))).toBe(true);
  });
});

describe("Consentement et identité sur les routes publiques de fidélité", () => {
  const profilePath = "/api/public/loyalty-card/profile";
  const feedbackPath = "/api/public/loyalty-card/feedback";

  beforeEach(() => {
    for (const mock of [consumeDimensions, saveProfile, submitFeedback, getLoyaltyCardSession]) mock.mockReset();
    consumeDimensions.mockResolvedValue({ allowed: true });
    saveProfile.mockResolvedValue({ ok: true, code: "ABC" });
    submitFeedback.mockResolvedValue({ ok: true });
    getLoyaltyCardSession.mockResolvedValue({ customerId: "cust_1" });
  });

  it.each(["true", 1, {}, [true]])("refuse un consentement non booléen sans écrire (%j)", async (bad) => {
    for (const [route, url, writer] of [
      [profileRoute, profilePath, saveProfile],
      [feedbackRoute, feedbackPath, submitFeedback],
    ] as const) {
      const response = await route(post(url, { token: TOKEN, marketingWhatsappConsent: bad }));
      expect(response.status).toBe(400);
      expect(writer).not.toHaveBeenCalled();
    }
  });

  it("exige une session vérifiée même en possession du code QR personnel", async () => {
    getLoyaltyCardSession.mockResolvedValue(null);
    expect((await profileRoute(post(profilePath, { token: TOKEN }))).status).toBe(401);
    expect((await feedbackRoute(post(feedbackPath, { token: TOKEN, rating: 5 }))).status).toBe(401);
    expect(saveProfile).not.toHaveBeenCalled();
    expect(submitFeedback).not.toHaveBeenCalled();
  });

  it("refuse de modifier le téléphone depuis le profil et l'ignore dans un avis", async () => {
    expect((await profileRoute(post(profilePath, { token: TOKEN, phone: PHONE }))).status).toBe(400);
    expect(saveProfile).not.toHaveBeenCalled();
    const response = await feedbackRoute(post(feedbackPath, { token: TOKEN, phone: PHONE, rating: 5 }));
    expect(response.status).toBe(200);
    expect(submitFeedback).toHaveBeenCalledWith(expect.objectContaining({ expectedCustomerId: "cust_1", phone: "", rating: 5 }));
  });
});

describe("join rate-limit keys", () => {
  const HOUR = 60 * 60 * 1000;

  it("builds the IP and per-QR dimensions, and skips the QR key for a malformed token", () => {
    expect(joinCreationRateLimits("1.2.3.4", JOIN.toLowerCase(), 60)).toEqual([
      { key: "loyalty:join:ip:1.2.3.4", limit: 60, windowMs: HOUR, sensitivity: "sensitive" },
      { key: `loyalty:join:qr:${JOIN}`, limit: JOIN_QR_LIMIT_PER_HOUR, windowMs: HOUR, sensitivity: "standard" },
    ]);
    expect(JOIN_QR_LIMIT_PER_HOUR).toBe(400);
    for (const bad of ["nope", "", undefined, 12, `RBJOIN_${"A".repeat(50)}`]) {
      expect(joinCreationRateLimits("1.2.3.4", bad, 20).map((d) => d.key)).toEqual(["loyalty:join:ip:1.2.3.4"]);
    }
  });
});
