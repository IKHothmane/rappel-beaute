import { describe, expect, it, vi } from "vitest";
import { createHmac } from "crypto";
import {
  verifyMetaSignature,
  verifyMetaWebhookChallenge,
  processWhatsAppWebhookEvent,
  type WhatsAppWebhookPayload,
} from "@/lib/whatsapp/webhook";
import {
  getMetaWhatsAppConfig,
  sendWhatsAppMessageViaMetaApi,
} from "@/lib/whatsapp/send";

describe("WhatsApp Meta Webhook — Challenge & Signature", () => {
  it("GET challenge valide avec hub.mode=subscribe et token correct", () => {
    const sp = new URLSearchParams({
      "hub.mode": "subscribe",
      "hub.verify_token": "my-secret-token",
      "hub.challenge": "1158201444",
    });
    const result = verifyMetaWebhookChallenge(sp, "my-secret-token");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.challenge).toBe("1158201444");
    }
  });

  it("GET challenge refusé si token incorrect", () => {
    const sp = new URLSearchParams({
      "hub.mode": "subscribe",
      "hub.verify_token": "wrong-token",
      "hub.challenge": "1158201444",
    });
    const result = verifyMetaWebhookChallenge(sp, "my-secret-token");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });

  it("GET challenge refusé si hub.mode différent de subscribe", () => {
    const sp = new URLSearchParams({
      "hub.mode": "other",
      "hub.verify_token": "my-secret-token",
      "hub.challenge": "1158201444",
    });
    const result = verifyMetaWebhookChallenge(sp, "my-secret-token");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });

  it("GET challenge statut 500 si token serveur non configuré", () => {
    const sp = new URLSearchParams({
      "hub.mode": "subscribe",
      "hub.verify_token": "my-secret-token",
      "hub.challenge": "1158201444",
    });
    const result = verifyMetaWebhookChallenge(sp, "");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(500);
    }
  });

  it("Signature HMAC valide", () => {
    const secret = "app_secret_123456";
    const body = JSON.stringify({ object: "whatsapp_business_account" });
    const signature = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");

    expect(verifyMetaSignature(body, signature, secret)).toBe(true);
  });

  it("Signature HMAC invalide ou falsifiée", () => {
    const secret = "app_secret_123456";
    const body = JSON.stringify({ object: "whatsapp_business_account" });
    const wrongSignature = "sha256=abcdef1234567890";

    expect(verifyMetaSignature(body, wrongSignature, secret)).toBe(false);
    expect(verifyMetaSignature(body, null, secret)).toBe(false);
    expect(verifyMetaSignature(body, "invalide", secret)).toBe(false);
  });

  it("Traitement des événements de messages et statuts", async () => {
    const payload: WhatsAppWebhookPayload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA_ID",
          changes: [
            {
              field: "messages",
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: "+212522000000",
                  phone_number_id: "PHONE_ID",
                },
                messages: [
                  {
                    from: "212661223344",
                    id: "wamid.HBgLMjEyNjYxMjIzMzQ0FQIAEhgg",
                    timestamp: "1725792000",
                    type: "text",
                    text: { body: "Bonjour, je souhaite confirmer mon RDV" },
                  },
                ],
                statuses: [
                  {
                    id: "wamid.sent123",
                    status: "delivered",
                    timestamp: "1725792010",
                    recipient_id: "212661223344",
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const events = await processWhatsAppWebhookEvent(payload);
    expect(events).toHaveLength(2);

    const msgEvent = events.find((e) => e.type === "message");
    expect(msgEvent).toBeDefined();
    expect(msgEvent?.messageId).toBe("wamid.HBgLMjEyNjYxMjIzMzQ0FQIAEhgg");

    const statusEvent = events.find((e) => e.type === "status");
    expect(statusEvent).toBeDefined();
    expect(statusEvent?.messageId).toBe("wamid.sent123");
  });
});

describe("WhatsApp Meta Cloud API — Envoi direct sans WhatsApp Web", () => {
  it("retourne une erreur explicite si les variables ne sont pas configurées", async () => {
    const origPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const origToken = process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    delete process.env.WHATSAPP_ACCESS_TOKEN;

    const config = getMetaWhatsAppConfig();
    expect(config.isConfigured).toBe(false);

    const result = await sendWhatsAppMessageViaMetaApi({
      toPhone: "0661223344",
      message: "Bonjour",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("WHATSAPP_PHONE_NUMBER_ID");
    }

    if (origPhoneId) process.env.WHATSAPP_PHONE_NUMBER_ID = origPhoneId;
    if (origToken) process.env.WHATSAPP_ACCESS_TOKEN = origToken;
  });

  it("envoie avec succès via fetch vers Meta Graph API", async () => {
    process.env.WHATSAPP_PHONE_NUMBER_ID = "123456789";
    process.env.WHATSAPP_ACCESS_TOKEN = "EAABtest_token";

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        messaging_product: "whatsapp",
        contacts: [{ input: "212661223344", wa_id: "212661223344" }],
        messages: [{ id: "wamid.TEST_DIRECT_SEND_123" }],
      }),
    } as Response);

    const result = await sendWhatsAppMessageViaMetaApi({
      toPhone: "0661223344",
      message: "Votre rendez-vous est confirmé.",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.messageId).toBe("wamid.TEST_DIRECT_SEND_123");
    }

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = fetchMock.mock.calls[0][0];
    expect(calledUrl).toContain("graph.facebook.com/v19.0/123456789/messages");

    fetchMock.mockRestore();
  });

  it("traduit l'erreur 131030 (numéro non autorisé en dev) en message compréhensible", async () => {
    process.env.WHATSAPP_PHONE_NUMBER_ID = "123456789";
    process.env.WHATSAPP_ACCESS_TOKEN = "EAABtest_token";

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        error: {
          message: "(#131030) Recipient phone number not in allowed list",
          type: "OAuthException",
          code: 131030,
          error_subcode: 2494010,
        },
      }),
    } as Response);

    const result = await sendWhatsAppMessageViaMetaApi({
      toPhone: "0661223344",
      message: "Test",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("destinataires autorisés");
    }

    fetchMock.mockRestore();
  });
});
