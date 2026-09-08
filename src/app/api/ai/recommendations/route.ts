import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { buildAIContext, requireAIRead } from "@/lib/ai/guard";
import { getAIRecommendations } from "@/lib/ai/service";

export async function POST(request: NextRequest) {
  const auth = await requireAIRead(request);
  if (!auth.ok) return auth.response;

  try {
    const ctx = await buildAIContext(auth);
    const data = await getAIRecommendations(ctx);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[POST /api/ai/recommendations]", error);
    return NextResponse.json({ error: "Erreur recommandations." }, { status: 500 });
  }
}
