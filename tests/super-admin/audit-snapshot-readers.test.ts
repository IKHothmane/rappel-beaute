import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Les lecteurs du journal par institut doivent retrouver les lignes d'un institut supprimé
 * ("organizationId" NULL, copie dans "organizationIdSnapshot"), comme platform-audit.ts.
 */
const mocks = vi.hoisted(() => ({ query: vi.fn() }));

vi.mock("@/lib/db/pool", () => ({ pool: { query: mocks.query, connect: vi.fn() } }));
vi.mock("@/lib/db/platform-audit", () => ({ writePlatformAuditLog: vi.fn() }));

import { listSubscriptionHistory } from "@/lib/db/admin-subscriptions";
import { listUserActivity } from "@/lib/db/admin-users";

const SNAPSHOT_FILTER = /"organizationId" IS NULL AND (a\.)?"organizationIdSnapshot" = \$\d/;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.query.mockResolvedValue({ rows: [] });
});

describe("listSubscriptionHistory", () => {
  it("filtre l'institut par organizationId ou, à défaut, par le snapshot du journal", async () => {
    await listSubscriptionHistory("sub_1", "org_1");
    const [sql, params] = mocks.query.mock.calls[0];
    expect(sql).toMatch(SNAPSHOT_FILTER);
    expect(sql).toContain(`"entityType" = 'Subscription'`);
    expect(params).toEqual(["sub_1", "org_1"]);
  });
});

describe("listUserActivity", () => {
  it("filtre par institut avec le snapshot et un seul paramètre lié", async () => {
    await listUserActivity({ organizationId: "org_1", limit: 10 });
    const [sql, params] = mocks.query.mock.calls[0];
    expect(sql).toMatch(SNAPSHOT_FILTER);
    expect(params).toEqual(["org_1", 10]);
  });

  it("combine utilisateur et institut sans décaler les paramètres", async () => {
    await listUserActivity({ userId: "u_1", organizationId: "org_1" });
    const [sql, params] = mocks.query.mock.calls[0];
    expect(sql).toContain(`a."entityId" = $1`);
    expect(sql).toMatch(/"organizationIdSnapshot" = \$2/);
    expect(sql).toMatch(/LIMIT \$3/);
    expect(params).toEqual(["u_1", "org_1", 40]);
  });

  it("sans filtre d'institut, n'ajoute aucune condition", async () => {
    await listUserActivity({});
    expect(mocks.query.mock.calls[0][0]).not.toContain("organizationIdSnapshot");
  });
});
