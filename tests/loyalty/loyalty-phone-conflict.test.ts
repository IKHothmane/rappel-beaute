import { beforeEach, describe, expect, it, vi } from "vitest";

const { query, warn } = vi.hoisted(() => ({ query: vi.fn(), warn: vi.fn() }));
vi.mock("@/lib/db/pool", () => ({ pool: { query } }));
vi.mock("@/lib/logger", () => ({ logger: { warn, info: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
const { issueLoyaltyCard } = vi.hoisted(() => ({ issueLoyaltyCard: vi.fn() }));
vi.mock("@/lib/loyalty/cards", () => ({
  issueLoyaltyCard,
  newLoyaltyId: (prefix: string) => `${prefix}_x`,
  newPublicToken: () => "RBLOY_ABCDEFGH",
}));

import { saveLoyaltyCardProfile, submitLoyaltyCardFeedback } from "@/lib/loyalty/card-review";
import { enrollFromJoinQr } from "@/lib/loyalty/join-qr";
import {
  LOYALTY_PHONE_ALREADY_KNOWN_MESSAGE,
  loyaltyPhoneLookupVariants,
  normalizeLoyaltyPhone,
  validLoyaltyPhone,
} from "@/lib/loyalty/profile-input";
import { limitPhoneDigits } from "@/lib/validation/customer";
import { normalizeLoginPhone } from "@/lib/auth/login-identifier";

const TOKEN = "RBLOY_ABCDEFGH";
const JOIN = "RBJOIN_ABCDEFGH";

describe("canonical loyalty phone", () => {
  it.each([
    "0612345678",
    "06 12 34 56 78",
    "06.12.34.56.78",
    "06-12-34-56-78",
    "+212612345678",
    "+212 6 12 34 56 78",
    "212612345678",
    "00212612345678",
    "00 212 612-345-678",
  ])("maps the Moroccan variant %s to the same canonical number as login and booking", (raw) => {
    expect(validLoyaltyPhone(raw)).toBe(true);
    expect(normalizeLoyaltyPhone(raw)).toBe("0612345678");
    expect(normalizeLoyaltyPhone(raw)).toBe(limitPhoneDigits(raw));
    expect(normalizeLoyaltyPhone(raw)).toBe(normalizeLoginPhone(raw));
  });

  it("also tolerates a stray trunk 0 after the country code (not handled by localPhoneDigits)", () => {
    expect(normalizeLoyaltyPhone("+212 (0) 612 345 678")).toBe("0612345678");
  });

  it("keeps foreign numbers permissive, untruncated and consistent between + and 00", () => {
    expect(normalizeLoyaltyPhone("+33 6 12 34 56 78")).toBe("+33612345678");
    expect(normalizeLoyaltyPhone("0033 6 12 34 56 78")).toBe("+33612345678");
    expect(normalizeLoyaltyPhone("+1 (415) 555-2671")).toBe("+14155552671");
    expect(validLoyaltyPhone("+1 (415) 555-2671")).toBe(true);
    expect(validLoyaltyPhone("1234567")).toBe(true);
    expect(normalizeLoyaltyPhone("")).toBe("");
  });

  it("rejects non phone input and truncated Moroccan international numbers", () => {
    for (const bad of ["abc", "06 12 ab 56", "+212 61", "1".repeat(33), "()", ""]) expect(validLoyaltyPhone(bad)).toBe(false);
  });

  it("looks up the legacy stored formats of the same Moroccan number", () => {
    expect(loyaltyPhoneLookupVariants("0612345678").sort()).toEqual(
      ["0612345678", "612345678", "212612345678", "+212612345678", "00212612345678"].sort(),
    );
    expect(loyaltyPhoneLookupVariants("+33612345678").sort()).toEqual(["+33612345678", "33612345678"].sort());
    expect(loyaltyPhoneLookupVariants("")).toEqual([]);
  });
});

/** The follow-up SELECT run after a refused UPDATE (the UPDATE itself also contains a "SELECT 1 FROM Customer" guard). */
function stillExists(sql: string) {
  return /^\s*SELECT 1 FROM "Customer" WHERE id/.test(sql);
}

function cardLookup(sql: string) {
  return sql.includes('FROM "LoyaltyCard" lc') && sql.includes('lc.id AS "cardId"');
}

describe("saveLoyaltyCardProfile phone conflicts", () => {
  beforeEach(() => {
    query.mockReset();
    warn.mockReset();
  });

  const profile = { cardToken: TOKEN, firstName: "Sara", lastName: "Amrani", phone: "+212 6 12 34 56 78" };

  it("saves the canonical phone with the legacy variants as conflict guard when the number is free", async () => {
    query.mockImplementation(async (sql: string) => {
      if (cardLookup(sql)) return { rows: [{ cardId: "card_1", customerId: "cust_1", organizationId: "org_1" }] };
      if (sql.includes('UPDATE "Customer"')) return { rows: [{ id: "cust_1" }] };
      return { rows: [] };
    });
    expect(await saveLoyaltyCardProfile(profile)).toEqual({ ok: true, code: expect.any(String) });
    const update = query.mock.calls.find(([sql]) => sql.includes('UPDATE "Customer"'));
    expect(update?.[1].slice(0, 5)).toEqual(["cust_1", "Sara", "Amrani", "0612345678", "org_1"]);
    expect(update?.[1][5]).toEqual(expect.arrayContaining(["0612345678", "212612345678", "+212612345678"]));
    expect(update?.[0]).toContain("other.id <> $1");
    expect(update?.[0]).toContain('other."organizationId" = $5');
    expect(query.mock.calls.some(([sql]) => sql.includes('"AuditLog"'))).toBe(false);
    expect(warn).not.toHaveBeenCalled();
  });

  it("returns PHONE_ALREADY_KNOWN without touching the card, revealing the other record or merging", async () => {
    query.mockImplementation(async (sql: string) => {
      if (cardLookup(sql)) return { rows: [{ cardId: "card_1", customerId: "cust_1", organizationId: "org_1" }] };
      if (sql.includes('UPDATE "Customer"')) return { rows: [] }; // guard rejected: nothing updated
      if (stillExists(sql)) return { rows: [{ "?column?": 1 }] };
      return { rows: [] };
    });
    const result = await saveLoyaltyCardProfile(profile);
    expect(result).toEqual({ ok: false, code: "PHONE_ALREADY_KNOWN", error: LOYALTY_PHONE_ALREADY_KNOWN_MESSAGE });
    expect(JSON.stringify(result)).not.toMatch(/0612345678|Amrani|cust_|org_/);
    const writes = query.mock.calls.filter(([sql]) => /^\s*(UPDATE|DELETE)/.test(sql) && !sql.includes("AuditLog"));
    expect(writes).toHaveLength(1); // the single guarded UPDATE: name and phone change together or not at all
    expect(query.mock.calls.some(([sql]) => /Appointment|Review|LoyaltyEvent|UPDATE "LoyaltyCard"/.test(sql))).toBe(false);
  });

  it("treats a unique-index violation from a concurrent save the same way", async () => {
    query.mockImplementation(async (sql: string) => {
      if (cardLookup(sql)) return { rows: [{ cardId: "card_1", customerId: "cust_1", organizationId: "org_1" }] };
      if (sql.includes('UPDATE "Customer"')) throw Object.assign(new Error("duplicate"), { code: "23505" });
      if (stillExists(sql)) return { rows: [{ "?column?": 1 }] };
      return { rows: [] };
    });
    expect(await saveLoyaltyCardProfile(profile)).toMatchObject({ ok: false, code: "PHONE_ALREADY_KNOWN" });
    expect(query.mock.calls.filter(([sql]) => sql.includes('UPDATE "Customer"'))).toHaveLength(1); // no silent retry without phone
  });

  it("logs institute + card + code only, no personal data, and de-duplicates the audit row", async () => {
    query.mockImplementation(async (sql: string) => {
      if (cardLookup(sql)) return { rows: [{ cardId: "card_1", customerId: "cust_1", organizationId: "org_1" }] };
      if (stillExists(sql)) return { rows: [{ "?column?": 1 }] };
      return { rows: [] };
    });
    await saveLoyaltyCardProfile(profile);
    expect(warn).toHaveBeenCalledWith("loyalty.phone_already_known", {
      organizationId: "org_1",
      entityType: "LoyaltyCard",
      entityId: "card_1",
      code: "PHONE_ALREADY_KNOWN",
      source: "card_profile",
    });
    const audit = query.mock.calls.find(([sql]) => sql.includes('"AuditLog"'));
    expect(audit?.[0]).toContain("WHERE NOT EXISTS");
    expect(JSON.stringify(audit?.[1])).not.toMatch(/0612345678|Sara|Amrani/);
    expect(audit?.[1].slice(1, 5)).toEqual(["org_1", "LoyaltyCard", "card_1", "PHONE_ALREADY_KNOWN"]);
  });

  it("still refuses cleanly when the audit table is unavailable", async () => {
    query.mockImplementation(async (sql: string) => {
      if (cardLookup(sql)) return { rows: [{ cardId: "card_1", customerId: "cust_1", organizationId: "org_1" }] };
      if (sql.includes('"AuditLog"')) throw new Error("db down");
      if (stillExists(sql)) return { rows: [{ "?column?": 1 }] };
      return { rows: [] };
    });
    expect(await saveLoyaltyCardProfile(profile)).toMatchObject({ ok: false, code: "PHONE_ALREADY_KNOWN" });
  });

  it("reports an unknown card instead of a phone conflict when the customer vanished", async () => {
    query.mockImplementation(async (sql: string) => {
      if (cardLookup(sql)) return { rows: [{ cardId: "card_1", customerId: "cust_1", organizationId: "org_1" }] };
      return { rows: [] };
    });
    expect(await saveLoyaltyCardProfile(profile)).toEqual({ ok: false, error: "Carte introuvable." });
  });

  it("saves the name only when no phone is given", async () => {
    query.mockImplementation(async (sql: string) => {
      if (cardLookup(sql)) return { rows: [{ cardId: "card_1", customerId: "cust_1", organizationId: "org_1" }] };
      if (sql.includes('UPDATE "Customer"')) return { rows: [{ id: "cust_1" }] };
      return { rows: [] };
    });
    expect((await saveLoyaltyCardProfile({ ...profile, phone: "" })).ok).toBe(true);
    const update = query.mock.calls.find(([sql]) => sql.includes('UPDATE "Customer"'));
    expect(update?.[1][3]).toBeNull();
  });

  it("keeps rejecting invalid input before any query", async () => {
    for (const bad of [{ phone: "pas un numéro" }, { phone: "1".repeat(33) }, { firstName: "A".repeat(81) }, { cardToken: "nope" }]) {
      expect((await saveLoyaltyCardProfile({ ...profile, ...bad })).ok).toBe(false);
    }
    expect(query).not.toHaveBeenCalled();
  });

  it("does not create a review when the feedback form carries a known phone", async () => {
    query.mockImplementation(async (sql: string) => {
      if (cardLookup(sql)) return { rows: [{ cardId: "card_1", customerId: "cust_1", organizationId: "org_1" }] };
      if (stillExists(sql)) return { rows: [{ "?column?": 1 }] };
      return { rows: [] };
    });
    const result = await submitLoyaltyCardFeedback({ ...profile, rating: 5, comment: "Super" });
    expect(result).toMatchObject({ ok: false, code: "PHONE_ALREADY_KNOWN" });
    expect(query.mock.calls.some(([sql]) => sql.includes('INSERT INTO "Review"'))).toBe(false);
  });
});

describe("enrollFromJoinQr phone handling", () => {
  const form = { token: JOIN, firstName: "Sara", lastName: "Amrani", phone: "+212 6 12 34 56 78" };

  function mockJoin(options: { existing?: boolean; insertError?: string } = {}) {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM "LoyaltyJoinQr"') && sql.includes("q.token")) {
        return { rows: [{ token: JOIN, organizationName: "Institut", programName: "P", visitsPerReward: 5, rewardLabel: "R", active: true }] };
      }
      if (sql.includes('SELECT "organizationId" FROM "LoyaltyJoinQr"') || sql.includes("app_public_loyalty_join_institute")) return { rows: [{ organizationId: "org_1" }] };
      if (sql.includes('SELECT id, "organizationId" FROM "LoyaltyJoinQr"')) return { rows: [{ id: "qr_1", organizationId: "org_1" }] };
      if (sql.includes('FROM "Customer"') && sql.includes("ANY($2::text[])")) return { rows: options.existing ? [{ id: "cust_old" }] : [] };
      if (sql.includes('INSERT INTO "Customer"') && options.insertError) throw Object.assign(new Error("dup"), { code: options.insertError });
      return { rows: [] };
    });
  }

  beforeEach(() => {
    query.mockReset();
    warn.mockReset();
    issueLoyaltyCard.mockReset();
    issueLoyaltyCard.mockResolvedValue({ publicToken: "RBLOY_NEWCARD2" });
  });

  it("creates the customer with the canonical phone and issues a card when the number is free", async () => {
    mockJoin();
    expect(await enrollFromJoinQr(form)).toEqual({ cardToken: "RBLOY_NEWCARD2" });
    const insert = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO "Customer"'));
    expect(insert?.[1][4]).toBe("0612345678");
    const lookup = query.mock.calls.find(([sql]) => sql.includes("ANY($2::text[])"));
    expect(lookup?.[1][1]).toEqual(expect.arrayContaining(["0612345678", "212612345678", "+212612345678"]));
  });

  it("refuses an existing customer instead of reusing it or issuing/returning its card", async () => {
    mockJoin({ existing: true });
    await expect(enrollFromJoinQr(form)).rejects.toThrow("PHONE_ALREADY_KNOWN");
    expect(issueLoyaltyCard).not.toHaveBeenCalled();
    expect(query.mock.calls.some(([sql]) => sql.includes('INSERT INTO "Customer"'))).toBe(false);
    expect(warn).toHaveBeenCalledWith("loyalty.phone_already_known", expect.objectContaining({ organizationId: "org_1", entityId: "qr_1", source: "join_form" }));
    expect(JSON.stringify(warn.mock.calls)).not.toMatch(/0612345678/);
  });

  it("refuses when a concurrent request wins the unique index, without re-selecting the other record", async () => {
    mockJoin({ insertError: "23505" });
    await expect(enrollFromJoinQr(form)).rejects.toThrow("PHONE_ALREADY_KNOWN");
    expect(issueLoyaltyCard).not.toHaveBeenCalled();
  });

  it("removes the fresh customer if the card cannot be issued so a retry is not blocked", async () => {
    mockJoin();
    issueLoyaltyCard.mockRejectedValue(new Error("boom"));
    await expect(enrollFromJoinQr(form)).rejects.toThrow("boom");
    expect(query.mock.calls.some(([sql]) => sql.includes('DELETE FROM "Customer"'))).toBe(true);
  });

  it.each(["", "abc", "+33 6 12 34 56 78", "123", "06123"])("keeps rejecting an invalid phone (%s) before writing", async (phone) => {
    mockJoin();
    await expect(enrollFromJoinQr({ ...form, phone })).rejects.toThrow("INVALID_PHONE");
    expect(query.mock.calls.some(([sql]) => /INSERT|UPDATE|DELETE/.test(sql))).toBe(false);
  });

  it("keeps rejecting a missing name", async () => {
    mockJoin();
    await expect(enrollFromJoinQr({ ...form, lastName: " " })).rejects.toThrow("INVALID_NAME");
  });
});
