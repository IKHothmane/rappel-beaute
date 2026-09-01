import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { getSessionSecret, signJwt, verifyJwt } from "@/lib/auth/crypto";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SEC,
  type AppSessionUser,
  type PlatformSessionUser,
  type SessionPayload,
  type SessionUser,
  toPublicSession,
} from "@/lib/auth/types";
import type { AppRole } from "@/lib/rbac";
import type { PlatformRole } from "@/types/platform";

function buildToken(user: SessionUser): string {
  return signJwt(user, getSessionSecret(), SESSION_MAX_AGE_SEC);
}

function payloadToSession(payload: SessionPayload): SessionUser | null {
  if (payload.scope === "platform" && payload.accountType === "PLATFORM") {
    return {
      id: payload.id,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      role: payload.role as PlatformRole,
      scope: "platform",
      accountType: "PLATFORM",
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
      scope: "app",
      accountType: "ORGANIZATION",
    };
  }
  // Legacy tokens without accountType
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
      scope: "app",
      accountType: "ORGANIZATION",
    };
  }
  return null;
}

export function parseSessionToken(token: string): SessionUser | null {
  const payload = verifyJwt<SessionPayload>(token, getSessionSecret());
  if (!payload) return null;
  return payloadToSession(payload);
}

export function getSessionFromRequest(request: NextRequest): SessionUser | null {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return parseSessionToken(token);
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return parseSessionToken(token);
}

export function sessionCookieOptions(token: string) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  };
}

export function createSessionCookie(user: SessionUser) {
  const token = buildToken(user);
  return sessionCookieOptions(token);
}

export function clearSessionCookie() {
  return {
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
}

export async function getPublicSession() {
  const session = await getSession();
  return session ? toPublicSession(session) : null;
}

export type { AppSessionUser, PlatformSessionUser };
