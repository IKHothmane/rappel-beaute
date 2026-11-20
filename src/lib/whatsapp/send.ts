import { randomUUID } from "node:crypto";
import { normalizePhoneForWa } from "@/lib/db/whatsapp";
import { writeAuditLog } from "@/lib/db/audit";
import type { WhatsAppTaskItem } from "@/types/whatsapp";
import { getOrganizationWhatsappFrom } from "@/lib/db/organization";
import {
  formatTwilioWhatsAppFrom,
  sendWhatsAppMessageViaTwilio,
  TWILIO_FROM_MISSING_MESSAGE,
  twilioCredentialsPresent,
} from "@/lib/whatsapp/twilio";
import { pool } from "@/lib/db/pool";
import { withTransaction } from "@/lib/db/transaction";
import { formatBusinessDate, formatBusinessTime } from "@/lib/time/business-timezone";

export type SendWhatsAppApiResult =
  | { ok: true; messageId: string; rawResponse?: unknown }
  | { ok: false; error: string; details?: unknown; acceptanceUnknown?: boolean };

/**
 * Envoi automatique via Meta Cloud API.
 * Désactivé par défaut (V1 = WhatsApp assisté manuel via wa.me).
 * Pour réactiver plus tard : WHATSAPP_DIRECT_SEND_ENABLED=true + WHATSAPP_ACCESS_TOKEN.
 */
export function isWhatsAppDirectSendEnabled(): boolean {
  return process.env.WHATSAPP_DIRECT_SEND_ENABLED === "true";
}

/** Twilio (clés présentes) ou l’ancien drapeau Meta. */
export function isAutomaticWhatsAppEnabled(): boolean {
  return twilioCredentialsPresent() || isWhatsAppDirectSendEnabled();
}

export const WHATSAPP_DIRECT_SEND_DISABLED_MESSAGE =
  "L'envoi automatique WhatsApp via Meta est désactivé. Utilisez « Ouvrir WhatsApp » pour un envoi manuel.";

/**
 * Récupère et valide la configuration WhatsApp Cloud API de Meta.
 */
export function getMetaWhatsAppConfig(): {
  isConfigured: boolean;
  phoneNumberId: string | null;
  accessToken: string | null;
  apiVersion: string;
} {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || null;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim() || null;
  const apiVersion = process.env.WHATSAPP_API_VERSION?.trim() || "v24.0";

  return {
    isConfigured: Boolean(phoneNumberId && accessToken),
    phoneNumberId,
    accessToken,
    apiVersion,
  };
}

export const META_WHATSAPP_MANUAL_SEND_UNAVAILABLE =
  "L’envoi direct via WhatsApp Business (Meta) n’est pas configuré pour cet institut.";

export function canSendDirectWhatsAppViaMeta(organizationId: string): boolean {
  const allowedOrganizations = process.env.WHATSAPP_META_ORG_IDS?.split(",").map((id) => id.trim());
  return Boolean(allowedOrganizations?.includes(organizationId) && getMetaWhatsAppConfig().isConfigured);
}

/**
 * Traduit les erreurs de l'API Meta en messages compréhensibles pour l'utilisateur.
 */
