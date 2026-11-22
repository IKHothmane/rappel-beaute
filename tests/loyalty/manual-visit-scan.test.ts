import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { query, beginLoyaltyScan } = vi.hoisted(() => ({ query: vi.fn(), beginLoyaltyScan: vi.fn() }));

vi.mock("@/lib/db/pool", () => ({ pool: { query } }));
vi.mock("@/lib/auth/api-guard", () => ({
  requireFeatureWriteLimited: async () => ({
    ok: true,
    session: { id: "u1", organizationId: "org1", firstName: "Nadia", lastName: "Test", role: "OWNER" },
  }),
  requireFeatureWrite: async () => ({ ok: true }),
  stripOrganizationId: (body: Record<string, unknown>) => {
    const { organizationId: _ignored, ...rest } = body;
    return rest;
  },
}));
vi.mock("@/lib/loyalty/validation", () => ({
  adjustLoyaltyVisit: vi.fn(),
  beginLoyaltyScan,
  confirmLoyaltyScan: vi.fn(),
  markVisitRewardUsed: vi.fn(),
}));

import { POST } from "@/app/api/loyalty/scan/route";

function post(body: unknown) {
  return POST(new NextRequest("https://app.rappelbeauty.com/api/loyalty/scan/", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }), { params: {} } as never);
}

describe("valider le passage à la main (POST /api/loyalty/scan)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    beginLoyaltyScan.mockResolvedValue({ validationId: "val1", customerId: "cust1", customerName: "Sara Alami" });
  });

  it("part de la carte active de la cliente de l'institut connecté", async () => {
    query.mockResolvedValue({ rows: [{ publicToken: "RBLOY_ABCDEFGH" }] });
    const res = await post({ action: "scan", customerId: "cust1" });
    expect(res.status).toBe(200);
    expect(query.mock.calls[0][1]).toEqual(["org1", "cust1"]);
    expect(beginLoyaltyScan).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org1", rawToken: "RBLOY_ABCDEFGH" }));
  });

  it("ignore un identifiant d'institut envoyé par le client", async () => {
    query.mockResolvedValue({ rows: [{ publicToken: "RBLOY_ABCDEFGH" }] });
    await post({ action: "scan", customerId: "cust1", organizationId: "autre" });
    expect(query.mock.calls[0][1][0]).toBe("org1");
  });

  it("répond 404 pour une cliente sans carte", async () => {
    query.mockResolvedValue({ rows: [] });
    const res = await post({ action: "scan", customerId: "cust1" });
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ code: "NO_CARD" });
    expect(beginLoyaltyScan).not.toHaveBeenCalled();
  });

  it("le scan par code ou QR reste inchangé", async () => {
    await post({ action: "scan", token: "E4FB" });
    expect(query).not.toHaveBeenCalled();
    expect(beginLoyaltyScan).toHaveBeenCalledWith(expect.objectContaining({ rawToken: "E4FB" }));
  });
});
