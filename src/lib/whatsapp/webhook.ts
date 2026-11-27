import { createHash, createHmac, timingSafeEqual } from "crypto";
import { writeAuditLog } from "@/lib/db/audit";
import { pool } from "@/lib/db/pool";
import { runInScope } from "@/lib/db/tenant-context";
import { logger } from "@/lib/logger";

const ROUTE = "/api/whatsapp/webhook";

type WhatsAppWebhookMessage = {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id: string; mime_type?: string };
  [key: string]: unknown;
};

type WhatsAppWebhookStatus = {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
  conversation?: { id: string; expiration_timestamp?: string; origin?: { type: string } };
  pricing?: { billable: boolean; pricing_model: string; category: string };
  errors?: unknown[];
};

type WhatsAppWebhookEntry = {
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
 * Production ou staging (Railway staging garde NODE_ENV=production) : un événement dont la signature ne peut pas
 * être vérifiée est refusé. Lu à chaque requête, jamais figé au chargement du module.
 */
export function whatsappSignatureRequired(env: NodeJS.ProcessEnv = process.env): boolean {
  const appEnv = env.APP_ENV?.trim().toLowerCase();
  return env.NODE_ENV === "production" || appEnv === "production" || appEnv === "staging";
}

/** Comparaison à temps constant : condensats SHA-256 de même longueur, quelle que soit la longueur des entrées. */
function constantTimeStringEqual(a: string, b: string): boolean {
  const left = createHash("sha256").update(a, "utf8").digest();
  const right = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(left, right);
}

function unquote(value: string | null | undefined): string {
  return value?.trim().replace(/^["']|["']$/g, "") ?? "";
}

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

  const configured = unquote(expectedToken);
  if (!configured) {
    logger.warn("whatsapp webhook verify token not configured", { route: ROUTE });
    return { ok: false, status: 500, message: "Webhook non configuré." };
  }

  const cleanToken = unquote(token);
  // Toujours évaluée, à temps constant : ni le mode ni la longueur du jeton ne court-circuitent la comparaison.
  const tokenMatches = constantTimeStringEqual(cleanToken, configured);
  if (mode === "subscribe" && cleanToken.length > 0 && tokenMatches && challenge) {
    return { ok: true, challenge };
  }

  // Aucune valeur fournie par l'appelant n'est journalisée.
  logger.warn("whatsapp webhook verification refused", { route: ROUTE });
  return {
    ok: false,
    status: 403,
    message: "Forbidden",
  };
}

const SIGNATURE_HEADER = /^sha256=([0-9a-f]{64})$/i;

/**
 * Valide la signature HMAC SHA-256 (X-Hub-Signature-256) envoyée par Meta (POST /webhook).
 * Les deux condensats font 32 octets : timingSafeEqual compare toujours des tampons de même longueur.
 */
export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string,
): boolean {
  const secret = appSecret.trim();
  if (!secret || typeof signatureHeader !== "string") return false;
  const match = SIGNATURE_HEADER.exec(signatureHeader.trim());
  if (!match) return false;

  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest();
  const received = Buffer.from(match[1], "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

type CustomerMatch = {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  phone: string;
};

/**
 * Recherche des clientes correspondant au numéro de téléphone Meta (ex. 212612345678), tous instituts confondus
 * (fonction SQL limitée à 5 lignes, clientes supprimées exclues).
 */
async function findCustomersByIncomingPhone(rawPhone: string): Promise<CustomerMatch[]> {
  const digits = rawPhone.replace(/\D/g, "");
  if (digits.length < 6 || digits.length > 20) return [];

  const localMorocco = digits.startsWith("212") ? `0${digits.slice(3)}` : digits;
  const intlMorocco = digits.startsWith("0") ? `212${digits.slice(1)}` : digits;

  const { rows } = await pool.query<CustomerMatch>(
    `SELECT id, "organizationId", "firstName", "lastName", phone
     FROM app_public_customer_by_phone(ARRAY[$1, $2, $3]::text[])`,
    [digits, localMorocco, intlMorocco],
  );

  return rows;
}

/**
 * Journalise un message entrant chez l'institut de la cliente, une seule fois par message : Meta peut relivrer
 * le même événement, y compris en parallèle. Verrou transactionnel par message, puis insertion si absente.
 * Ni le texte ni le numéro ne sont conservés (aucun lecteur fonctionnel ; la cliente est désignée par son id).
 */
async function recordInboundMessage(
  organizationId: string,
  messageId: string,
  after: Record<string, unknown>,
): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [
      `whatsapp-inbound:${organizationId}:${messageId}`,
    ]);
    const existing = await client.query(
      `SELECT 1 FROM "AuditLog"
       WHERE "organizationId" = $1 AND "entityType" = 'WhatsAppMessage' AND "entityId" = $2
         AND action = 'INCOMING_MESSAGE'
       LIMIT 1`,
      [organizationId, messageId],
    );
    if ((existing.rowCount ?? 0) > 0) {
      await client.query("COMMIT");
      return false;
    }
    await writeAuditLog({
      organizationId,
      entityType: "WhatsAppMessage",
      entityId: messageId,
      action: "INCOMING_MESSAGE",
      after,
      client,
    });
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

type ProcessedWhatsAppEvent = {
  type: "message" | "status";
  messageId: string;
  customer?: { id: string; organizationId: string; name: string };
  /** Vrai si le message a été journalisé chez un institut (attribution unique, première réception). */
  recorded?: boolean;
  data: WhatsAppWebhookMessage | WhatsAppWebhookStatus;
};

function boundedString(value: unknown, max: number): string | null {
  return typeof value === "string" && value.length > 0 && value.length <= max ? value : null;
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "unknown";
}

/**
 * Traite les événements d'un webhook Meta reçu.
 * Ne lance jamais d'exception pour que le webhook réponde toujours 200 à Meta.
 *
 * Attribution : le numéro de réception (phone_number_id) est unique pour toute la plateforme
 * (WHATSAPP_PHONE_NUMBER_ID) et ne désigne aucun institut. Un message n'est donc attribué que si une seule cliente,
 * tous instituts confondus, possède ce numéro ; sinon rien n'est écrit chez un institut.
 */
export async function processWhatsAppWebhookEvent(
  payload: WhatsAppWebhookPayload,
): Promise<ProcessedWhatsAppEvent[]> {
  const processed: ProcessedWhatsAppEvent[] = [];

  if (
    !payload ||
    typeof payload !== "object" ||
    payload.object !== "whatsapp_business_account" ||
    !Array.isArray(payload.entry)
  ) {
    return processed;
  }

  for (const entry of payload.entry) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of changes) {
      if (change?.field !== "messages") continue;
      const value = change.value;
      if (!value || typeof value !== "object") continue;

      // 1. Messages entrants
      const messages = Array.isArray(value.messages) ? value.messages : [];
      for (const msg of messages) {
        const messageId = boundedString(msg?.id, 256);
        if (!messageId) continue;
        const from = boundedString(msg.from, 64);
        const matches = from
          ? await findCustomersByIncomingPhone(from).catch((error: unknown) => {
              logger.warn("whatsapp inbound customer lookup failed", { route: ROUTE, error: errorName(error) });
              return [] as CustomerMatch[];
            })
          : [];
        const matched = matches.length === 1 ? matches[0] : undefined;

        const event: ProcessedWhatsAppEvent = {
          type: "message",
          messageId,
          customer: matched
            ? {
                id: matched.id,
                organizationId: matched.organizationId,
                name: `${matched.firstName} ${matched.lastName}`.trim(),
              }
            : undefined,
          data: msg,
        };
        processed.push(event);

        if (!matched) {
          if (matches.length > 1) {
            // Plusieurs clientes (souvent dans plusieurs instituts) : aucune donnée personnelle journalisée.
            logger.info("whatsapp inbound message not attributed", { route: ROUTE, matches: matches.length });
          }
          continue;
        }

        try {
          // Écriture liée à l'institut de la cliente (RLS) : une même livraison peut en concerner plusieurs,
          // chaque message a donc sa propre portée publique bornée à cet institut.
          event.recorded = await runInScope({ kind: "public", reason: "whatsapp-inbound", organizationId: matched.organizationId }, () =>
            recordInboundMessage(matched.organizationId, messageId, {
              type: boundedString(msg.type, 32) ?? "unknown",
              hasText: typeof msg.text?.body === "string" && msg.text.body.length > 0,
              customerId: matched.id,
            }),
          );
        } catch (error) {
          logger.error("whatsapp inbound audit failed", { route: ROUTE, error: errorName(error) });
        }
      }

      // 2. Statuts (sent, delivered, read, failed)
      const statuses = Array.isArray(value.statuses) ? value.statuses : [];
      for (const status of statuses) {
        const statusId = boundedString(status?.id, 256);
        if (!statusId) continue;
        processed.push({
          type: "status",
          messageId: statusId,
          data: status,
        });
      }
    }
  }

  return processed;
}
