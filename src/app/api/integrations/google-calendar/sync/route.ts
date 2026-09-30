import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAppSession } from "@/lib/auth/api-guard";
import { canManageGoogleCalendar } from "@/lib/rbac";
import { getGoogleCalendarConnection } from "@/lib/db/google-calendar";
import { pushUpcomingAppointmentsToGoogle } from "@/lib/integrations/google-calendar-sync";

export async function POST(request: NextRequest) {
  const auth = await requireAppSession(request);
  if (!auth.ok) return auth.response;
  if (!canManageGoogleCalendar(auth.session.role)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  try {
    const conn = await getGoogleCalendarConnection(auth.session.organizationId);
    if (!conn) {
      return NextResponse.json({ error: "Google Calendar n'est pas connecté." }, { status: 404 });
    }

    const result = await pushUpcomingAppointmentsToGoogle(auth.session.organizationId);
    return NextResponse.json({
      ok: true,
      ...result,
      calendarName: conn.calendarName,
    });
  } catch (error) {
    console.error("[POST /api/integrations/google-calendar/sync]", error);
    return NextResponse.json(
      { error: "Impossible de synchroniser l'agenda vers Google." },
      { status: 500 },
    );
  }
}