function formatMetaErrorMessage(status: number, errObj: Record<string, unknown> | null): string {
  if (!errObj || typeof errObj !== "object") {
    return `Erreur Meta HTTP ${status}`;
  }

  const err = (errObj.error as Record<string, unknown>) || errObj;
  const code = Number(err.code);
  const subcode = Number(err.error_subcode);
  const msg = String(err.message || "");

  // Permissions manquantes ou token non associé à ce numéro de téléphone
  if (
    msg.includes("Unsupported post request") ||
    msg.includes("does not support this operation") ||
    msg.includes("missing permissions") ||
    (code === 100 && err.type === "GraphMethodException")
  ) {
    return "Erreur d'autorisation Meta : le jeton d'accès (WHATSAPP_ACCESS_TOKEN) n'a pas les permissions requises ou n'est pas associé à ce numéro de téléphone. Dans Meta for Developers : 1) Assurez-vous que votre numéro est sélectionné dans le menu déroulant « De » avant de copier/générer le jeton. 2) Vérifiez que le jeton possède la permission 'whatsapp_business_messaging'. 3) Dans Meta Business Suite, vérifiez que votre compte WhatsApp est bien associé à cette application.";
  }

  // Destinataire non autorisé (mode sandbox / dev Meta)
  if (code === 131030 || subcode === 2494010) {
    return "Le numéro du client n'est pas dans la liste des destinataires autorisés dans Meta for Developers (section WhatsApp > Démarrage rapide > Gérer les numéros de test).";
  }

  // Token expiré ou invalide
  if (code === 190 || err.type === "OAuthException") {
    return "Le jeton d'accès Meta (WHATSAPP_ACCESS_TOKEN) est expiré ou invalide. Veuillez générer un nouveau jeton dans Meta.";
  }

  // Fenêtre de 24h expirée (conversation non initiée par le client)
  if (code === 131047 || msg.toLowerCase().includes("24 hours") || msg.toLowerCase().includes("template")) {
    return "La fenêtre de 24h est expirée : le client ne vous a pas écrit récemment. Pour initier un premier contact, Meta exige un modèle de message (Template) pré-approuvé.";
  }

  // Numéro de téléphone invalide
  if (code === 131026 || code === 131000) {
    return "Le numéro de téléphone du client est invalide ou non enregistré sur WhatsApp.";
  }

  // Limite de débit / Quota Meta
  if (code === 130429 || code === 80007) {
    return "Limite de débit Meta atteinte. Veuillez patienter quelques instants avant de renvoyer.";
  }

  return msg || `Erreur Meta (${code || status})`;
}

/**
 * Envoie un message texte directement à un destinataire via l'API officielle WhatsApp Cloud de Meta.
 * Ne fait AUCUNE ouverture de navigateur ni de WhatsApp Web.
 */
type MetaSendOptions = { toPhone: string } & (
  | { message: string; previewUrl?: boolean }
  | { template: { name: string; language: string; bodyParameters: string[] } }
);

export async function sendWhatsAppMessageViaMetaApi(options: MetaSendOptions): Promise<SendWhatsAppApiResult> {
  // Garde-fou : aucun appel graph.facebook.com/.../messages tant que le flag est off
  if (!isWhatsAppDirectSendEnabled()) {
    return { ok: false, error: WHATSAPP_DIRECT_SEND_DISABLED_MESSAGE };
  }
  return requestMetaWhatsAppMessage(options);
}

async function requestMetaWhatsAppMessage(options: MetaSendOptions): Promise<SendWhatsAppApiResult> {
  const config = getMetaWhatsAppConfig();
  if (!config.isConfigured || !config.phoneNumberId || !config.accessToken) {
    return {
      ok: false,
      error:
        "Configuration WhatsApp API incomplète : les variables WHATSAPP_PHONE_NUMBER_ID et WHATSAPP_ACCESS_TOKEN doivent être définies dans Railway.",
    };
  }

  const normalizedPhone = normalizePhoneForWa(options.toPhone);
  if (!normalizedPhone || normalizedPhone.length < 8) {
    return {
      ok: false,
      error: "Numéro de téléphone destinataire invalide.",
    };
  }

  const endpoint = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;

  const content = "template" in options ? {
    type: "template",
    template: {
      name: options.template.name,
      language: { code: options.template.language },
      components: [{
        type: "body",
        parameters: options.template.bodyParameters.map((text) => ({ type: "text", text })),
      }],
    },
  } : {
    type: "text",
    text: { preview_url: options.previewUrl ?? false, body: options.message },
  };
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: normalizedPhone,
    ...content,
  };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });

    const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;

    if (!res.ok) {
      const metaCode = (data?.error as { code?: number } | undefined)?.code;
      const friendlyError = "template" in options && [132000, 132001, 132012, 132015, 132016].includes(Number(metaCode))
        ? "Le modèle de rappel WhatsApp n’est pas disponible ou ses paramètres ne correspondent pas au modèle Meta."
        : formatMetaErrorMessage(res.status, data);
      console.error("[WhatsApp Cloud API Send Error]", res.status, metaCode);
      return {
        ok: false,
        error: friendlyError,
        details: data,
        acceptanceUnknown: res.status >= 500,
      };
    }

    const messages = (data?.messages as { id: string }[]) || [];
    const messageId = messages[0]?.id;
    if (!messageId) {
      return { ok: false, error: "Meta n’a pas confirmé la prise en charge du message.", acceptanceUnknown: true };
    }

    return {
      ok: true,
      messageId,
      rawResponse: data,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur de connexion réseau vers Meta";
    console.error("[WhatsApp Cloud API Network Error]", err);
    return {
      ok: false,
      error: `Échec d'envoi réseau vers Meta: ${message}`,
      acceptanceUnknown: true,
    };
  }
}

