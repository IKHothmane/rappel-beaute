import type { AppRole } from "@/lib/rbac";
import type { PlatformRole } from "@/types/platform";

export type AppSessionUser = {
  id: string;
  email: string;
  loginPhone?: string;
  firstName: string;
  lastName: string;
  role: AppRole;
  organizationId: string;
  orgName: string;
  orgSlug: string;
  orgLogoUrl: string | null;
  scope: "app";
  accountType: "ORGANIZATION";
  /** true après un reset admin — accès limité à /changer-mot-de-passe */
  mustChangePassword: boolean;
  /** Doit correspondre à User.sessionVersion sinon session invalidée */
  sessionVersion: number;
  /** Identifiant de session (révocation à la déconnexion). Absent d'un ancien jeton. */
  jti?: string;
  /** Instant (s) de l'authentification d'origine : borne la durée ABSOLUE de la session, renouvellements compris. */
  authAt?: number;
};

export type PlatformSessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: PlatformRole;
  scope: "platform";
  accountType: "PLATFORM";
  /**
   * Doit correspondre à PlatformUser.sessionVersion sinon session révoquée.
   * Absent d'un ancien jeton : traité comme 0 (voir session-payload).
   */
  sessionVersion?: number;
  /** Identifiant de session (révocation à la déconnexion). Absent d'un ancien jeton. */
  jti?: string;
  /** Instant (s) de l'authentification d'origine : borne la durée ABSOLUE de la session. */
  authAt?: number;
};

export type SessionUser = AppSessionUser | PlatformSessionUser;

export type SessionPayload = SessionUser & {
  iat: number;
  exp: number;
};

export const SESSION_COOKIE = "rappel_session";
/** Durée de session d'un institut. */
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30;
/** Durée de session du back-office plateforme (plus courte : comptes à privilèges élevés). */
export const PLATFORM_SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7;

export type PublicSession = SessionUser;

/** Le profil renvoyé au navigateur ne porte ni l'identifiant de session ni la date d'authentification. */
export function toPublicSession(user: SessionUser): PublicSession {
  const { jti: _jti, authAt: _authAt, ...rest } = user;
  return rest as PublicSession;
}

export function isPlatformSession(session: SessionUser): session is PlatformSessionUser {
  return session.scope === "platform";
}

export function isAppSession(session: SessionUser): session is AppSessionUser {
  return session.scope === "app";
}
