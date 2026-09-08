import { createHmac, timingSafeEqual } from "crypto";
import { Pool } from "pg";
import { writeAuditLog } from "@/lib/db/audit";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export type WhatsAppWebhookMessage = {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id: string; mime_type?: string };
  [key: string]: unknown;
};

export type WhatsAppWebhookStatus = {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
  conversation?: { id: string; expiration_timestamp?: string; origin?: { type: string } };
  pricing?: { billable: boolean; pricing_model: string; category: string };
  errors?: unknown[];
};

export type WhatsAppWebhookEntry = {
  id: string;
  changes: {
    value: {
      messaging_product: string;
      metadata: { display_phone_number: string; phone_number_id: string };
      contacts?: { profile: { name: string }; wa_id: string }[];
      messages?: WhatsAppWebhookMessage[];
      statuses?: WhatsAppWebhookStatus[];
    };
    field: string;
  }[];
};

export type WhatsAppWebhookPayload = {
  object: string;
  entry?: WhatsAppWebhookEntry[];
};

/**
 * Valide le challenge de vérification envoyé par Meta (GET /webhook).
 */
export function verifyMetaWebhookChallenge(
  searchParams: URLSearchParams,
  expectedToken = process.env.WHATSAPP_VERIFY_TOKEN,
): { ok: true; challenge: string } | { ok: false; status: number; message?: string } {
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  // Si aucun paramètre n'est fourni (ex. test direct dans le navigateur sans query string)
  if (!mode && !token && !challenge) {
    return {
      ok: false,
      status: 200,
      message:
        "Rappel Beauty — Webhook WhatsApp opérationnel. En attente des paramètres Meta (hub.mode, hub.verify_token, hub.challenge).",
    };
  }

  const configured = expectedToken?.trim().replace(/^["']|["']$/g, "");
  if (!configured) {
    console.warn("[WhatsApp Webhook] Variable d'environnement WHATSAPP_VERIFY_TOKEN non configurée");
    return {
      ok: false,
      status: 500,
      message: "Configuration error: WHATSAPP_VERIFY_TOKEN is missing on server",
    };
  }

  const cleanToken = token?.trim().replace(/^["']|["']$/g, "");
  if (mode === "subscribe" && cleanToken && cleanToken === configured && challenge) {
    console.log("[WhatsApp Webhook] ✅ Challenge Meta validé avec succès");
    return { ok: true, challenge };
  }

  console.warn(
    `[WhatsApp Webhook] ❌ Refus de vérification Meta (mode=${mode}, tokenMatch=${cleanToken === configured}, challengePresent=${Boolean(challenge)})`,
  );
  return {
    ok: false,
    status: 403,
    message: "Forbidden: verify_token incorrect ou paramètres invalides",
  };
}

/**
 * Valide la signature HMAC SHA-256 (X-Hub-Signature-256) envoyée par Meta (POST /webhook).
 */
export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string,
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
    return false;
  }
  const signatureHex = signatureHeader.slice(7).trim();
  const hmac = createHmac("sha256", appSecret.trim());
  hmac.update(rawBody);
  const expectedHex = hmac.digest("hex");

  try {
    const sigBuf = Buffer.from(signatureHex, "hex");
    const expBuf = Buffer.from(expectedHex, "hex");
    if (sigBuf.length !== expBuf.length) return false;
    return timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

/**
 * Recherche des clientes correspondant au numéro de téléphone Meta (ex. 212612345678).
 */
export async function findCustomersByIncomingPhone(rawPhone: string): Promise<
  {
    id: string;
    organizationId: string;
    firstName: string;
    lastName: string;
    phone: string;
  }[]
> {
  const digits = rawPhone.replace(/\D/g, "");
  if (!digits) return [];

  const localMorocco = digits.startsWith("212") ? `0${digits.slice(3)}` : digits;
  const intlMorocco = digits.startsWith("0") ? `212${digits.slice(1)}` : digits;

  const { rows } = await pool.query<{
    id: string;
    organizationId: string;
    firstName: string;
    lastName: string;
    phone: string;
  }>(
    `SELECT id, "organizationId", "firstName", "lastName", phone
     FROM "Customer"
     WHERE "deletedAt" IS NULL
       AND (
         regexp_replace(phone, '\\D', '', 'g') = $1
         OR regexp_replace(phone, '\\D', '', 'g') = $2
         OR regexp_replace(phone, '\\D', '', 'g') = $3
         OR phone = $4
       )
     LIMIT 5`,
    [digits, localMorocco, intlMorocco, rawPhone],
  );

  return rows;
}

export type ProcessedWhatsAppEvent = {
  type: "message" | "status";
  messageId: string;
  customer?: { id: string; organizationId: string; name: string };
  data: WhatsAppWebhookMessage | WhatsAppWebhookStatus;
};

/**
 * Traite les événements d'un webhook Meta reçu.
 * Ne lance jamais d'exception pour que le webhook réponde toujours 200 à Meta.
 */
export async function processWhatsAppWebhookEvent(
  payload: WhatsAppWebhookPayload,
): Promise<ProcessedWhatsAppEvent[]> {
  const processed: ProcessedWhatsAppEvent[] = [];

  if (payload.object !== "whatsapp_business_account" || !Array.isArray(payload.entry)) {
    return processed;
  }

  for (const entry of payload.entry) {
    const changes = entry.changes || [];
    for (const change of changes) {
      if (change.field !== "messages") continue;
      const value = change.value;
      if (!value) continue;

      // 1. Messages entrants
      const messages = value.messages || [];
      for (const msg of messages) {
        const from = msg.from;
        const customers = await findCustomersByIncomingPhone(from).catch(() => []);
        const matched = customers[0];

        processed.push({
          type: "message",
          messageId: msg.id,
          customer: matched
            ? {
                id: matched.id,
                organizationId: matched.organizationId,
                name: `${matched.firstName} ${matched.lastName}`.trim(),
              }
            : undefined,
          data: msg,
        });

        if (matched) {
          try {
            await writeAuditLog({
              organizationId: matched.organizationId,
              entityType: "WhatsAppMessage",
              entityId: msg.id,
              action: "INCOMING_MESSAGE",
              after: {
                from,
                type: msg.type,
                text: msg.text?.body ? msg.text.body.slice(0, 500) : null,
                customerId: matched.id,
              },
            });
          } catch (e) {
            console.error("[WhatsApp Webhook] Erreur audit log message entrant:", e);
          }
        }
      }

      // 2. Statuts (sent, delivered, read, failed)
      const statuses = value.statuses || [];
      for (const status of statuses) {
        processed.push({
          type: "status",
          messageId: status.id,
          data: status,
        });
      }
    }
  }

  return processed;
}
