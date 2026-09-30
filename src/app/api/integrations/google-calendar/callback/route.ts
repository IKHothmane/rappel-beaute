import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { isAppSession } from "@/lib/auth/types";
import { writeAuditLog } from "@/lib/db/audit";
import {
  getGoogleCalendarConnection,
  getOrganizationName,
  upsertGoogleCalendarConnection,
} from "@/lib/db/google-calendar";
import {
  exchangeGoogleCode,
  fetchGoogleAccountEmail,
  listGoogleCalendars,
  pickDefaultGoogleCalendar,
  verifyGoogleOAuthState,
} from "@/lib/google/calendar";

function agendaRedirect(
  origin: string,
  google: "connected" | "error",
  extra?: Record<string, string>,
) {
  const base = origin.replace(/\/$/, "");
  const url = new URL(`${base}/agenda/`);
  url.searchParams.set("google", google);
  if (extra) {
    for (const [key, value] of Object.entries(extra)) url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const origin = (process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin).replace(/\/$/, "");
  const sp = request.nextUrl.searchParams;
  const error = sp.get("error");
  const code = sp.get("code");
  const stateToken = sp.get("state");

  if (error) {
    return agendaRedirect(origin, "error", { reason: error === "access_denied" ? "denied" : "oauth" });
  }
  if (!code || !stateToken) {
    return agendaRedirect(origin, "error", { reason: "oauth" });
  }

  const state = verifyGoogleOAuthState(stateToken);
  if (!state) {
    return agendaRedirect(origin, "error", { reason: "state" });
  }

  const session = getSessionFromRequest(request);
  if (!session || !isAppSession(session) || session.organizationId !== state.orgId) {
    return agendaRedirect(origin, "error", { reason: "session" });
  }

  try {
    const tokens = await exchangeGoogleCode(code, state.redirectUri);
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
}
