import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  requireFeatureWriteLimited,
  stripOrganizationId,
} from "@/lib/auth/api-guard";
import { deleteCustomerNote, updateCustomerNote } from "@/lib/db/customer-360";

type Ctx = { params: Promise<{ id: string; noteId: string }> };

export async function PATCH(request: NextRequest, context: Ctx) {
  const auth = await requireFeatureWriteLimited(request, "customers");
  if (!auth.ok) return auth.response;

  const { id, noteId } = await context.params;
  try {
    const raw = stripOrganizationId((await request.json()) as Record<string, unknown>);
    const content = String(raw.content ?? "").trim();
    if (!content) {
      return NextResponse.json({ error: "Contenu requis." }, { status: 400 });
    }

    const note = await updateCustomerNote(
      noteId,
      id,
      auth.session.organizationId,
      { content },
      {
        id: auth.session.id,
        name: `${auth.session.firstName} ${auth.session.lastName}`.trim(),
      },
    );
    if (!note) {
      return NextResponse.json({ error: "Note introuvable." }, { status: 404 });
    }
    return NextResponse.json(note);
  } catch (error) {
    console.error("[PATCH /api/customers/[id]/notes/[noteId]]", error);
    return NextResponse.json({ error: "Erreur mise à jour." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: Ctx) {
  const auth = await requireFeatureWriteLimited(request, "customers");
  if (!auth.ok) return auth.response;

  const { id, noteId } = await context.params;
  try {
    const ok = await deleteCustomerNote(noteId, id, auth.session.organizationId, {
      id: auth.session.id,
      name: `${auth.session.firstName} ${auth.session.lastName}`.trim(),
    });
    if (!ok) {
      return NextResponse.json({ error: "Note introuvable." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/customers/[id]/notes/[noteId]]", error);
    return NextResponse.json({ error: "Erreur suppression." }, { status: 500 });
  }
}
