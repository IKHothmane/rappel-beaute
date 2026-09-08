import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { buildAIContext, requireAIRead, requireAIWrite } from "@/lib/ai/guard";
import { deleteAIConversation, getAIConversation } from "@/lib/ai/service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Ctx) {
  const auth = await requireAIRead(request);
  if (!auth.ok) return auth.response;
  const { id } = await context.params;

  try {
    const ctx = await buildAIContext(auth);
    const data = await getAIConversation(ctx.organizationId, ctx.userId, id);
    if (!data) {
      return NextResponse.json({ error: "Introuvable." }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("[GET /api/ai/conversations/[id]]", error);
    return NextResponse.json({ error: "Erreur." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: Ctx) {
  const auth = await requireAIWrite(request);
  if (!auth.ok) return auth.response;
  const { id } = await context.params;

  try {
    const ctx = await buildAIContext(auth);
    await deleteAIConversation(ctx.organizationId, ctx.userId, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "NOT_FOUND") {
      return NextResponse.json({ error: "Introuvable." }, { status: 404 });
    }
    console.error("[DELETE /api/ai/conversations/[id]]", error);
    return NextResponse.json({ error: "Erreur." }, { status: 500 });
  }
}
