import { Pool } from "pg";
import { normalizePhoneForWa } from "@/lib/db/whatsapp";
import { writeAuditLog } from "@/lib/db/audit";
import type { WhatsAppTaskItem } from "@/types/whatsapp";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export type SendWhatsAppApiResult =
  | { ok: true; messageId: string; rawResponse?: unknown }
  | { ok: false; error: string; details?: unknown };

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
  const apiVersion = process.env.WHATSAPP_API_VERSION?.trim() || "v19.0";

  return {
    isConfigured: Boolean(phoneNumberId && accessToken),
    phoneNumberId,
    accessToken,
    apiVersion,
  };
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

  // Identifiant incorrect (confondu avec WABA ID ou App ID au lieu de Phone number ID)
  if (
    msg.includes("Unsupported post request") ||
    msg.includes("does not support this operation") ||
    (code === 100 && err.type === "GraphMethodException")
  ) {
    return "Identifiant de numéro de téléphone incorrect dans Railway : vous avez configuré l'« Identifiant de compte WhatsApp Business (WABA ID) » ou l'« ID de l'application » au lieu de l'« Identifiant du numéro de téléphone » (Phone number ID). Dans Meta for Developers > WhatsApp > Démarrage rapide (ou Configuration de l'API), copiez la valeur du champ « Identifiant du numéro de téléphone » et mettez-la dans WHATSAPP_PHONE_NUMBER_ID.";
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
export async function sendWhatsAppMessageViaMetaApi(options: {
  toPhone: string;
  message: string;
  previewUrl?: boolean;
}): Promise<SendWhatsAppApiResult> {
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

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: normalizedPhone,
    type: "text",
    text: {
      preview_url: options.previewUrl ?? false,
      body: options.message,
    },
  };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;

    if (!res.ok) {
      const friendlyError = formatMetaErrorMessage(res.status, data);
      console.error("[WhatsApp Cloud API Send Error]", res.status, data);
      return {
        ok: false,
        error: friendlyError,
        details: data,
      };
    }

    const messages = (data?.messages as { id: string }[]) || [];
    const messageId = messages[0]?.id || "unknown_wamid";

    console.log(`[WhatsApp Cloud API] ✅ Message envoyé avec succès à ${normalizedPhone} (wamid: ${messageId})`);

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
    };
  }
}

/**
 * Envoie une tâche WhatsAppTask existante directement via l'API Meta et met à jour son statut en DB.
 * Ne déclenche AUCUNE ouverture de WhatsApp Web.
 */
export async function sendDirectWhatsAppTask(
  organizationId: string,
  taskId: string,
  actor: { id: string; name?: string | null },
): Promise<{ task: WhatsAppTaskItem; messageId: string }> {
  const { rows } = await pool.query<{
    id: string;
    organizationId: string;
    customerId: string;
    phoneSnapshot: string;
    messageSnapshot: string;
    status: string;
  }>(
    `SELECT id, "organizationId", "customerId", "phoneSnapshot", "messageSnapshot", status
     FROM "WhatsAppTask"
     WHERE id = $1 AND "organizationId" = $2`,
    [taskId, organizationId],
  );

  const taskRow = rows[0];
  if (!taskRow) {
    throw new Error("Tâche WhatsApp introuvable.");
  }

  // Appel direct à l'API Meta
  const sendResult = await sendWhatsAppMessageViaMetaApi({
    toPhone: taskRow.phoneSnapshot,
    message: taskRow.messageSnapshot,
  });

  if (!sendResult.ok) {
    // Enregistrement de l'échec dans l'audit log pour traçabilité
    await writeAuditLog({
      organizationId,
      actorId: actor.id,
      actorName: actor.name,
      entityType: "WhatsAppTask",
      entityId: taskId,
      action: "WHATSAPP_SEND_FAILED",
      after: {
        error: sendResult.error,
        toPhone: taskRow.phoneSnapshot,
      },
    }).catch(() => null);

    throw new Error(sendResult.error);
  }

  // Mise à jour de la tâche en DB avec statut SENT
  await pool.query(
    `UPDATE "WhatsAppTask"
     SET status = 'SENT'::"WhatsAppTaskStatus",
         "sentAt" = NOW(),
         "sentById" = $3,
         "updatedAt" = NOW()
     WHERE id = $1 AND "organizationId" = $2`,
    [taskId, organizationId, actor.id],
  );

  // Mise à jour récipient de campagne si existant
  await pool.query(
    `UPDATE "CampaignRecipient"
     SET status = 'SENT'::"CampaignRecipientStatus", "updatedAt" = NOW()
     WHERE "whatsappTaskId" = $1 AND status = 'PENDING'::"CampaignRecipientStatus"`,
    [taskId],
  ).catch(() => null);

  // Audit log de succès
  await writeAuditLog({
    organizationId,
    actorId: actor.id,
    actorName: actor.name,
    entityType: "WhatsAppTask",
    entityId: taskId,
    action: "WHATSAPP_DIRECT_SENT",
    after: {
      messageId: sendResult.messageId,
      toPhone: taskRow.phoneSnapshot,
      directApi: true,
    },
  }).catch(() => null);

  // Récupérer la tâche complète mise à jour
  const { getWhatsAppTaskById } = await import("@/lib/db/whatsapp");
  const updatedTask = await getWhatsAppTaskById(taskId);
  if (!updatedTask) {
    throw new Error("Erreur lors de la récupération de la tâche envoyée.");
  }

  return { task: updatedTask, messageId: sendResult.messageId };
}
