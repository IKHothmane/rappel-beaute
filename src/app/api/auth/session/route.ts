import { NextResponse } from "next/server";
import { clearSessionCookie, createSessionCookie, getSessionFromRequest } from "@/lib/auth/session";
import { isAppSession, SESSION_MAX_AGE_SEC, toPublicSession } from "@/lib/auth/types";
import { COOKIE_HOST } from "@/lib/domain";
import { getUserSessionState } from "@/lib/db/users";
import { getEmailSetupRequired } from "@/lib/db/account-security";
import { getPlatformUserById } from "@/lib/db/platform-users";
import { getOrganizationLogoUrl } from "@/lib/db/organization";
import type { NextRequest } from "next/server";
import { publicRoute } from "@/lib/http/route-scope";

export const GET = publicRoute(async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  // Session déconnectée : ni profil ni renouvellement (le jeton ne se ressuscite pas lui-même).
  if (session.jti) {
    const { isSessionRevoked } = await import("@/lib/db/session-revocation");
    if (await isSessionRevoked(session.jti)) {
      const res = NextResponse.json({ user: null, code: "SESSION_REVOKED" }, { status: 401 });
      res.cookies.set(clearSessionCookie());
      return res;
    }
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
      role: state.role ?? session.role,
      orgLogoUrl: await getOrganizationLogoUrl(session.organizationId),
      mustChangePassword: state.mustChangePassword,
      sessionVersion: state.sessionVersion,
    };
    // Champ additif, hors du jeton signé : « Sécuriser mon compte » tant que l'e-mail est absent ou non vérifié.
    const emailSetupRequired = await getEmailSetupRequired(session.id);
    const res = NextResponse.json({
      user: { ...toPublicSession(refreshed), ...(emailSetupRequired === undefined ? {} : { emailSetupRequired }) },
    });
    res.cookies.set(createSessionCookie(refreshed));
    res.cookies.set(COOKIE_HOST, "app", {
      path: "/",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_SEC,
    });
    return res;
  }

  // Session plateforme : même relecture que requirePlatformSession. Un administrateur désactivé ou
  // supprimé, ou un jeton dont la version a été dépassée (changement de mot de passe, réinitialisation),
  // ne reçoit ni profil ni nouveau cookie ; l'ancien cookie est effacé.
  const current = await getPlatformUserById(session.id);
  if (!current) {
    const res = NextResponse.json({ user: null }, { status: 401 });
    res.cookies.set(clearSessionCookie());
    return res;
  }
  // Un ancien jeton sans version vaut 0 (voir session-payload).
  if ((session.sessionVersion ?? 0) !== (current.sessionVersion ?? 0)) {
    const res = NextResponse.json(
      { user: null, code: "SESSION_REVOKED" },
      { status: 401 },
    );
    res.cookies.set(clearSessionCookie());
    return res;
  }

  // Profil et rôle viennent de la base ; la version courante est écrite dans le jeton ré-émis.
  // jti et authAt sont conservés : le renouvellement ne prolonge jamais la durée absolue de la session.
  const refreshed = {
    ...current,
    sessionVersion: current.sessionVersion ?? 0,
    ...(session.jti ? { jti: session.jti } : {}),
    ...(session.authAt ? { authAt: session.authAt } : {}),
  };
  const res = NextResponse.json({ user: toPublicSession(refreshed) });
  res.cookies.set(createSessionCookie(refreshed));
  res.cookies.set(COOKIE_HOST, "admin", {
    path: "/",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SEC,
  });
  return res;
});
