import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireFeatureWriteLimited, stripOrganizationId } from "@/lib/auth/api-guard";
import { canSendWhatsapp } from "@/lib/rbac";
import {
  isWhatsAppDirectSendEnabled,
  sendDirectWhatsAppTask,
  WHATSAPP_DIRECT_SEND_DISABLED_MESSAGE,
} from "@/lib/whatsapp/send";
import { createAIWhatsAppTask } from "@/lib/db/whatsapp";
import { WHATSAPP_TASK_TYPES, type WhatsAppTaskType } from "@/types/whatsapp";

/**
 * POST /api/whatsapp/send
 * Envoi via Meta Cloud API — désactivé par défaut (V1 manuel).
 * Réactivation : WHATSAPP_DIRECT_SEND_ENABLED=true + token Meta.
 */
export async function POST(request: NextRequest) {
  const auth = await requireFeatureWriteLimited(request, "whatsapp");
  if (!auth.ok) return auth.response;
  if (!canSendWhatsapp(auth.session.role)) {
    return NextResponse.json({ error: "Accès refusé pour l'envoi WhatsApp." }, { status: 403 });
  }

  if (!isWhatsAppDirectSendEnabled()) {
    return NextResponse.json(
      {
        error: WHATSAPP_DIRECT_SEND_DISABLED_MESSAGE,
        disabled: true,
        mode: "manual_wa_me",
      },
      { status: 503 },
    );
  }

  try {
    const raw = stripOrganizationId((await request.json()) as Record<string, unknown>);
    const actor = {
      id: auth.session.id,
      name: `${auth.session.firstName} ${auth.session.lastName}`.trim(),
    };

    // Cas 1 : Envoi d'une tâche existante
    if (typeof raw.taskId === "string" && raw.taskId.trim()) {
      const taskId = raw.taskId.trim();
      const result = await sendDirectWhatsAppTask(auth.session.organizationId, taskId, actor);
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
      },
      actor,
    );

    const result = await sendDirectWhatsAppTask(
      auth.session.organizationId,
      createdTask.id,
      actor,
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("[POST /api/whatsapp/send]", error);
    const msg = error instanceof Error ? error.message : "Échec d'envoi du message WhatsApp";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
