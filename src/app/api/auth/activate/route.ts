import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { activateAccount } from "@/lib/db/activation";
import { clientIp } from "@/lib/http/client-ip";
import { AUTH_RATE_LIMITS, authRateLimitKey, checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const ip = clientIp(request);

  const rl = await checkRateLimit({
    key: authRateLimitKey("activate", ip),
    ...AUTH_RATE_LIMITS.activate,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez plus tard." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec ?? 900) } },
    );
  }

  try {
    const body = (await request.json()) as { token?: string; password?: string };
    const token = body.token?.trim();
    const password = body.password;

    if (!token || !password || password.length < 8) {
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
}
