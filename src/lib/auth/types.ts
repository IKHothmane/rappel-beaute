import type { AppRole } from "@/lib/rbac";
import type { PlatformRole } from "@/types/platform";

export type SessionScope = "app" | "platform";
export type AccountType = "ORGANIZATION" | "PLATFORM";

export type AppSessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AppRole;
  organizationId: string;
  orgName: string;
  orgSlug: string;
  scope: "app";
  accountType: "ORGANIZATION";
};

export type PlatformSessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: PlatformRole;
  scope: "platform";
  accountType: "PLATFORM";
};

export type SessionUser = AppSessionUser | PlatformSessionUser;

export type SessionPayload = SessionUser & {
  iat: number;
  exp: number;
};

export const SESSION_COOKIE = "rappel_session";
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7;

export type PublicSession = SessionUser;

export function toPublicSession(user: SessionUser): PublicSession {
  return { ...user };
}

export function isPlatformSession(session: SessionUser): session is PlatformSessionUser {
  return session.scope === "platform";
}

export function isAppSession(session: SessionUser): session is AppSessionUser {
  return session.scope === "app";
}
