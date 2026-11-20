import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAppSession } from "@/lib/auth/api-guard";
import { writeAuditLog } from "@/lib/db/audit";
import {
  getGoogleCalendarConnection,
  getOrganizationName,
  upsertGoogleCalendarConnection,
} from "@/lib/db/google-calendar";
import { consumeOneTimeToken } from "@/lib/db/session-revocation";
import { canManageGoogleCalendar } from "@/lib/rbac";
import {
  clearGoogleCalendarCookie,
  exchangeGoogleCode,
  fetchGoogleAccountEmail,
  listGoogleCalendars,
  matchGoogleCalendarCookie,
  pickDefaultGoogleCalendar,
  verifyGoogleOAuthState,
} from "@/lib/google/calendar";
import { tenantRoute } from "@/lib/http/route-scope";

function agendaRedirect(
  origin: string,
  google: "connected" | "error",
  extra?: Record<string, string>,
) {
  const base = origin.replace(/\/$/, "");
  const url = new URL(`${base}/agenda/`);
  url.searchParams.set("google", google);
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(base)) {
    url.searchParams.set("__host", "app");
  }
  if (extra) {
    for (const [key, value] of Object.entries(extra)) url.searchParams.set(key, value);
  }
  const res = NextResponse.redirect(url);
  res.headers.set("Cache-Control", "no-store");
  // Le cookie lié au state sert une seule fois : effacé quelle que soit l'issue.
  clearGoogleCalendarCookie(res);
  return res;
}

/** Retour vers le site qui a lancé OAuth. En local, ne pas suivre NEXT_PUBLIC_APP_URL (staging). */
function returnOrigin(request: NextRequest, callbackUri?: string): string {
  if (callbackUri) {
    try {
      return new URL(callbackUri).origin.replace(/\/$/, "");
    } catch {
      /* URI d'état illisible : on retombe sur l'hôte de la requête */
    }
  }
  const here = request.nextUrl.origin.replace(/\/$/, "");
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(here)) return here;
  return (process.env.NEXT_PUBLIC_APP_URL || here).replace(/\/$/, "");
}

export const GET = tenantRoute(async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const error = sp.get("error");
  const code = sp.get("code");
  const stateToken = sp.get("state");

  if (error) {
    return agendaRedirect(returnOrigin(request), "error", {
      reason: error === "access_denied" ? "denied" : "oauth",
    });
  }
  if (!code || !stateToken) {
    return agendaRedirect(returnOrigin(request), "error", { reason: "oauth" });
  }

  const state = verifyGoogleOAuthState(stateToken);
  if (!state) {
    return agendaRedirect(returnOrigin(request), "error", { reason: "state" });
  }

  const origin = returnOrigin(request, state.redirectUri);

  // Même contrôle que les routes métier : version de session, jeton non révoqué, utilisateur et institut actifs,
  // rôle courant lu en base.
  const auth = await requireAppSession(request);
  if (!auth.ok) {
    return agendaRedirect(origin, "error", { reason: "session" });
  }
  const session = auth.session;
  if (!canManageGoogleCalendar(session.role)) {
    return agendaRedirect(origin, "error", { reason: "forbidden" });
  }
  // Le state a été émis pour CET utilisateur et CET institut.
  if (session.id !== state.userId || session.organizationId !== state.orgId) {
    return agendaRedirect(origin, "error", { reason: "session" });
  }

  // Lié au navigateur : le nonce du cookie doit correspondre au state (anti injection / session fixation OAuth).
  const codeVerifier = matchGoogleCalendarCookie(request, state);
  if (!codeVerifier) {
    return agendaRedirect(origin, "error", { reason: "state" });
  }

  // Usage unique : seul le premier retour avec ce state passe, un rejeu est refusé.
  let firstUse = false;
  try {
    firstUse = await consumeOneTimeToken({
      jti: state.jti,
      userId: session.id,
      organizationId: session.organizationId,
      expiresAt: new Date(state.exp * 1000),
    });
  } catch (e) {
    console.error("[google-calendar callback] state consume", e);
  }
  if (!firstUse) {
    return agendaRedirect(origin, "error", { reason: "state" });
  }

  try {
    const tokens = await exchangeGoogleCode(code, state.redirectUri, state.pkce ? codeVerifier : undefined);
    const account = await fetchGoogleAccountEmail(tokens.accessToken);
    const existing = await getGoogleCalendarConnection(state.orgId);
    const orgName = await getOrganizationName(state.orgId);
    let calendars: Awaited<ReturnType<typeof listGoogleCalendars>> = [];
    try {
      calendars = await listGoogleCalendars(tokens.accessToken);
    } catch (e) {
      console.error("[google-calendar callback] list", e);
    }
    const chosen = pickDefaultGoogleCalendar(calendars, orgName);

    await upsertGoogleCalendarConnection({
      organizationId: state.orgId,
      googleEmail: account.email,
      googleAccountId: account.accountId,
      calendarId: chosen.id,
      calendarName: chosen.name,
      tokens,
      existingRefreshEnc: existing?.refreshTokenEnc,
    });

    try {
      await writeAuditLog({
        organizationId: state.orgId,
        actorId: session.id,
        actorName: `${session.firstName} ${session.lastName}`.trim(),
        entityType: "GoogleCalendarConnection",
        entityId: state.orgId,
        action: "GOOGLE_CALENDAR_CONNECTED",
        after: { email: account.email, calendarId: chosen.id, calendarName: chosen.name },
      });
    } catch (e) {
      console.error("[google-calendar callback] audit", e);
    }

    try {
      const { pushUpcomingAppointmentsToGoogle } = await import(
        "@/lib/integrations/google-calendar-sync"
      );
      void pushUpcomingAppointmentsToGoogle(state.orgId).catch((e) => {
        console.error("[google-calendar callback] bulk sync", e);
      });
    } catch (e) {
      console.error("[google-calendar callback] bulk import", e);
    }

    return agendaRedirect(origin, "connected", {
      pick: calendars.length > 1 ? "1" : "0",
    });
  } catch (e) {
    console.error("[GET /api/integrations/google-calendar/callback]", e);
    const msg = e instanceof Error ? e.message : "";
    const reason =
      msg === "GOOGLE_REFRESH_MISSING"
        ? "refresh"
        : msg === "GOOGLE_NOT_CONFIGURED"
          ? "not-configured"
          : "oauth";
    return agendaRedirect(origin, "error", { reason });
  }
});
