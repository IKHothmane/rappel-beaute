import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/whatsapp/send/route";

const db = vi.hoisted(() => ({
  createTask: vi.fn(),
  getTask: vi.fn(),
  query: vi.fn(),
  getOrganizationWhatsappFrom: vi.fn(),
}));

vi.mock("@/lib/http/route-scope", () => ({ tenantRoute: (handler: unknown) => handler }));
vi.mock("@/lib/auth/api-guard", () => ({
  requireFeatureWriteLimited: async () => ({
    ok: true,
    session: { id: "user_qa", organizationId: "org_qa", role: "OWNER", firstName: "Test" },
  }),
  stripOrganizationId: (body: Record<string, unknown>) => body,
}));
vi.mock("@/lib/db/whatsapp", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/db/whatsapp")>()),
  createAIWhatsAppTask: db.createTask,
  getWhatsAppTaskById: db.getTask,
}));
vi.mock("@/lib/db/transaction", () => ({
  withTransaction: (run: (client: { query: typeof db.query }) => unknown) => run({ query: db.query }),
}));
vi.mock("@/lib/db/pool", () => ({ pool: { query: db.query } }));
vi.mock("@/lib/db/audit", () => ({ writeAuditLog: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/db/organization", () => ({ getOrganizationWhatsappFrom: db.getOrganizationWhatsappFrom }));

const message = "Bonjour, souhaitez-vous prendre rendez-vous ?";

function sendFromCustomerCard() {
  return POST(new NextRequest("http://localhost/api/whatsapp/send/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "REACTIVATION", customerId: "customer_qa", message }),
  }));
}

describe("Envoi WhatsApp depuis la fiche cliente via Meta", () => {
  const fetchProvider = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.clearAllMocks();
    fetchProvider.mockReset();
    vi.stubGlobal("fetch", fetchProvider);
    vi.stubEnv("TWILIO_ACCOUNT_SID", "test-twilio-sid");
    vi.stubEnv("TWILIO_AUTH_TOKEN", "test-twilio-token");
    vi.stubEnv("WHATSAPP_DIRECT_SEND_ENABLED", "false");
    vi.stubEnv("WHATSAPP_META_ORG_IDS", "org_qa");
    vi.stubEnv("WHATSAPP_APPOINTMENT_ORG_IDS", "");
    vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "123456");
    vi.stubEnv("WHATSAPP_ACCESS_TOKEN", "test-meta-token");
    vi.stubEnv("WHATSAPP_API_VERSION", "v24.0");
    db.query.mockResolvedValue({ rows: [] });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("envoie le texte via Meta même lorsque les identifiants Twilio sont présents", async () => {
    db.createTask.mockResolvedValue({ id: "task_qa" });
    db.getTask.mockResolvedValue({ id: "task_qa", status: "SENT" });
    db.query.mockResolvedValueOnce({ rows: [{
      phoneSnapshot: "+212 600 000 001",
      messageSnapshot: message,
      status: "PENDING",
      type: "REACTIVATION",
    }] });
    fetchProvider.mockResolvedValue(Response.json({ messages: [{ id: "wamid.test" }] }));

    const response = await sendFromCustomerCard();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ messageId: "wamid.test" });
    expect(fetchProvider).toHaveBeenCalledExactlyOnceWith(
      "https://graph.facebook.com/v24.0/123456/messages",
      expect.objectContaining({ method: "POST" }),
    );
    expect(JSON.parse(String(fetchProvider.mock.calls[0][1]?.body))).toMatchObject({
      to: "212600000001",
      type: "text",
      text: { body: message },
    });
    expect(db.getOrganizationWhatsappFrom).not.toHaveBeenCalled();
  });

  it.each([
    ["sans jeton Meta", "WHATSAPP_ACCESS_TOKEN", ""],
    ["pour un autre institut", "WHATSAPP_META_ORG_IDS", "other_org"],
  ])("renvoie 503 sans contacter de fournisseur %s", async (_, key, value) => {
    vi.stubEnv(key, value);

    const response = await sendFromCustomerCard();

    expect(response.status).toBe(503);
    expect(db.createTask).not.toHaveBeenCalled();
    expect(db.getOrganizationWhatsappFrom).not.toHaveBeenCalled();
    expect(fetchProvider).not.toHaveBeenCalled();
  });
});
