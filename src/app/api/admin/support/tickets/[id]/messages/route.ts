import type { NextRequest } from "next/server";
import { adminError, adminJson, requireAdmin } from "@/lib/admin/api-helpers";
import { addPlatformSupportMessage } from "@/lib/db/support-tickets";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Ctx) {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  try {
    const body = (await request.json()) as { message?: string };
    const message = String(body.message ?? "").trim();
    if (!message) return adminError("Message requis.", 400);

    const row = await addPlatformSupportMessage({
      ticketId: id,
      platformUserId: auth.session.id,
      platformUserName: `${auth.session.firstName} ${auth.session.lastName}`.trim(),
      message,
    });

    return adminJson(
      { message: { ...row, createdAt: row.createdAt.toISOString() } },
      201,
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "NOT_FOUND") return adminError("Ticket introuvable.", 404);
      if (error.message === "TICKET_CLOSED") return adminError("Ticket clôturé.", 409);
      if (error.message === "INVALID_INPUT") return adminError("Message invalide.", 400);
    }
    console.error("[POST /api/admin/support/tickets/:id/messages]", error);
    return adminError("Impossible d'envoyer le message.", 500);
  }
}
