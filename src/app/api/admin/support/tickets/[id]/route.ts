import type { NextRequest } from "next/server";
import { adminError, adminJson, requireAdmin } from "@/lib/admin/api-helpers";
import { listPlatformAuditLogs } from "@/lib/db/platform-audit";
import {
  adminGetSupportTicket,
  adminUpdateSupportTicket,
  listTicketMessages,
  parseCategory,
  parsePriority,
  parseStatus,
  serializeMessage,
  serializeTicket,
} from "@/lib/db/support-tickets";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Ctx) {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  try {
    const ticket = await adminGetSupportTicket(id);
    if (!ticket) return adminError("Ticket introuvable.", 404);
    const [messages, history] = await Promise.all([
      listTicketMessages(id, { includeInternal: true }),
      listPlatformAuditLogs({
        entityType: "SupportTicket",
        entityId: id,
        limit: 40,
      }).catch(() => []),
    ]);
    return adminJson({
      ticket: serializeTicket(ticket),
      messages: messages.map(serializeMessage),
      history,
    });
  } catch (error) {
    console.error("[GET /api/admin/support/tickets/:id]", error);
    return adminError("Impossible de charger le ticket.", 500);
  }
}

export async function PATCH(request: NextRequest, context: Ctx) {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  try {
    const body = (await request.json()) as {
      status?: string;
      priority?: string;
      category?: string;
      assignedToPlatformUserId?: string | null;
    };
    const status = body.status ? parseStatus(body.status) : undefined;
    const priority = body.priority ? parsePriority(body.priority) : undefined;
    const category = body.category ? parseCategory(body.category) : undefined;
    if (body.status && !status) return adminError("Statut invalide.", 400);
    if (body.priority && !priority) return adminError("Priorité invalide.", 400);
    if (body.category && !category) return adminError("Catégorie invalide.", 400);

    const ticket = await adminUpdateSupportTicket({
      ticketId: id,
      platformUserId: auth.session.id,
      platformUserName: `${auth.session.firstName} ${auth.session.lastName}`.trim(),
      status: status ?? undefined,
      priority: priority ?? undefined,
      category: category ?? undefined,
      assignedToPlatformUserId: body.assignedToPlatformUserId,
    });

    return adminJson({ ticket: serializeTicket(ticket) });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return adminError("Ticket introuvable.", 404);
    }
    console.error("[PATCH /api/admin/support/tickets/:id]", error);
    return adminError("Impossible de mettre à jour le ticket.", 500);
  }
}
