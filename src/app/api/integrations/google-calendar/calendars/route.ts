import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAppSession } from "@/lib/auth/api-guard";
import { canManageGoogleCalendar } from "@/lib/rbac";
import {
  getValidGoogleAccessToken,
  updateGoogleCalendarSelection,
} from "@/lib/db/google-calendar";
import { listGoogleCalendars } from "@/lib/google/calendar";
import type { GoogleCalendarOption } from "@/types/google-calendar";

export async function GET(request: NextRequest) {
  const auth = await requireAppSession(request);
  if (!auth.ok) return auth.response;
  if (!canManageGoogleCalendar(auth.session.role)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  try {
    const tokens = await getValidGoogleAccessToken(auth.session.organizationId);
    if (!tokens) {
      return NextResponse.json({ error: "Google Calendar n'est pas connecté." }, { status: 404 });
    }
    const calendars: GoogleCalendarOption[] = await listGoogleCalendars(tokens.accessToken);
    return NextResponse.json({ calendars });
  } catch (error) {
    console.error("[GET /api/integrations/google-calendar/calendars]", error);
    return NextResponse.json(
      { error: "Impossible de lister les calendriers Google." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAppSession(request);
  if (!auth.ok) return auth.response;
  if (!canManageGoogleCalendar(auth.session.role)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { calendarId?: string; calendarName?: string };
    const calendarId = body.calendarId?.trim();
    if (!calendarId) {
      return NextResponse.json({ error: "Calendrier manquant." }, { status: 400 });
    }

    const tokens = await getValidGoogleAccessToken(auth.session.organizationId);
    if (!tokens) {
      return NextResponse.json({ error: "Google Calendar n'est pas connecté." }, { status: 404 });
    }

    const calendars = await listGoogleCalendars(tokens.accessToken);
    const chosen = calendars.find((c) => c.id === calendarId);
    if (!chosen) {
      return NextResponse.json({ error: "Ce calendrier n'appartient pas à ce compte." }, { status: 400 });
    }

    const saved = await updateGoogleCalendarSelection(
      auth.session.organizationId,
      chosen.id,
      body.calendarName?.trim() || chosen.name,
    );

    let synced = 0;
    let failed = 0;
    try {
      const { pushUpcomingAppointmentsToGoogle } = await import(
        "@/lib/integrations/google-calendar-sync"
      );
      const result = await pushUpcomingAppointmentsToGoogle(auth.session.organizationId);
      synced = result.synced;
      failed = result.failed;
    } catch (e) {
      console.error("[PATCH calendars] bulk sync", e);
    }

    return NextResponse.json({
      ok: true,
      calendarId: saved?.calendarId ?? chosen.id,
      calendarName: saved?.calendarName ?? chosen.name,
      synced,
      failed,
    });
  } catch (error) {
    console.error("[PATCH /api/integrations/google-calendar/calendars]", error);
    return NextResponse.json(
      { error: "Impossible d'enregistrer le calendrier." },
      { status: 500 },
    );
  }
}
