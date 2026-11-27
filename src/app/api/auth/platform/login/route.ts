import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticatePlatformUser } from "@/lib/db/platform-users";
import {
  cookieSecure,
  createSessionCookie,
  clearSessionCookie,
  getSessionFromRequest,
  sessionAbsoluteExpiry,
} from "@/lib/auth/session";
import { SESSION_MAX_AGE_SEC } from "@/lib/auth/types";
import { COOKIE_HOST } from "@/lib/domain";
import { writePlatformAuditLog } from "@/lib/db/platform-audit";
import { clientIp } from "@/lib/http/client-ip";
import { logger } from "@/lib/logger";
import { consumeDimensions, emailKey, RATE_POLICIES } from "@/lib/rate-limit";
import { publicRoute } from "@/lib/http/route-scope";
import { checkAuthPostOrigin } from "@/lib/http/json-same-origin";

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

export const POST = publicRoute(async function POST(request: NextRequest) {
  const ip = clientIp(request);

  const csrf = checkAuthPostOrigin(request);
  if (csrf) return csrf;

  try {
    let body: { email?: string; password?: string; remember?: boolean };
    try {
      body = (await request.json()) as { email?: string; password?: string };
    } catch {
      logger.warn("platform login invalid json", { route: "/api/auth/platform/login", ip });
      return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
    }

    const email = body.email?.trim();
    const password = body.password;
    const remember = body.remember !== false;
    const sessionMaxAge = remember ? SESSION_MAX_AGE_SEC : null;

    if (!email || !password) {
      return NextResponse.json({ error: "Identifiants invalides." }, { status: 401 });
    }

    const account = emailKey(email);
    // IP puis couple IP+compte d'abord ; le compteur du compte n'est alimenté que si ceux-ci laissent passer
    // (une seule IP ne peut pas épuiser le plafond du compte).
    let rl = await consumeDimensions([
      { key: `auth:platform-login:ip:${ip}`, ...RATE_POLICIES.login.ip, sensitivity: "sensitive" },
      { key: `auth:platform-login:ip-account:${ip}:${account}`, ...RATE_POLICIES.login.pair, sensitivity: "sensitive" },
    ]);
    if (rl.allowed) {
      rl = await consumeDimensions([
        { key: `auth:platform-login:account:${account}`, ...RATE_POLICIES.login.account, sensitivity: "sensitive" },
      ]);
    }
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
    res.cookies.set(createSessionCookie(session, sessionMaxAge));
    res.cookies.set(COOKIE_HOST, "admin", {
      path: "/",
      secure: cookieSecure(),
      sameSite: "lax",
      ...(sessionMaxAge == null ? {} : { maxAge: sessionMaxAge }),
    });
    return res;
  } catch (error) {
    logger.error("platform login error", {
      route: "/api/auth/platform/login",
      ...errorDetails(error),
    });
    if ((error as { code?: unknown } | null)?.code === "AUTH_BUSY") {
      return NextResponse.json(
        { error: "Service momentanément indisponible. Réessayez." },
        { status: 503, headers: { "Retry-After": "5" } },
      );
    }
    const msg = error instanceof Error ? `${error.name} ${error.message}` : String(error);
    if (/(AggregateError|ECONNREFUSED|ETIMEDOUT|P1001|SESSION_SECRET)/.test(msg)) {
      return NextResponse.json(
        { error: "Service indisponible. Réessayez plus tard." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Identifiants invalides." }, { status: 401 });
  }
});

export const DELETE = publicRoute(async function DELETE(request: NextRequest) {
  const csrf = checkAuthPostOrigin(request, { requireJson: false });
  if (csrf) return csrf;

  const session = getSessionFromRequest(request);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(clearSessionCookie());
  res.headers.set("Clear-Site-Data", '"cache"');
  res.cookies.set({ name: COOKIE_HOST, value: "", path: "/", sameSite: "lax", maxAge: 0 });

  if (session?.scope === "platform") {
    // La déconnexion révoque réellement la session courante ; le cookie est effacé même si l'écriture échoue.
    if (session.jti) {
      try {
        const { revokeSession } = await import("@/lib/db/session-revocation");
        await revokeSession({
          jti: session.jti,
          userId: session.id,
          organizationId: null,
          scope: "platform",
          expiresAt: sessionAbsoluteExpiry(session),
        });
      } catch (error) {
        logger.warn("platform session revocation failed", { error: error instanceof Error ? error.name : "unknown" });
      }
    }
    await writePlatformAuditLog({
      platformUserId: session.id,
      platformUserName: `${session.firstName} ${session.lastName}`.trim(),
      entityType: "PlatformUser",
      entityId: session.id,
      action: "LOGOUT",
    }).catch(() => undefined);
  }

  return res;
});
