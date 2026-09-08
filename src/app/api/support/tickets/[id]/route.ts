import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireFeatureRead } from "@/lib/auth/api-guard";
import {
  getOrgSupportTicket,
  listTicketMessages,
} from "@/lib/db/support-tickets";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Ctx) {
  const auth = await requireFeatureRead(request, "support");
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  try {
    const ticket = await getOrgSupportTicket(auth.session.organizationId, id);
    if (!ticket) {
      return NextResponse.json({ error: "Ticket introuvable." }, { status: 404 });
    }
    const messages = await listTicketMessages(id);
    return NextResponse.json({
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
    console.error("[GET /api/support/tickets/:id]", error);
    return NextResponse.json({ error: "Impossible de charger le ticket." }, { status: 500 });
  }
}
