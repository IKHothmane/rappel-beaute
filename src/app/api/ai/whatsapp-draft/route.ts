import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAIWrite, sanitizeAIBody } from "@/lib/ai/guard";
import {
  AI_KIND_TO_WHATSAPP,
  isMarketingMessageKind,
} from "@/lib/ai/marketing";
import { requireFeatureWriteLimited } from "@/lib/auth/api-guard";
import { createAIWhatsAppTask } from "@/lib/db/whatsapp";
import { sendDirectWhatsAppTask } from "@/lib/whatsapp/send";
import { canSendWhatsapp } from "@/lib/rbac";
import { AI_MARKETING_ATTRIBUTION } from "@/types/ai";
import { parseCommitWhatsAppBody } from "@/lib/validation/ai-message";

/**
 * Valide un brouillon IA et crée une WhatsAppTask.
 * Si sendDirect === true : envoie immédiatement via l'API officielle Meta (sans ouvrir WhatsApp Web).
 * Sinon : crée la tâche en statut PENDING.
 */
export async function POST(request: NextRequest) {
  const aiAuth = await requireAIWrite(request);
  if (!aiAuth.ok) return aiAuth.response;

  const waAuth = await requireFeatureWriteLimited(request, "whatsapp");
  if (!waAuth.ok) return waAuth.response;
  if (!canSendWhatsapp(waAuth.session.role)) {
    return NextResponse.json({ error: "Accès WhatsApp refusé." }, { status: 403 });
  }

  try {
    const raw = sanitizeAIBody((await request.json()) as Record<string, unknown>);
    const parsed = parseCommitWhatsAppBody(raw);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const type = AI_KIND_TO_WHATSAPP[parsed.data.kind];
    const actor = {
      id: waAuth.session.id,
      name: `${waAuth.session.firstName} ${waAuth.session.lastName}`.trim(),
    };

    const task = await createAIWhatsAppTask(
      waAuth.session.organizationId,
      {
        customerId: parsed.data.customerId,
        message: parsed.data.message,
        type,
        appointmentId: parsed.data.appointmentId,
        attributionSource: AI_MARKETING_ATTRIBUTION,
      },
      actor,
    );

    // Si envoi direct demandé : appel immédiat à l'API Meta sans ouvrir WhatsApp Web
    if (parsed.data.sendDirect) {
      const directResult = await sendDirectWhatsAppTask(
        waAuth.session.organizationId,
        task.id,
        actor,
      );
      return NextResponse.json({
        task: directResult.task,
        autoSent: true,
        messageId: directResult.messageId,
        marketingKind: isMarketingMessageKind(parsed.data.kind),
      });
    }

    return NextResponse.json({
      task,
      autoSent: false,
      marketingKind: isMarketingMessageKind(parsed.data.kind),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "CUSTOMER_NOT_FOUND") {
      return NextResponse.json({ error: "Cliente introuvable." }, { status: 404 });
    }
    if (code === "CUSTOMER_NO_PHONE") {
      return NextResponse.json(
        { error: "Cette cliente n'a pas de numéro WhatsApp." },
        { status: 400 },
      );
    }
    if (code === "CUSTOMER_NO_MARKETING_OPTIN") {
      return NextResponse.json(
        { error: "Cette cliente n'a pas consenti au marketing WhatsApp." },
        { status: 400 },
      );
    }
    if (code === "APPOINTMENT_NOT_FOUND" || code === "APPOINTMENT_MISMATCH") {
      return NextResponse.json({ error: "Rendez-vous introuvable." }, { status: 404 });
    }
    console.error("[POST /api/ai/whatsapp-draft]", error);
    return NextResponse.json({ error: "Impossible de préparer WhatsApp." }, { status: 500 });
  }
}
