import { beforeEach, describe, expect, it, vi } from "vitest";

const { poolQuery, clientQuery, release } = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  clientQuery: vi.fn(),
  release: vi.fn(),
}));
vi.mock("@/lib/db/pool", () => ({
  pool: { query: poolQuery, connect: vi.fn(async () => ({ query: clientQuery, release })) },
}));
vi.mock("@/lib/subscriptions/plans", () => ({
  getPlanByCode: vi.fn(async () => ({ id: "plan_1", code: "STARTER", active: true, price: 10, currency: "MAD" })),
}));
vi.mock("@/lib/db/admin-subscriptions", () => ({ changeSubscriptionPlan: vi.fn() }));

import { hashActivationToken } from "@/lib/db/activation";
import { createOrganization, resetOwnerAccess } from "@/lib/db/admin-organizations";

const actor = { id: "pu_1", firstName: "Root", lastName: "Admin" } as never;

function tokenInsert(calls: unknown[][]): unknown[] {
  const call = calls.find((c) => String(c[0]).includes('INSERT INTO "ActivationToken"'));
  expect(call, "INSERT INTO ActivationToken attendu").toBeDefined();
  return call![1] as unknown[];
}

function tokenFromUrl(url: string): string {
  const token = new URL(url).searchParams.get("token");
  expect(token).toMatch(/^[0-9a-f]{64}$/);
  return token as string;
}

beforeEach(() => {
  poolQuery.mockReset();
  clientQuery.mockReset();
  release.mockReset();
  clientQuery.mockImplementation(async () => ({ rows: [], rowCount: 1 }));
});

describe("jetons d'activation émis par la création d'institut", () => {
  it("stocke le haché sha256 et renvoie le jeton en clair dans le lien", async () => {
    poolQuery.mockResolvedValue({ rows: [] }); // slug libre
    const res = await createOrganization(actor, {
      name: "Institut Test",
      slug: "institut-test",
      phone: "0600000000",
      email: "contact@example.test",
      plan: "STARTER",
      owner: { firstName: "Sara", lastName: "Amrani", email: "Owner@Example.test" },
    } as never);

    const params = tokenInsert(clientQuery.mock.calls);
    const stored = params[2] as string;
    expect(stored).toBe(hashActivationToken(res.activationToken));
    expect(stored).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(stored).not.toContain(res.activationToken);
    expect(tokenFromUrl(res.activationUrl)).toBe(res.activationToken);
    // Les écritures liées partent dans la même transaction.
    const sqls = clientQuery.mock.calls.map((c) => String(c[0]));
    expect(sqls[0]).toBe("BEGIN");
    expect(sqls).toContain("COMMIT");
  });
});

describe("resetOwnerAccess", () => {
  it("stocke le haché, renvoie le jeton en clair, et exécute tout dans une transaction avec l'audit", async () => {
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM "User"') && sql.includes("OWNER")) {
        return { rows: [{ id: "u_owner", email: "owner@example.test" }] };
      }
      return { rows: [], rowCount: 1 };
    });

    const res = await resetOwnerAccess(actor, "org_1");

    const sqls = clientQuery.mock.calls.map((c) => String(c[0]));
    expect(sqls[0]).toBe("BEGIN");
    expect(sqls[sqls.length - 1]).toBe("COMMIT");
    expect(sqls.some((s) => s.includes("FOR UPDATE"))).toBe(true);
    expect(sqls.some((s) => s.includes('"passwordHash" = NULL'))).toBe(true);
    expect(sqls.some((s) => s.includes('SET "usedAt" = NOW()'))).toBe(true);
    expect(sqls.some((s) => s.includes('INSERT INTO "PlatformAuditLog"'))).toBe(true);
    // Plus aucune écriture hors transaction.
    expect(poolQuery).not.toHaveBeenCalled();

    const params = tokenInsert(clientQuery.mock.calls);
    expect(params[1]).toBe("u_owner");
    expect(params[2]).toBe(hashActivationToken(res.activationToken));
    expect(params[2]).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(tokenFromUrl(res.activationUrl)).toBe(res.activationToken);
    expect(release).toHaveBeenCalled();
  });

  it("annule tout et n'émet aucun jeton si le propriétaire est introuvable", async () => {
    clientQuery.mockImplementation(async () => ({ rows: [], rowCount: 0 }));
    await expect(resetOwnerAccess(actor, "org_x")).rejects.toThrow("OWNER_NOT_FOUND");
    const sqls = clientQuery.mock.calls.map((c) => String(c[0]));
    expect(sqls).toContain("ROLLBACK");
    expect(sqls.some((s) => s.includes('INSERT INTO "ActivationToken"'))).toBe(false);
    expect(sqls.some((s) => s.includes('"passwordHash" = NULL'))).toBe(false);
  });

  it("annule le changement de jeton si l'audit échoue", async () => {
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM "User"') && sql.includes("OWNER")) {
        return { rows: [{ id: "u_owner", email: "o@example.test" }] };
      }
      if (sql.includes('"PlatformAuditLog"')) throw new Error("audit down");
      return { rows: [], rowCount: 1 };
    });
    await expect(resetOwnerAccess(actor, "org_1")).rejects.toThrow("audit down");
    const sqls = clientQuery.mock.calls.map((c) => String(c[0]));
    expect(sqls).toContain("ROLLBACK");
    expect(sqls).not.toContain("COMMIT");
  });
});
