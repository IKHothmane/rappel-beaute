import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { getSessionSecret, signJwt, verifyJwt } from "@/lib/auth/crypto";
import { payloadToSession } from "@/lib/auth/session-payload";
import { PLATFORM_SESSION_MAX_AGE_SEC, SESSION_COOKIE, SESSION_MAX_AGE_SEC, type AppSessionUser, type PlatformSessionUser, type SessionPayload, type SessionUser } from "@/lib/auth/types";

function buildToken(user: SessionUser, maxAgeSec: number): string {
  return signJwt(user, getSessionSecret(), maxAgeSec);
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

function cookieSecure(): boolean {
  // E2E / next start en HTTP : Secure empêcherait le navigateur d'envoyer le cookie.
  if (process.env.COOKIE_SECURE === "false") return false;
  if (process.env.COOKIE_SECURE === "true") return true;
  return process.env.NODE_ENV === "production";
}

function sessionCookieOptions(token: string, maxAgeSec: number | null = SESSION_MAX_AGE_SEC) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: cookieSecure(),
    path: "/",
    ...(maxAgeSec == null ? {} : { maxAge: maxAgeSec }),
  };
}

/**
 * maxAgeSec null = cookie de session navigateur (perdu à la fermeture).
 * Une session plateforme ne dépasse jamais PLATFORM_SESSION_MAX_AGE_SEC, quel que soit l'appelant.
 */
export function createSessionCookie(user: SessionUser, maxAgeSec: number | null = SESSION_MAX_AGE_SEC) {
  const ceiling = user.scope === "platform" ? PLATFORM_SESSION_MAX_AGE_SEC : SESSION_MAX_AGE_SEC;
  const effective = maxAgeSec == null ? null : Math.min(maxAgeSec, ceiling);
  const token = buildToken(user, effective ?? ceiling);
  return sessionCookieOptions(token, effective);
}

export function clearSessionCookie() {
  return {
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: cookieSecure(),
    path: "/",
    maxAge: 0,
  };
}

export type { AppSessionUser, PlatformSessionUser };
