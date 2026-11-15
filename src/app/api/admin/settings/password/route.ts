import type { NextRequest } from "next/server";
import { adminError, adminJson, requireAdmin } from "@/lib/admin/api-helpers";
import { readJsonObject } from "@/lib/admin/read-json-object";
import { createSessionCookie } from "@/lib/auth/session";
import {
  changePlatformUserPassword,
  PLATFORM_MAX_PASSWORD_LENGTH,
  PLATFORM_MIN_PASSWORD_LENGTH,
} from "@/lib/db/platform-users";
import { clientIp } from "@/lib/http/client-ip";
import { platformRoute } from "@/lib/http/route-scope";
import { consumeDimensions, identityHash, RATE_POLICIES } from "@/lib/rate-limit";

export const POST = platformRoute(async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok || !auth.session) return auth.ok ? adminError("Session invalide.", 401) : auth.response;

  // Un mot de passe actuel se devine par essais : limite par administrateur et par IP.
  const rl = await consumeDimensions([
    {
      key: `auth:platform-change-password:user:${identityHash(auth.session.id)}`,
      ...RATE_POLICIES.changePassword.user,
      sensitivity: "sensitive",
    },
    {
      key: `auth:platform-change-password:ip:${clientIp(request)}`,
      ...RATE_POLICIES.changePassword.ip,
      sensitivity: "sensitive",
    },
  ]);
  if (!rl.allowed) {
    const res = adminError("Trop de tentatives. Réessayez plus tard.", 429);
    res.headers.set("Retry-After", String(rl.retryAfterSec ?? 900));
    return res;
  }

  const body = await readJsonObject(request);
  if (!body) return adminError("Requête invalide.", 400);
  const { currentPassword, newPassword } = body;
  if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
    return adminError("Requête invalide.", 400);
  }
  if (newPassword.length < PLATFORM_MIN_PASSWORD_LENGTH) {
    return adminError("Nouveau mot de passe trop court (8 min).", 400);
  }
  if (
    newPassword.length > PLATFORM_MAX_PASSWORD_LENGTH ||
    currentPassword.length > PLATFORM_MAX_PASSWORD_LENGTH
  ) {
    return adminError("Mot de passe trop long.", 400);
  }

  try {
    const { sessionVersion } = await changePlatformUserPassword({
      id: auth.session.id,
      currentPassword,
      newPassword,
      platformUserName: `${auth.session.firstName} ${auth.session.lastName}`.trim(),
    });
    const res = adminJson({ ok: true });
    // Les autres sessions de ce compte sont révoquées ; celle de l'auteur reçoit un jeton à jour.
    res.cookies.set(createSessionCookie({ ...auth.session, sessionVersion }));
    return res;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "BAD_PASSWORD") {
        return adminError("Mot de passe actuel incorrect.", 400);
      }
      if (error.message === "WEAK_PASSWORD") {
        return adminError("Nouveau mot de passe trop court (8 min).", 400);
      }
      if (error.message === "PASSWORD_TOO_LONG") {
        return adminError("Mot de passe trop long.", 400);
      }
      if (error.message === "NOT_FOUND") {
        return adminError("Session expirée.", 401);
      }
    }
    console.error("[POST /api/admin/settings/password]", error);
    return adminError("Impossible de changer le mot de passe.", 500);
  }
});
