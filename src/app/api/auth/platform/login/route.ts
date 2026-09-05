import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticatePlatformUser } from "@/lib/db/platform-users";
import { createSessionCookie, clearSessionCookie, getSessionFromRequest } from "@/lib/auth/session";
import { writePlatformAuditLog } from "@/lib/db/platform-audit";
import { clientIp } from "@/lib/http/client-ip";
import { logger } from "@/lib/logger";
import { AUTH_RATE_LIMITS, authRateLimitKey, checkRateLimit } from "@/lib/rate-limit";

function errorDetails(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      cause: error.cause ? String(error.cause) : undefined,
    };
  }
  return { message: String(error) };
}

export async function POST(request: NextRequest) {
  const ip = clientIp(request);

  try {
    let body: { email?: string; password?: string };
    try {
      body = (await request.json()) as { email?: string; password?: string };
    } catch {
      logger.warn("platform login invalid json", { route: "/api/auth/platform/login", ip });
      return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
    }

    const email = body.email?.trim();
    const password = body.password;

    if (!email || !password) {
      return NextResponse.json({ error: "Identifiants invalides." }, { status: 401 });
    }

    const rl = await checkRateLimit({
      key: authRateLimitKey("platform-login", ip, email),
      ...AUTH_RATE_LIMITS.platformLogin,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Trop de tentatives. Réessayez plus tard." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec ?? 900) } },
      );
    }

    const session = await authenticatePlatformUser(email, password);
    if (!session) {
      return NextResponse.json({ error: "Identifiants invalides." }, { status: 401 });
    }

    await writePlatformAuditLog({
      platformUserId: session.id,
      platformUserName: `${session.firstName} ${session.lastName}`.trim(),
      entityType: "PlatformUser",
      entityId: session.id,
      action: "LOGIN",
    }).catch((err) => logger.warn("platform LOGIN audit failed", { error: String(err) }));

    const res = NextResponse.json({
      user: {
        id: session.id,
        email: session.email,
        firstName: session.firstName,
        lastName: session.lastName,
        role: session.role,
        accountType: session.accountType,
      },
    });
    res.cookies.set(createSessionCookie(session));
    return res;
  } catch (error) {
    logger.error("platform login error", {
      route: "/api/auth/platform/login",
      ...errorDetails(error),
    });
    const msg = error instanceof Error ? error.message : String(error);
    if (
      msg.includes("AggregateError") ||
      msg.includes("ECONNREFUSED") ||
      msg.includes("P1001") ||
      msg.includes("connect") ||
      msg.includes("SESSION_SECRET")
    ) {
      return NextResponse.json(
        { error: "Service indisponible. Réessayez plus tard." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Identifiants invalides." }, { status: 401 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = getSessionFromRequest(request);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(clearSessionCookie());

  if (session?.scope === "platform") {
    await writePlatformAuditLog({
      platformUserId: session.id,
      platformUserName: `${session.firstName} ${session.lastName}`.trim(),
      entityType: "PlatformUser",
      entityId: session.id,
      action: "LOGOUT",
    }).catch(() => undefined);
  }

  return res;
}
