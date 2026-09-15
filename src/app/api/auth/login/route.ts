import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateUser } from "@/lib/db/users";
import { authenticatePlatformUser } from "@/lib/db/platform-users";
import { writeAuditLog } from "@/lib/db/audit";
import { writePlatformAuditLog } from "@/lib/db/platform-audit";
import { createSessionCookie } from "@/lib/auth/session";
import { isAppSession, isPlatformSession } from "@/lib/auth/types";
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

    const session =
      (await authenticateUser(email, password)) ?? (await authenticatePlatformUser(email, password));
    if (!session) {
      return NextResponse.json({ error: "Identifiants invalides." }, { status: 401 });
    }

    if (isPlatformSession(session)) {
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
          scope: session.scope,
        },
      });
      res.cookies.set(createSessionCookie(session));
      return res;
    }

    if (!isAppSession(session)) {
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
        mustChangePassword: session.mustChangePassword,
      },
      mustChangePassword: session.mustChangePassword,
    });

    res.cookies.set(createSessionCookie(session));
    return res;
  } catch (error) {
    logger.error("login error", { route: "/api/auth/login", error: String(error) });
    const msg = error instanceof Error ? error.message : String(error);
    if (
      msg.includes("ECONNREFUSED") ||
      msg.includes("AggregateError") ||
      msg.includes("P1001") ||
      msg.includes("connect")
    ) {
      return NextResponse.json(
        { error: "Base de données indisponible. Démarrez PostgreSQL puis réessayez." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Identifiants invalides." }, { status: 401 });
  }
}
