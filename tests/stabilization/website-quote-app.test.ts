import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAppSession, query, send, claim } = vi.hoisted(() => ({
  requireAppSession: vi.fn(),
  query: vi.fn(),
  send: vi.fn(),
  claim: vi.fn(),
}));

vi.mock("@/lib/auth/api-guard", () => ({ requireAppSession }));
vi.mock("@/lib/db/pool", () => ({ pool: { query } }));
vi.mock("@/lib/email/send", () => ({ isEmailConfigured: () => true, sendTransactionalEmail: send }));
vi.mock("@/lib/rate-limit", () => ({
  consumeDimensions: async () => ({ allowed: true }),
  claimIdempotency: claim,
  releaseIdempotency: async () => undefined,
  identityHash: (v: string) => `h_${v}`,
}));

import { POST } from "@/app/api/website-quote/route";

function request(body: unknown) {
  return new NextRequest("http://localhost:3000/api/website-quote/", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost:3000", host: "localhost:3000" },
    body: JSON.stringify(body),
  });
}

const owner = {
  ok: true,
  session: { id: "u1", role: "OWNER", organizationId: "org1", firstName: "Sara", lastName: "Alami", email: "sara@exemple.ma", loginPhone: "0612345678" },
};

describe("POST /api/website-quote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAppSession.mockResolvedValue(owner);
    claim.mockResolvedValue(true);
    send.mockResolvedValue({ messageId: "m1" });
    query.mockResolvedValue({ rows: [{ name: "Maison Belle", phone: null, email: null, city: "Casablanca", website: null, slug: "maison-belle" }] });
  });

  it("envoie la demande avec les coordonnées du compte, sans formulaire", async () => {
    const res = await POST(request({ project: "rendez-vous" }), { params: {} } as never);
    expect(res.status).toBe(200);
    expect(send).toHaveBeenCalledTimes(1);
    const mail = send.mock.calls[0][0];
    expect(mail.replyTo).toBe("sara@exemple.ma");
    expect(mail.subject).toContain("Maison Belle");
    expect(mail.text).toContain("Site avec prise de rendez-vous");
    expect(mail.text).toContain("0612345678");
  });

  it("ignore les coordonnées envoyées par le client", async () => {
    await POST(request({ project: "vitrine", email: "pirate@x.com", name: "Autre", institute: "Autre" }), { params: {} } as never);
    expect(send.mock.calls[0][0].replyTo).toBe("sara@exemple.ma");
  });

  it("refuse un rôle autre que propriétaire", async () => {
    requireAppSession.mockResolvedValue({ ...owner, session: { ...owner.session, role: "RECEPTION" } });
    const res = await POST(request({ project: "vitrine" }), { params: {} } as never);
    expect(res.status).toBe(403);
    expect(send).not.toHaveBeenCalled();
  });

  it("refuse un type de site inconnu", async () => {
    const res = await POST(request({ project: "inconnu" }), { params: {} } as never);
    expect(res.status).toBe(400);
    expect(send).not.toHaveBeenCalled();
  });

  it("n'envoie pas deux fois la même demande", async () => {
    claim.mockResolvedValue(false);
    const res = await POST(request({ project: "vitrine" }), { params: {} } as never);
    expect(await res.json()).toMatchObject({ ok: true, alreadySent: true });
    expect(send).not.toHaveBeenCalled();
  });

  it("explique quand les coordonnées de l'institut sont incomplètes", async () => {
    requireAppSession.mockResolvedValue({ ...owner, session: { ...owner.session, loginPhone: "" } });
    const res = await POST(request({ project: "vitrine" }), { params: {} } as never);
    expect(res.status).toBe(422);
    expect(send).not.toHaveBeenCalled();
  });
});
