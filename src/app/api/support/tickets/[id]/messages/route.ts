import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureWriteLimited,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import { addOrgSupportMessage } from "@/lib/db/support-tickets";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Ctx) {
  const auth = await requireFeatureWriteLimited(request, "support");
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  try {
    const raw = stripOrganizationId(
      (await request.json()) as Record<string, unknown>,
    );
    const message = String(raw.message ?? "").trim();
    if (!message) {
      return NextResponse.json({ error: "Message requis." }, { status: 400 });
    }

    const row = await addOrgSupportMessage({
      organizationId: auth.session.organizationId,
      ticketId: id,
      userId: auth.session.id,
      actorName: `${auth.session.firstName} ${auth.session.lastName}`.trim(),
      message,
    });

    return NextResponse.json(
      { message: { ...row, createdAt: row.createdAt.toISOString() } },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "NOT_FOUND") {
        return NextResponse.json({ error: "Ticket introuvable." }, { status: 404 });
      }
      if (error.message === "TICKET_CLOSED") {
        return NextResponse.json({ error: "Ticket clôturé." }, { status: 409 });
      }
      if (error.message === "INVALID_INPUT") {
        return NextResponse.json({ error: "Message invalide." }, { status: 400 });
      }
    }
    console.error("[POST /api/support/tickets/:id/messages]", error);
    return NextResponse.json({ error: "Impossible d'envoyer le message." }, { status: 500 });
  }
}