export class AppointmentWhatsAppError extends Error {
  constructor(message: string, public readonly status: number, public readonly disabled = false) {
    super(message);
  }
}

const REMINDER_SOURCE = "agenda_direct";
const REMINDER_RESERVED_SOURCE = "agenda_direct_reserved";
const REMINDER_FAILED_SOURCE = "agenda_direct_failed";
const REMINDER_UNCONFIRMED = "Impossible de confirmer l’envoi du rappel. Vérifiez la conversation WhatsApp avant tout nouvel envoi.";

export async function sendAppointmentWhatsAppReminder(
  organizationId: string,
  appointmentId: string,
  actor: { id: string; name?: string | null },
): Promise<{ alreadySent: boolean; messageId?: string }> {
  const enabledOrganizations = process.env.WHATSAPP_APPOINTMENT_ORG_IDS?.split(",").map((id) => id.trim());
  const templateName = process.env.WHATSAPP_APPOINTMENT_TEMPLATE_NAME?.trim();
  const language = process.env.WHATSAPP_APPOINTMENT_TEMPLATE_LANGUAGE?.trim() || "fr";
  if (!enabledOrganizations?.includes(organizationId) || !templateName || !getMetaWhatsAppConfig().isConfigured) {
    throw new AppointmentWhatsAppError("L’envoi direct des rappels WhatsApp n’est pas configuré pour cet institut.", 503, true);
  }

  const reservation = await withTransaction(async (client) => {
    const { rows: [appointment] } = await client.query<{
      customerId: string; startAt: Date; status: string; phone: string | null;
    }>(
      `SELECT a."customerId", a."startAt", a.status, c.phone
       FROM "Appointment" a
       JOIN "Customer" c ON c.id = a."customerId" AND c."organizationId" = a."organizationId"
       WHERE a.id = $1 AND a."organizationId" = $2 AND c."deletedAt" IS NULL
       FOR SHARE OF a, c`,
      [appointmentId, organizationId],
    );
    if (!appointment) throw new AppointmentWhatsAppError("Rendez-vous introuvable.", 404);
    if (!["PENDING", "CONFIRMED"].includes(appointment.status) || appointment.startAt.getTime() <= Date.now()) {
      throw new AppointmentWhatsAppError("Ce rendez-vous ne peut plus faire l’objet d’un rappel.", 409);
    }
    const phone = appointment.phone && normalizePhoneForWa(appointment.phone);
    if (!phone || phone.length < 8 || phone.length > 15) {
      throw new AppointmentWhatsAppError("Le numéro WhatsApp de cette cliente est invalide ou manquant.", 400);
    }

    const date = formatBusinessDate(appointment.startAt);
    const time = formatBusinessTime(appointment.startAt);
    const message = `Bonjour, nous vous rappelons votre rendez-vous le ${date} à ${time}. Merci de nous prévenir en cas d’empêchement.`;
    // Même clé que le rappel planifié. L'insertion et le verrou sur la tâche sérialisent les deux chemins.
    const day = appointment.startAt.toISOString().slice(0, 10);
    const key = `wa:reminder:${appointmentId}:${day}`;
    const { rows: [newTask] } = await client.query<{ id: string }>(
      `INSERT INTO "WhatsAppTask" (
         id, "organizationId", "customerId", "appointmentId", type, status,
         "messageSnapshot", "phoneSnapshot", "scheduledFor", "idempotencyKey", "attributionSource", "updatedAt"
       ) VALUES ($1, $2, $3, $4, 'APPOINTMENT_REMINDER', 'PENDING', $5, $6, NOW(), $7, $8, NOW())
       ON CONFLICT ("organizationId", "idempotencyKey") DO NOTHING RETURNING id`,
      [`wtask_${randomUUID()}`, organizationId, appointment.customerId, appointmentId, message, phone, key, REMINDER_SOURCE],
    );
    const { rows: [task] } = await client.query<{ id: string; status: string; attributionSource: string | null }>(
      `SELECT id, status, "attributionSource" FROM "WhatsAppTask"
       WHERE "organizationId" = $1 AND "idempotencyKey" = $2 FOR UPDATE`,
      [organizationId, key],
    );
    if (!task) throw new AppointmentWhatsAppError("Impossible de préparer le rappel WhatsApp.", 409);
    if (task.status === "SENT") return null;
    if (task.attributionSource === REMINDER_RESERVED_SOURCE) throw new AppointmentWhatsAppError(REMINDER_UNCONFIRMED, 409);
    if (task.status !== "PENDING" && task.attributionSource !== REMINDER_FAILED_SOURCE) {
      throw new AppointmentWhatsAppError("Ce rappel WhatsApp est déjà clôturé.", 409);
    }

    // Réserver avant l’appel réseau. Une interruption laisse le rappel inexécutable par le cron.
    await client.query(
      `UPDATE "WhatsAppTask"
       SET status = 'SKIPPED', "attributionSource" = $3, "updatedAt" = NOW()
       WHERE id = $1 AND "organizationId" = $2`,
      [task.id, organizationId, REMINDER_RESERVED_SOURCE],
    );
    await writeAuditLog({
      client, organizationId, actorId: actor.id, actorName: actor.name,
      entityType: "WhatsAppTask", entityId: task.id, action: "WHATSAPP_DIRECT_RESERVED",
    });
    return {
      taskId: task.id, phone, date, time, message,
      plannedTask: !newTask && task.status === "PENDING" ? { source: task.attributionSource } : null,
    };
  });
  if (!reservation) return { alreadySent: true };

  const sent = await requestMetaWhatsAppMessage({
    toPhone: reservation.phone,
    template: { name: templateName, language, bodyParameters: [reservation.date, reservation.time] },
  });
  await withTransaction(async (client) => {
    const restorePlanned = !sent.ok && !sent.acceptanceUnknown ? reservation.plannedTask : null;
    const status = sent.ok ? "SENT" : restorePlanned ? "PENDING" : "SKIPPED";
    const source = sent.ok ? REMINDER_SOURCE
      : restorePlanned ? restorePlanned.source
      : sent.acceptanceUnknown ? REMINDER_RESERVED_SOURCE : REMINDER_FAILED_SOURCE;
    const { rowCount } = await client.query(
      `UPDATE "WhatsAppTask"
       SET status = $3::"WhatsAppTaskStatus", "attributionSource" = $4,
           "sentAt" = CASE WHEN $3 = 'SENT' THEN NOW() ELSE NULL END,
           "sentById" = CASE WHEN $3 = 'SENT' THEN $5 ELSE NULL END,
           "messageSnapshot" = COALESCE($7, "messageSnapshot"),
           "phoneSnapshot" = COALESCE($8, "phoneSnapshot"), "updatedAt" = NOW()
       WHERE id = $1 AND "organizationId" = $2 AND "attributionSource" = $6`,
      [reservation.taskId, organizationId, status, source, actor.id, REMINDER_RESERVED_SOURCE,
        sent.ok ? reservation.message : null, sent.ok ? reservation.phone : null],
    );
    if (rowCount !== 1) throw new AppointmentWhatsAppError(REMINDER_UNCONFIRMED, 409);
    await writeAuditLog({
      client, organizationId, actorId: actor.id, actorName: actor.name,
      entityType: "WhatsAppTask", entityId: reservation.taskId,
      action: sent.ok ? "WHATSAPP_DIRECT_SENT"
        : sent.acceptanceUnknown ? "WHATSAPP_SEND_UNCONFIRMED" : "WHATSAPP_AGENDA_SEND_FAILED",
      after: sent.ok ? { messageId: sent.messageId, directApi: true } : undefined,
    });
  });
  if (!sent.ok) throw new AppointmentWhatsAppError(sent.acceptanceUnknown ? REMINDER_UNCONFIRMED : sent.error, 502);
  return { alreadySent: false, messageId: sent.messageId };
}

