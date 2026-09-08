import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { buildAIContext, requireAIRead } from "@/lib/ai/guard";
import { listAIConversations } from "@/lib/ai/service";

export async function GET(request: NextRequest) {
  const auth = await requireAIRead(request);
  if (!auth.ok) return auth.response;

  try {
    const ctx = await buildAIContext(auth);
    const data = await listAIConversations(ctx.organizationId, ctx.userId);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GET /api/ai/conversations]", error);
    return NextResponse.json({ error: "Erreur liste." }, { status: 500 });
  }
}
