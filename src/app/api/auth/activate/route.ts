import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { activateAccount } from "@/lib/db/activation";
import { clientIp } from "@/lib/http/client-ip";
import { consumeDimensions, identityHash, RATE_POLICIES } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { publicRoute } from "@/lib/http/route-scope";
import { checkAuthPostOrigin } from "@/lib/http/json-same-origin";

export const POST = publicRoute(async function POST(request: NextRequest) {
  const csrf = checkAuthPostOrigin(request);
  if (csrf) return csrf;

  const ip = clientIp(request);

  let tokenHint = "unknown";
  try {
    const peek = (await request.clone().json()) as { token?: unknown };
    if (typeof peek.token === "string" && peek.token.trim()) tokenHint = identityHash(peek.token.trim());
  } catch {
    /* corps relu plus bas */
  }
  const rl = await consumeDimensions([
    { key: `auth:activate:ip:${ip}`, ...RATE_POLICIES.activate.ip, sensitivity: "sensitive" },
    { key: `auth:activate:token:${tokenHint}`, ...RATE_POLICIES.activate.token, sensitivity: "sensitive" },
  ]);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez plus tard." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec ?? 900) } },
    );
  }

  try {
    const body = (await request.json()) as { token?: unknown; password?: unknown };
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!token || token.length > 256 || password.length < 8 || password.length > 200) {
      return NextResponse.json({ error: "Données invalides." }, { status: 400 });
    }

    const result = await activateAccount(token, password);
    return NextResponse.json({ ok: true, email: result.email });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "TOKEN_INVALID" || msg === "TOKEN_EXPIRED") {
      return NextResponse.json({ error: "Lien d'activation invalide ou expiré." }, { status: 400 });
    }
    logger.error("activate error", { error: String(e) });
    return NextResponse.json({ error: "Activation impossible." }, { status: 500 });
  }
});
