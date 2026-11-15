import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn(), release: vi.fn(), audit: vi.fn(), poolQuery: vi.fn() }));
vi.mock("@/lib/db/pool", () => ({ pool: { connect: async () => ({ query: mocks.query, release: mocks.release }), query: mocks.poolQuery } }));
vi.mock("@/lib/db/platform-audit", () => ({ writePlatformAuditLog: mocks.audit }));
vi.mock("@/lib/db/platform-users", () => ({ newPlatformId: vi.fn() }));
vi.mock("@/lib/subscriptions/plans", () => ({ getPlanByCode: vi.fn(), getPlanById: vi.fn(), listPlans: vi.fn() }));
vi.mock("@/lib/site", () => ({ publicAppOrigin: () => "http://localhost" }));

import { deleteOrganization, updateOrganization } from "@/lib/db/admin-organizations";
import { listOrganizationPaymentHistory } from "@/lib/db/organization-payment-history";
import type { PlatformSessionUser } from "@/lib/auth/types";

const actor = { id: "admin", firstName: "Test", lastName: "Admin" } as PlatformSessionUser;
const sqls = () => mocks.query.mock.calls.map(([sql]) => String(sql));

describe("deleteOrganization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.audit.mockResolvedValue(undefined);
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM "Organization" WHERE id = $1 FOR UPDATE')) return { rows: [{ name: "Institut Test", slug: "test", status: "ACTIVE", city: "Rabat" }] };
      if (sql.includes('FROM "Subscription"')) return { rows: [{ id: "sub_1" }, { id: "sub_2" }] };
      if (sql.includes('FROM "PlatformAuditLog"')) return { rows: [{ count: "12" }] };
      if (sql.startsWith('DELETE FROM "Organization"')) return { rows: [], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    });
  });

  it("keeps the institute identity in the deletion event and never rewrites the journal", async () => {
    await deleteOrganization(actor, "org1");
    const event = mocks.audit.mock.calls[0][0];
    expect(event.action).toBe("ORGANIZATION_DELETED");
    expect(event.client).toBeDefined();
    expect(event.before).toEqual(expect.objectContaining({ id: "org1", name: "Institut Test", slug: "test" }));
    expect(event.after).toEqual({ organizationId: "org1", organizationName: "Institut Test", subscriptionIds: ["sub_1", "sub_2"], detachedAuditLogs: 12 });
    expect(sqls().some((sql) => /UPDATE\s+"PlatformAuditLog"|DELETE FROM "PlatformAuditLog"/.test(sql))).toBe(false);
    expect(sqls().at(-1)).toBe("COMMIT");
  });

  it("is NOT_FOUND (no event) for an unknown or already deleted institute", async () => {
    mocks.query.mockImplementation(async () => ({ rows: [], rowCount: 0 }));
    await expect(deleteOrganization(actor, "gone")).rejects.toThrow("NOT_FOUND");
    expect(mocks.audit).not.toHaveBeenCalled();
    expect(sqls().at(-1)).toBe("ROLLBACK");
  });

  it("rolls back when the delete fails", async () => {
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes("FOR UPDATE")) return { rows: [{ name: "X", slug: "x", status: "ACTIVE", city: null }] };
      if (sql.startsWith('DELETE FROM "Invoice"')) throw Object.assign(new Error("fk"), { code: "23503" });
      return { rows: [{ count: "0" }], rowCount: 1 };
    });
    await expect(deleteOrganization(actor, "org1")).rejects.toThrow("fk");
    expect(sqls().at(-1)).toBe("ROLLBACK");
  });
});

describe("updateOrganization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.audit.mockResolvedValue(undefined);
  });

  it("updates under lock, never writes blank strings and audits in the same transaction", async () => {
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes("FOR UPDATE")) return { rows: [{ name: "Old", phone: "1", email: "a@b.co" }] };
      if (sql.includes("RETURNING")) return { rows: [{ name: "New", phone: "1", email: "a@b.co" }] };
      return { rows: [] };
    });
    await updateOrganization(actor, "org1", { name: "  New ", phone: "   ", email: "" });
    const update = mocks.query.mock.calls.find(([sql]) => String(sql).includes('UPDATE "Organization"'));
    expect(update?.[1]).toEqual(["org1", "New", null, null, null, null]);
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ client: expect.anything(), before: expect.objectContaining({ name: "Old" }), after: expect.objectContaining({ name: "New" }) }));
    expect(sqls().at(-1)).toBe("COMMIT");
  });

  it("throws NOT_FOUND for an unknown institute", async () => {
    mocks.query.mockImplementation(async () => ({ rows: [] }));
    await expect(updateOrganization(actor, "x", { name: "N" })).rejects.toThrow("NOT_FOUND");
  });
});

describe("listOrganizationPaymentHistory", () => {
  it("reads amount and period from the event and tolerates legacy events", async () => {
    mocks.poolQuery.mockResolvedValue({
      rows: [
        { id: "a", action: "SUBSCRIPTION_MARKED_PAID", createdAt: new Date("2026-11-10T10:00:00Z"), platformUserName: "Admin",
          after: { paid: true, priceSnapshot: 120, currency: "MAD", periodStart: "2026-11-01T00:00:00.000Z", periodEnd: "2026-12-01T00:00:00.000Z" } },
        { id: "b", action: "SUBSCRIPTION_MARKED_UNPAID", createdAt: new Date("2026-10-10T10:00:00Z"), platformUserName: null, after: { paid: false } },
        { id: "c", action: "SUBSCRIPTION_MARKED_PAID", createdAt: new Date("2026-09-10T10:00:00Z"), platformUserName: null, after: null },
      ],
    });
    const rows = await listOrganizationPaymentHistory("org1");
    expect(rows[0]).toEqual(expect.objectContaining({ paid: true, amount: 120, currency: "MAD", periodStart: "2026-11-01T00:00:00.000Z", periodEnd: "2026-12-01T00:00:00.000Z" }));
    expect(rows[1]).toEqual(expect.objectContaining({ paid: false, amount: null, currency: null, periodStart: null, periodEnd: null }));
    expect(rows[2]).toEqual(expect.objectContaining({ paid: true, amount: null }));
  });
});
