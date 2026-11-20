import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isSessionTokenRevoked, requireSession } from "@/lib/auth/api-guard";
import { isAppSession } from "@/lib/auth/types";
import { createSessionCookie } from "@/lib/auth/session";
import { checkAuthPostOrigin } from "@/lib/http/json-same-origin";
import { changeOwnPassword, getUserSessionState, MAX_PASSWORD_LENGTH } from "@/lib/db/users";
import { clientIp } from "@/lib/http/client-ip";
import { consumeDimensions, identityHash, RATE_POLICIES } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { publicRoute } from "@/lib/http/route-scope";

/**
 * POST /api/auth/change-password
 * Accessible même si mustChangePassword = true.
 */
export const POST = publicRoute(async function POST(request: NextRequest) {
  const csrf = checkAuthPostOrigin(request);
  if (csrf) return csrf;

  const auth = requireSession(request);
  if (!auth.ok) return auth.response;
  if (!isAppSession(auth.session)) {
    return NextResponse.json({ error: "Accès réservé aux instituts." }, { status: 403 });
  }

  const ip = clientIp(request);
  const userKey = identityHash(auth.session.id);
  const rl = await consumeDimensions([
    { key: `auth:change-password:user:${userKey}`, ...RATE_POLICIES.changePassword.user, sensitivity: "sensitive" },
    { key: `auth:change-password:ip:${ip}`, ...RATE_POLICIES.changePassword.ip, sensitivity: "sensitive" },
  ]);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez plus tard." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec ?? 900) } },
    );
  }

  // Vérifie que la session n'a pas été révoquée (déconnexion, puis changement de version)
  if (await isSessionTokenRevoked(auth.session)) {
    return NextResponse.json(
      { error: "Session invalidée. Reconnectez-vous.", code: "SESSION_REVOKED" },
      { status: 401 },
    );
  }
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
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
    }
    const asString = (v: unknown) => (typeof v === "string" ? v : "");
    const newPassword = asString(body.newPassword);
    const confirmPassword = asString(body.confirmPassword);
    const currentPassword = asString(body.currentPassword);

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 8 caractères." },
        { status: 400 },
      );
    }
    if (newPassword.length > MAX_PASSWORD_LENGTH || currentPassword.length > MAX_PASSWORD_LENGTH) {
      return NextResponse.json({ error: "Mot de passe trop long." }, { status: 400 });
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "Les mots de passe ne correspondent pas." },
        { status: 400 },
      );
    }

    // Le mot de passe actuel est exigé hors flux « mot de passe temporaire » ; la décision est prise
    // en base (verrou de ligne) dans changeOwnPassword, pas d'après le jeton ni le corps de la requête.
    const session = await changeOwnPassword({
      userId: auth.session.id,
      organizationId: auth.session.organizationId,
      newPassword,
      currentPassword,
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
    // La session garde son identifiant et son échéance absolue ; seule sessionVersion change.
    res.cookies.set(
      createSessionCookie({
        ...session,
        ...(auth.session.jti ? { jti: auth.session.jti } : {}),
        ...(auth.session.authAt ? { authAt: auth.session.authAt } : {}),
      }),
    );
    return res;
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "CURRENT_PASSWORD_REQUIRED") {
      return NextResponse.json(
        { error: "Saisissez votre mot de passe actuel.", code },
        { status: 400 },
      );
    }
    if (code === "CURRENT_PASSWORD_INVALID") {
      return NextResponse.json(
        { error: "Le mot de passe actuel est incorrect.", code },
        { status: 400 },
      );
    }
    if (code === "PASSWORD_TOO_LONG") {
      return NextResponse.json({ error: "Mot de passe trop long." }, { status: 400 });
    }
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
});
