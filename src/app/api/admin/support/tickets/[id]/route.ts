import type { NextRequest } from "next/server";
import { adminError, adminJson, requireAdmin } from "@/lib/admin/api-helpers";
import {
  adminGetSupportTicket,
  adminUpdateSupportTicket,
  listTicketMessages,
  parseStatus,
} from "@/lib/db/support-tickets";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Ctx) {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  try {
    const ticket = await adminGetSupportTicket(id);
    if (!ticket) return adminError("Ticket introuvable.", 404);
    const messages = await listTicketMessages(id);
    return adminJson({
      ticket: {
        ...ticket,
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt.toISOString(),
        resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
      },
      messages: messages.map((m) => ({
        ...m,
        createdAt: m.createdAt.toISOString(),
      })),
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
      assignedToPlatformUserId?: string | null;
    };
    const status = body.status ? parseStatus(body.status) : undefined;
    if (body.status && !status) {
      return adminError("Statut invalide.", 400);
    }

    const ticket = await adminUpdateSupportTicket({
      ticketId: id,
      platformUserId: auth.session.id,
      platformUserName: `${auth.session.firstName} ${auth.session.lastName}`.trim(),
      status: status ?? undefined,
      assignedToPlatformUserId: body.assignedToPlatformUserId,
    });

    return adminJson({
      ticket: {
        ...ticket,
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt.toISOString(),
        resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return adminError("Ticket introuvable.", 404);
    }
    console.error("[PATCH /api/admin/support/tickets/:id]", error);
    return adminError("Impossible de mettre à jour le ticket.", 500);
  }
}
