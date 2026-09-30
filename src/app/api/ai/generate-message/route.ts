import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { buildAIContext, requireAIWrite, sanitizeAIBody } from "@/lib/ai/guard";
import { generateMessageDraft } from "@/lib/ai/service";
import { parseGenerateMessageBody } from "@/lib/validation/ai-message";
import { getClientIp } from "@/lib/http/client-ip";
import { consumeDimensions, identityHash, RATE_POLICIES } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const auth = await requireAIWrite(request);
  if (!auth.ok) return auth.response;

  const user = identityHash(auth.session.id);
  const ip = getClientIp(request);
  const rl = await consumeDimensions([
    { key: `ai:generate:user:${user}`, ...RATE_POLICIES.ai.user },
    { key: `ai:generate:ip:${ip}`, ...RATE_POLICIES.ai.ip },
  ]);
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: "Trop de requêtes IA. Réessayez dans un instant.",
        retryAfterSec: rl.retryAfterSec,
      },
      { status: 429 },
    );
  }

  try {
    const raw = sanitizeAIBody((await request.json()) as Record<string, unknown>);
    const parsed = parseGenerateMessageBody(raw);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const ctx = await buildAIContext(auth);
    const data = await generateMessageDraft(ctx, parsed.data);
    return NextResponse.json(data);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "AI_QUOTA_EXCEEDED") {
      return NextResponse.json({ error: "Quota IA mensuel atteint." }, { status: 429 });
    }
    if (code === "AI_NOT_IN_PLAN") {
      return NextResponse.json(
        { error: "IA non incluse dans votre forfait." },
        { status: 403 },
      );
    }
    if (code === "CUSTOMER_NOT_FOUND") {
      return NextResponse.json({ error: "Cliente introuvable." }, { status: 404 });
    }
    if (code === "APPOINTMENT_NOT_FOUND" || code === "APPOINTMENT_MISMATCH") {
      return NextResponse.json({ error: "Rendez-vous introuvable." }, { status: 404 });
    }
    console.error("[POST /api/ai/generate-message]", error);
    return NextResponse.json({ error: "Erreur génération." }, { status: 500 });
  }
}
