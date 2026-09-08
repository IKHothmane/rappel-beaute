import { describe, expect, it } from "vitest";
import { createHmac } from "crypto";
import {
  verifyMetaSignature,
  verifyMetaWebhookChallenge,
  processWhatsAppWebhookEvent,
  type WhatsAppWebhookPayload,
} from "@/lib/whatsapp/webhook";

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
