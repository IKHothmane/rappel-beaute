import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureRead,
  requireFeatureWriteLimited,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import {
  createSupportTicket,
  listOrgSupportTickets,
  parseCategory,
} from "@/lib/db/support-tickets";

export async function GET(request: NextRequest) {
  const auth = await requireFeatureRead(request, "support");
  if (!auth.ok) return auth.response;

  try {
    const items = await listOrgSupportTickets(auth.session.organizationId);
    return NextResponse.json({
      items: items.map((t) => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        resolvedAt: t.resolvedAt?.toISOString() ?? null,
        lastMessageAt: t.lastMessageAt?.toISOString() ?? null,
      })),
    });
  } catch (error) {
    console.error("[GET /api/support/tickets]", error);
    return NextResponse.json({ error: "Impossible de charger les tickets." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireFeatureWriteLimited(request, "support");
  if (!auth.ok) return auth.response;

  try {
    const raw = stripOrganizationId(
      (await request.json()) as Record<string, unknown>,
    );
    const category = parseCategory(raw.category);
    const subject = String(raw.subject ?? "").trim();
    const message = String(raw.message ?? "").trim();

    if (!category || !subject || !message) {
      return NextResponse.json(
        { error: "Sujet, catégorie et message requis." },
        { status: 400 },
      );
    }

    const result = await createSupportTicket({
      organizationId: auth.session.organizationId,
      createdByUserId: auth.session.id,
      actorName: `${auth.session.firstName} ${auth.session.lastName}`.trim(),
      subject,
      category,
      message,
    });

    return NextResponse.json(
      {
        ticket: {
          ...result.ticket,
          createdAt: result.ticket.createdAt.toISOString(),
          updatedAt: result.ticket.updatedAt.toISOString(),
          resolvedAt: result.ticket.resolvedAt?.toISOString() ?? null,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_INPUT") {
      return NextResponse.json({ error: "Données invalides." }, { status: 400 });
    }
    console.error("[POST /api/support/tickets]", error);
    return NextResponse.json({ error: "Impossible de créer le ticket." }, { status: 500 });
  }
}
