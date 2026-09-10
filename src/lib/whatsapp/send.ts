import { Pool } from "pg";
import { normalizePhoneForWa } from "@/lib/db/whatsapp";
import { writeAuditLog } from "@/lib/db/audit";
import type { WhatsAppTaskItem } from "@/types/whatsapp";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export type SendWhatsAppApiResult =
  | { ok: true; messageId: string; rawResponse?: unknown }
  | { ok: false; error: string; details?: unknown };

/**
 * Envoi automatique via Meta Cloud API.
 * Désactivé par défaut (V1 = WhatsApp assisté manuel via wa.me).
 * Pour réactiver plus tard : WHATSAPP_DIRECT_SEND_ENABLED=true + WHATSAPP_ACCESS_TOKEN.
 */
export function isWhatsAppDirectSendEnabled(): boolean {
  return process.env.WHATSAPP_DIRECT_SEND_ENABLED === "true";
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
export async function sendWhatsAppMessageViaMetaApi(options: {
  toPhone: string;
  message: string;
  previewUrl?: boolean;
}): Promise<SendWhatsAppApiResult> {
  // Garde-fou : aucun appel graph.facebook.com/.../messages tant que le flag est off
  if (!isWhatsAppDirectSendEnabled()) {
    return { ok: false, error: WHATSAPP_DIRECT_SEND_DISABLED_MESSAGE };
  }

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
  if (!isWhatsAppDirectSendEnabled()) {
    throw new Error(WHATSAPP_DIRECT_SEND_DISABLED_MESSAGE);
  }

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

