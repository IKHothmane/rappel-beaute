import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { buildAIContext, requireAIRead } from "@/lib/ai/guard";
import { getAIUsage } from "@/lib/ai/service";
import { tenantRoute } from "@/lib/http/route-scope";

export const GET = tenantRoute(async function GET(request: NextRequest) {
  const auth = await requireAIRead(request);
  if (!auth.ok) return auth.response;

  try {
    const ctx = await buildAIContext(auth);
    const data = await getAIUsage(ctx.organizationId, ctx.planCode);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[GET /api/ai/usage]", error);
    return NextResponse.json({ error: "Erreur usage." }, { status: 500 });
  }
});
