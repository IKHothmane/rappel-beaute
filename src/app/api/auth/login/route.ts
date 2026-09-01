import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateUser } from "@/lib/db/users";
import { writeAuditLog } from "@/lib/db/audit";
import { createSessionCookie } from "@/lib/auth/session";
import { isAppSession } from "@/lib/auth/types";
import { stripOrganizationId } from "@/lib/auth/api-guard";
import { clientIp } from "@/lib/http/client-ip";
import { logger } from "@/lib/logger";
import { AUTH_RATE_LIMITS, authRateLimitKey, checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = clientIp(request);

  try {
    const body = stripOrganizationId(
      (await request.json()) as { email?: string; password?: string; organizationId?: string },
    );
    const email = body.email?.trim();
    const password = body.password;

    if (!email || !password) {
      return NextResponse.json({ error: "Identifiants invalides." }, { status: 401 });
    }

    const rl = await checkRateLimit({
      key: authRateLimitKey("login", ip, email),
      ...AUTH_RATE_LIMITS.login,
    });
    if (!rl.allowed) {
      logger.warn("login rate limited", { route: "/api/auth/login", method: "POST" });
      return NextResponse.json(
        { error: "Trop de tentatives. Réessayez plus tard." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec ?? 900) } },
      );
    }

    const session = await authenticateUser(email, password);
    if (!session || !isAppSession(session)) {
      return NextResponse.json({ error: "Identifiants invalides." }, { status: 401 });
    }

    await writeAuditLog({
      organizationId: session.organizationId,
      actorId: session.id,
      actorName: `${session.firstName} ${session.lastName}`.trim(),
      entityType: "User",
      entityId: session.id,
      action: "LOGIN",
    }).catch((err) => {
      logger.warn("audit LOGIN failed", { userId: session.id, error: String(err) });
    });

    const res = NextResponse.json({
      user: {
        id: session.id,
        email: session.email,
        firstName: session.firstName,
        lastName: session.lastName,
        role: session.role,
        orgName: session.orgName,
        orgSlug: session.orgSlug,
        accountType: session.accountType,
        scope: session.scope,
      },
    });

    const cookie = createSessionCookie(session);
    res.cookies.set(cookie);
    return res;
  } catch (error) {
    logger.error("login error", { route: "/api/auth/login", error: String(error) });
    return NextResponse.json({ error: "Identifiants invalides." }, { status: 401 });
  }
}
