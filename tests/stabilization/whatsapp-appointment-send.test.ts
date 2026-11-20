import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendAppointmentWhatsAppReminder, sendWhatsAppMessageViaMetaApi } from "@/lib/whatsapp/send";

const { query, transaction, writeAuditLog } = vi.hoisted(() => ({
  query: vi.fn<(sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number }>>(),
  transaction: vi.fn(),
  writeAuditLog: vi.fn(),
}));

vi.mock("@/lib/db/transaction", () => ({ withTransaction: transaction }));
vi.mock("@/lib/db/audit", () => ({ writeAuditLog }));

const reminder = {
  toPhone: "+212 600 000 001",
  template: {
    name: "rappel_rendez_vous",
    language: "fr",
    bodyParameters: ["21/11/2026", "14:30"],
  },
};

describe("Envoi du modèle de rappel WhatsApp à Meta", () => {
  const fetchMeta = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMeta.mockReset();
    vi.stubGlobal("fetch", fetchMeta);
    vi.stubEnv("WHATSAPP_DIRECT_SEND_ENABLED", "true");
    vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "123456");
    vi.stubEnv("WHATSAPP_ACCESS_TOKEN", "test-token");
    vi.stubEnv("WHATSAPP_API_VERSION", "v25.0");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("envoie le modèle et les deux paramètres à un numéro normalisé", async () => {
    fetchMeta.mockResolvedValue(Response.json({ messages: [{ id: "wamid.test" }] }));

    await expect(sendWhatsAppMessageViaMetaApi(reminder)).resolves.toMatchObject({
      ok: true,
      messageId: "wamid.test",
    });

    expect(fetchMeta).toHaveBeenCalledExactlyOnceWith(
      "https://graph.facebook.com/v25.0/123456/messages",
      expect.objectContaining({ method: "POST" }),
    );
    expect(JSON.parse(String(fetchMeta.mock.calls[0][1]?.body))).toEqual({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: "212600000001",
      type: "template",
      template: {
        name: "rappel_rendez_vous",
        language: { code: "fr" },
        components: [{
          type: "body",
          parameters: [
            { type: "text", text: "21/11/2026" },
            { type: "text", text: "14:30" },
          ],
        }],
      },
    });
  });

  it("ne contacte pas Meta tant que l'envoi direct est désactivé", async () => {
    vi.stubEnv("WHATSAPP_DIRECT_SEND_ENABLED", "false");

    await expect(sendWhatsAppMessageViaMetaApi(reminder)).resolves.toMatchObject({ ok: false });
    expect(fetchMeta).not.toHaveBeenCalled();
  });
});

describe("Rappel WhatsApp depuis l’agenda", () => {
  const fetchMeta = vi.fn<typeof fetch>();
  const actor = { id: "user_qa" };
  const appointment = {
    customerId: "customer_qa",
    startAt: new Date("2026-11-21T13:30:00Z"),
    status: "CONFIRMED",
    phone: "+212 600 000 001",
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-20T10:00:00Z"));
    vi.stubGlobal("fetch", fetchMeta);
    vi.stubEnv("WHATSAPP_APPOINTMENT_ORG_IDS", "org_qa");
    vi.stubEnv("WHATSAPP_APPOINTMENT_TEMPLATE_NAME", "rappel_rendez_vous");
    vi.stubEnv("WHATSAPP_APPOINTMENT_TEMPLATE_LANGUAGE", "");
    vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "123456");
    vi.stubEnv("WHATSAPP_ACCESS_TOKEN", "test-token");
    vi.stubEnv("WHATSAPP_DIRECT_SEND_ENABLED", "false");
    transaction.mockImplementation((run: (client: { query: typeof query }) => unknown) => run({ query }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("ne charge pas de rendez-vous et n’envoie rien pour un institut non activé", async () => {
    await expect(sendAppointmentWhatsAppReminder("other", "appointment_qa", actor))
      .rejects.toMatchObject({ status: 503, disabled: true });

    expect(transaction).not.toHaveBeenCalled();
    expect(fetchMeta).not.toHaveBeenCalled();
  });

  it("utilise le numéro et le créneau Casablanca du rendez-vous de l’institut", async () => {
    query.mockResolvedValueOnce({ rows: [appointment] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: "task_qa", status: "PENDING", attributionSource: null }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });
    fetchMeta.mockResolvedValue(Response.json({ messages: [{ id: "wamid.test" }] }));

    await expect(sendAppointmentWhatsAppReminder("org_qa", "appointment_qa", actor))
      .resolves.toEqual({ alreadySent: false, messageId: "wamid.test" });

    expect(query.mock.calls[0][1]).toEqual(["appointment_qa", "org_qa"]);
    expect(writeAuditLog).toHaveBeenNthCalledWith(1, expect.objectContaining({
      organizationId: "org_qa",
      entityId: "task_qa",
      action: "WHATSAPP_DIRECT_RESERVED",
    }));
    expect(writeAuditLog.mock.invocationCallOrder[0]).toBeLessThan(fetchMeta.mock.invocationCallOrder[0]);
    expect(JSON.parse(String(fetchMeta.mock.calls[0][1]?.body))).toMatchObject({
      to: "212600000001",
      type: "template",
      template: {
        name: "rappel_rendez_vous",
        language: { code: "fr" },
        components: [{ type: "body", parameters: [
          { type: "text", text: "21/11/2026" },
          { type: "text", text: "13:30" },
        ] }],
      },
    });
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org_qa",
      entityId: "task_qa",
      action: "WHATSAPP_DIRECT_SENT",
    }));
  });

  it("ne renvoie pas un rappel déjà envoyé", async () => {
    query.mockResolvedValueOnce({ rows: [appointment] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: "task_qa", status: "SENT", attributionSource: null }] });

    await expect(sendAppointmentWhatsAppReminder("org_qa", "appointment_qa", actor))
      .resolves.toEqual({ alreadySent: true });

    expect(fetchMeta).not.toHaveBeenCalled();
  });

  it.each([
    [undefined, 404],
    [{ ...appointment, status: "CANCELLED" }, 409],
    [{ ...appointment, phone: null }, 400],
  ])("refuse un rendez-vous indisponible sans contacter Meta (%j)", async (row, status) => {
    query.mockResolvedValueOnce({ rows: row ? [row] : [] });

    await expect(sendAppointmentWhatsAppReminder("org_qa", "appointment_qa", actor))
      .rejects.toMatchObject({ status });

    expect(query).toHaveBeenCalledTimes(1);
    expect(fetchMeta).not.toHaveBeenCalled();
  });

  it("conserve la réservation après une réponse incertaine et ne renvoie pas au second clic", async () => {
    query.mockResolvedValueOnce({ rows: [appointment] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: "task_qa", status: "PENDING", attributionSource: null }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });
    fetchMeta.mockResolvedValue(Response.json({}, { status: 503 }));

    await expect(sendAppointmentWhatsAppReminder("org_qa", "appointment_qa", actor))
      .rejects.toMatchObject({ status: 502 });

    const [, , status, attributionSource] = query.mock.calls[4][1] ?? [];
    expect(status).toBe("SKIPPED");
    expect(attributionSource).toBe("agenda_direct_reserved");
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "WHATSAPP_SEND_UNCONFIRMED" }));

    query.mockResolvedValueOnce({ rows: [appointment] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: "task_qa", status, attributionSource }] });

    await expect(sendAppointmentWhatsAppReminder("org_qa", "appointment_qa", actor))
      .rejects.toMatchObject({ status: 409 });

    expect(fetchMeta).toHaveBeenCalledTimes(1);
  });
});