/**
 * Envoie une tâche WhatsAppTask existante directement via l'API Meta et met à jour son statut en DB.
 * Ne déclenche AUCUNE ouverture de WhatsApp Web.
 */
export async function sendDirectWhatsAppTask(
  organizationId: string,
  taskId: string,
  actor: { id: string; name?: string | null },
  provider: "automatic" | "meta" = "automatic",
): Promise<{ task: WhatsAppTaskItem; messageId: string }> {
  if (provider === "meta" && !canSendDirectWhatsAppViaMeta(organizationId)) {
    throw new Error(META_WHATSAPP_MANUAL_SEND_UNAVAILABLE);
  }
  if (provider === "automatic" && !isAutomaticWhatsAppEnabled()) {
    throw new Error(WHATSAPP_DIRECT_SEND_DISABLED_MESSAGE);
  }

  const useTwilio = provider === "automatic" && twilioCredentialsPresent();
  const instituteFrom = useTwilio
    ? await getOrganizationWhatsappFrom(organizationId)
    : null;
  if (useTwilio && !formatTwilioWhatsAppFrom(instituteFrom)) {
    throw new Error(TWILIO_FROM_MISSING_MESSAGE);
  }

  const { sendResult, phoneSnapshot, reminderUnconfirmed } = await withTransaction(async (client) => {
    const { rows: [task] } = await client.query<{
      phoneSnapshot: string; messageSnapshot: string; status: string; type: string;
    }>(
      `SELECT "phoneSnapshot", "messageSnapshot", status, type FROM "WhatsAppTask"
       WHERE id = $1 AND "organizationId" = $2 FOR UPDATE`,
      [taskId, organizationId],
    );
    if (!task) throw new Error("Tâche WhatsApp introuvable.");
    if (task.status !== "PENDING") throw new Error("Cette tâche WhatsApp n’est plus en attente.");

    const delivery = useTwilio
      ? await sendWhatsAppMessageViaTwilio({
          toPhone: task.phoneSnapshot, message: task.messageSnapshot, fromPhone: instituteFrom || "",
        })
      : await requestMetaWhatsAppMessage({ toPhone: task.phoneSnapshot, message: task.messageSnapshot });
    const reminderUnconfirmed = !delivery.ok && Boolean(delivery.acceptanceUnknown) && task.type === "APPOINTMENT_REMINDER";

    if (delivery.ok) {
      await client.query(
        `UPDATE "WhatsAppTask"
         SET status = 'SENT', "sentAt" = NOW(), "sentById" = $3, "updatedAt" = NOW()
         WHERE id = $1 AND "organizationId" = $2`,
        [taskId, organizationId, actor.id],
      );
    } else if (reminderUnconfirmed) {
      await client.query(
        `UPDATE "WhatsAppTask" SET status = 'SKIPPED', "attributionSource" = $3, "updatedAt" = NOW()
         WHERE id = $1 AND "organizationId" = $2`,
        [taskId, organizationId, REMINDER_RESERVED_SOURCE],
      );
    }
    return { sendResult: delivery, phoneSnapshot: task.phoneSnapshot, reminderUnconfirmed };
  });

  if (sendResult.ok) {
    await pool.query(
      `UPDATE "CampaignRecipient" r SET status = 'SENT', "updatedAt" = NOW()
       FROM "Campaign" c WHERE c.id = r."campaignId" AND c."organizationId" = $2
         AND r."whatsappTaskId" = $1 AND r.status = 'PENDING'`,
      [taskId, organizationId],
    ).catch(() => null);
  }
  await writeAuditLog({
    organizationId, actorId: actor.id, actorName: actor.name, entityType: "WhatsAppTask", entityId: taskId,
    action: sendResult.ok ? "WHATSAPP_DIRECT_SENT"
      : reminderUnconfirmed ? "WHATSAPP_SEND_UNCONFIRMED" : "WHATSAPP_SEND_FAILED",
    after: sendResult.ok
      ? { messageId: sendResult.messageId, toPhone: phoneSnapshot, directApi: true }
      : { error: sendResult.error, toPhone: phoneSnapshot },
  }).catch(() => null);
  if (!sendResult.ok) throw new Error(reminderUnconfirmed ? REMINDER_UNCONFIRMED : sendResult.error);

  // Récupérer la tâche complète mise à jour
  const { getWhatsAppTaskById } = await import("@/lib/db/whatsapp");
  const updatedTask = await getWhatsAppTaskById(taskId);
  if (!updatedTask) {
    throw new Error("Erreur lors de la récupération de la tâche envoyée.");
  }

  return { task: updatedTask, messageId: sendResult.messageId };
}

