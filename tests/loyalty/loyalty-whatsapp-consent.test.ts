import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { query, consumeDimensions, saveProfile, submitFeedback, enrollForm, enrollAnonymous, previewJoinQr, cardTokenForJoinQr } = vi.hoisted(() => ({
  query: vi.fn(),
  consumeDimensions: vi.fn(),
  saveProfile: vi.fn(),
  submitFeedback: vi.fn(),
  enrollForm: vi.fn(),
  enrollAnonymous: vi.fn(),
  previewJoinQr: vi.fn(),
  cardTokenForJoinQr: vi.fn(),
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
vi.mock("@/lib/loyalty/google-wallet", () => ({ createGoogleWalletSaveUrl: vi.fn().mockResolvedValue(null) }));

// Les routes sont testées avec la couche métier simulée (la logique SQL est couverte plus bas, sur les vraies fonctions).
vi.mock("@/lib/loyalty/card-review", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/loyalty/card-review")>();
  return { ...actual, saveLoyaltyCardProfile: saveProfile, submitLoyaltyCardFeedback: submitFeedback };
});
vi.mock("@/lib/loyalty/join-qr", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/loyalty/join-qr")>();
  return { ...actual, enrollFromJoinQr: enrollForm, enrollAnonymousFromJoinQr: enrollAnonymous, previewJoinQr, cardTokenForJoinQr };
});

import { parseMarketingWhatsappConsent } from "@/lib/loyalty/card-review";
import { JOIN_QR_LIMIT_PER_HOUR, joinCreationRateLimits } from "@/lib/loyalty/join-qr";
import { POST as profileRoute } from "@/app/api/public/loyalty-card/profile/route";
import { POST as feedbackRoute } from "@/app/api/public/loyalty-card/feedback/route";
import { POST as joinFormRoute } from "@/app/api/public/loyalty-join/route";
import { GET as scanRoute } from "@/app/(marketing)/carte/rejoindre/[token]/route";

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
      if (sql.includes('SELECT "organizationId" FROM "LoyaltyJoinQr"')) return { rows: [{ organizationId: "org_1" }] };
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
      if (sql.includes('SELECT "organizationId" FROM "LoyaltyJoinQr"')) return { rows: [{ organizationId: "org_1" }] };
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
      if (sql.includes('SELECT "organizationId" FROM "LoyaltyJoinQr"')) return { rows: [{ organizationId: "org_1" }] };
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

describe("routes: consent contract at the server boundary", () => {
  beforeEach(() => {
    for (const mock of [consumeDimensions, saveProfile, submitFeedback, enrollForm]) mock.mockReset();
    consumeDimensions.mockResolvedValue({ allowed: true });
    saveProfile.mockResolvedValue({ ok: true, code: "ABC" });
    submitFeedback.mockResolvedValue({ ok: true });
    enrollForm.mockResolvedValue({ cardToken: "RBLOY_NEWCARD2" });
  });

  it("profile: forwards a true boolean, defaults absent to false", async () => {
    await profileRoute(post("/api/public/loyalty-card/profile", { token: TOKEN, phone: PHONE, marketingWhatsappConsent: true }));
    expect(saveProfile).toHaveBeenLastCalledWith(expect.objectContaining({ marketingWhatsappConsent: true }));
    await profileRoute(post("/api/public/loyalty-card/profile", { token: TOKEN, phone: PHONE }));
    expect(saveProfile).toHaveBeenLastCalledWith(expect.objectContaining({ marketingWhatsappConsent: false }));
  });

  it.each(["true", 1, {}, [true]])("profile, feedback and join form answer 400 without writing when the consent is %j", async (bad) => {
    for (const [route, url, mock] of [
      [profileRoute, "/api/public/loyalty-card/profile", saveProfile],
      [feedbackRoute, "/api/public/loyalty-card/feedback", submitFeedback],
      [joinFormRoute, "/api/public/loyalty-join", enrollForm],
    ] as const) {
      const response = await route(post(url, { token: route === joinFormRoute ? JOIN : TOKEN, phone: PHONE, marketingWhatsappConsent: bad }));
      expect(response.status).toBe(400);
      expect(mock).not.toHaveBeenCalled();
    }
  });

  it("feedback and join form forward the consent flag", async () => {
    await feedbackRoute(post("/api/public/loyalty-card/feedback", { token: TOKEN, phone: PHONE, marketingWhatsappConsent: true }));
    expect(submitFeedback).toHaveBeenLastCalledWith(expect.objectContaining({ marketingWhatsappConsent: true }));
    await joinFormRoute(post("/api/public/loyalty-join", { token: JOIN, firstName: "S", lastName: "A", phone: PHONE, marketingWhatsappConsent: true }));
    expect(enrollForm).toHaveBeenLastCalledWith(expect.objectContaining({ marketingWhatsappConsent: true }));
    await joinFormRoute(post("/api/public/loyalty-join", { token: JOIN, firstName: "S", lastName: "A", phone: PHONE }));
    expect(enrollForm).toHaveBeenLastCalledWith(expect.objectContaining({ marketingWhatsappConsent: false }));
  });

  it("propagates PHONE_ALREADY_KNOWN as 409 without exposing consent state", async () => {
    saveProfile.mockResolvedValue({ ok: false, code: "PHONE_ALREADY_KNOWN", error: "déjà" });
    const response = await profileRoute(post("/api/public/loyalty-card/profile", { token: TOKEN, phone: PHONE, marketingWhatsappConsent: true }));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "déjà", code: "PHONE_ALREADY_KNOWN" });
  });
});

