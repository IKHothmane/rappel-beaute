import { NextResponse } from "next/server";
import { clearSessionCookie, createSessionCookie, getSessionFromRequest } from "@/lib/auth/session";
import { isAppSession, SESSION_MAX_AGE_SEC, toPublicSession } from "@/lib/auth/types";
import { COOKIE_HOST } from "@/lib/domain";
import { getUserSessionState } from "@/lib/db/users";
import { getOrganizationLogoUrl } from "@/lib/db/organization";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  if (isAppSession(session)) {
    const state = await getUserSessionState(session.id);
    if (!state || state.status !== "ACTIVE") {
      const res = NextResponse.json({ user: null }, { status: 401 });
      res.cookies.set(clearSessionCookie());
      return res;
    }
    if ((session.sessionVersion ?? 0) !== state.sessionVersion) {
      const res = NextResponse.json(
        { user: null, code: "SESSION_REVOKED" },
        { status: 401 },
      );
      res.cookies.set(clearSessionCookie());
      return res;
    }

    const refreshed = {
      ...session,
      orgLogoUrl: await getOrganizationLogoUrl(session.organizationId),
      mustChangePassword: state.mustChangePassword,
      sessionVersion: state.sessionVersion,
    };
    const res = NextResponse.json({ user: toPublicSession(refreshed) });
    res.cookies.set(createSessionCookie(refreshed));
    res.cookies.set(COOKIE_HOST, "app", {
      path: "/",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_SEC,
    });
    return res;
  }

  const res = NextResponse.json({ user: toPublicSession(session) });
  res.cookies.set(createSessionCookie(session));
  res.cookies.set(COOKIE_HOST, "admin", {
    path: "/",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SEC,
  });
  return res;
}
