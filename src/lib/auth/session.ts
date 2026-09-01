import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { getSessionSecret, signJwt, verifyJwt } from "@/lib/auth/crypto";
import { payloadToSession } from "@/lib/auth/session-payload";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SEC,
  type AppSessionUser,
  type PlatformSessionUser,
  type SessionPayload,
  type SessionUser,
  toPublicSession,
} from "@/lib/auth/types";

function buildToken(user: SessionUser): string {
  return signJwt(user, getSessionSecret(), SESSION_MAX_AGE_SEC);
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