describe("join rate-limit keys", () => {
  beforeEach(() => {
    consumeDimensions.mockReset();
    consumeDimensions.mockResolvedValue({ allowed: true });
    enrollForm.mockReset();
    enrollAnonymous.mockReset();
    previewJoinQr.mockReset();
    cardTokenForJoinQr.mockReset();
  });

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

  it("scan route: 60/h per IP and 400/h per QR before creating an anonymous card", async () => {
    previewJoinQr.mockResolvedValue({ token: JOIN, status: "ACTIVE", active: true });
    cardTokenForJoinQr.mockResolvedValue(null);
    enrollAnonymous.mockResolvedValue({ cardToken: TOKEN });
    const request = new NextRequest(`https://example.test/carte/rejoindre/${JOIN}?n=1`, { headers: { "cf-connecting-ip": "203.0.113.7" } });
    const response = await scanRoute(request, { params: { token: JOIN } });
    expect(response.status).toBe(307);
    expect(consumeDimensions).toHaveBeenCalledWith([
      { key: "loyalty:join:ip:203.0.113.7", limit: 60, windowMs: HOUR, sensitivity: "sensitive" },
      { key: `loyalty:join:qr:${JOIN}`, limit: 400, windowMs: HOUR, sensitivity: "standard" },
    ]);
    expect(enrollAnonymous).toHaveBeenCalledOnce();
  });

  it("scan route: keeps 429 + Retry-After and creates nothing when limited", async () => {
    previewJoinQr.mockResolvedValue({ token: JOIN, status: "ACTIVE", active: true });
    cardTokenForJoinQr.mockResolvedValue(null);
    consumeDimensions.mockResolvedValue({ allowed: false, retryAfterSec: 1234 });
    const request = new NextRequest(`https://example.test/carte/rejoindre/${JOIN}?n=1`);
    const response = await scanRoute(request, { params: { token: JOIN } });
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("1234");
    expect(response.headers.get("Content-Type")).toContain("text/html");
    expect(enrollAnonymous).not.toHaveBeenCalled();
  });

  it("scan route: an existing card never consumes the creation limits", async () => {
    previewJoinQr.mockResolvedValue({ token: JOIN, status: "ACTIVE", active: true });
    cardTokenForJoinQr.mockResolvedValue(TOKEN);
    const request = new NextRequest(`https://example.test/carte/rejoindre/${JOIN}?c=${TOKEN}`);
    await scanRoute(request, { params: { token: JOIN } });
    expect(consumeDimensions).not.toHaveBeenCalled();
  });

  it("join form: keeps 20/h per IP and shares the per-QR counter with the scan; 429 keeps Retry-After", async () => {
    await joinFormRoute(post("/api/public/loyalty-join", { token: JOIN, firstName: "S", lastName: "A", phone: PHONE }));
    expect(consumeDimensions).toHaveBeenCalledWith([
      { key: "loyalty:join:ip:203.0.113.7", limit: 20, windowMs: HOUR, sensitivity: "sensitive" },
      { key: `loyalty:join:qr:${JOIN}`, limit: 400, windowMs: HOUR, sensitivity: "standard" },
    ]);
    consumeDimensions.mockResolvedValue({ allowed: false, retryAfterSec: 99 });
    enrollForm.mockClear();
    const limited = await joinFormRoute(post("/api/public/loyalty-join", { token: JOIN, firstName: "S", lastName: "A", phone: PHONE }));
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBe("99");
    expect(enrollForm).not.toHaveBeenCalled();
  });

  it("join form: rejects a missing or non-string token without enrolling", async () => {
    consumeDimensions.mockResolvedValue({ allowed: true });
    for (const body of [{}, { token: 42 }, "not json"]) {
      const response = await joinFormRoute(post("/api/public/loyalty-join", body));
      expect(response.status).toBe(400);
    }
    expect(enrollForm).not.toHaveBeenCalled();
  });
});
