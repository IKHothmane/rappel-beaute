import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateUser } from "@/lib/db/users";
import { authenticatePlatformUser } from "@/lib/db/platform-users";
import { writeAuditLog } from "@/lib/db/audit";
import { writePlatformAuditLog } from "@/lib/db/platform-audit";
import { createSessionCookie } from "@/lib/auth/session";
import { isAppSession, isPlatformSession, SESSION_MAX_AGE_SEC } from "@/lib/auth/types";
import { stripOrganizationId } from "@/lib/auth/api-guard";
import { clientIp } from "@/lib/http/client-ip";
import { logger } from "@/lib/logger";
import { consumeDimensions, emailKey, RATE_POLICIES } from "@/lib/rate-limit";
import { COOKIE_HOST } from "@/lib/domain";
import { normalizeLoginIdentifier } from "@/lib/auth/login-identifier";

async function readLoginBody(request: NextRequest): Promise<{
  identifier?: string;
  email?: string;
  password?: string;
  organizationId?: string;
  remember?: boolean;
} | null> {
  const raw = await request.text();
  if (!raw.trim()) return null;
  try {
    return stripOrganizationId(JSON.parse(raw) as Record<string, unknown>) as {
      identifier?: string;
      email?: string;
      password?: string;
      organizationId?: string;
      remember?: boolean;
    };
  } catch {
    // Fallback si le corps arrive en form-urlencoded (certains clients / proxies).
    try {
      const params = new URLSearchParams(raw);
      if (!params.has("email") && !params.has("identifier") && !params.has("password")) return null;
      return {
        identifier: params.get("identifier") ?? undefined,
        email: params.get("email") ?? undefined,
        password: params.get("password") ?? undefined,
        remember: params.get("remember") !== "false",
      };
    } catch {
      return null;
    }
  }
}

export async function POST(request: NextRequest) {
  const ip = clientIp(request);

  try {
    const body = await readLoginBody(request);
    if (!body) {
      return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
    }
    const rawIdentifier = body.identifier ?? body.email;
    const email = typeof rawIdentifier === "string" ? normalizeLoginIdentifier(rawIdentifier) : "";
    const password = body.password;
    const remember = body.remember !== false;
    const sessionMaxAge = remember ? SESSION_MAX_AGE_SEC : null;

    if (!email || !password) {
      return NextResponse.json({ error: "Identifiants invalides." }, { status: 401 });
    }

    const account = emailKey(email);
    const rl = await consumeDimensions([
      { key: `auth:login:ip:${ip}`, ...RATE_POLICIES.login.ip, sensitivity: "sensitive" },
      { key: `auth:login:account:${account}`, ...RATE_POLICIES.login.account, sensitivity: "sensitive" },
      { key: `auth:login:ip-account:${ip}:${account}`, ...RATE_POLICIES.login.pair, sensitivity: "sensitive" },
    ]);
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
      res.headers.set("Clear-Site-Data", '"cache"');
      res.cookies.set(createSessionCookie(session, sessionMaxAge));
      res.cookies.set(COOKIE_HOST, "admin", {
        path: "/",
        sameSite: "lax",
        ...(sessionMaxAge == null ? {} : { maxAge: sessionMaxAge }),
      });
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

    res.headers.set("Clear-Site-Data", '"cache"');
    res.cookies.set(createSessionCookie(session, sessionMaxAge));
    res.cookies.set(COOKIE_HOST, "app", {
      path: "/",
      sameSite: "lax",
      ...(sessionMaxAge == null ? {} : { maxAge: sessionMaxAge }),
    });
    return res;
  } catch (error) {
    logger.error("login error", { route: "/api/auth/login", error: String(error) });
    const msg = error instanceof Error ? `${error.name} ${error.message}` : String(error);
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
