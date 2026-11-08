import { beforeEach, describe, expect, it, vi } from "vitest";
const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/lib/db/pool", () => ({ pool: { query } }));
vi.mock("@/lib/db/audit", () => ({ writeAuditLog: vi.fn().mockResolvedValue(undefined) }));
import { authenticateUser, changeOwnPassword } from "@/lib/db/users";
import { hashPassword } from "@/lib/auth/crypto";
import { normalizeLoginIdentifier } from "@/lib/auth/login-identifier";
const passwordHash = hashPassword("Temporary123");
const owner = { id: "owner", email: null, loginPhone: "0612345678", firstName: "Sara", lastName: "A", role: "OWNER", passwordHash, organizationId: "org", orgName: "Institut", orgSlug: "institut", userStatus: "ACTIVE", orgStatus: "ACTIVE", mustChangePassword: true, sessionVersion: 0 };
beforeEach(() => {
  query.mockReset();
  query.mockImplementation(async (sql: string) => ({ rows: sql.includes('"PlatformUser"') ? [] : [owner] }));
});
describe("Phone login alongside existing email accounts", () => {
  it.each(["0612345678", "+212 612 345 678", "00212612345678"])("authenticates WhatsApp identifier %s", async (phone) => {
    const user = await authenticateUser(phone, "Temporary123");
    expect(user).toMatchObject({ id: "owner", email: "", loginPhone: "0612345678", mustChangePassword: true });
    expect(query).toHaveBeenCalledWith(expect.stringContaining('u."loginPhone" = $2'), ["0612345678", "0612345678"]);
  });
  it("keeps login by email for existing accounts", async () => {
    query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ ...owner, email: "owner@example.com", loginPhone: null }] });
    expect(await authenticateUser("OWNER@example.com", "Temporary123")).toMatchObject({ email: "owner@example.com" });
    expect(query).toHaveBeenCalledWith(expect.stringContaining('LOWER(u.email) = $1'), ["owner@example.com", null]);
  });
  it("rejects incorrect passwords and ambiguous matches", async () => {
    expect(await authenticateUser("0612345678", "wrong")).toBeNull();
    query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [owner, owner] });
    expect(await authenticateUser("0612345678", "Temporary123")).toBeNull();
  });
  it("retains the phone identifier after the mandatory password change", async () => {
    query.mockResolvedValueOnce({ rows: [owner] }).mockResolvedValueOnce({ rows: [{ sessionVersion: 1 }] });
    expect(await changeOwnPassword({ userId: "owner", organizationId: "org", newPassword: "NewPassword456" })).toMatchObject({ email: "", loginPhone: "0612345678", mustChangePassword: false, sessionVersion: 1 });
  });
  it("uses the same normalized account key for phone formats", () => {
    expect(normalizeLoginIdentifier("+212 612 345 678")).toBe(normalizeLoginIdentifier("0612345678"));
    expect(normalizeLoginIdentifier("Test@EXAMPLE.com")).toBe("test@example.com");
  });
});
