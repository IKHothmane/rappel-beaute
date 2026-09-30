import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { buildAIContext, requireAIRead } from "@/lib/ai/guard";
import { analyzeDashboard } from "@/lib/ai/service";
import { getClientIp } from "@/lib/http/client-ip";
import { consumeDimensions, identityHash, RATE_POLICIES } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const auth = await requireAIRead(request);
  if (!auth.ok) return auth.response;

  const rl = await consumeDimensions([
    { key: `ai:analyze:user:${identityHash(auth.session.id)}`, ...RATE_POLICIES.ai.user },
    { key: `ai:analyze:ip:${getClientIp(request)}`, ...RATE_POLICIES.ai.ip },
  ]);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Trop de requêtes IA. Réessayez dans un instant." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec ?? 60) } },
    );
  }

  try {
    const ctx = await buildAIContext(auth);
    const data = await analyzeDashboard(ctx);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[POST /api/ai/analyze-dashboard]", error);
    return NextResponse.json({ error: "Erreur analyse." }, { status: 500 });
  }
}
