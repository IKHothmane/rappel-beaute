import { beforeEach, describe, expect, it, vi } from "vitest";
const { query, release } = vi.hoisted(() => ({ query: vi.fn(), release: vi.fn() }));
vi.mock("@/lib/db/pool", () => ({ pool: { connect: async () => ({ query, release }), query } }));
vi.mock("@/lib/subscriptions/plans", () => ({ getPlanByCode: async () => ({ id: "plan", active: true, price: 100, currency: "MAD" }), listPlans: vi.fn() }));
vi.mock("@/lib/subscriptions/subscription-service", () => ({ newInstituteTrialEnd: (date: Date) => new Date(date.getTime() + 7 * 86400000) }));
import { createPublicSignup } from "@/lib/db/public-signup";
const input = { personName: "Sara Amrani", institut: "Institut Sara", phone: "0612345678", city: "Casablanca", address: "", website: null };
beforeEach(() => { query.mockReset(); release.mockReset(); query.mockResolvedValue({ rows: [] }); });
describe("Professional signup without email", () => {
  it("creates the owner with a unique WhatsApp login, a real password hash and no fabricated email", async () => {
    const created = await createPublicSignup(input);
    expect(created).toMatchObject({ phone: "0612345678", email: null, institut: "Institut Sara" });
    expect(created.temporaryPassword).toMatch(/^\d{6}$/);
    const insert = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO "User"'));
    expect(insert?.[0]).toContain('"loginPhone"');
    expect(insert?.[1][2]).toBeNull();
    expect(insert?.[1][5]).toBe("0612345678");
    expect(insert?.[1][6]).not.toBe(created.temporaryPassword);
    expect(query).toHaveBeenCalledWith("COMMIT");
    expect(release).toHaveBeenCalled();
  });
  it("rejects a number already used for login", async () => {
    query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ id: "existing" }] });
    await expect(createPublicSignup(input)).rejects.toMatchObject({ code: "PHONE_TAKEN" });
    expect(query.mock.calls.some(([sql]) => sql.includes('INSERT INTO "Organization"'))).toBe(false);
    expect(query).toHaveBeenCalledWith("ROLLBACK");
  });
  it("turns a concurrent unique-phone collision into a clear signup error", async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('INSERT INTO "User"')) throw { code: "23505", constraint: "User_loginPhone_key" };
      return { rows: [] };
    });
    await expect(createPublicSignup(input)).rejects.toMatchObject({ code: "PHONE_TAKEN" });
    expect(query).toHaveBeenCalledWith("ROLLBACK");
  });
});
