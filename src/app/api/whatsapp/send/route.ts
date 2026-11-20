import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireFeatureWriteLimited, stripOrganizationId } from "@/lib/auth/api-guard";
import { canSendWhatsapp } from "@/lib/rbac";
import {
  AppointmentWhatsAppError,
  canSendDirectWhatsAppViaMeta,
  META_WHATSAPP_MANUAL_SEND_UNAVAILABLE,
  sendAppointmentWhatsAppReminder,
  sendDirectWhatsAppTask,
} from "@/lib/whatsapp/send";
import { createAIWhatsAppTask } from "@/lib/db/whatsapp";
import { WHATSAPP_TASK_TYPES, type WhatsAppTaskType } from "@/types/whatsapp";
import { tenantRoute } from "@/lib/http/route-scope";

/**
 * Seul message individuel déclenché à la main depuis la fiche cliente (bouton « relancer »,
 * type REACTIVATION) peut partir sans opt-in marketing. Tout autre type marketing
 * (PROMOTION, BIRTHDAY, …) exige le consentement, quoi que contienne le corps de la requête.
 */
const STAFF_OPT_IN_BYPASS_TYPES: ReadonlySet<WhatsAppTaskType> = new Set<WhatsAppTaskType>(["REACTIVATION"]);

function allowsStaffOptInBypass(type: WhatsAppTaskType): boolean {
  return STAFF_OPT_IN_BYPASS_TYPES.has(type);
}

/**
 * POST /api/whatsapp/send
 * Envoi via Meta Cloud API pour les instituts autorisés.
 */
export const POST = tenantRoute(async function POST(request: NextRequest) {
  const auth = await requireFeatureWriteLimited(request, "whatsapp");
  if (!auth.ok) return auth.response;
  if (!canSendWhatsapp(auth.session.role)) {
    return NextResponse.json({ error: "Accès refusé pour l'envoi WhatsApp." }, { status: 403 });
  }

  if (request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json") {
    return NextResponse.json({ error: "Un corps JSON est requis." }, { status: 415 });
  }

  try {
    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
    }
    const raw = stripOrganizationId(body as Record<string, unknown>);
    const actor = {
      id: auth.session.id,
      name: `${auth.session.firstName} ${auth.session.lastName}`.trim(),
    };

    if (raw.type === "APPOINTMENT_REMINDER") {
      const appointmentId = typeof raw.appointmentId === "string" ? raw.appointmentId.trim() : "";
      if (!appointmentId || appointmentId.length > 128) {
        return NextResponse.json({ error: "Identifiant de rendez-vous invalide." }, { status: 400 });
      }
      try {
        return NextResponse.json(await sendAppointmentWhatsAppReminder(auth.session.organizationId, appointmentId, actor));
      } catch (error) {
        if (error instanceof AppointmentWhatsAppError) throw error;
        console.error("[POST /api/whatsapp/send] Erreur de traitement du rappel", error instanceof Error ? error.name : "UnknownError");
        return NextResponse.json({ error: "Impossible de confirmer le traitement du rappel WhatsApp." }, { status: 500 });
      }
    }

    if (!canSendDirectWhatsAppViaMeta(auth.session.organizationId)) {
      return NextResponse.json(
        { error: META_WHATSAPP_MANUAL_SEND_UNAVAILABLE, disabled: true, mode: "manual_wa_me" },
        { status: 503 },
      );
    }

    // Cas 1 : Envoi d'une tâche existante
    if (typeof raw.taskId === "string" && raw.taskId.trim()) {
      const taskId = raw.taskId.trim();
      const result = await sendDirectWhatsAppTask(auth.session.organizationId, taskId, actor, "meta");
      return NextResponse.json(result);
    }

    // Cas 2 : Envoi direct à un client avec création automatique de tâche
    const customerId = typeof raw.customerId === "string" ? raw.customerId.trim() : null;
    const message = typeof raw.message === "string" ? raw.message.trim() : null;
    const type: WhatsAppTaskType =
      raw.type && typeof raw.type === "string" && (WHATSAPP_TASK_TYPES as string[]).includes(raw.type)
        ? (raw.type as WhatsAppTaskType)
        : "PROMOTION";
    const appointmentId = typeof raw.appointmentId === "string" ? raw.appointmentId.trim() : null;
    const attributionSource =
      typeof raw.attributionSource === "string" ? raw.attributionSource.trim() : "direct_send";

    if (!customerId || !message) {
      return NextResponse.json(
        { error: "Paramètres requis : taskId ou (customerId + message)." },
        { status: 400 },
      );
    }

    const createdTask = await createAIWhatsAppTask(
      auth.session.organizationId,
      {
        customerId,
        message,
        type,
        appointmentId,
        attributionSource,
        // Dérivé côté serveur : le drapeau `staffClick` du corps n'est plus lu.
        allowWithoutMarketingOptIn: allowsStaffOptInBypass(type),
      },
      actor,
    );

    const result = await sendDirectWhatsAppTask(
      auth.session.organizationId,
      createdTask.id,
      actor,
      "meta",
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AppointmentWhatsAppError) {
      return NextResponse.json(
        { error: error.message, ...(error.disabled ? { disabled: true } : {}) },
        { status: error.status },
      );
    }
    const code = error instanceof Error ? error.message : "";
    if (code === "CUSTOMER_NOT_FOUND") {
      return NextResponse.json({ error: "Cliente introuvable." }, { status: 404 });
    }
    if (code === "CUSTOMER_NO_PHONE") {
      return NextResponse.json({ error: "Cette cliente n'a pas de numéro." }, { status: 400 });
    }
    if (code === "CUSTOMER_NO_MARKETING_OPTIN") {
      return NextResponse.json(
        { error: "Cette cliente n'a pas consenti au marketing WhatsApp." },
        { status: 400 },
      );
    }
    console.error("[POST /api/whatsapp/send]", error);
    const msg = code && !code.startsWith("CUSTOMER_") ? code : "Échec d'envoi du message WhatsApp";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
});
