import { NextResponse } from "next/server";
import { clearSessionCookie, getSessionFromRequest } from "@/lib/auth/session";
import { isAppSession, toPublicSession } from "@/lib/auth/types";
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

    return NextResponse.json({
      user: toPublicSession({
        ...session,
        orgLogoUrl: await getOrganizationLogoUrl(session.organizationId),
        mustChangePassword: state.mustChangePassword,
        sessionVersion: state.sessionVersion,
      }),
    });
  }

  return NextResponse.json({ user: toPublicSession(session) });
}
