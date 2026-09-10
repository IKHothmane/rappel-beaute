import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/api-guard";
import { isAppSession } from "@/lib/auth/types";
import { createSessionCookie } from "@/lib/auth/session";
import { changeOwnPassword, getUserSessionState } from "@/lib/db/users";
import { clientIp } from "@/lib/http/client-ip";
import { AUTH_RATE_LIMITS, authRateLimitKey, checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

/**
 * POST /api/auth/change-password
 * Accessible même si mustChangePassword = true.
 */
export async function POST(request: NextRequest) {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;
  if (!isAppSession(auth.session)) {
    return NextResponse.json({ error: "Accès réservé aux instituts." }, { status: 403 });
  }

  const ip = clientIp(request);
  const rl = await checkRateLimit({
    key: authRateLimitKey("change-password", ip, auth.session.id),
    ...AUTH_RATE_LIMITS.login,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez plus tard." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec ?? 900) } },
    );
  }

  // Vérifie que la session n'a pas été révoquée
  const state = await getUserSessionState(auth.session.id);
  if (!state || state.status !== "ACTIVE") {
    return NextResponse.json({ error: "Session expirée." }, { status: 401 });
  }
  if ((auth.session.sessionVersion ?? 0) !== state.sessionVersion) {
    return NextResponse.json(
      { error: "Session invalidée. Reconnectez-vous.", code: "SESSION_REVOKED" },
      { status: 401 },
    );
  }

  try {
    const body = (await request.json()) as {
      newPassword?: string;
      confirmPassword?: string;
    };
    const newPassword = body.newPassword ?? "";
    const confirmPassword = body.confirmPassword ?? "";

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 8 caractères." },
        { status: 400 },
      );
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "Les mots de passe ne correspondent pas." },
        { status: 400 },
      );
    }

    const session = await changeOwnPassword({
      userId: auth.session.id,
      organizationId: auth.session.organizationId,
      newPassword,
    });

    const res = NextResponse.json({
      ok: true,
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
        mustChangePassword: false,
      },
    });
    res.cookies.set(createSessionCookie(session));
    return res;
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "PASSWORD_REUSE") {
      return NextResponse.json(
        { error: "Choisissez un mot de passe différent du mot de passe temporaire." },
        { status: 400 },
      );
    }
    if (code === "PASSWORD_TOO_SHORT") {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 8 caractères." },
        { status: 400 },
      );
    }
    logger.error("change-password error", { error: String(error) });
    return NextResponse.json({ error: "Impossible de changer le mot de passe." }, { status: 500 });
  }
}
