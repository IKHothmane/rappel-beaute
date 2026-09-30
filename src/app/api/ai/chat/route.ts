import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { buildAIContext, requireAIWrite, sanitizeAIBody } from "@/lib/ai/guard";
import { runAIChat } from "@/lib/ai/service";
import { getClientIp } from "@/lib/http/client-ip";
import { consumeDimensions, identityHash, RATE_POLICIES } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const auth = await requireAIWrite(request);
  if (!auth.ok) return auth.response;

  const user = identityHash(auth.session.id);
  const ip = getClientIp(request);
  const rl = await consumeDimensions([
    { key: `ai:chat:user:${user}`, ...RATE_POLICIES.ai.user },
    { key: `ai:chat:ip:${ip}`, ...RATE_POLICIES.ai.ip },
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
    const ctx = await buildAIContext(auth);
    const result = await runAIChat(ctx, {
      message: String(raw.message ?? ""),
      conversationId: raw.conversationId ? String(raw.conversationId) : null,
    });
    return NextResponse.json(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "AI_NOT_IN_PLAN" || code === "FEATURE_NOT_INCLUDED") {
      return NextResponse.json(
        { error: "L'assistant IA n'est pas inclus dans votre forfait." },
        { status: 403 },
      );
    }
    if (code === "AI_QUOTA_EXCEEDED") {
      return NextResponse.json(
        { error: "Quota IA mensuel atteint." },
        { status: 429 },
      );
    }
    if (code === "EMPTY_MESSAGE") {
      return NextResponse.json({ error: "Message vide." }, { status: 400 });
    }
    if (code === "NOT_FOUND") {
      return NextResponse.json({ error: "Conversation introuvable." }, { status: 404 });
    }
    console.error("[POST /api/ai/chat]", error);
    return NextResponse.json({ error: "Erreur assistant IA." }, { status: 500 });
  }
}
