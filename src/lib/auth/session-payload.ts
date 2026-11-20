import type { AppRole } from "@/lib/rbac";
import type { PlatformRole } from "@/types/platform";
import {
  PLATFORM_SESSION_MAX_AGE_SEC,
  SESSION_MAX_AGE_SEC,
  type SessionPayload,
  type SessionUser,
} from "./types";

/** Métadonnées de session : `jti` (révocation) et `authAt` (durée absolue). Un ancien jeton n'a que `iat`. */
function sessionMeta(payload: SessionPayload): { jti?: string; authAt: number } {
  const authAt =
    typeof payload.authAt === "number" && Number.isFinite(payload.authAt) ? payload.authAt : payload.iat;
  return {
    ...(typeof payload.jti === "string" && payload.jti.length >= 8 && payload.jti.length <= 128
      ? { jti: payload.jti }
      : {}),
    authAt: typeof authAt === "number" ? authAt : 0,
  };
}

/** Durée ABSOLUE écoulée depuis l'authentification d'origine : le renouvellement n'y change rien. */
function withinAbsoluteLifetime(payload: SessionPayload, scope: "app" | "platform"): boolean {
  const { authAt } = sessionMeta(payload);
  if (!authAt) return true; // ni iat ni authAt : seule `exp` borne le jeton (déjà vérifiée)
  const ceiling = scope === "platform" ? PLATFORM_SESSION_MAX_AGE_SEC : SESSION_MAX_AGE_SEC;
  return Math.floor(Date.now() / 1000) < authAt + ceiling;
}

export function payloadToSession(payload: SessionPayload): SessionUser | null {
  const user = payloadToSessionUser(payload);
  if (!user) return null;
  if (!withinAbsoluteLifetime(payload, user.scope)) return null;
  return { ...user, ...sessionMeta(payload) };
}

function payloadToSessionUser(payload: SessionPayload): SessionUser | null {
  if (payload.scope === "platform" && payload.accountType === "PLATFORM") {
    return {
      id: payload.id,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      role: payload.role as PlatformRole,
      scope: "platform",
      accountType: "PLATFORM",
      // Ancien jeton sans version : accepté comme 0, puis ré-émis avec une version explicite.
      sessionVersion: typeof payload.sessionVersion === "number" ? payload.sessionVersion : 0,
    };
  }
  if (
    payload.scope === "app" &&
    payload.accountType === "ORGANIZATION" &&
    payload.organizationId &&
    payload.orgName &&
    payload.orgSlug
  ) {
    return {
      id: payload.id,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      role: payload.role as AppRole,
      organizationId: payload.organizationId,
      orgName: payload.orgName,
      orgSlug: payload.orgSlug,
      orgLogoUrl: null,
      loginPhone: payload.loginPhone,
      scope: "app",
      accountType: "ORGANIZATION",
      mustChangePassword: Boolean(payload.mustChangePassword),
      sessionVersion:
        typeof payload.sessionVersion === "number" ? payload.sessionVersion : 0,
    };
  }
  if (payload.organizationId && payload.orgName && payload.orgSlug) {
    return {
      id: payload.id,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      role: payload.role as AppRole,
      organizationId: payload.organizationId,
      orgName: payload.orgName,
      orgSlug: payload.orgSlug,
      orgLogoUrl: null,
      loginPhone: payload.loginPhone,
      scope: "app",
      accountType: "ORGANIZATION",
      mustChangePassword: Boolean(
        (payload as { mustChangePassword?: unknown }).mustChangePassword,
      ),
      sessionVersion:
        typeof (payload as { sessionVersion?: unknown }).sessionVersion === "number"
          ? ((payload as { sessionVersion: number }).sessionVersion)
          : 0,
    };
  }
  return null;
}