/**
 * Diagnostic complet de la connexion WhatsApp Meta Cloud API.
 * Interroge en temps réel les endpoints Meta pour vérifier la validité du token et l'accès au numéro.
 */
export async function diagnoseMetaWhatsAppConnection(): Promise<{
  configured: boolean;
  phoneNumberId: string | null;
  apiVersion: string;
  hasAccessToken: boolean;
  maskedToken: string | null;
  phoneCheck: {
    ok: boolean;
    data?: Record<string, unknown>;
    error?: string;
    rawError?: unknown;
  };
  tokenOwner?: Record<string, unknown>;
  tokenDebug?: Record<string, unknown>;
  verdict: string;
  nextSteps: string[];
}> {
  const config = getMetaWhatsAppConfig();
  if (!config.isConfigured || !config.phoneNumberId || !config.accessToken) {
    return {
      configured: false,
      phoneNumberId: config.phoneNumberId,
      apiVersion: config.apiVersion,
      hasAccessToken: Boolean(config.accessToken),
      maskedToken: null,
      phoneCheck: { ok: false, error: "Variables manquantes sur le serveur" },
      verdict: "Variables d'environnement non configurées sur Railway.",
      nextSteps: [
        "Définir WHATSAPP_PHONE_NUMBER_ID dans Railway",
        "Définir WHATSAPP_ACCESS_TOKEN dans Railway",
      ],
    };
  }

  const maskedToken = `${config.accessToken.slice(0, 7)}...${config.accessToken.slice(-4)}`;

  // 1. Tester l'accès au numéro de téléphone
  const phoneEndpoint = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}?fields=id,display_phone_number,verified_name,code_verification_status,quality_rating`;

  let phoneCheck: {
    ok: boolean;
    data?: Record<string, unknown>;
    error?: string;
    rawError?: unknown;
  } = { ok: false };

  try {
    const res = await fetch(phoneEndpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
      },
    });
    const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (res.ok && data && !data.error) {
      phoneCheck = { ok: true, data };
    } else {
      phoneCheck = {
        ok: false,
        error: (data?.error as Record<string, unknown>)?.message as string || `Erreur HTTP ${res.status}`,
        rawError: data?.error,
      };
    }
  } catch (e) {
    phoneCheck = {
      ok: false,
      error: e instanceof Error ? e.message : "Erreur réseau vers Meta",
    };
  }

  // 2. Tenter de lire l'identité du token via /me
  let tokenOwner: Record<string, unknown> | undefined;
  try {
    const meRes = await fetch(
      `https://graph.facebook.com/${config.apiVersion}/me?access_token=${config.accessToken}`,
    );
    const meData = (await meRes.json().catch(() => null)) as Record<string, unknown> | null;
    if (meRes.ok && meData && !meData.error) {
      tokenOwner = meData;
    }
  } catch {
    // silence
  }

  // 3. Tenter debug_token
  let tokenDebug: Record<string, unknown> | undefined;
  try {
    const debugRes = await fetch(
      `https://graph.facebook.com/${config.apiVersion}/debug_token?input_token=${config.accessToken}&access_token=${config.accessToken}`,
    );
    const debugData = (await debugRes.json().catch(() => null)) as Record<string, unknown> | null;
    if (debugRes.ok && debugData && !debugData.error) {
      tokenDebug = (debugData.data as Record<string, unknown>) || debugData;
    }
  } catch {
    // silence
  }

  // 4. Synthèse et verdict
  if (phoneCheck.ok) {
    return {
      configured: true,
      phoneNumberId: config.phoneNumberId,
      apiVersion: config.apiVersion,
      hasAccessToken: true,
      maskedToken,
      phoneCheck,
      tokenOwner,
      tokenDebug,
      verdict: "✅ Connexion Meta WhatsApp opérationnelle ! Le numéro et le token sont autorisés.",
      nextSteps: ["Vous pouvez envoyer directement les messages WhatsApp aux clients."],
    };
  }

  return {
    configured: true,
    phoneNumberId: config.phoneNumberId,
    apiVersion: config.apiVersion,
    hasAccessToken: true,
    maskedToken,
    phoneCheck,
    tokenOwner,
    tokenDebug,
    verdict: "❌ Le jeton Meta ne dispose pas des droits pour agir sur le numéro ID " + config.phoneNumberId,
    nextSteps: [
      "Dans Meta for Developers > WhatsApp > Configuration de l'API : vérifiez que votre numéro est bien sélectionné dans le menu déroulant « De » avant de générer le jeton.",
      "Ou créez un jeton permanent dans Meta Business Suite (business.facebook.com/settings/system-users) : Utilisateur Système avec rôle Admin, attribuez le compte WhatsApp avec Contrôle total, puis générez un jeton avec whatsapp_business_messaging et whatsapp_business_management.",
    ],
  };
}

