import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureRead,
  requireFeatureWriteLimited,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import {
  createCustomerNote,
  listCustomerNotes,
} from "@/lib/db/customer-360";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Ctx) {
  const auth = await requireFeatureRead(request, "customers");
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  try {
    const notes = await listCustomerNotes(id, auth.session.organizationId);
    if (!notes) {
      return NextResponse.json({ error: "Cliente introuvable." }, { status: 404 });
    }
    return NextResponse.json({ data: notes });
  } catch (error) {
    console.error("[GET /api/customers/[id]/notes]", error);
    return NextResponse.json({ error: "Erreur notes." }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: Ctx) {
  const auth = await requireFeatureWriteLimited(request, "customers");
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  try {
    const raw = stripOrganizationId((await request.json()) as Record<string, unknown>);
    const content = String(raw.content ?? "").trim();
    if (!content) {
      return NextResponse.json({ error: "Contenu requis." }, { status: 400 });
    }
    if (content.length > 5000) {
      return NextResponse.json({ error: "Note trop longue." }, { status: 400 });
    }

    const note = await createCustomerNote(
      id,
      auth.session.organizationId,
      { content },
      {
        id: auth.session.id,
        name: `${auth.session.firstName} ${auth.session.lastName}`.trim(),
      },
    );
    if (!note) {
      return NextResponse.json({ error: "Cliente introuvable." }, { status: 404 });
    }
    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "EMPTY_CONTENT") {
      return NextResponse.json({ error: "Contenu requis." }, { status: 400 });
    }
    console.error("[POST /api/customers/[id]/notes]", error);
    return NextResponse.json({ error: "Erreur création note." }, { status: 500 });
  }
}
